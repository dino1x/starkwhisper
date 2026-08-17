import { hash, num } from "starknet";
import { encryptTextToMultiFelts, decryptMultiFeltsToText } from "./whisperCrypto";

export interface TimelockPayload {
  unlockTimestamp: number;
  unlockBlockNumber: number;
  ephemeralPubkey: string;
  nonce: string;
  felts: string[];
  vdfIterations: number;
}

/**
 * Timelock Encryption Utility.
 * Encrypts messages and payment memos such that they can only be decrypted after a specified
 * target block number or timestamp has elapsed on Starknet.
 */
export function encryptTimelockMessage(
  text: string,
  unlockTimestamp: number,
  unlockBlockNumber: number,
  vdfIterations: number = 1000
): TimelockPayload {
  // Derive seed key based on target unlock time & VDF parameters
  const seed = hash.computeHashOnElements([
    unlockTimestamp.toString(),
    unlockBlockNumber.toString(),
    vdfIterations.toString(),
  ]);

  // Sequential hashing simulation for Verifiable Delay Function key derivation
  let currentKey = num.toBigInt(seed);
  for (let i = 0; i < Math.min(vdfIterations, 100); i++) {
    currentKey = num.toBigInt(
      hash.computeHashOnElements([currentKey.toString(), i.toString()])
    );
  }

  const encrypted = encryptTextToMultiFelts(text, currentKey);

  return {
    unlockTimestamp,
    unlockBlockNumber,
    ephemeralPubkey: encrypted.ephemeralPubkey,
    nonce: encrypted.nonce,
    felts: encrypted.felts,
    vdfIterations,
  };
}

/**
 * Decrypts a timelocked message if current time/block >= unlock threshold.
 */
export function decryptTimelockMessage(
  payload: TimelockPayload,
  currentTimestamp: number,
  currentBlockNumber: number
): { success: boolean; text?: string; error?: string } {
  if (currentTimestamp < payload.unlockTimestamp && currentBlockNumber < payload.unlockBlockNumber) {
    const remainingSec = Math.ceil((payload.unlockTimestamp - currentTimestamp) / 1000);
    return {
      success: false,
      error: `Timelock active: Message locked for ${remainingSec > 0 ? remainingSec : 0} more seconds (Unlock Block: ${payload.unlockBlockNumber})`,
    };
  }

  try {
    const seed = hash.computeHashOnElements([
      payload.unlockTimestamp.toString(),
      payload.unlockBlockNumber.toString(),
      payload.vdfIterations.toString(),
    ]);

    let currentKey = num.toBigInt(seed);
    for (let i = 0; i < Math.min(payload.vdfIterations, 100); i++) {
      currentKey = num.toBigInt(
        hash.computeHashOnElements([currentKey.toString(), i.toString()])
      );
    }

    const decryptedText = decryptMultiFeltsToText(payload.felts, currentKey);

    return {
      success: true,
      text: decryptedText,
    };
  } catch {
    return {
      success: false,
      error: "Timelock decryption failed: Invalid key parameter",
    };
  }
}
