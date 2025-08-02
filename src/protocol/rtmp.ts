import {
    MESSAGE_FORMAT_0,
    RTMP_CHANNEL_AUDIO,
    RTMP_CHANNEL_DATA, RTMP_CHANNEL_INVOKE,
    RTMP_CHANNEL_VIDEO,
    RTMP_CHUNK_TYPE_0,
    RTMP_CHUNK_TYPE_1,
    RTMP_CHUNK_TYPE_2,
    RTMP_CHUNK_TYPE_3,
    RTMP_HANDSHAKE_0,
    RTMP_HANDSHAKE_1,
    RTMP_HANDSHAKE_2,
    RTMP_HANDSHAKE_SIZE,
    RTMP_HANDSHAKE_UNINIT,
    RTMP_MAX_CHUNK_SIZE,
    RTMP_PARSE_BASIC_HEADER,
    RTMP_PARSE_EXTENDED_TIMESTAMP,
    RTMP_PARSE_INIT,
    RTMP_PARSE_MESSAGE_HEADER,
    RTMP_PARSE_PAYLOAD,
    RTMP_TYPE_ABORT,
    RTMP_TYPE_ACKNOWLEDGEMENT,
    RTMP_TYPE_AUDIO, RTMP_TYPE_DATA,
    RTMP_TYPE_EVENT,
    RTMP_TYPE_FLEX_MESSAGE,
    RTMP_TYPE_FLEX_STREAM,
    RTMP_TYPE_INVOKE,
    RTMP_TYPE_SET_CHUNK_SIZE,
    RTMP_TYPE_SET_PEER_BANDWIDTH,
    RTMP_TYPE_VIDEO,
    RTMP_TYPE_WINDOW_ACKNOWLEDGEMENT_SIZE,
    rtmpHeaderSize, STREAM_BEGIN
} from "../types";
import { Flv } from "./flv";
import { Logger } from "../core/logger";
import { AVPacket } from "../packets/avpacket";
import { generateS0S1S2 } from "../utils/crypto";
import {RtmpHeader, RtmpPacket} from "../packets/rtmppacket";
import { RtmpParser } from "./parsers/rtmp-parser";
import { parse as qsParse } from "querystring";
import {InvokeMessageEvent} from "../events/invoke-message";
import {ParsedUrlQuery} from "node:querystring";

export class Rtmp {
    handshake: {
        payload: Buffer;
        state: number;
        bytes: number;
    }

    parser: RtmpParser;
    streams: number;
    flv: Flv;
    logger: Logger;

    connectCmdObj?: object;
    streamId: number = 0;
    streamApp?: string;
    streamName?: string;
    streamHost?: string;
    streamQuery?: ParsedUrlQuery;
    objectEncoding?: number;
    connectTime?: Date;
    startTimestamp?: number;

    constructor(logger: Logger) {
        this.handshake = {
            payload: Buffer.alloc(RTMP_HANDSHAKE_SIZE),
            state: RTMP_HANDSHAKE_UNINIT,
            bytes: 0
        }

        // initialize parser
        this.parser = new RtmpParser();

        this.streams = 0;
        this.flv = new Flv(logger);
        this.logger = logger;
    }

    /**
     * @param {object} req
     * @abstract
     */
    onConnectCallback = (req: object) => {

    };

    /**
     * @abstract
     */
    onPlayCallback = () => {

    };

    /**
     * @abstract
     */
    onPushCallback = () => {

    };

    /**
     * @abstract
     * @param {AVPacket} avpacket
     */
    onPacketCallback = (avpacket: AVPacket) => {

    };

    /**
     * @abstract
     * @param {Buffer} buffer
     */
    onOutputCallback = (buffer: Buffer) => {

    };

