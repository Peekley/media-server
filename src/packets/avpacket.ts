export class AVPacket {
    codec_id: number = 0;
    codec_type: number = 0;
    duration: number = 0;
    flags: number = 0;
    pts: number = 0;
    dts: number = 0;
    size: number = 0;
    offset: number = 0;
    data: Buffer<ArrayBuffer> = Buffer.alloc(0);
}