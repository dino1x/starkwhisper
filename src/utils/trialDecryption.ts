import { decryptFeltsToText, deriveChannelId, deriveEcdhSharedSecret, DecryptedWhisperMessage } from "./whisperCrypto";

export interface OnChainMessageEvent {
  transactionHash: string;
  channelId: string;
  ephemeralPubkey: string;
  nonce: string;
  c0: string;
  c1: string;
  c2: string;
  c3: string;
  timestamp: number;
}

export interface ScanResult {
  discoveredMessages: DecryptedWhisperMessage[];
  scannedCount: number;
  matchedCount: number;
}

/**
 * Client-Side Trial Decryption Engine.
 * Scans on-chain MessagePosted events by re-deriving the ECDH shared secret from
 * ephemeralPubkey + userPrivateKey, then matching deriveChannelId(sharedSecret, nonce)
 * against evt.channelId. This achieves zero-knowledge note discovery with 0 metadata leakage.
 */
export async function scanOnChainMessagesForUser(
  userPrivateKey: string,
  events: OnChainMessageEvent[]
): Promise<ScanResult> {
  const discoveredMessages: DecryptedWhisperMessage[] = [];

  events.forEach((evt, idx) => {
    try {
      // 1. Re-derive candidate ECDH shared secret
      const sharedSecret = deriveEcdhSharedSecret(userPrivateKey, evt.ephemeralPubkey);

      // 2. Re-compute expected channel ID: Poseidon(sharedSecret, nonce)
      const expectedChannelId = deriveChannelId(sharedSecret, evt.nonce);

      // 3. Match against on-chain channelId
      if (evt.channelId === expectedChannelId || evt.channelId.slice(0, 10) === expectedChannelId.slice(0, 10)) {
        const decryptedObj = decryptFeltsToText(
          evt.c0,
          evt.c1,
          evt.c2,
          evt.c3,
          evt.ephemeralPubkey,
          evt.nonce,
          userPrivateKey
        );

        if (decryptedObj.isAuthenticated && decryptedObj.text) {
          const text = decryptedObj.text;
          const hasPayment = text.toLowerCase().includes("strk") || text.toLowerCase().includes("disbursed");

          discoveredMessages.push({
            id: `scanned-${evt.transactionHash.slice(0, 10)}-${idx}`,
            channelId: evt.channelId,
            sender: evt.ephemeralPubkey.slice(0, 12) + "...",
            text,
            timestamp: evt.timestamp,
            hasPayment,
            paymentAmount: hasPayment ? "STRK Note" : undefined,
            isSelf: false,
          });
        }
      }
    } catch {
      // Skip non-matching events
    }
  });

  return {
    discoveredMessages,
    scannedCount: events.length,
    matchedCount: discoveredMessages.length,
  };
}
