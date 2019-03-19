import { WebHookCacheItem } from './webhook-cache-model';
import { LoggingService } from '../../common/logging';
import { WebHookCacheModelHelper } from './webhook-cache-model-helper';

export class WebHookCacheService {
    private map: Map<string, WebHookCacheItem>;

    constructor(private loggingService: LoggingService) {
        this.map = new Map<string, WebHookCacheItem>();
        this.loggingService.trace(`${WebHookCacheService.name} has been build`);
    }

    async removeItemFromCache(url: string): Promise<void> {
        if (this.map.has(url)) {
            this.map.delete(url);
            this.loggingService.debug(`${WebHookCacheService.name}-item deleted from cache [url:${url}]`);
            this.displayCache();
        }
    }

    async addItemToCacheIfNotPresent(url: string, wpid: number): Promise<boolean> {
        let shouldCallWebHook = false;
        const item = this.getItemByUrl(url);
        if (!item) {
            const item: WebHookCacheItem = {
                startTime: new Date,
                workerId: wpid,
                url: url
            };

            this.map.set(url, item);
            this.loggingService.debug(`${WebHookCacheService.name}-item added to cache [url:${url}]`);
            this.displayCache();
            shouldCallWebHook = true;
        }
        return shouldCallWebHook;
    }

    private displayCache(): void {
        this.loggingService.debug(`${WebHookCacheService}-Cache\n`);
        [...this.map.values()].forEach((item: WebHookCacheItem) => this.loggingService.debug(WebHookCacheModelHelper.getWebHookCacheItemStrg(item)));
    }

    private getItemByUrl(url: string): WebHookCacheItem {
        return [...this.map.values()].find((item: WebHookCacheItem) => item.url === url);
    }
}