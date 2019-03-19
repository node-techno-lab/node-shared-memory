import { MasterProcess } from './master/master-process';
import { WorkerProcess } from './worker/worker-process';
import { ServerHooks } from './common/helpers/server-hooks';
import { LoggingService, LogRecordConverter } from './common/logging';
import { ConfigurationService } from './config/configuration-service';
import { DocumentService } from './master/document-writer/document-service';
import { IpcEventBus } from './common/ipc-bus/ipc-event-bus';
import { WebHookCacheService } from './master/webhook-cache/webhook-cache-service';
const cluster = require('cluster');

ServerHooks.registerProcessHooks();

// Use a IOC container like (type-di) if possible
const configurationService = new ConfigurationService();
const loggingService = new LoggingService(configurationService, new LogRecordConverter());
const cacheService = new WebHookCacheService(loggingService);
const documentService = new DocumentService(loggingService);
const eventBus = new IpcEventBus()
if (cluster.isMaster) {
    new MasterProcess(loggingService, cacheService, documentService, eventBus).run();
}
else {
    new WorkerProcess(loggingService, configurationService, eventBus).run();
}