    /**
     * @param {Buffer} buffer
     * @returns {string | null}
     */
    parserData = (buffer: Buffer) => {
        let bytes = buffer.length;
        let p = 0;
        let n = 0;
        while (bytes > 0) {
            switch (this.handshake.state) {
                case RTMP_HANDSHAKE_UNINIT:
                    // logger.log('RTMP_HANDSHAKE_UNINIT');
                    this.handshake.state = RTMP_HANDSHAKE_0;
                    this.handshake.bytes = 0;
                    bytes -= 1;
                    p += 1;
                    break;
                case RTMP_HANDSHAKE_0:
                    // logger.log('RTMP_HANDSHAKE_0');
                    n = RTMP_HANDSHAKE_SIZE - this.handshake.bytes;
                    n = n <= bytes ? n : bytes;
                    buffer.copy(this.handshake.payload, this.handshake.bytes, p, p + n);
                    this.handshake.bytes += n;
                    bytes -= n;
                    p += n;
                    if (this.handshake.bytes === RTMP_HANDSHAKE_SIZE) {
                        this.handshake.state = RTMP_HANDSHAKE_1;
                        this.handshake.bytes = 0;
                        let s0s1s2 = generateS0S1S2(this.handshake.payload);
                        this.onOutputCallback(s0s1s2);
                    }
                    break;
                case RTMP_HANDSHAKE_1:
                    // logger.log('RTMP_HANDSHAKE_1');
                    n = RTMP_HANDSHAKE_SIZE - this.handshake.bytes;
                    n = n <= bytes ? n : bytes;
                    buffer.copy(this.handshake.payload, this.handshake.bytes, p, n);
                    this.handshake.bytes += n;
                    bytes -= n;
                    p += n;
                    if (this.handshake.bytes === RTMP_HANDSHAKE_SIZE) {
                        this.handshake.state = RTMP_HANDSHAKE_2;
                        this.handshake.bytes = 0;
                    }
                    break;
                case RTMP_HANDSHAKE_2:
                default:
                    return this.chunkRead(buffer, p, bytes);
            }
        }
        return null;
    };

    /**
     * @param {AVPacket} avpacket
     * @returns {Buffer}
     */
    static createMessage = (avpacket: AVPacket) => {
        let rtmpPacket = new RtmpPacket();
        rtmpPacket.header.fmt = MESSAGE_FORMAT_0;
        switch (avpacket.codec_type) {
            case 8:
                rtmpPacket.header.cid = RTMP_CHANNEL_AUDIO;
                break;
            case 9:
                rtmpPacket.header.cid = RTMP_CHANNEL_VIDEO;
                break;
            case 18:
                rtmpPacket.header.cid = RTMP_CHANNEL_DATA;
                break;
        }
        rtmpPacket.header.length = avpacket.size;
        rtmpPacket.header.type = avpacket.codec_type;
        rtmpPacket.header.timestamp = avpacket.dts;
        rtmpPacket.clock = avpacket.dts;
        rtmpPacket.payload = avpacket.data;
        return Rtmp.chunksCreate(rtmpPacket);
    };

    static chunkBasicHeaderCreate = (fmt: number, cid: number) => {
        let out;

        if (cid >= 64 + 255) {
            out = Buffer.alloc(3);
            out[0] = (fmt << 6) | 1;
            out[1] = (cid - 64) & 0xff;
            out[2] = ((cid - 64) >> 8) & 0xff;
        } else if (cid >= 64) {
            out = Buffer.alloc(2);
            out[0] = (fmt << 6) | 0;
            out[1] = (cid - 64) & 0xff;
        } else {
            out = Buffer.alloc(1);
            out[0] = (fmt << 6) | cid;
        }

        return out;
    };

    static chunkMessageHeaderCreate = (header: RtmpHeader) => {
        let out = Buffer.alloc(rtmpHeaderSize[header.fmt % 4]);
        if (header.fmt <= RTMP_CHUNK_TYPE_2) {
            out.writeUIntBE(header.timestamp >= 0xffffff ? 0xffffff : header.timestamp, 0, 3);
        }

        if (header.fmt <= RTMP_CHUNK_TYPE_1) {
            out.writeUIntBE(header.length, 3, 3);
            out.writeUInt8(header.type, 6);
        }

        if (header.fmt === RTMP_CHUNK_TYPE_0) {
            out.writeUInt32LE(header.stream_id, 7);
        }
        return out;
    };

