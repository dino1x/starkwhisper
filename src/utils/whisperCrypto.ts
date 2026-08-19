import { ec, hash, num } from "starknet";

export interface EncryptedWhisperPayload {
  channelId: string;
  ephemeralPubkey: string;
  nonce: string;
  nullifier: string;
  c0: string;
  c1: string;
  c2: string;
  c3: string;
  mac: string;
  felts: string[];
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

function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function shortHex(h: string, head = 6, tail = 4): string {
  if (!h || h.length <= head + tail) return h || "";
  return `${h.slice(0, head)}...${h.slice(-tail)}`;
}

export function fmtStrk(wei: bigint | string | number): string {
  const b = typeof wei === "bigint" ? wei : BigInt(wei || 0);
  return (Number(b) / 1e18).toFixed(2);
}

export function deriveChannelId(sharedSecret: string, nonce: string): string {
  return hash.computeHashOnElements([
    num.toBigInt(sharedSecret).toString(),
    num.toBigInt(nonce).toString(),
  ]);
}

export function deriveNullifier(ephemeralPubkey: string, nonce: string): string {
  return hash.computeHashOnElements([
    num.toBigInt(ephemeralPubkey).toString(),
    num.toBigInt(nonce).toString(),
  ]);
}

export function deriveEcdhSharedSecret(
  ephemeralPrivateKey: string | bigint,
  recipientPublicKey: string | bigint
): string {
  try {
    const priv = typeof ephemeralPrivateKey === "bigint"
      ? num.toHex(ephemeralPrivateKey)
      : ephemeralPrivateKey;

    const pub = typeof recipientPublicKey === "bigint"
      ? num.toHex(recipientPublicKey)
      : recipientPublicKey;

    const sharedPoint = ec.starkCurve.getSharedSecret(priv, pub);
    return bytesToHex(sharedPoint);
  } catch {
    return hash.computeHashOnElements([
      num.toBigInt(ephemeralPrivateKey).toString(),
      num.toBigInt(recipientPublicKey).toString(),
    ]);
  }
}

export function encryptTextToMultiFelts(
  text: string,
  recipientPublicKey: string,
  ephemeralPrivKeyHex?: string
): {
  nonce: string;
  ephemeralPubkey: string;
  nullifier: string;
  channelId: string;
  felts: string[];
  mac: string;
} {
  const privKeyBytes = ec.starkCurve.utils.randomPrivateKey();
  const ephemeralPrivKey = ephemeralPrivKeyHex || bytesToHex(privKeyBytes);
  const ephemeralPubkey = ec.starkCurve.getStarkKey(ephemeralPrivKey);
  const nonce = num.toHex(BigInt(Date.now()));
  const nullifier = deriveNullifier(ephemeralPubkey, nonce);

  const sharedSecret = deriveEcdhSharedSecret(ephemeralPrivKey, recipientPublicKey);
  const channelId = deriveChannelId(sharedSecret, nonce);
  const kdfKey = num.toBigInt(hash.computeHashOnElements([sharedSecret, nonce]));

  const encoder = new TextEncoder();
  const bytes = Array.from(encoder.encode(text));
  const chunkSize = 30;
  const chunkCount = Math.max(1, Math.ceil(bytes.length / chunkSize));
  const rawChunks: bigint[] = new Array(chunkCount).fill(0n);

  for (let i = 0; i < bytes.length; i++) {
    const chunkIdx = Math.floor(i / chunkSize);
    rawChunks[chunkIdx] = (rawChunks[chunkIdx] << 8n) | BigInt(bytes[i]);
  }

  const felts = rawChunks.map((chunk, idx) => {
    const subkey = num.toBigInt(hash.computeHashOnElements([kdfKey.toString(), idx.toString()]));
    const masked = chunk ^ subkey;
    return num.toHex(masked);
  });

  const mac = hash.computeHashOnElements([
    ...felts,
    kdfKey.toString(),
  ]);

  return {
    nonce,
    ephemeralPubkey,
    nullifier,
    channelId,
    felts,
    mac,
  };
}

export function decryptMultiFeltsToText(
  felts: string[],
  ephemeralPubkey: string,
  nonce: string,
  recipientPrivateKey: string,
  mac?: string
): { text: string; isAuthenticated: boolean } {
  try {
    const sharedSecret = deriveEcdhSharedSecret(recipientPrivateKey, ephemeralPubkey);
    const kdfKey = num.toBigInt(hash.computeHashOnElements([sharedSecret, nonce]));

    if (mac) {
      const computedMac = hash.computeHashOnElements([...felts, kdfKey.toString()]);
      if (computedMac !== mac) {
        return { text: "[Authentication Failed]", isAuthenticated: false };
      }
    }

    const bytes: number[] = [];

    felts.forEach((cHex, idx) => {
      const subkey = num.toBigInt(hash.computeHashOnElements([kdfKey.toString(), idx.toString()]));
      const masked = num.toBigInt(cHex);
      const unmasked = masked ^ subkey;

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
    return {
      text: decoder.decode(new Uint8Array(bytes)),
      isAuthenticated: true,
    };
  } catch {
    return { text: "[Decryption Failed]", isAuthenticated: false };
  }
}

export function encryptTextToFelts(
  text: string,
  recipientPublicKey: string,
  ephemeralPrivKeyHex?: string
): EncryptedWhisperPayload {
  const res = encryptTextToMultiFelts(text, recipientPublicKey, ephemeralPrivKeyHex);
  const f = res.felts;
  return {
    channelId: res.channelId,
    ephemeralPubkey: res.ephemeralPubkey,
    nonce: res.nonce,
    nullifier: res.nullifier,
    c0: f[0] || "0x0",
    c1: f[1] || "0x0",
    c2: f[2] || "0x0",
    c3: f[3] || "0x0",
    mac: res.mac,
    felts: res.felts,
  };
}

export function decryptFeltsToText(
  c0: string,
  c1: string,
  c2: string,
  c3: string,
  ephemeralPubkey: string,
  nonce: string,
  recipientPrivateKey: string,
  mac?: string
): { text: string; isAuthenticated: boolean } {
  return decryptMultiFeltsToText([c0, c1, c2, c3], ephemeralPubkey, nonce, recipientPrivateKey, mac);
}
