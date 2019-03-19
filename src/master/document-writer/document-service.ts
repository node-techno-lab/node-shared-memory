import { LoggingService } from '../../common/logging';
import { Document } from './document';

export class DocumentService {

    constructor(
        private loggingService: LoggingService) {
        this.loggingService.trace(`${DocumentService.name}-has been build`);
    }

    writeDocument(document: Document): void {
        this.loggingService.trace(`${DocumentService.name}-write document`, document);
    }
}