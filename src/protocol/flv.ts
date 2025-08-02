import {
    FlvPacketType,
    FLV_PARSE_INIT,
    FLV_PARSE_HEAD,
    FLV_PARSE_TAGS,
    FLV_PARSE_PREV,
    FLV_MEDIA_TYPE_AUDIO,
    FLV_CODECID_AAC,
    FLV_MEDIA_TYPE_VIDEO,
    FOURCC_AV1,
    FOURCC_VP9,
    FOURCC_HEVC,
    FLV_FRAME_KEY,
    FLV_CODECID_H264, FLV_AVC_SEQUENCE_HEADER, FLV_MEDIA_TYPE_SCRIPT
} from "../types";
import { AVPacket } from "../core/avpacket";
import { FlvParser } from "./parsers/flv-parser";
import {Logger} from "../core/logger";

export class Flv {
    parser: FlvParser;
    logger: Logger;

    constructor(logger: Logger) {
        this.parser = new FlvParser();
        this.logger = logger;
    }

    /**
     * @abstract
     * @param {AVPacket} avpacket
     */
    onPacketCallback = (avpacket: AVPacket) => {

    };

    parserData = (buffer: Buffer): string|null => {
        let s = buffer.length;
        let n = 0;
        let p = 0;
        while (s > 0) {
            switch (this.parser.packet.state) {
                case FLV_PARSE_INIT:
                    n = 13 - this.parser.packet.headerBytes;
                    n = n <= s ? n : s;
                    buffer.copy(this.parser.packet.buffer, this.parser.packet.headerBytes, p, p + n);
                    this.parser.packet.headerBytes += n;
                    s -= n;
                    p += n;
                    if (this.parser.packet.headerBytes === 13) {
                        this.parser.packet.state = FLV_PARSE_HEAD;
                        this.parser.packet.headerBytes = 0;
                    }
                    break;
                case FLV_PARSE_HEAD:
                    n = 11 - this.parser.packet.headerBytes;
                    n = n <= s ? n : s;
                    buffer.copy(this.parser.packet.buffer, this.parser.packet.headerBytes, p, p + n);
                    this.parser.packet.headerBytes += n;
                    s -= n;
                    p += n;
                    if (this.parser.packet.headerBytes === 11) {
                        this.parser.packet.state = FLV_PARSE_TAGS;
                        this.parser.packet.headerBytes = 0;
                        this.parser.tag.type = this.parser.packet.buffer[0];
                        this.parser.tag.size = this.parser.packet.buffer.readUintBE(1, 3);
                        this.parser.tag.time = (this.parser.packet.buffer[4] << 16) | (this.parser.packet.buffer[5] << 8) | this.parser.packet.buffer[6] | (this.parser.packet.buffer[7] << 24);
                        logger.trace(`parser tag type=${this.parser.tag.type} time=${this.parser.tag.time} size=${this.parser.tag.size} `);
                    }
                    break;
                case FLV_PARSE_TAGS:
                    this.parserTagAlloc(this.parser.tag.size);
                    n = this.parser.tag.size - this.parser.tag.bytes;
                    n = n <= s ? n : s;
                    buffer.copy(this.parser.tag.data, this.parser.tag.bytes, p, p + n);
                    this.parser.tag.bytes += n;
                    s -= n;
                    p += n;
                    if (this.parser.tag.bytes === this.parser.tag.size) {
                        this.parser.packet.state = FLV_PARSE_PREV;
                        this.parser.tag.bytes = 0;
                    }
                    break;
                case FLV_PARSE_PREV:
                    n = 4 - this.parser.packet.previousBytes;
                    n = n <= s ? n : s;
                    buffer.copy(this.parser.packet.buffer, this.parser.packet.previousBytes, p, p + n);
                    this.parser.packet.previousBytes += n;
                    s -= n;
                    p += n;
                    if (this.parser.packet.previousBytes === 4) {
                        this.parser.packet.state = FLV_PARSE_HEAD;
                        this.parser.packet.previousBytes = 0;
                        const parserPreviousNSize = this.parser.packet.buffer.readUint32BE();
                        if (parserPreviousNSize === this.parser.tag.size + 11) {
                            let packet = Flv.parserTag(this.parser.tag.type, this.parser.tag.time, this.parser.tag.size, this.parser.tag.data);
                            this.onPacketCallback(packet);
                        } else {
                            return "flv tag parser error";
                        }
                    }
                    break;
            }
        }
        return null;
    };

