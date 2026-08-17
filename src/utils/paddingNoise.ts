import { hash, num } from "starknet";

export const UNIFORM_BUCKET_SIZES = [4, 8, 16, 32]; // Fixed felt counts

/**
 * Side-Channel Traffic Analysis Protection.
 * Pads felt arrays to uniform bucket sizes with pseudo-random noise felts.
 */
export function applyUniformCiphertextPadding(
  felts: string[],
  targetBucketSize?: number
): { paddedFelts: string[]; originalLength: number; bucketSize: number } {
  const originalLength = felts.length;
  let bucketSize = targetBucketSize || 4;

  for (const b of UNIFORM_BUCKET_SIZES) {
    if (b >= originalLength) {
      bucketSize = b;
      break;
    }
  }
  if (originalLength > bucketSize) {
    bucketSize = Math.ceil(originalLength / 16) * 16;
  }

  const paddedFelts = [...felts];
  const noiseSeed = BigInt(Date.now());

  while (paddedFelts.length < bucketSize) {
    const idx = paddedFelts.length;
    const noiseFelt = num.toHex(
      hash.computeHashOnElements([noiseSeed.toString(), idx.toString()])
    );
    paddedFelts.push(noiseFelt);
  }

  return {
    paddedFelts,
    originalLength,
    bucketSize,
  };
}

/**
 * Strips uniform ciphertext noise padding.
 */
export function stripUniformCiphertextPadding(
  paddedFelts: string[],
  originalLength: number
): string[] {
  return paddedFelts.slice(0, originalLength);
}
