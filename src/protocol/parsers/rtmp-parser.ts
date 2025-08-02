import {MAX_CHUNK_HEADER, RTMP_CHUNK_SIZE, RTMP_MAX_CHUNK_SIZE, RTMP_PARSE_INIT} from "../../types";
import { RtmpPacket } from "../../packets/rtmppacket";

export class RtmpParser {
    buffer: Buffer;
    state: number;
    bytes: number;
    basicBytes: number;
    packet: RtmpPacket;
    inPackets: Map<number, RtmpPacket>;

    inChunkSize: number = RTMP_CHUNK_SIZE;
    outChunkSize: number = RTMP_MAX_CHUNK_SIZE;
    ackSize: number;

    constructor(fmt: number = 0, cid: number = 0) {
        this.buffer = Buffer.alloc(MAX_CHUNK_HEADER);
        this.state = RTMP_PARSE_INIT;
        this.bytes = 0;
        this.basicBytes = 0;
        this.packet = new RtmpPacket(fmt, cid);
        this.inPackets = new Map();

        this.inChunkSize = RTMP_CHUNK_SIZE;
        this.outChunkSize = RTMP_MAX_CHUNK_SIZE;
        this.ackSize = 0;
    }
}