    /**
     * @param {number} size
     */
    parserTagAlloc = (size: number) => {
        if (this.parser.tag.capacity < size) {
            this.parser.tag.capacity = size * 2;
            const newBuffer = Buffer.alloc(this.parser.tag.capacity);
            this.parser.tag.data.copy(newBuffer);
            this.parser.tag.data = newBuffer;
        }
    };

    /**
     * @param {boolean} hasAudio
     * @param {boolean} hasVideo
     * @returns {Buffer}
     */
    static createHeader = (hasAudio: boolean, hasVideo: boolean): Buffer => {
        const buffer = Buffer.from([0x46, 0x4c, 0x56, 0x01, 0x00, 0x00, 0x00, 0x00, 0x09, 0x00, 0x00, 0x00, 0x00]);

        if (hasAudio) {
            buffer[4] |= 4;
        }

        if (hasVideo) {
            buffer[4] |= 1;
        }

        return buffer;
    };

    /**
     * @param {AVPacket} avpacket
     * @returns {Buffer}
     */
    static createMessage = (avpacket: AVPacket): Buffer => {
        const buffer = Buffer.alloc(11 + avpacket.size + 4);
        buffer[0] = avpacket.codec_type;
        buffer.writeUintBE(avpacket.size, 1, 3);
        buffer[4] = (avpacket.dts >> 16) & 0xFF;
        buffer[5] = (avpacket.dts >> 8) & 0xFF;
        buffer[6] = avpacket.dts & 0xFF;
        buffer[7] = (avpacket.dts >> 24) & 0xFF;
        avpacket.data.copy(buffer, 11, 0, avpacket.size);
        buffer.writeUint32BE(11 + avpacket.size, 11 + avpacket.size);
        return buffer;
    };

    /**
     * @param {number} type
     * @param {number} time
     * @param {number} size
     * @param {Buffer} data
     * @returns {AVPacket}
     */
    static parserTag = (type: number, time: number, size: number, data: Buffer<ArrayBuffer>): AVPacket => {
        // create our AVPacket
        let packet = new AVPacket();
        packet.codec_type = type;
        packet.pts = time;
        packet.dts = time;
        packet.size = size;
        packet.data = data;

        // do we have audio?
        if (type === FLV_MEDIA_TYPE_AUDIO) {
            const codecID = data[0] >> 4;
            packet.codec_id = codecID;
            packet.flags = 1;
            if (codecID === FLV_CODECID_AAC) {
                if (data[1] === 0) {
                    packet.flags = 0;
                }
            }
        } else if (type === FLV_MEDIA_TYPE_VIDEO) {
            const frameType = data[0] >> 4 & 0b0111;
            const codecID = data[0] & 0x0f;
            const isExHeader = (data[0] >> 4 & 0b1000) !== 0;

            if (isExHeader) {
                const packetType = data[0] & 0x0f;
                const fourCC = data.subarray(1, 5);
                if (fourCC.compare(FOURCC_AV1) === 0 || fourCC.compare(FOURCC_VP9) === 0 || fourCC.compare(FOURCC_HEVC) === 0) {
                    packet.codec_id = fourCC.readUint32BE();
                    if (packetType === FlvPacketType.SequenceStart) {
                        packet.flags = 2;
                    } else if (packetType === FlvPacketType.CodedFrames || packetType === FlvPacketType.CodedFramesX) {
                        if (frameType === FLV_FRAME_KEY) {
                            packet.flags = 3;
                        } else {
                            packet.flags = 4;
                        }
                    } else if (packetType === FlvPacketType.Metadata) {
                        packet.flags = 5;
                        // const hdrMetadata = AMF.parseScriptData(packet.data.buffer, 5, packet.size);
                        // logger.debug(`hdrMetadata:${JSON.stringify(hdrMetadata)}`);
                        packet.flags = 6;
                    }

                    if (fourCC.compare(FOURCC_HEVC) === 0) {
                        if (packetType === FlvPacketType.CodedFrames) {
                            const cts = data.readUintBE(5, 3);
                            packet.pts = packet.dts + cts;
                        }
                    }
                }
            } else {
                const cts = data.readUintBE(2, 3);
                const packetType = data[1];
                packet.codec_id = codecID;
                packet.pts = packet.dts + cts;
                packet.flags = 4;

                if (codecID === FLV_CODECID_H264) {
                    if (packetType === FLV_AVC_SEQUENCE_HEADER) {
                        packet.flags = 2;
                    } else {
                        if (frameType === FLV_FRAME_KEY) {
                            packet.flags = 3;
                        } else {
                            packet.flags = 4;
                        }
                    }
                }
            }
        } else if (type === FLV_MEDIA_TYPE_SCRIPT) {
            packet.flags = 5;
        }
        return packet;
    };
}