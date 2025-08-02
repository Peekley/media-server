export interface RtmpHeader {
    fmt: number,
    cid: number,
    timestamp: number,
    length: number,
    type: number,
    stream_id: number
}

export class RtmpPacket {
    header: RtmpHeader;
    clock: number;
    payload: Buffer<ArrayBuffer>;
    capacity: number;
    bytes: number;

    constructor(fmt: number = 0, cid: number = 0) {
        this.header = {
            fmt: fmt,
            cid: cid,
            timestamp: 0,
            length: 0,
            type: 0,
            stream_id: 0
        };
        this.clock = 0;
        this.payload = Buffer.alloc(0);
        this.capacity = 0;
        this.bytes = 0;
    }
}