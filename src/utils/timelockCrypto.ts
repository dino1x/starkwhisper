import { hash, num } from "starknet";
import { encryptTextToMultiFelts, decryptMultiFeltsToText } from "./whisperCrypto";

export interface TimelockPayload {
  unlockTimestamp: number;
  unlockBlockNumber: number;
  ephemeralPubkey: string;
  nonce: string;
  felts: string[];
  hashIterations: number;
}

/**
 * Time-Lock Delay Policy Utility.
 * Encrypts messages and payment memos such that key derivation requires sequential
 * hash iterations tied to a target block height or timestamp elapsing on Starknet.
 */
export function encryptTimelockMessage(
  text: string,
  unlockTimestamp: number,
  unlockBlockNumber: number,
  hashIterations: number = 100
): TimelockPayload {
  const seed = hash.computeHashOnElements([
    unlockTimestamp.toString(),
    unlockBlockNumber.toString(),
    hashIterations.toString(),
  ]);

  let currentKey = num.toBigInt(seed);
  for (let i = 0; i < hashIterations; i++) {
    currentKey = num.toBigInt(
      hash.computeHashOnElements([currentKey.toString(), i.toString()])
    );
  }

  const hexKey = num.toHex(currentKey);
  const encrypted = encryptTextToMultiFelts(text, hexKey);

  return {
    unlockTimestamp,
    unlockBlockNumber,
    ephemeralPubkey: encrypted.ephemeralPubkey,
    nonce: encrypted.nonce,
    felts: encrypted.felts,
    hashIterations,
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
      error: `Time-Lock Active: Message locked for ${remainingSec > 0 ? remainingSec : 0} more seconds (Unlock Block: ${payload.unlockBlockNumber})`,
    };
  }

  try {
    const seed = hash.computeHashOnElements([
      payload.unlockTimestamp.toString(),
      payload.unlockBlockNumber.toString(),
      payload.hashIterations.toString(),
    ]);

    let currentKey = num.toBigInt(seed);
    for (let i = 0; i < payload.hashIterations; i++) {
      currentKey = num.toBigInt(
        hash.computeHashOnElements([currentKey.toString(), i.toString()])
      );
    }

    const hexKey = num.toHex(currentKey);
    const decryptedObj = decryptMultiFeltsToText(
      payload.felts,
      payload.ephemeralPubkey,
      payload.nonce,
      hexKey
    );

    return {
      success: decryptedObj.isAuthenticated,
      text: decryptedObj.text,
    };
  } catch {
    return {
      success: false,
      error: "Time-Lock decryption failed: Invalid parameter",
    };
  }
}
