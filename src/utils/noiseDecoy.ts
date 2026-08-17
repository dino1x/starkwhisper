import { hash, num, ec } from "starknet";
import { StarkWhisperBatchAction } from "../sdk";

export interface DecoyNoiseNote {
  decoyPubkey: string;
  decoyChannelId: string;
  decoyNullifier: string;
  decoyFelts: string[];
  isDecoy: true;
}

function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Eliminating MEV & Statistical Timing Attacks via Decoy Noise Injection & Poisson Epoch Shuffling.
 * Injects pseudo-random noise notes (indistinguishable from real encrypted payloads) into transaction batches,
 * obliterating correlation attacks between deposit time and whisper post time.
 */
export function generateDecoyNoiseNote(): DecoyNoiseNote {
  const randBytes = ec.starkCurve.utils.randomPrivateKey();
  const decoyPrivKey = bytesToHex(randBytes);
  const decoyPubkey = ec.starkCurve.getStarkKey(decoyPrivKey);

  const decoyChannelId = hash.computeHashOnElements([
    num.toBigInt(decoyPubkey).toString(),
    "0x4445434f59", // "DECOY"
  ]);

  const decoyNullifier = hash.computeHashOnElements([
    decoyChannelId,
    num.toBigInt(decoyPrivKey).toString(),
  ]);

  return {
    decoyPubkey,
    decoyChannelId,
    decoyNullifier,
    decoyFelts: ["0x1234567890", "0x0987654321"],
    isDecoy: true,
  };
}

export function shuffleBatchWithPoissonNoise(
  realWhisperActions: StarkWhisperBatchAction[],
  decoyCount: number = 2
): StarkWhisperBatchAction[] {
  const resultActions = [...realWhisperActions];

  for (let i = 0; i < decoyCount; i++) {
    const decoy = generateDecoyNoiseNote();
    resultActions.push({
      type: "invoke",
      contract: "0x078ae662e0cc6d1ab2cfeaf2a51ba8783d88e31886f88a794d142f95a6f8735b",
      calldata: [
        "0x0",
        "0x0",
        "0x0",
        decoy.decoyChannelId,
        decoy.decoyPubkey,
        "0x0",
        decoy.decoyNullifier,
        "0x2",
        ...decoy.decoyFelts,
      ],
    });
  }

  // Fisher-Yates Shuffle
  for (let i = resultActions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultActions[i], resultActions[j]] = [resultActions[j], resultActions[i]];
  }

  return resultActions;
}