    /**
     *
     * @param {RtmpPacket} packet
     * @returns {Buffer}
     */
    static chunksCreate = (packet: RtmpPacket) => {
        let header = packet.header;
        let payload = packet.payload;
        let payloadSize = header.length;
        let chunkSize = RTMP_MAX_CHUNK_SIZE;
        let chunksOffset = 0;
        let payloadOffset = 0;
        let chunkBasicHeader = Rtmp.chunkBasicHeaderCreate(header.fmt, header.cid);
        let chunkBasicHeader3 = Rtmp.chunkBasicHeaderCreate(RTMP_CHUNK_TYPE_3, header.cid);
        let chunkMessageHeader = Rtmp.chunkMessageHeaderCreate(header);
        let useExtendedTimestamp = header.timestamp >= 0xffffff;
        let headerSize = chunkBasicHeader.length + chunkMessageHeader.length + (useExtendedTimestamp ? 4 : 0);
        let n = headerSize + payloadSize + Math.floor(payloadSize / chunkSize);

        if (useExtendedTimestamp) {
            n += Math.floor(payloadSize / chunkSize) * 4;
        }

        if (!(payloadSize % chunkSize)) {
            n -= 1;

            if (useExtendedTimestamp) {
                //TODO CHECK
                n -= 4;
            }
        }

        let chunks = Buffer.alloc(n);
        chunkBasicHeader.copy(chunks, chunksOffset);
        chunksOffset += chunkBasicHeader.length;
        chunkMessageHeader.copy(chunks, chunksOffset);
        chunksOffset += chunkMessageHeader.length;

        if (useExtendedTimestamp) {
            chunks.writeUInt32BE(header.timestamp, chunksOffset);
            chunksOffset += 4;
        }

        while (payloadSize > 0) {
            if (payloadSize > chunkSize) {
                payload.copy(chunks, chunksOffset, payloadOffset, payloadOffset + chunkSize);
                payloadSize -= chunkSize;
                chunksOffset += chunkSize;
                payloadOffset += chunkSize;
                chunkBasicHeader3.copy(chunks, chunksOffset);
                chunksOffset += chunkBasicHeader3.length;
                if (useExtendedTimestamp) {
                    chunks.writeUInt32BE(header.timestamp, chunksOffset);
                    chunksOffset += 4;
                }
            } else {
                payload.copy(chunks, chunksOffset, payloadOffset, payloadOffset + payloadSize);
                payloadSize -= payloadSize;
                chunksOffset += payloadSize;
                payloadOffset += payloadSize;
            }
        }
        return chunks;
    };

    /**
     *
     * @param {Buffer} data
     * @param {number} p
     * @param {number} bytes
     * @returns {string | null}
     */
    chunkRead = (data: Buffer, p: number, bytes: number): string|null => {
        let size = 0;
        let offset = 0;
        let extended_timestamp = 0;

        while (offset < bytes) {
            switch (this.parser.state) {
                case RTMP_PARSE_INIT:
                    this.parser.bytes = 1;
                    this.parser.buffer[0] = data[p + offset++];
                    if (0 === (this.parser.buffer[0] & 0x3f)) {
                        this.parser.basicBytes = 2;
                    } else if (1 === (this.parser.buffer[0] & 0x3f)) {
                        this.parser.basicBytes = 3;
                    } else {
                        this.parser.basicBytes = 1;
                    }
                    this.parser.state = RTMP_PARSE_BASIC_HEADER;
                    break;
                case RTMP_PARSE_BASIC_HEADER:
                    while (this.parser.bytes < this.parser.basicBytes && offset < bytes) {
                        this.parser.buffer[this.parser.bytes++] = data[p + offset++];
                    }
                    if (this.parser.bytes >= this.parser.basicBytes) {
                        this.parser.state = RTMP_PARSE_MESSAGE_HEADER;
                    }
                    break;
                case RTMP_PARSE_MESSAGE_HEADER:
                    size = rtmpHeaderSize[this.parser.buffer[0] >> 6] + this.parser.basicBytes;
                    while (this.parser.bytes < size && offset < bytes) {
                        this.parser.buffer[this.parser.bytes++] = data[p + offset++];
                    }
                    if (this.parser.bytes >= size) {
                        this.packetParse();
                        this.parser.state = RTMP_PARSE_EXTENDED_TIMESTAMP;
                    }
                    break;
                case RTMP_PARSE_EXTENDED_TIMESTAMP:
                    size = rtmpHeaderSize[this.parser.packet.header.fmt] + this.parser.basicBytes;
                    if (this.parser.packet.header.timestamp === 0xffffff) {
                        size += 4;
                    }
                    while (this.parser.bytes < size && offset < bytes) {
                        this.parser.buffer[this.parser.bytes++] = data[p + offset++];
                    }
                    if (this.parser.bytes >= size) {
                        if (this.parser.packet.header.timestamp === 0xffffff) {
                            extended_timestamp = this.parser.buffer.readUInt32BE(rtmpHeaderSize[this.parser.packet.header.fmt] + this.parser.basicBytes);
                        } else {
                            extended_timestamp = this.parser.packet.header.timestamp;
                        }

                        if (this.parser.packet.bytes === 0) {
                            if (RTMP_CHUNK_TYPE_0 === this.parser.packet.header.fmt) {
                                this.parser.packet.clock = extended_timestamp;
                            } else {
                                this.parser.packet.clock += extended_timestamp;
                            }
                            this.packetAlloc();
                        }
                        this.parser.state = RTMP_PARSE_PAYLOAD;
                    }
                    break;
                case RTMP_PARSE_PAYLOAD:
                    size = Math.min(this.parser.inChunkSize - (this.parser.packet.bytes % this.parser.inChunkSize), this.parser.packet.header.length - this.parser.packet.bytes);
                    size = Math.min(size, bytes - offset);
                    if (size > 0) {
                        data.copy(this.parser.packet.payload, this.parser.packet.bytes, p + offset, p + offset + size);
                    }
                    this.parser.packet.bytes += size;
                    offset += size;

                    if (this.parser.packet.bytes >= this.parser.packet.header.length) {
                        this.parser.state = RTMP_PARSE_INIT;
                        this.parser.packet.bytes = 0;
                        if (this.parser.packet.clock > 0xffffffff) {
                            break;
                        }
                        this.packetHandler();
                    } else if (0 === this.parser.packet.bytes % this.parser.inChunkSize) {
                        this.parser.state = RTMP_PARSE_INIT;
                    }
                    break;
            }
        }
        return null;
    };


