import { LoggingService } from "../logging";
import { IEvent } from "./ipc-event";
const cluster = require('cluster');

export type EventDirection = 'XMT' | 'RCV';

export class IpcEventBusHelper {
    static logEvent(loggingService: LoggingService, event: IEvent, direction: EventDirection): void {
        const directionStrg = (direction) => (direction === 'XMT') ? 'sent' : 'received';
        loggingService.debug(
            `${directionStrg(direction)} event [${event.type}] on IPC event bus`,
            event);
    }
}