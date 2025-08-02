export const FLV_MEDIA_TYPE_AUDIO = 8;
export const FLV_MEDIA_TYPE_VIDEO = 9;
export const FLV_MEDIA_TYPE_SCRIPT = 18;

export const FLV_PARSE_INIT = 0;
export const FLV_PARSE_HEAD = 1;
export const FLV_PARSE_TAGS = 2;
export const FLV_PARSE_PREV = 3;

export const FLV_FRAME_KEY = 1; ///< key frame (for AVC, a seekable frame)
export const FLV_FRAME_INTER = 2; ///< inter frame (for AVC, a non-seekable frame)
export const FLV_FRAME_DISP_INTER = 3; ///< disposable inter frame (H.263 only)
export const FLV_FRAME_GENERATED_KEY = 4; ///< generated key frame (reserved for server use only)
export const FLV_FRAME_VIDEO_INFO_CMD = 5; ///< video info/command frame

export const FLV_AVC_SEQUENCE_HEADER = 0;
export const FLV_AVC_NALU = 1;
export const FLV_AVC_END_OF_SEQUENCE = 2;

export const FLV_CODECID_PCM = 0;
export const FLV_CODECID_ADPCM = 1;
export const FLV_CODECID_MP3 = 2;
export const FLV_CODECID_PCM_LE = 3;
export const FLV_CODECID_NELLYMOSER_16KHZ_MONO = 4;
export const FLV_CODECID_NELLYMOSER_8KHZ_MONO = 5;
export const FLV_CODECID_NELLYMOSER = 6;
export const FLV_CODECID_PCM_ALAW = 7;
export const FLV_CODECID_PCM_MULAW = 8;
export const FLV_CODECID_AAC = 10;
export const FLV_CODECID_SPEEX = 11;

export const FLV_CODECID_H263 = 2;
export const FLV_CODECID_SCREEN = 3;
export const FLV_CODECID_VP6 = 4;
export const FLV_CODECID_VP6A = 5;
export const FLV_CODECID_SCREEN2 = 6;
export const FLV_CODECID_H264 = 7;
export const FLV_CODECID_REALH263 = 8;
export const FLV_CODECID_MPEG4 = 9;

export const FOURCC_AV1 = Buffer.from("av01");
export const FOURCC_VP9 = Buffer.from("vp09");
export const FOURCC_HEVC = Buffer.from("hvc1");

export enum FlvPacketType {
    SequenceStart = 0,
    CodedFrames = 1,
    SequenceEnd = 2,
    CodedFramesX = 3,
    Metadata = 4,
    MPEG2TSSequenceStart = 5
}

export interface FlvTag {
    bytes: number;
    type: number;
    size: number;
    time: number;
    capacity: number;
    data: Buffer<ArrayBuffer>;
}

export interface FlvPacket {
    buffer: Buffer<ArrayBuffer>;
    state: number;
    headerBytes: number;
    previousBytes: number;
}