    packetParse = () => {
        let fmt = this.parser.buffer[0] >> 6;
        let cid = 0;
        if (this.parser.basicBytes === 2) {
            cid = 64 + this.parser.buffer[1];
        } else if (this.parser.basicBytes === 3) {
            cid = (64 + this.parser.buffer[1] + this.parser.buffer[2]) << 8;
        } else {
            cid = this.parser.buffer[0] & 0x3f;
        }
        this.parser.packet = this.parser.inPackets.get(cid) ?? new RtmpPacket(fmt, cid);
        this.parser.inPackets.set(cid, this.parser.packet);
        this.parser.packet.header.fmt = fmt;
        this.parser.packet.header.cid = cid;
        this.chunkMessageHeaderRead();
    };

    chunkMessageHeaderRead = () => {
        let offset = this.parser.basicBytes;

        // timestamp / delta
        if (this.parser.packet.header.fmt <= RTMP_CHUNK_TYPE_2) {
            this.parser.packet.header.timestamp = this.parser.buffer.readUIntBE(offset, 3);
            offset += 3;
        }

        // message length + type
        if (this.parser.packet.header.fmt <= RTMP_CHUNK_TYPE_1) {
            this.parser.packet.header.length = this.parser.buffer.readUIntBE(offset, 3);
            this.parser.packet.header.type = this.parser.buffer[offset + 3];
            offset += 4;
        }

        if (this.parser.packet.header.fmt === RTMP_CHUNK_TYPE_0) {
            this.parser.packet.header.stream_id = this.parser.buffer.readUInt32LE(offset);
            offset += 4;
        }
        return offset;
    };

    packetAlloc = () => {
        if (this.parser.packet.capacity < this.parser.packet.header.length) {
            this.parser.packet.payload = Buffer.alloc(this.parser.packet.header.length + 1024);
            this.parser.packet.capacity = this.parser.packet.header.length + 1024;
        }
    };

