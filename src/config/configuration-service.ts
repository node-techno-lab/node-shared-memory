import { Configuration } from './configuration';
import minimist = require('minimist');

export class ConfigurationService {

    private _config: Configuration;
    private _absolutePath: string;

    constructor() {
        const args = minimist(process.argv.slice(2));
        const configPath = `./config-devlocal.json`;
        //        const configPath = `./config-${args.env}.json`;
        this._config = require(configPath);
        this._absolutePath = `${__dirname}/..${this._config.relativePublicPath}`;
    }

    get config(): Configuration {
        return this._config;
    }

    get absolutePath(): string {
        return this._absolutePath;
    }
}
