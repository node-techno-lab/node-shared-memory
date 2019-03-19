export interface Configuration {
    logging: {
        shortDescription: boolean;
        transports: any[];
    };
    listenPort: number;
    relativePublicPath: string;
}
