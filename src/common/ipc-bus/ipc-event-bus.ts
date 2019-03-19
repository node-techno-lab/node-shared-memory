import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IEvent } from './ipc-event';
import { Cluster, Worker } from 'cluster';

const cluster: Cluster = require('cluster');

export class IpcEventBus extends Subject<IEvent> {

    constructor() {
        super();
    }

    ofTypes(...args: string[]): Observable<IEvent> {
        if (args !== undefined) {
            return this.pipe(filter((e: IEvent): boolean => {
                let found = false;

                if (e.type !== undefined) {
                    const typeUpperCase = e.type.toUpperCase();
                    for (const arg of args) {
                        if (typeUpperCase === arg.toUpperCase()) {
                            found = true;
                            break;
                        }
                    }
                }

                return found;
            }));
        }
        return <Observable<IEvent>>super.asObservable();
    }

    async emitAsync(event: IEvent, worker?: Worker): Promise<void> {
        if (cluster.isMaster) {
            worker.send(event);
        } else {
            process.send(event);
        }
    }

    start(): void {
        if (cluster.isMaster) {
            cluster.on('message', (worker: Worker, event: IEvent, handle: any) => {
                this.next(event);
            });
        } else {
            process.on('message', (event: IEvent) => {
                this.next(event);
            });
        }
    }
}
