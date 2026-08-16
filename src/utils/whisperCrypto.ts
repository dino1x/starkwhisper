import { hash, num } from "starknet";

export interface EncryptedWhisperPayload {
  channelId: string;
  ephemeralPubkey: string;
  nonce: string;
  c0: string;
  c1: string;
  c2: string;
  c3: string;
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
 * Simple XOR-XChaCha stream cipher simulation over 4 Starknet felts.
 * Encrypts UTF-8 text into 4 felts (c0..c3) that fit directly in Cairo calldata.
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
  const nonce = num.toHex(BigInt(Date.now()));
  const ephemeralPubkey = num.toHex(hash.computeHashOnElements([ephemeralSecret.toString(), nonce]));
  
  // Convert text bytes into up to 4 chunk felts
  const encoder = new TextEncoder();
  const bytes = Array.from(encoder.encode(text.slice(0, 120))); // Limit to ~120 chars for demo
  const chunks: bigint[] = [0n, 0n, 0n, 0n];

  for (let i = 0; i < bytes.length; i++) {
    const chunkIdx = Math.floor(i / 30);
    chunks[chunkIdx] = (chunks[chunkIdx] << 8n) | BigInt(bytes[i]);
  }

  // Mask each chunk with a pseudo-random key derived from Poseidon(ephemeralSecret, chunkIdx)
  const felts = chunks.map((chunk, idx) => {
    const key = num.toBigInt(hash.computeHashOnElements([ephemeralSecret.toString(), idx.toString()]));
    const masked = chunk ^ key;
    return num.toHex(masked);
  });

  return {
    nonce,
    ephemeralPubkey,
    c0: felts[0],
    c1: felts[1],
    c2: felts[2],
    c3: felts[3],
  };
}

/**
 * Decrypts 4 Starknet felts (c0..c3) back into a UTF-8 string.
 */
export function decryptFeltsToText(
  c0: string,
  c1: string,
  c2: string,
  c3: string,
  ephemeralSecret: bigint
): string {
  try {
    const felts = [c0, c1, c2, c3];
    const bytes: number[] = [];

    felts.forEach((cHex, idx) => {
      const key = num.toBigInt(hash.computeHashOnElements([ephemeralSecret.toString(), idx.toString()]));
      const masked = num.toBigInt(cHex);
      const unmasked = masked ^ key;

      if (unmasked === 0n) return;

      // Extract bytes from bigint
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
