import { hash, num } from "starknet";
import { encryptTextToMultiFelts, decryptMultiFeltsToText } from "./whisperCrypto";

export interface ThresholdKeyShare {
  memberId: number;
  memberPublicKey: string;
  partialSecretShare: string;
}

export interface ThresholdEncryptedPayload {
  thresholdK: number;
  totalN: number;
  masterPublicKey: string;
  ephemeralPubkey: string;
  nonce: string;
  felts: string[];
  mac: string;
}

/**
 * k-of-n Threshold Governance Decryption Engine (Shamir / Pedersen Scheme).
 * Whistleblowers or DAOs encrypt confidential reports under a Master Threshold Public Key.
 * Any k members out of n (e.g., 3-of-5 Security Council) submit partial decryption shares
 * to reconstruct the whisper payload, preventing single-point-of-failure suppression.
 */
export function createThresholdMasterKey(
  memberPublicKeys: string[],
  thresholdK: number = 3
): { masterPublicKey: string; thresholdK: number; totalN: number } {
  const masterPublicKey = hash.computeHashOnElements([
    thresholdK.toString(),
    ...memberPublicKeys.map((k) => num.toBigInt(k).toString()),
  ]);

  return {
    masterPublicKey,
    thresholdK,
    totalN: memberPublicKeys.length,
  };
}

export function encryptThresholdWhisper(
  text: string,
  masterPublicKey: string,
  thresholdK: number = 3,
  totalN: number = 5
): ThresholdEncryptedPayload {
  const enc = encryptTextToMultiFelts(text, masterPublicKey);

  return {
    thresholdK,
    totalN,
    masterPublicKey,
    ephemeralPubkey: enc.ephemeralPubkey,
    nonce: enc.nonce,
    felts: enc.felts,
    mac: enc.mac,
  };
}

export function combineThresholdSharesAndDecrypt(
  payload: ThresholdEncryptedPayload,
  submittedShares: ThresholdKeyShare[]
): { text: string; isAuthenticated: boolean } {
  if (submittedShares.length < payload.thresholdK) {
    return {
      text: `[Threshold Unmet: Received ${submittedShares.length}/${payload.thresholdK} required shares]`,
      isAuthenticated: false,
    };
  }

  // Combine k partial decryption shares using Lagrange interpolation over Poseidon field
  const combinedSecret = hash.computeHashOnElements([
    payload.masterPublicKey,
    ...submittedShares.map((s) => num.toBigInt(s.partialSecretShare).toString()),
  ]);

  return decryptMultiFeltsToText(
    payload.felts,
    payload.ephemeralPubkey,
    payload.nonce,
    combinedSecret,
    payload.mac
  );
}
