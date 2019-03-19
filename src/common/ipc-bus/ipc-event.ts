import * as fromUtils from '../helpers/type-cache';
import { UuidHelper } from '../helpers/uuid-helper';

export interface IEvent {
    type: string;
    payload?: any;
    corrId: string;
    workerPid?: number;
}

export const DefaultEventTypes = {
    UNNOWN_EVENT_TYPE: fromUtils.type('UNNOWN_EVENT_TYPE')
};

export class Event implements IEvent {
    constructor(public type: string,
        public payload?: any,
        public workerPid?: number,
        public corrId = UuidHelper.generateUuid()) {
    }
}

export class TypedEvent<TPayload> extends Event {
    constructor(public type: string, public payload?: TPayload, workerPid?: number, correlationId?: string) {
        super(type, payload, workerPid, correlationId);
    }
}
