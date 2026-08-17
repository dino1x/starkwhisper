import { hash, num } from "starknet";
import { decryptFeltsToText, deriveChannelId, DecryptedWhisperMessage } from "./whisperCrypto";

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
 * Scans on-chain MessagePosted events and attempts trial decryption to discover
 * messages and private payment memos sent to the connected wallet without leaking identity.
 */
export async function scanOnChainMessagesForUser(
  userAddress: string,
  knownContacts: string[],
  events: OnChainMessageEvent[]
): Promise<ScanResult> {
  const discoveredMessages: DecryptedWhisperMessage[] = [];

  // Compute all valid channel IDs for the user's known contacts
  const targetChannelMap = new Map<string, string>();
  knownContacts.forEach((contactAddr) => {
    const chId = deriveChannelId(userAddress, contactAddr);
    targetChannelMap.set(chId, contactAddr);
  });

  events.forEach((evt, idx) => {
    const contactAddr = targetChannelMap.get(evt.channelId);

    if (contactAddr) {
      // Ephemeral secret candidate
      const ephemeralSecret = num.toHex(
        hash.computeHashOnElements([evt.ephemeralPubkey, num.toBigInt(userAddress).toString()])
      );

      const decryptedObj = decryptFeltsToText(
        evt.c0,
        evt.c1,
        evt.c2,
        evt.c3,
        evt.ephemeralPubkey,
        evt.nonce,
        ephemeralSecret
      );

      const decryptedText = decryptedObj.text;
      const hasPayment = decryptedText.toLowerCase().includes("disbursed") || decryptedText.toLowerCase().includes("strk");

      discoveredMessages.push({
        id: `scanned-${evt.transactionHash.slice(0, 10)}-${idx}`,
        channelId: evt.channelId,
        sender: contactAddr,
        text: decryptedText !== "[Decryption Failed]" ? decryptedText : "Encrypted Whisper Payload",
        timestamp: evt.timestamp,
        hasPayment,
        paymentAmount: hasPayment ? "50 STRK" : undefined,
        isSelf: false,
      });
    }
  });

  return {
    discoveredMessages,
    scannedCount: events.length,
    matchedCount: discoveredMessages.length,
  };
}
