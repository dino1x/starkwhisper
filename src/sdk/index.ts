/**
 * @starkwhisper/sdk - Official Starknet STRK20 Zero-Knowledge Messaging & Payment Memos SDK
 * 
 * Embed metadata-resistant whispers, dual-key stealth payments, and compliance viewing keys
 * into any Starknet dApp in under 10 lines of code.
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
  generateDualKeyStealthAddress,
  checkDualKeyStealthOwnership,
  GeneratedStealthAddress,
} from "../utils/stealthAddress";
import { exportScopedThreadViewingKey, ScopedViewingKey } from "../utils/viewingKeys";
import { messagingHelperForIndex, addrSTRK } from "../utils/constants";

export interface StarkWhisperBatchAction {
  type: "withdraw" | "transfer" | "invoke";
  token?: string;
  amount?: string;
  recipient?: string;
  contract?: string;
  calldata?: string[];
}

export class StarkWhisperSDK {
  private networkIndex: number;
  private helperAddress: string;

  constructor(networkIndex: number = 0) {
    this.networkIndex = networkIndex;
    this.helperAddress = messagingHelperForIndex(networkIndex);
  }

  /**
   * Encrypts a message payload for a recipient and constructs the atomic STRK20 batch actions.
   */
  public prepareWhisperBatch(
    text: string,
    recipientPublicKey: string,
    paymentAmountStrk: string = "0"
  ): {
    payload: EncryptedWhisperPayload;
    actions: StarkWhisperBatchAction[];
  } {
    const payload = encryptTextToFelts(text, recipientPublicKey);
    const parsedAmount = BigInt(Math.floor(parseFloat(paymentAmountStrk || "0") * 1e18));
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
        recipient: recipientPublicKey,
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
      payload,
      actions,
    };
  }

  /**
   * Generates a 100% un-linkable Dual-Key Stealth Address for a recipient (ERC-5564 equivalent).
   */
  public generateStealthRecipient(
    recipientSpendPubKey: string,
    recipientViewPubKey: string
  ): GeneratedStealthAddress {
    return generateDualKeyStealthAddress(recipientSpendPubKey, recipientViewPubKey);
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
  generateDualKeyStealthAddress,
  checkDualKeyStealthOwnership,
  exportScopedThreadViewingKey,
};
