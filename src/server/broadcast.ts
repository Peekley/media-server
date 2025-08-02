import Flv from "../protocol/flv";
import { BaseSession } from "../session/base-session";

export class BroadcastServer {

    publisher: BaseSession|null = null;
    subscribers: Map<string, BaseSession> = new Map();

    flvHeader: Buffer = Flv.createHeader(true, true);
    flvMetaData: Buffer|null = null;
    flvAudioHeader: Buffer|null = null;
    flvVideoHeader: Buffer|null = null;
    rtmpMetaData: Buffer|null = null;
    rtmpAudioHeader: Buffer|null = null;
    rtmpVideoHeader: Buffer|null = null;
    flvGopCache: Set<Buffer>|null = null;
    rtmpGopCache: Set<Buffer>|null = null;
}