    packetHandler = () => {
        switch (this.parser.packet.header.type) {
            case RTMP_TYPE_SET_CHUNK_SIZE:
            case RTMP_TYPE_ABORT:
            case RTMP_TYPE_ACKNOWLEDGEMENT:
            case RTMP_TYPE_WINDOW_ACKNOWLEDGEMENT_SIZE:
            case RTMP_TYPE_SET_PEER_BANDWIDTH:
                return this.controlHandler();
            case RTMP_TYPE_EVENT:
                return this.eventHandler();
            case RTMP_TYPE_FLEX_MESSAGE:
            case RTMP_TYPE_INVOKE:
                return this.invokeHandler();
            case RTMP_TYPE_AUDIO:
            case RTMP_TYPE_VIDEO:
            case RTMP_TYPE_FLEX_STREAM: // AMF3
            case RTMP_TYPE_DATA: // AMF0
                return this.dataHandler();
        }
    };

    controlHandler = () => {
        let payload = this.parser.packet.payload;
        switch (this.parser.packet.header.type) {
            case RTMP_TYPE_SET_CHUNK_SIZE:
                this.parser.inChunkSize = payload.readUInt32BE();
                // logger.debug('set parser.inChunkSize', this.parser.inChunkSize);
                break;
            case RTMP_TYPE_ABORT:
                break;
            case RTMP_TYPE_ACKNOWLEDGEMENT:
                break;
            case RTMP_TYPE_WINDOW_ACKNOWLEDGEMENT_SIZE:
                this.parser.ackSize = payload.readUInt32BE();
                // logger.debug('set ack Size', this.parser.ackSize);
                break;
            case RTMP_TYPE_SET_PEER_BANDWIDTH:
                break;
        }
    };

    eventHandler = () => {

    };

    invokeHandler() {
        let offset = this.parser.packet.header.type === RTMP_TYPE_FLEX_MESSAGE ? 1 : 0;
        let payload = this.parser.packet.payload.subarray(offset, this.parser.packet.header.length);

        let invokeMessage = AMF.decodeAmf0Cmd(payload);
        switch (invokeMessage.cmd) {
            case "connect":
                this.onConnect(invokeMessage);
                break;
            case "createStream":
                this.onCreateStream(invokeMessage);
                break;
            case "publish":
                this.onPublish(invokeMessage);
                break;
            case "play":
                this.onPlay(invokeMessage);
                break;
            case "deleteStream":
                this.onDeleteStream(invokeMessage);
                break;
            default:
                this.logger.trace(`unhandle invoke message ${invokeMessage.cmd}`);
                break;
        }
    }

    dataHandler = () => {
        let parcket = Flv.parserTag(this.parser.packet.header.type, this.parser.packet.clock, this.parser.packet.header.length, this.parser.packet.payload);
        this.onPacketCallback(parcket);
    };

    onConnect = (invokeMessage: InvokeMessageEvent) => {
        const url = new URL(invokeMessage.cmdObj.tcUrl);
        this.connectCmdObj = invokeMessage.cmdObj;
        this.streamApp = invokeMessage.cmdObj.app;
        this.streamHost = url.hostname;
        this.objectEncoding = invokeMessage.cmdObj.objectEncoding != null ? invokeMessage.cmdObj.objectEncoding : 0;
        this.connectTime = new Date();
        this.startTimestamp = Date.now();
        this.sendWindowACK(5000000);
        this.setPeerBandwidth(5000000, 2);
        this.setChunkSize(this.parser.outChunkSize);
        this.respondConnect(invokeMessage.transId);
    };

    onCreateStream = (invokeMessage: InvokeMessageEvent) => {
        this.respondCreateStream(invokeMessage.transId);
    };

    onPublish = (invokeMessage: InvokeMessageEvent) => {
        this.streamName = invokeMessage.streamName.split("?")[0];
        this.streamQuery = qsParse(invokeMessage.streamName.split("?")[1]);
        this.streamId = this.parser.packet.header.stream_id;
        this.respondPublish();
        this.onConnectCallback({
            app: this.streamApp,
            name: this.streamName,
            host: this.streamHost,
            query: this.streamQuery
        });
        this.onPushCallback();
    };

    onPlay = (invokeMessage: InvokeMessageEvent) => {
        this.streamName = invokeMessage.streamName.split("?")[0];
        this.streamQuery = qsParse(invokeMessage.streamName.split("?")[1]);
        this.streamId = this.parser.packet.header.stream_id;
        this.respondPlay();
        this.onConnectCallback({
            app: this.streamApp,
            name: this.streamName,
            host: this.streamHost,
            query:this.streamQuery
        });
        this.onPlayCallback();
    };

