import { hash, num } from "starknet";

export interface ShieldedStreamConfig {
  streamId: string;
  senderCommitment: string;
  recipientStealthAddress: string;
  totalDepositAmount: string;
  startTime: number;
  stopTime: number;
  ratePerSecond: string;
}

export interface ClaimableStreamState {
  unlockedAmount: string;
  claimedAmount: string;
  remainingAmount: string;
  percentVested: number;
}

/**
 * Shielded Sablier-Style Linear Vesting & Micro-Streaming Engine.
 * Employer deposits bulk funds into a ShieldedStream note. The employee incrementally claims unlocked
 * STRK into fresh stealth notes without exposing employer identity, total stream balance, or flow rate.
 */
export function createShieldedStreamConfig(
  senderStealthPubKey: string,
  recipientStealthAddress: string,
  totalAmountStrk: string,
  durationSeconds: number
): ShieldedStreamConfig {
  const startTime = Date.now();
  const stopTime = startTime + durationSeconds * 1000;
  const totalWei = BigInt(Math.floor(parseFloat(totalAmountStrk) * 1e18));
  const ratePerSecond = (totalWei / BigInt(durationSeconds)).toString();

  const streamId = hash.computeHashOnElements([
    num.toBigInt(senderStealthPubKey).toString(),
    num.toBigInt(recipientStealthAddress).toString(),
    startTime.toString(),
  ]);

  const senderCommitment = hash.computeHashOnElements([
    streamId,
    totalWei.toString(),
    "0x53545245414d", // "STREAM"
  ]);

  return {
    streamId,
    senderCommitment,
    recipientStealthAddress,
    totalDepositAmount: totalAmountStrk,
    startTime,
    stopTime,
    ratePerSecond,
  };
}

export function calculateShieldedStreamVesting(
  config: ShieldedStreamConfig,
  currentTime: number = Date.now(),
  claimedWei: bigint = 0n
): ClaimableStreamState {
  const totalWei = BigInt(Math.floor(parseFloat(config.totalDepositAmount) * 1e18));

  if (currentTime <= config.startTime) {
    return {
      unlockedAmount: "0 STRK",
      claimedAmount: `${Number(claimedWei) / 1e18} STRK`,
      remainingAmount: `${config.totalDepositAmount} STRK`,
      percentVested: 0,
    };
  }

  const elapsedSec = Math.min(
    Math.floor((currentTime - config.startTime) / 1000),
    Math.floor((config.stopTime - config.startTime) / 1000)
  );

  const durationSec = Math.floor((config.stopTime - config.startTime) / 1000);
  const vestedWei = (totalWei * BigInt(elapsedSec)) / BigInt(durationSec);
  const claimableWei = vestedWei > claimedWei ? vestedWei - claimedWei : 0n;

  const percentVested = Math.min(100, Math.round((elapsedSec / durationSec) * 100));

  return {
    unlockedAmount: `${(Number(claimableWei) / 1e18).toFixed(4)} STRK`,
    claimedAmount: `${(Number(claimedWei) / 1e18).toFixed(4)} STRK`,
    remainingAmount: `${(Number(totalWei - vestedWei) / 1e18).toFixed(4)} STRK`,
    percentVested,
  };
}
