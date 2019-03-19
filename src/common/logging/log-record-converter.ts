import { JsonHelper } from '../helpers/json-helper';
import * as _ from 'lodash';

export class LogRecordConverter {

    getLogMessage(info: any): string {
        try {
            return `${info.timestamp}|${info.level}|${info.clusterType}|${info.pid}|${info.message}|${this.getMetaJsonString(info.meta)}|`;
        } catch (err) {
            return `${info.timestamp}-[${info.level}]-${info.message}--Unexpected Logging ERROR - ${err.message}`;
        }
    }

    private getMetaJsonString(meta: any): string {
        if (!meta) { return ''; }

        for (let index = 0; index < meta.length; index++) {
            const element = meta[index];
            if (element instanceof Error) {
                if (!_.isEmpty(element.stack)) {
                    meta[index] = element.stack.split('\n');
                }
            }
        }
        return `\r\n${JsonHelper.stringify(meta, null, 2)}`;
    }
}
