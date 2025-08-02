import {FLV_PARSE_INIT, FlvPacket, FlvTag} from "../../types";

export class FlvParser {
    tag: FlvTag;
    packet: FlvPacket;

    constructor(initialCapacity: number = 1024 * 1024) {
        this.tag = {
            bytes: 0,
            type: 0,
            size: 0,
            time: 0,
            capacity: initialCapacity,
            data: Buffer.alloc(initialCapacity)
        };

        this.packet = {
            buffer: Buffer.alloc(13),
            state: FLV_PARSE_INIT,
            headerBytes: 0,
            previousBytes: 0
        };
    }
}