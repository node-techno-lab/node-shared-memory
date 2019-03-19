import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import { LoggingService } from '../common/logging';
import { ConfigurationService } from '../config/configuration-service';
import { IpcEventBus } from '../common/ipc-bus/ipc-event-bus';
import { IEvent } from '../common/ipc-bus/ipc-event';
import { Document } from '../master/document-writer/document';
import { WriteDocumentEvent, AddItemToCacheIfNotPresentAnswerEvent, AddItemToCacheIfNotPresentEvent, RemoveItemFromCacheEvent } from '../event/events';
import { Observable } from 'rxjs';
import { take, filter, timeout } from 'rxjs/operators';
import { IpcEventBusHelper } from '../common/ipc-bus/ipc-bus-helper';

export class WorkerProcess {

    private app: express.Application = express();

    constructor(
        private loggingService: LoggingService,
        private configurationService: ConfigurationService,
        private eventBus: IpcEventBus) {
        this.app = express();
        this.loggingService.trace(`${WorkerProcess.name}-has been build`);
    }

    run(): void {

        this.initEventBus();

        // Apply Log / WebHook middleware
        this.app.all('*', async (req, res, next) => {
            // Apply Log Middelware
            this.loggingService.debug(`${WorkerProcess.name}-${req.method} => ${req.url}`);

            try {
                // Apply WebHook middelware
                const shouldCallWebHook = await this.shouldCallWebHook(req.url);
                if (!shouldCallWebHook) {
                    this.endResponse(res, `Worker ${process.pid} is not calling WebHook ${req.url} (already processing request)}`);
                } else {
                    this.loggingService.debug(`${WorkerProcess.name}-pass to next middleware...`);
                    next();
                }
            } catch (err) {
                this.loggingService.warn(`${WorkerProcess.name}-unexpected error in middleware...`, err);
                next();
            }
        });

        // Serve static files
        this.app.use(cors());
        this.app.use(bodyParser.json({ limit: '50mb', type: 'application/json' }));
        this.app.use('/', express.static(this.configurationService.absolutePath));

        this.app.get('/write', this.onWrite.bind(this));
        this.app.get('/web-hook', this.onWebHook.bind(this));

        // Error handler
        this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction): any => {
            if (err) {
                this.loggingService.error(`${WorkerProcess.name}-${req.url}\n500-${err.message}`);
                res.status(500);
                res.send(`Worker:${process.pid} Error 500-${err.message}\n`);
            }
        });

        // // Handle 404
        // this.app.all('*', (req: express.Request, res: express.Response) => {
        //     this.loggingService.error(`404 - ${req.url}`);
        //     res.status(404);
        //     res.end();
        // });

        // Create and start the server
        const server = require('http').createServer(this.app);
        server.listen(this.port, (err: any) => {
            if (err) {
                const message = `Listen error ${err}`;
                this.loggingService.error(`${WorkerProcess.name} - ${message}`);
                throw new Error(message);
            };
            this.loggingService.debug(`${WorkerProcess.name}-web app is listening on port: ${this.port}`);
        });
    }

    private async shouldCallWebHook(webHookUrl: string): Promise<boolean> {
        let shouldCallWebHook = true
        if (webHookUrl.startsWith('/web-hook')) {
            try {
                const event = new AddItemToCacheIfNotPresentEvent(webHookUrl, process.pid);
                const answer: AddItemToCacheIfNotPresentAnswerEvent = await this.sendEventAndWaitAnswerAsync(event, 3000);
                shouldCallWebHook = answer ? answer.payload : false;
            } catch (err) {
                this.loggingService.error(`${WorkerProcess.name}-error when calling shouldCallWebHook for ${webHookUrl}`, err)
                throw err;
            }
        }
        return shouldCallWebHook;
    }

    private async sendEventAndWaitAnswerAsync(requestEvent: AddItemToCacheIfNotPresentEvent, timeoutMs: number): Promise<AddItemToCacheIfNotPresentAnswerEvent> {
        const wait$: Observable<IEvent> = this.eventBus
            .ofTypes(AddItemToCacheIfNotPresentAnswerEvent.TYPE)
            .pipe(
                filter((evt: AddItemToCacheIfNotPresentEvent) => evt.corrId === requestEvent.corrId),
                timeout(timeoutMs),
                take(1)  // to automatically remove subscription
            );
        IpcEventBusHelper.logEvent(this.loggingService, requestEvent, 'XMT');
        this.eventBus.emitAsync(requestEvent);

        const responseEvent: AddItemToCacheIfNotPresentAnswerEvent = await wait$.toPromise();
        IpcEventBusHelper.logEvent(this.loggingService, responseEvent, 'RCV');
        return responseEvent;
    }

    private initEventBus(): void {
        this.loggingService.trace(`${WorkerProcess.name}-start IPC EventBus`);
        this.eventBus.start();
    }

    private get port(): number {
        return this.configurationService.config.listenPort;
    }

    private async onWrite(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
        try {
            const doc: Document = {
                content: 'content of couchbase Doc'
            };
            const event: IEvent = new WriteDocumentEvent(doc);
            IpcEventBusHelper.logEvent(this.loggingService, event, 'XMT');
            await this.eventBus.emitAsync(event);

            this.endResponse(res, `${WorkerProcess.name}-${process.pid}- onWrite has been called\n`)
        } catch (err) {
            this.loggingService.error(`error when called onWrite`, err);
            next(err);
        }
    }

    private async onWebHook(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
        try {
            const processTimeMs = 10000;
            this.loggingService.debug(`${WorkerProcess.name} - onWebHook is waiting ${processTimeMs}ms`);
            await new Promise((resolve, reject) => setTimeout(() => resolve(), processTimeMs));
            const event = new RemoveItemFromCacheEvent(req.url, process.pid);
            IpcEventBusHelper.logEvent(this.loggingService, event, 'XMT');
            this.eventBus.emitAsync(event);

            this.endResponse(res, `${WorkerProcess.name}-${process.pid}- onWebHook has been called processing time:: ${processTimeMs}ms\n`)
        }
        catch (err) {
            this.loggingService.error(`error when called onWebHook`, err);
            next(err);
        }
    }

    private endResponse(res: express.Response, msg: string): void {
        this.loggingService.debug(`${WorkerProcess.name} - 200-OK => [${msg}]`);
        res.writeHead(200);
        res.write(msg);
        res.end();
    }

}