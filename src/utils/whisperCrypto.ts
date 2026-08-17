import { hash, num } from "starknet";

export interface EncryptedWhisperPayload {
  channelId: string;
  ephemeralPubkey: string;
  nonce: string;
  c0: string;
  c1: string;
  c2: string;
  c3: string;
  extraFelts?: string[];
}

export interface DecryptedWhisperMessage {
  id: string;
  channelId: string;
  sender: string;
  text: string;
  timestamp: number;
  hasPayment: boolean;
  paymentAmount?: string;
  isSelf: boolean;
}

/**
 * Derives a unique deterministic channel ID between two Starknet addresses or public keys.
 * Sorts them lexicographically so channelId(A, B) === channelId(B, A).
 */
export function deriveChannelId(partyA: string, partyB: string): string {
  try {
    const a = num.toBigInt(partyA);
    const b = num.toBigInt(partyB);
    const min = a < b ? a : b;
    const max = a < b ? b : a;
    return hash.computeHashOnElements([min.toString(), max.toString()]);
  } catch {
    return hash.computeHashOnElements([partyA, partyB]);
  }
}

/**
 * Encrypts UTF-8 text into an arbitrary-length array of Cairo felts (c0..cN).
 * Allows sending documents or long notes of unbounded size.
 */
export function encryptTextToMultiFelts(
  text: string,
  ephemeralSecret: bigint = BigInt(Math.floor(Math.random() * 1e12))
): {
  nonce: string;
  ephemeralPubkey: string;
  felts: string[];
} {
  const nonce = num.toHex(BigInt(Date.now()));
  const ephemeralPubkey = num.toHex(hash.computeHashOnElements([ephemeralSecret.toString(), nonce]));

  const encoder = new TextEncoder();
  const bytes = Array.from(encoder.encode(text));
  const chunkSize = 30; // 30 bytes per 252-bit Cairo felt
  const chunkCount = Math.max(1, Math.ceil(bytes.length / chunkSize));
  const rawChunks: bigint[] = new Array(chunkCount).fill(0n);

  for (let i = 0; i < bytes.length; i++) {
    const chunkIdx = Math.floor(i / chunkSize);
    rawChunks[chunkIdx] = (rawChunks[chunkIdx] << 8n) | BigInt(bytes[i]);
  }

  const felts = rawChunks.map((chunk, idx) => {
    const key = num.toBigInt(hash.computeHashOnElements([ephemeralSecret.toString(), idx.toString()]));
    const masked = chunk ^ key;
    return num.toHex(masked);
  });

  return {
    nonce,
    ephemeralPubkey,
    felts,
  };
}

/**
 * Decrypts an arbitrary-length array of Cairo felts back into a UTF-8 string.
 */
export function decryptMultiFeltsToText(
  felts: string[],
  ephemeralSecret: bigint
): string {
  try {
    const bytes: number[] = [];

    felts.forEach((cHex, idx) => {
      const key = num.toBigInt(hash.computeHashOnElements([ephemeralSecret.toString(), idx.toString()]));
      const masked = num.toBigInt(cHex);
      const unmasked = masked ^ key;

      if (unmasked === 0n) return;

      let temp = unmasked;
      const chunkBytes: number[] = [];
      while (temp > 0n) {
        chunkBytes.unshift(Number(temp & 0xffn));
        temp >>= 8n;
      }
      bytes.push(...chunkBytes);
    });

    const decoder = new TextDecoder();
    return decoder.decode(new Uint8Array(bytes));
  } catch {
    return "[Decryption Failed]";
  }
}

/**
 * Standard 4-felt stream cipher (backward-compatible).
 */
export function encryptTextToFelts(
  text: string,
  ephemeralSecret: bigint = BigInt(Math.floor(Math.random() * 1e12))
): {
  nonce: string;
  ephemeralPubkey: string;
  c0: string;
  c1: string;
  c2: string;
  c3: string;
} {
  const res = encryptTextToMultiFelts(text, ephemeralSecret);
  const f = res.felts;
  return {
    nonce: res.nonce,
    ephemeralPubkey: res.ephemeralPubkey,
    c0: f[0] || "0x0",
    c1: f[1] || "0x0",
    c2: f[2] || "0x0",
    c3: f[3] || "0x0",
  };
}

/**
 * Decrypts 4 Starknet felts back into a UTF-8 string.
 */
export function decryptFeltsToText(
  c0: string,
  c1: string,
  c2: string,
  c3: string,
  ephemeralSecret: bigint
): string {
  return decryptMultiFeltsToText([c0, c1, c2, c3], ephemeralSecret);
}
