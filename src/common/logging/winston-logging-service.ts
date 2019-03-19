import { LogMsgType, LogLevel, LogRecordConverter, LogTimer } from '.';
import { Cluster } from 'cluster';
import * as _ from 'lodash';
import { LogLevels, getMessage, LogEvent, LogEventPayload } from '.';
import { IpcEventBus } from '../ipc-bus/ipc-event-bus';
import { IEvent } from '../ipc-bus/ipc-event';
import { UuidHelper } from '../helpers/uuid-helper';
import { ConfigurationService } from '../../config/configuration-service';
import { Configuration } from '../../config/configuration';
import { ConsoleTransportOptions, FileTransportOptions } from 'winston/lib/winston/transports';

require('winston-daily-rotate-file');

const winston = require('winston');
const format = winston.format;
const cluster: Cluster = require('cluster');

export type TransportTypes = 'Console' | 'File';

export class LoggingService {
    private _logger: { log: Function, add: Function, configure: Function, levels: Function, level: string };
    private _enableTransports: any[];
    private _eventBus: IpcEventBus;

    constructor(
        private _cfgService: ConfigurationService,
        private _logRecordConverter: LogRecordConverter) {
        this.initialize();
    }

    startTimer(): LogTimer {
        return new LogTimer();
    }

    stopTimer(timer: LogTimer, logLevel: LogLevel, message: LogMsgType, ...optionalParams: any[]): void {
        this.stopTimerLevelled(timer, logLevel, message, ...optionalParams);
    }

    trace(message: LogMsgType, ...optionalParams: any[]): void {
        this.logInternal(LogLevels.TRACE, message, ...optionalParams);
    }

    debug(message: LogMsgType, ...optionalParams: any[]): void {
        this.logInternal(LogLevels.DEBUG, message, ...optionalParams);
    }

    info(message: LogMsgType, ...optionalParams: any[]): void {
        this.logInternal(LogLevels.INFO, message, ...optionalParams);
    }

    warn(message: LogMsgType, ...optionalParams: any[]): void {
        this.logInternal(LogLevels.WARN, message, ...optionalParams);
    }

    error(message: LogMsgType, ...optionalParams: any[]): void {
        this.logInternal(LogLevels.ERROR, message, ...optionalParams);
    }

    private logInternal(callerLogLevel: LogLevel, message: LogMsgType, ...optionalParams: any[]): void {
        // Check if at least one transport level has been build
        if (this.isAtLeastOneTransportLevelActive(callerLogLevel) === true) {
            if (cluster.isMaster) {
                this._logger.log(
                    callerLogLevel.label,
                    message,
                    this.buildMetaInfo(optionalParams));
            } else {
                const eventPayload: LogEventPayload = {
                    level: callerLogLevel.label,
                    message: getMessage(message),
                    meta: this.buildMetaInfo(optionalParams)
                };
                const event: IEvent = new LogEvent(eventPayload);
                this._eventBus.emitAsync(event);
            }
        }
    }

    private stopTimerLevelled(timer: LogTimer, level: LogLevel, message: LogMsgType, ...optionalParams: any[]): void {
        if (timer) {
            timer.stop();
            this._logger.log(
                level.label,
                `${message}-[time:${timer.delay} ms]`,
                this.buildMetaInfo(optionalParams)
            );
        }
    }

    private static getLogLevelNbr(level: string): number {
        switch (level) {
            case LogLevels.DEBUG.label: return LogLevels.DEBUG.id;
            case LogLevels.INFO.label: return LogLevels.INFO.id;
            case LogLevels.WARN.label: return LogLevels.WARN.id;
            case LogLevels.ERROR.label: return LogLevels.ERROR.id;
            case LogLevels.TRACE.label:
            default:
                return LogLevels.TRACE.id;
        }
    }

    private static getEnabledTransports(configuration: Configuration): any[] {
        const transports = configuration.logging.transports
            .filter((c: any) => c.enabled === true);
        return transports;
    }

