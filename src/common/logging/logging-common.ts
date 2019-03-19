import { TypedEvent } from '../ipc-bus/ipc-event';

export type LogMsgType = string | (() => string);
export const getMessage = (msg: LogMsgType) => (typeof msg === 'function') ? msg() : msg;

export class LogTimer {

    get start(): number {
        return this._start;
    }

    get delay(): number {
        return this._delay;
    }

    private _start: number;
    private _stop: number;
    private _delay: number;

    constructor() {
        this._start = new Date().getTime();
    }

    stop(): void {
        this._stop = new Date().getTime();
        this._delay = this._stop - this._start;
    }
}

export interface LogLevel {
    id: number;
    label: string;
    color: string;
}

export class LogLevels {
    static readonly TRACE = { id: 4, label: 'trace', color: 'bold grey' };
    static readonly DEBUG = { id: 3, label: 'debug', color: 'bold cyan' };
    static readonly INFO = { id: 2, label: 'info', color: 'bold green' };
    static readonly WARN = { id: 1, label: 'warn', color: 'bold yellow' };
    static readonly ERROR = { id: 0, label: 'error', color: 'bold red' };
}

export interface LogRecord {
    datetime: string;
    colorizedLevel?: string;
    processId?: string;
    message: string;
    meta?: any[];
}

export interface ILoggingService {
    getName(): string;
    trace(obj: LogMsgType, ...optionalParams: any[]): void;
    debug(obj: LogMsgType, ...optionalParams: any[]): void;
    info(obj: LogMsgType, ...optionalParams: any[]): void;
    warn(obj: LogMsgType, ...optionalParams: any[]): void;
    error(obj: LogMsgType, ...optionalParams: any[]): void;
    startTimer(): LogTimer;
    stopTimer(timer: LogTimer, logLevel: LogLevel, message: LogMsgType, ...optionalParams: any[]): void;
}

export interface LogEventPayload {
    level: string;
    message: string;
    meta: {
        processId: number;
        corrdId: string;
    };
}

export class LogEvent extends TypedEvent<LogEventPayload> {
    static readonly TYPE = 'ADD_LOG';

    constructor(payload: LogEventPayload) {
        super(LogEvent.TYPE, payload);
    }
}
