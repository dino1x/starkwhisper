import { hash, num } from "starknet";
import { decryptFeltsToText, deriveEcdhSharedSecret } from "./whisperCrypto";

export interface ScopedViewingKey {
  version: "v1.0";
  channelId: string;
  scopedSecretKey: string;
  createdAt: number;
  exportedBy: string;
}

/**
 * Scoped Auditor Viewing Key Protocol.
 * Enables users to export a thread-specific viewing key for compliance auditors.
 * The auditor can decrypt ONLY messages in the specified channelId without having access
 * to the user's master private key or any other private conversation threads.
 */
export function exportScopedThreadViewingKey(
  channelId: string,
  userPrivateKey: string,
  counterpartyPublicKey: string
): ScopedViewingKey {
  const sharedSecret = deriveEcdhSharedSecret(userPrivateKey, counterpartyPublicKey);
  // Scoped key is Poseidon(sharedSecret, channelId)
  const scopedSecretKey = hash.computeHashOnElements([
    sharedSecret,
    num.toBigInt(channelId).toString(),
  ]);

  return {
    version: "v1.0",
    channelId,
    scopedSecretKey,
    createdAt: Date.now(),
    exportedBy: userPrivateKey.slice(0, 10) + "...",
  };
}

/**
 * Decrypts a specific message in a channel using a Scoped Auditor Viewing Key.
 */
export function decryptWithScopedViewingKey(
  viewingKey: ScopedViewingKey,
  c0: string,
  c1: string,
  c2: string,
  c3: string,
  ephemeralPubkey: string,
  nonce: string
): { text: string; isAuthenticated: boolean } {
  if (!viewingKey || !viewingKey.scopedSecretKey) {
    return { text: "[Invalid Viewing Key]", isAuthenticated: false };
  }

  return decryptFeltsToText(
    c0,
    c1,
    c2,
    c3,
    ephemeralPubkey,
    nonce,
    viewingKey.scopedSecretKey
  );
}
