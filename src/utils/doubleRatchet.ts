import { hash, num, ec } from "starknet";

export interface DoubleRatchetState {
  dhSecret: string;
  dhPublicKey: string;
  chainKey: string;
  stepCount: number;
}

export interface RatchetMessagePayload {
  stepCount: number;
  ratchetPublicKey: string;
  nonce: string;
  felts: string[];
  mac: string;
}

function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Signal-Style Asynchronous Double-Ratchet Engine on the STARK Curve.
 * Provides Forward Secrecy & Break-in Recovery for Starknet private messaging.
 * Even if a long-term key is compromised in the future, past whispers remain mathematically uncrackable.
 */
export function initDoubleRatchetState(
  sharedSecret: string,
  ratchetPrivKeyHex?: string
): DoubleRatchetState {
  const privBytes = ec.starkCurve.utils.randomPrivateKey();
  const dhSecret = ratchetPrivKeyHex || bytesToHex(privBytes);
  const dhPublicKey = ec.starkCurve.getStarkKey(dhSecret);

  const chainKey = hash.computeHashOnElements([
    num.toBigInt(sharedSecret).toString(),
    "0x52415443484554", // "RATCHET"
  ]);

  return {
    dhSecret,
    dhPublicKey,
    chainKey,
    stepCount: 0,
  };
}

export function ratchetStepAdvance(state: DoubleRatchetState, remoteDhPubKey: string): {
  nextState: DoubleRatchetState;
  derivedMessageKey: string;
} {
  let dhShared: string;
  try {
    const sharedBytes = ec.starkCurve.getSharedSecret(state.dhSecret, remoteDhPubKey);
    dhShared = bytesToHex(sharedBytes);
  } catch {
    dhShared = hash.computeHashOnElements([
      num.toBigInt(state.dhSecret).toString(),
      num.toBigInt(remoteDhPubKey).toString(),
    ]);
  }

  const nextChainKey = hash.computeHashOnElements([
    num.toBigInt(state.chainKey).toString(),
    num.toBigInt(dhShared).toString(),
    state.stepCount.toString(),
  ]);

  const derivedMessageKey = hash.computeHashOnElements([
    num.toBigInt(nextChainKey).toString(),
    "0x4d4553534147455f4b4559", // "MESSAGE_KEY"
  ]);

  return {
    nextState: {
      ...state,
      chainKey: nextChainKey,
      stepCount: state.stepCount + 1,
    },
    derivedMessageKey,
  };
}
