import { TypedEvent } from '../common/ipc-bus/ipc-event';
import { EventTypes } from './event-type';
import { Document } from '../master/document-writer/document';

export class WriteDocumentEvent extends TypedEvent<Document> {
    static readonly TYPE = EventTypes.WRITE_DOC;

    constructor(payload: Document, workerPid?: number, correlationId?: string) {
        super(WriteDocumentEvent.TYPE, payload, workerPid, correlationId);
    }
}

export class AddItemToCacheIfNotPresentEvent extends TypedEvent<string> {
    static readonly TYPE = EventTypes.ADD_ITEM_TO_CACHE_IF_NOT_PRESENT;

    constructor(payload: string, workerPid?: number, correlationId?: string) {
        super(AddItemToCacheIfNotPresentEvent.TYPE, payload, workerPid, correlationId);
    }
}

export class AddItemToCacheIfNotPresentAnswerEvent extends TypedEvent<boolean> {
    static readonly TYPE = EventTypes.ADD_ITEM_TO_CACHE_IF_NOT_PRESENT_ANSWER;

    constructor(payload: boolean, workerPid?: number, correlationId?: string) {
        super(AddItemToCacheIfNotPresentAnswerEvent.TYPE, payload, workerPid, correlationId);
    }
}

export class RemoveItemFromCacheEvent extends TypedEvent<string> {
    static readonly TYPE = EventTypes.REMOVE_ITEM_FROM_CACHE;

    constructor(url: string, workerPid?: number, correlationId?: string) {
        super(RemoveItemFromCacheEvent.TYPE, url, workerPid, correlationId);
    }
}