    private static createEnabledTransports(enabledTransports: any[]): any[] {
        const transports = enabledTransports
            .map((transportConfig: any) => LoggingService.createTransportFromConfig(transportConfig));
        return transports;
    }

    private static createTransportFromConfig(transportConfig: any): void {
        switch (transportConfig.transport) {
            case 'Console':
                const consoleOpts: ConsoleTransportOptions = {
                    level: transportConfig.minLevel,
                    handleExceptions: false
                };
                return new winston.transports.Console(consoleOpts);

            case 'File':
                const fileOpts: FileTransportOptions = {
                    level: transportConfig.minLevel,
                    tailable: true,
                    filename: transportConfig.filePath,
                    maxFiles: transportConfig.maxFiles,
                    maxsize: transportConfig.maxSize,
                    handleExceptions: false
                };
                return new (winston.transports.DailyRotateFile)(fileOpts);
            default: {
                throw new Error(
                    `Logger Transport ${transportConfig.type} not supported !`);
            }
        }
    }

    private static getClusterTypeName(): string {
        return cluster.isMaster ? 'MASTER' : 'WORKER';
    }

    private static getClusterTypePid(): number {
        return process.pid;
    }

    private isAtLeastOneTransportLevelActive(callerLogLevel: LogLevel): boolean {
        // Check if at least one transport level has been build
        let result = false;
        for (const transport of this._enableTransports) {
            const transportLogLevelId = LoggingService.getLogLevelNbr(transport.minLevel);
            if (transportLogLevelId >= callerLogLevel.id) {
                result = true;
                break;
            }
        }
        return result;
    }

    private buildMetaInfo(optionalParams: any[], corrId?: string): any {
        return {
            meta: _.isEmpty(optionalParams) ? undefined : optionalParams, // avoid to show empty array
            clusterType: LoggingService.getClusterTypeName(),
            pid: LoggingService.getClusterTypePid(),
            corrId: corrId ? corrId : UuidHelper.generateUuid()
        };
    }

    private initialize(): void {
        const customLevels = this.initCustomLogLevels();
        this.createLoggerWithTransports(customLevels);
        this.initEventBus();
    }

    private initCustomLogLevels(): any {
        // Handle custom log levels including colors
        const customLevels = {
            levels: {
                trace: LogLevels.TRACE.id,
                debug: LogLevels.DEBUG.id,
                info: LogLevels.INFO.id,
                warn: LogLevels.WARN.id,
                error: LogLevels.ERROR.id
            },
            colors: {
                trace: LogLevels.TRACE.color,
                debug: LogLevels.DEBUG.color,
                info: LogLevels.INFO.color,
                warn: LogLevels.WARN.color,
                error: LogLevels.ERROR.color
            }
        };
        winston.addColors(customLevels.colors);
        return customLevels;
    }

    private initEventBus(): void {
        this._eventBus = new IpcEventBus();
        if (cluster.isMaster) {
            this._eventBus.start();
            this._eventBus
                .ofTypes(LogEvent.TYPE)
                .subscribe(event => {
                    const typedEvent = event as LogEvent;
                    this._logger.log(
                        typedEvent.payload.level,
                        typedEvent.payload.message,
                        typedEvent.payload.meta);
                });
        }
    }

    private createLoggerWithTransports(customLevels: any): void {
        // Create Logger with transports
        this._enableTransports = LoggingService.getEnabledTransports(this._cfgService.config);
        const opts: any = {
            levels: customLevels.levels,
            level: LogLevels.TRACE.label,
            format: format.combine(
                format.colorize({ level: true, message: false }),
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.printf((info: any) => this._logRecordConverter.getLogMessage(info))
            ),
            transports: LoggingService.createEnabledTransports(this._enableTransports),
            exitOnError: false
        };
        this._logger = winston.createLogger(opts);
    }
}
