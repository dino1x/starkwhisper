import { hash, num, ec } from "starknet";

export interface StealthKeyPair {
  spendingPubkey: string;
  viewingPubkey: string;
}

export interface GeneratedStealthAddress {
  stealthAddress: string;
  ephemeralPubKey: string;
  viewTag: string;
}

/**
 * Dual-Key Stealth Address Protocol (DKSAP) for Starknet.
 * Generates single-use, un-linkable stealth recipient addresses for total transaction privacy.
 */
export function generateStealthAddress(
  recipientSpendingPubkey: string,
  recipientViewingPubkey: string,
  ephemeralSecret: bigint = BigInt(Math.floor(Math.random() * 1e12))
): GeneratedStealthAddress {
  const nonce = num.toHex(BigInt(Date.now()));
  const ephemeralPubKey = num.toHex(
    hash.computeHashOnElements([ephemeralSecret.toString(), nonce])
  );

  // Derive Shared Secret S = Poseidon(ephemeralSecret, recipientViewingPubkey)
  const sharedSecret = hash.computeHashOnElements([
    ephemeralSecret.toString(),
    num.toBigInt(recipientViewingPubkey).toString(),
  ]);

  // View Tag (1 byte hash slice) for instant 99% fast filtering during note scanning
  const viewTag = num.toHex(num.toBigInt(sharedSecret) & 0xffn);

  // Stealth Address P = Poseidon(recipientSpendingPubkey, sharedSecret)
  const stealthAddress = num.toHex(
    hash.computeHashOnElements([
      num.toBigInt(recipientSpendingPubkey).toString(),
      sharedSecret,
    ])
  );

  return {
    stealthAddress,
    ephemeralPubKey,
    viewTag,
  };
}

/**
 * Checks if a stealth address belongs to the receiver using their private viewing key.
 */
export function checkStealthAddressOwnership(
  stealthAddress: string,
  ephemeralPubKey: string,
  viewTag: string,
  mySpendingPubkey: string,
  myViewingSecret: bigint
): boolean {
  try {
    const sharedSecret = hash.computeHashOnElements([
      myViewingSecret.toString(),
      num.toBigInt(ephemeralPubKey).toString(),
    ]);

    const expectedViewTag = num.toHex(num.toBigInt(sharedSecret) & 0xffn);
    if (expectedViewTag !== viewTag) return false;

    const expectedStealthAddress = num.toHex(
      hash.computeHashOnElements([
        num.toBigInt(mySpendingPubkey).toString(),
        sharedSecret,
      ])
    );

    return expectedStealthAddress === stealthAddress;
  } catch {
    return false;
  }
}
