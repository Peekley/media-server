export const N_CHUNK_STREAM = 8;
export const RTMP_VERSION = 3;
export const RTMP_HANDSHAKE_SIZE = 1536;
export const RTMP_HANDSHAKE_UNINIT = 0;
export const RTMP_HANDSHAKE_0 = 1;
export const RTMP_HANDSHAKE_1 = 2;
export const RTMP_HANDSHAKE_2 = 3;

export const RTMP_PARSE_INIT = 0;
export const RTMP_PARSE_BASIC_HEADER = 1;
export const RTMP_PARSE_MESSAGE_HEADER = 2;
export const RTMP_PARSE_EXTENDED_TIMESTAMP = 3;
export const RTMP_PARSE_PAYLOAD = 4;

export const MAX_CHUNK_HEADER = 18;

export const RTMP_CHUNK_TYPE_0 = 0; // 11-bytes: timestamp(3) + length(3) + stream type(1) + stream id(4)
export const RTMP_CHUNK_TYPE_1 = 1; // 7-bytes: delta(3) + length(3) + stream type(1)
export const RTMP_CHUNK_TYPE_2 = 2; // 3-bytes: delta(3)
export const RTMP_CHUNK_TYPE_3 = 3; // 0-byte

export const RTMP_CHANNEL_PROTOCOL = 2;
export const RTMP_CHANNEL_INVOKE = 3;
export const RTMP_CHANNEL_AUDIO = 4;
export const RTMP_CHANNEL_VIDEO = 5;
export const RTMP_CHANNEL_DATA = 6;

export const rtmpHeaderSize = [11, 7, 3, 0];

/* Protocol Control Messages */
export const RTMP_TYPE_SET_CHUNK_SIZE = 1;
export const RTMP_TYPE_ABORT = 2;
export const RTMP_TYPE_ACKNOWLEDGEMENT = 3; // bytes read report
export const RTMP_TYPE_WINDOW_ACKNOWLEDGEMENT_SIZE = 5; // server bandwidth
export const RTMP_TYPE_SET_PEER_BANDWIDTH = 6; // client bandwidth

/* User Control Messages Event (4) */
export const RTMP_TYPE_EVENT = 4;

export const RTMP_TYPE_AUDIO = 8;
export const RTMP_TYPE_VIDEO = 9;

/* Data Message */
export const RTMP_TYPE_FLEX_STREAM = 15; // AMF3
export const RTMP_TYPE_DATA = 18; // AMF0

/* Shared Object Message */
export const RTMP_TYPE_FLEX_OBJECT = 16; // AMF3
export const RTMP_TYPE_SHARED_OBJECT = 19; // AMF0

/* Command Message */
export const RTMP_TYPE_FLEX_MESSAGE = 17; // AMF3
export const RTMP_TYPE_INVOKE = 20; // AMF0

/* Aggregate Message */
export const RTMP_TYPE_METADATA = 22;

export const RTMP_CHUNK_SIZE = 128;
export const RTMP_MAX_CHUNK_SIZE = 0xffff;
export const RTMP_PING_TIME = 60000;
export const RTMP_PING_TIMEOUT = 30000;

export const STREAM_BEGIN = 0x00;
export const STREAM_EOF = 0x01;
export const STREAM_DRY = 0x02;
export const STREAM_EMPTY = 0x1f;
export const STREAM_READY = 0x20;

export const MESSAGE_FORMAT_0 = 0;
export const MESSAGE_FORMAT_1 = 1;
export const MESSAGE_FORMAT_2 = 2;

export const RTMP_SIG_SIZE = 1536;
export const SHA256DL = 32;

export const RandomCrud = Buffer.from([
    0xf0, 0xee, 0xc2, 0x4a, 0x80, 0x68, 0xbe, 0xe8,
    0x2e, 0x00, 0xd0, 0xd1, 0x02, 0x9e, 0x7e, 0x57,
    0x6e, 0xec, 0x5d, 0x2d, 0x29, 0x80, 0x6f, 0xab,
    0x93, 0xb8, 0xe6, 0x36, 0xcf, 0xeb, 0x31, 0xae
]);

export const GenuineFMSConst = "Genuine Adobe Flash Media Server 001";
export const GenuineFMSConstCrud = Buffer.concat([Buffer.from(GenuineFMSConst, "utf8"), RandomCrud]);

export const GenuineFPConst = "Genuine Adobe Flash Player 001";
export const GenuineFPConstCrud = Buffer.concat([Buffer.from(GenuineFPConst, "utf8"), RandomCrud]);