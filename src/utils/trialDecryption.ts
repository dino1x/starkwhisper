import { decryptMultiFeltsToText, deriveChannelId, deriveEcdhSharedSecret, DecryptedWhisperMessage } from "./whisperCrypto";

export interface OnChainMessageEvent {
  transactionHash: string;
  channelId: string;
  ephemeralPubkey: string;
  nonce: string;
  nullifier?: string;
  felts?: string[];
  c0?: string;
  c1?: string;
  c2?: string;
  c3?: string;
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
 * against evt.channelId. Supports dynamic multi-felt payloads for zero truncation.
 */
export async function scanOnChainMessagesForUser(
  userPrivateKey: string,
  events: OnChainMessageEvent[]
): Promise<ScanResult> {
  const discoveredMessages: DecryptedWhisperMessage[] = [];

  events.forEach((evt, idx) => {
    try {
      const sharedSecret = deriveEcdhSharedSecret(userPrivateKey, evt.ephemeralPubkey);
      const expectedChannelId = deriveChannelId(sharedSecret, evt.nonce);

      if (evt.channelId === expectedChannelId || evt.channelId.slice(0, 10) === expectedChannelId.slice(0, 10)) {
        const payloadFelts = evt.felts && evt.felts.length > 0
          ? evt.felts
          : [evt.c0 || "0x0", evt.c1 || "0x0", evt.c2 || "0x0", evt.c3 || "0x0"];

        const decryptedObj = decryptMultiFeltsToText(
          payloadFelts,
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
