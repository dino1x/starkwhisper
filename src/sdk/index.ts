/**
 * @starkwhisper/sdk - Official Starknet STRK20 Zero-Knowledge Messaging & Payment Memos SDK
 * 
 * Embed metadata-resistant whispers, STARK Dual-Key stealth payments, 1-byte ViewTag scanners,
 * and compliance viewing keys into any Starknet dApp in under 10 lines of code.
 */

import { num } from "starknet";
import {
  encryptTextToFelts,
  decryptFeltsToText,
  deriveChannelId,
  deriveNullifier,
  EncryptedWhisperPayload,
} from "../utils/whisperCrypto";
import {
  generateDualKeyKeyPair,
  generateDualKeyStealthAddress,
  checkDualKeyStealthOwnership,
  GeneratedStealthAddress,
  DualKeyStealthKeyPair,
} from "../utils/stealthAddress";
import { exportScopedThreadViewingKey, ScopedViewingKey } from "../utils/viewingKeys";
import { messagingHelperForIndex, addrSTRK } from "../utils/constants";
import { scanOnChainMessagesForUser, OnChainMessageEvent } from "../utils/trialDecryption";

export interface CreateEncryptedWhisperOptions {
  recipientMeta: {
    spendPublicKey: string;
    viewPublicKey: string;
  };
  message: string;
  tipAmount?: string;
}

export interface ScanWhispersOptions {
  viewingKey: string; // Recipient View Private Key or Scoped Viewing Key
  events: OnChainMessageEvent[];
}

export interface StarkWhisperBatchAction {
  type: "withdraw" | "transfer" | "invoke";
  token?: string;
  amount?: string;
  recipient?: string;
  contract?: string;
  calldata?: string[];
}

export class StarkWhisperSDK {
  public networkIndex: number;
  public helperAddress: string;

  constructor(networkIndex: number = 0) {
    this.networkIndex = networkIndex;
    this.helperAddress = messagingHelperForIndex(networkIndex);
  }

  /**
   * Generates a Dual-Key Stealth Keypair (Spend Key + View Key) on the STARK Curve.
   */
  public generateStealthMetaAddress(): DualKeyStealthKeyPair {
    return generateDualKeyKeyPair();
  }

  /**
   * Encrypts a whisper payload and constructs an atomic STRK20 Multicall Action Batch.
   */
  public createEncryptedWhisper(options: CreateEncryptedWhisperOptions): {
    stealth: GeneratedStealthAddress;
    payload: EncryptedWhisperPayload;
    actions: StarkWhisperBatchAction[];
  } {
    const stealth = generateDualKeyStealthAddress(
      options.recipientMeta.spendPublicKey,
      options.recipientMeta.viewPublicKey
    );

    const payload = encryptTextToFelts(options.message, stealth.stealthAddress);
    const parsedAmount = BigInt(Math.floor(parseFloat(options.tipAmount || "0") * 1e18));
    const sendAmount = parsedAmount > 0n ? parsedAmount : 1n;

    const actions: StarkWhisperBatchAction[] = [
      {
        type: "withdraw",
        token: addrSTRK,
        amount: num.toHex(sendAmount),
        recipient: this.helperAddress,
      },
      {
        type: "transfer",
        token: addrSTRK,
        amount: "OPEN",
        recipient: stealth.stealthAddress,
      },
      {
        type: "invoke",
        contract: this.helperAddress,
        calldata: [
          num.toHex(addrSTRK),
          "${poolAddress}",
          "${openNoteIds[0]}",
          payload.channelId,
          payload.ephemeralPubkey,
          payload.nonce,
          payload.nullifier,
          num.toHex(payload.felts.length),
          ...payload.felts,
        ],
      },
    ];

    return {
      stealth,
      payload,
      actions,
    };
  }

  /**
   * Fast View-Tag Indexed Scanner that decrypts whispers using a Viewing Key (99.6% CPU reduction).
   */
  public async scanWhispers(options: ScanWhispersOptions) {
    return scanOnChainMessagesForUser(options.viewingKey, options.events);
  }

  /**
   * Exports a thread-specific Scoped Auditor Viewing Key for compliance disclosure.
   */
  public exportAuditorKey(
    channelId: string,
    userPrivateKey: string,
    counterpartyPublicKey: string
  ): ScopedViewingKey {
    return exportScopedThreadViewingKey(channelId, userPrivateKey, counterpartyPublicKey);
  }
}

export {
  encryptTextToFelts,
  decryptFeltsToText,
  deriveChannelId,
  deriveNullifier,
  generateDualKeyKeyPair,
  generateDualKeyStealthAddress,
  checkDualKeyStealthOwnership,
  exportScopedThreadViewingKey,
};
