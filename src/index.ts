import { EventEmitter } from "node:events";

class MediaServer extends EventEmitter {
    sessions: Map<string, BaseSession>;
    broadcasts: Map<string, BroadcastServer>;

    constructor() {
        this.sessions = new Map();
        this.broadcasts = new Map();
    }
}