    onDeleteStream = (invokeMessage: InvokeMessageEvent) => {

    };

    sendACK = (size: number) => {
        let rtmpBuffer = Buffer.from("02000000000004030000000000000000", "hex");
        rtmpBuffer.writeUInt32BE(size, 12);
        this.onOutputCallback(rtmpBuffer);
    };

    sendWindowACK = (size: number) => {
        let rtmpBuffer = Buffer.from("02000000000004050000000000000000", "hex");
        rtmpBuffer.writeUInt32BE(size, 12);
        this.onOutputCallback(rtmpBuffer);
    };

    setPeerBandwidth = (size, type) => {
        let rtmpBuffer = Buffer.from("0200000000000506000000000000000000", "hex");
        rtmpBuffer.writeUInt32BE(size, 12);
        rtmpBuffer[16] = type;
        this.onOutputCallback(rtmpBuffer);
    };

    setChunkSize = (size) => {
        let rtmpBuffer = Buffer.from("02000000000004010000000000000000", "hex");
        rtmpBuffer.writeUInt32BE(size, 12);
        this.onOutputCallback(rtmpBuffer);
    };

    sendStreamStatus = (st, id) => {
        let rtmpBuffer = Buffer.from("020000000000060400000000000000000000", "hex");
        rtmpBuffer.writeUInt16BE(st, 12);
        rtmpBuffer.writeUInt32BE(id, 14);
        this.onOutputCallback(rtmpBuffer);
    };

    sendInvokeMessage = (sid, opt) => {
        let packet = new RtmpPacket();
        packet.header.fmt = RTMP_CHUNK_TYPE_0;
        packet.header.cid = RTMP_CHANNEL_INVOKE;
        packet.header.type = RTMP_TYPE_INVOKE;
        packet.header.stream_id = sid;
        packet.payload = AMF.encodeAmf0Cmd(opt);
        packet.header.length = packet.payload.length;
        let chunks = Rtmp.chunksCreate(packet);
        this.onOutputCallback(chunks);
    };

    sendDataMessage(opt, sid) {
        let packet = new RtmpPacket();
        packet.header.fmt = RTMP_CHUNK_TYPE_0;
        packet.header.cid = RTMP_CHANNEL_DATA;
        packet.header.type = RTMP_TYPE_DATA;
        packet.payload = AMF.encodeAmf0Data(opt);
        packet.header.length = packet.payload.length;
        packet.header.stream_id = sid;
        let chunks = Rtmp.chunksCreate(packet);
        this.onOutputCallback(chunks);
    }

    sendStatusMessage(sid, level, code, description) {
        let opt = {
            cmd: "onStatus",
            transId: 0,
            cmdObj: null,
            info: {
                level: level,
                code: code,
                description: description
            }
        };
        this.sendInvokeMessage(sid, opt);
    }

    sendRtmpSampleAccess(sid) {
        let opt = {
            cmd: "|RtmpSampleAccess",
            bool1: false,
            bool2: false
        };
        this.sendDataMessage(opt, sid);
    }

    respondConnect(tid) {
        let opt = {
            cmd: "_result",
            transId: tid,
            cmdObj: {
                fmsVer: "FMS/3,0,1,123",
                capabilities: 31
            },
            info: {
                level: "status",
                code: "NetConnection.Connect.Success",
                description: "Connection succeeded.",
                objectEncoding: this.objectEncoding
            }
        };
        this.sendInvokeMessage(0, opt);
    }

    respondCreateStream(tid) {
        this.streams++;
        let opt = {
            cmd: "_result",
            transId: tid,
            cmdObj: null,
            info: this.streams
        };
        this.sendInvokeMessage(0, opt);
    }

    respondPublish() {
        this.sendStatusMessage(this.streamId, "status", "NetStream.Publish.Start", `/${this.streamApp}/${this.streamName} is now published.`);
    }

    respondPlay() {
        this.sendStreamStatus(STREAM_BEGIN, this.streamId);
        this.sendStatusMessage(this.streamId, "status", "NetStream.Play.Reset", "Playing and resetting stream.");
        this.sendStatusMessage(this.streamId, "status", "NetStream.Play.Start", "Started playing stream.");
        this.sendRtmpSampleAccess();
    }
}