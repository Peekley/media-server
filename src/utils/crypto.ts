import { randomBytes, createHmac } from "node:crypto";
import {
    GenuineFMSConst, GenuineFMSConstCrud,
    GenuineFPConst,
    MESSAGE_FORMAT_0,
    MESSAGE_FORMAT_1,
    MESSAGE_FORMAT_2,
    RTMP_SIG_SIZE,
    SHA256DL
} from "../types";

export function calcHmac(data: Buffer, key: Buffer | string): Buffer<ArrayBufferLike>  {
    let hmac = createHmac("sha256", key);
    hmac.update(data);
    return hmac.digest();
}

export function GetClientGenuineConstDigestOffset(buf: Buffer): number {
    let offset = buf[0] + buf[1] + buf[2] + buf[3];
    offset = (offset % 728) + 12;
    return offset;
}

export function GetServerGenuineConstDigestOffset(buf: Buffer): number {
    let offset = buf[0] + buf[1] + buf[2] + buf[3];
    offset = (offset % 728) + 776;
    return offset;
}

export function detectClientMessageFormat(clientsig: Buffer): number {
    let computedSignature, msg, providedSignature, sdl;
    sdl = GetServerGenuineConstDigestOffset(clientsig.subarray(772, 776));
    msg = Buffer.concat([clientsig.subarray(0, sdl), clientsig.subarray(sdl + SHA256DL)], 1504);

    computedSignature = calcHmac(msg, GenuineFPConst);
    providedSignature = clientsig.subarray(sdl, sdl + SHA256DL);
    if (computedSignature.equals(providedSignature)) {
        return MESSAGE_FORMAT_2;
    }

    sdl = GetClientGenuineConstDigestOffset(clientsig.subarray(8, 12));
    msg = Buffer.concat([clientsig.subarray(0, sdl), clientsig.subarray(sdl + SHA256DL)], 1504);
    computedSignature = calcHmac(msg, GenuineFPConst);
    providedSignature = clientsig.subarray(sdl, sdl + SHA256DL);
    if (computedSignature.equals(providedSignature)) {
        return MESSAGE_FORMAT_1;
    }

    return MESSAGE_FORMAT_0;
}

export function generateS1(messageFormat: number)  {
    let bytes = randomBytes(RTMP_SIG_SIZE - 8);
    let handshakeBytes = Buffer.concat([Buffer.from([0, 0, 0, 0, 1, 2, 3, 4]), bytes], RTMP_SIG_SIZE);

    let serverDigestOffset;
    if (messageFormat === 1) {
        serverDigestOffset = GetClientGenuineConstDigestOffset(handshakeBytes.subarray(8, 12));
    } else {
        serverDigestOffset = GetServerGenuineConstDigestOffset(handshakeBytes.subarray(772, 776));
    }

    let msg = Buffer.concat([handshakeBytes.subarray(0, serverDigestOffset), handshakeBytes.subarray(serverDigestOffset + SHA256DL)], RTMP_SIG_SIZE - SHA256DL);
    let hash = calcHmac(msg, GenuineFMSConst);
    hash.copy(handshakeBytes, serverDigestOffset, 0, 32);

    return handshakeBytes;
}

export function generateS2(messageFormat: number, clientsig: Buffer) {
    let bytes = randomBytes(RTMP_SIG_SIZE - 32);
    let challengeKeyOffset;

    if (messageFormat === 1) {
        challengeKeyOffset = GetClientGenuineConstDigestOffset(clientsig.subarray(8, 12));
    } else {
        challengeKeyOffset = GetServerGenuineConstDigestOffset(clientsig.subarray(772, 776));
    }

    let challengeKey = clientsig.subarray(challengeKeyOffset, challengeKeyOffset + 32);
    let hash = calcHmac(challengeKey, GenuineFMSConstCrud);
    let signature = calcHmac(bytes, hash);
    let s2Bytes = Buffer.concat([bytes, signature], RTMP_SIG_SIZE);

    return s2Bytes;
}

export function generateS0S1S2(clientsig: Buffer) {
    let clientType = Buffer.alloc(1, 3);
    let messageFormat = detectClientMessageFormat(clientsig);
    let allBytes;

    if (messageFormat === MESSAGE_FORMAT_0) {
        //    logger.debug('[rtmp handshake] using simple handshake.');
        allBytes = Buffer.concat([clientType, clientsig, clientsig]);
    } else {
        //    logger.debug('[rtmp handshake] using complex handshake.');
        allBytes = Buffer.concat([clientType, generateS1(messageFormat), generateS2(messageFormat, clientsig)]);
    }

    return allBytes;
}