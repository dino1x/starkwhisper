/**
 * @starkwhisper/sdk - Official Starknet STRK20 Zero-Knowledge Messaging & Payment Memos SDK
 * 
 * Embed metadata-resistant whispers, STARK Dual-Key stealth payments, 1-byte ViewTag scanners,
 * Ephemeral Counterfactual AA execution, Double-Ratchet Forward Secrecy, ZK-PoI Proof of Innocence,
 * and Waku P2P transport into any Starknet dApp in under 10 lines of code.
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
import { calculateCounterfactualStealthAccount, CounterfactualAaAccount, DefiExecutionIntent } from "../utils/counterfactualAa";
import { createThresholdMasterKey, encryptThresholdWhisper, combineThresholdSharesAndDecrypt, ThresholdEncryptedPayload } from "../utils/thresholdDecryption";
import { createShieldedStreamConfig, calculateShieldedStreamVesting, ShieldedStreamConfig } from "../utils/shieldedStream";
import { createGarbledBloomFilter, checkBloomFilterMatch, publishWakuP2PWhisper, WakuMessagePayload } from "../utils/wakuRelay";
import { initDoubleRatchetState, ratchetStepAdvance, DoubleRatchetState } from "../utils/doubleRatchet";
import { generateZkProofOfInnocence, verifyZkProofOfInnocence, ZkProofOfInnocence } from "../utils/proofOfInnocence";
import { generateDecoyNoiseNote, shuffleBatchWithPoissonNoise } from "../utils/noiseDecoy";

export interface CreateEncryptedWhisperOptions {
  recipientMeta: {
    spendPublicKey: string;
    viewPublicKey: string;
  };
  message: string;
  tipAmount?: string;
}

export interface ScanWhispersOptions {
  viewingKey: string;
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

  public generateStealthMetaAddress(): DualKeyStealthKeyPair {
    return generateDualKeyKeyPair();
  }

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

  public initDoubleRatchet(sharedSecret: string): DoubleRatchetState {
    return initDoubleRatchetState(sharedSecret);
  }

  public generateProofOfInnocence(noteCommitment: string, userAddress: string): ZkProofOfInnocence {
    return generateZkProofOfInnocence(noteCommitment, userAddress);
  }

  public createCounterfactualDeFiAccount(
    sharedSecret: string,
    defiIntent?: DefiExecutionIntent
  ): CounterfactualAaAccount {
    return calculateCounterfactualStealthAccount(sharedSecret, this.helperAddress, defiIntent);
  }

  public injectDecoyNoiseBatch(actions: StarkWhisperBatchAction[], decoyCount: number = 2): StarkWhisperBatchAction[] {
    return shuffleBatchWithPoissonNoise(actions, decoyCount);
  }

  public async scanWhispers(options: ScanWhispersOptions) {
    return scanOnChainMessagesForUser(options.viewingKey, options.events);
  }

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
  calculateCounterfactualStealthAccount,
  createThresholdMasterKey,
  encryptThresholdWhisper,
  combineThresholdSharesAndDecrypt,
  createShieldedStreamConfig,
  calculateShieldedStreamVesting,
  createGarbledBloomFilter,
  checkBloomFilterMatch,
  publishWakuP2PWhisper,
  initDoubleRatchetState,
  ratchetStepAdvance,
  generateZkProofOfInnocence,
  verifyZkProofOfInnocence,
  generateDecoyNoiseNote,
  shuffleBatchWithPoissonNoise,
};
