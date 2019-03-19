import { Worker, worker } from 'cluster';
import { LoggingService } from '../common/logging';
import { Util } from '../common/helpers/util';
import { DocumentService } from './document-writer/document-service';
import { IpcEventBus } from '../common/ipc-bus/ipc-event-bus';
import { WriteDocumentEvent, AddItemToCacheIfNotPresentEvent, RemoveItemFromCacheEvent, AddItemToCacheIfNotPresentAnswerEvent } from '../event/events';
import { WebHookCacheService } from './webhook-cache/webhook-cache-service';
import { Subscription } from 'rxjs';
import { IpcEventBusHelper } from '../common/ipc-bus/ipc-bus-helper';
const cluster = require('cluster');

export class MasterProcess {

    private _workers: Worker[];
    private documentSubscription: Subscription;
    private cacheSubscription: Subscription;

    constructor(
        private loggingService: LoggingService,
        private cacheService: WebHookCacheService,
        private documentService: DocumentService,
        private eventBus: IpcEventBus, ) {
        this._workers = new Array<Worker>();
        this.loggingService.trace(`${MasterProcess.name}-has been build`);
    }


    async run(): Promise<void> {
        this.loggingService.debug(`${MasterProcess.name}-running...`);

        this.initEventBus();
        await this.createAndRegisterAllClusterWorkersAsync();
        this.subscribeToClusterWorkerExit();
    }

    async dispose(): Promise<void> {
        if (this.cacheSubscription) {
            this.cacheSubscription.unsubscribe();
            this.cacheSubscription = null;
        }
        if (this.documentSubscription) {
            this.documentSubscription.unsubscribe();
            this.documentSubscription = null;
        }
    }

    private initEventBus(): void {
        this.eventBus.start();
        this.documentSubscription = this.eventBus
            .ofTypes(WriteDocumentEvent.TYPE)
            .subscribe((event: WriteDocumentEvent) => {
                IpcEventBusHelper.logEvent(this.loggingService, event, 'RCV');
                this.documentService.writeDocument(event.payload);
            });
        this.cacheSubscription = this.eventBus
            .ofTypes(AddItemToCacheIfNotPresentEvent.TYPE, RemoveItemFromCacheEvent.TYPE)
            .subscribe((event: AddItemToCacheIfNotPresentEvent | RemoveItemFromCacheEvent) => this.onCacheAccess(event));
    }

    private async onCacheAccess(event: RemoveItemFromCacheEvent | AddItemToCacheIfNotPresentEvent): Promise<void> {
        IpcEventBusHelper.logEvent(this.loggingService, event, 'RCV');
        if (event.type === RemoveItemFromCacheEvent.TYPE) {
            await this.cacheService.removeItemFromCache(event.payload);
        } else if (event.type === AddItemToCacheIfNotPresentEvent.TYPE) {
            const answer = await this.cacheService.addItemToCacheIfNotPresent(event.payload, event.workerPid);
            const worker: Worker = this._workers.find((worker: Worker) => worker.process.pid === event.workerPid);
            const answerEvent = new AddItemToCacheIfNotPresentAnswerEvent(answer, event.workerPid, event.corrId);
            IpcEventBusHelper.logEvent(this.loggingService, answerEvent, 'XMT');
            this.eventBus.emitAsync(answerEvent, worker);
        } else {
            this.loggingService.error(`${MasterProcess.name}-invalid event received for cache management`);
        }
    }

    private async createAndRegisterAllClusterWorkersAsync() {
        const cpusCount = Util.cpusCount;
        this.loggingService.debug(`${MasterProcess.name} creating cluster workers for ${cpusCount} CPU's cores...`);
        for (let i = 0; i < cpusCount; i++) {
            this.forkWorker();
            this.displayWorkerCache();
        }
    }

    private subscribeToClusterWorkerExit() {
        this.loggingService.debug(`${MasterProcess.name} subscribing to 'exit' event and wait end of cluster workers...`);
        cluster.on('online', this.onOnlineClusterWorker.bind(this));
        cluster.on('exit', this.onExitClusterWorker.bind(this));
    }

    private onOnlineClusterWorker(clusterWorker: Worker): void {
        this.loggingService.debug(
            `${MasterProcess.name} detects worker [PID:${clusterWorker.process.pid}] is online`);
    }

    private async onExitClusterWorker(worker: Worker, code: number, signal: string): Promise<void> {
        this.loggingService.warn(
            `${MasterProcess.name}-worker:${worker.id}} stopped working ` +
            `after ${process.uptime()} sec(code: ${code}, signal: ${signal}, exitedAfterDisconnect: ${worker.exitedAfterDisconnect}).`);

        const idx = this._workers.indexOf(worker);
        if (idx != -1) {
            this._workers.splice(idx, 1);
        }

        if (code !== 0 && !worker.exitedAfterDisconnect) {
            this.forkWorker();
        } else {
            this.loggingService.debug(`${MasterProcess.name}-worker: ${worker.id} has exit successfully`)
        }

        if (this._workers.length === 0) {
            this.loggingService.debug(`${MasterProcess.name}-all workers processes have reported fatal errors and cannot be restarted`);
            process.exit(99);
        }
        this.displayWorkerCache();
    }


    private forkWorker() {
        console.log(`Master forks a Cluster Worker`);
        const worker: Worker = cluster.fork();
        this._workers.push(worker);
    }

    private displayWorkerCache() {
        this.loggingService.debug(
            `Master cache contains now ${this._workers.length} cluster worker(s)` +
            `[${this._workers.map((w: Worker) => w.process.pid).join(', ')}]`)
    }
}
