import { WebHookCacheItem } from './webhook-cache-model';

export class WebHookCacheModelHelper {
    static getWebHookCacheItemStrg(item: WebHookCacheItem): string {
        return `\nUrl       : ${item.url}\n` +
            `WorkerId  : ${item.workerId}\n` +
            `StartTime : ${item.startTime}`;
    }
}