export interface InvokeMessageEvent {
    cmd?: string;
    streamId?: number;
    streamName?: string;
    streamQuery?: string;
    transId: number;
    cmdObj?: {
        app: string;
        name: string;
        host: string;
        query: string;
        tcUrl: string;
        objectEncoding?: number;
    },
    info?: {
        level: string;
        code: string;
        description: string;
        objectEncoding?: number;
    }
}