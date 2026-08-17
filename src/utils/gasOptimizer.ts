/**
 * Gas & Proof Savings Calculator for STRK20 Privacy Pool.
 * Computes gas savings and STARK proof cost reduction when bundling payments + encrypted memos.
 */

export interface GasSavingsMetrics {
  individualTxGasFee: bigint;
  bundledTxGasFee: bigint;
  gasSavedWei: bigint;
  savingsPercentage: number;
  starkProofCount: number;
}

/**
 * Computes gas efficiency metrics for atomic privacy_invoke note spends.
 */
export function calculateBundledGasSavings(
  paymentCount: number,
  hasMemo: boolean = true
): GasSavingsMetrics {
  const baseTxFee = 150000000000000n; // ~0.00015 STRK per individual tx
  const proofBaseFee = 250000000000000n; // STARK proof verifier cost

  // Individual executions require N separate STARK proofs and N base fees
  const individualTotal = (baseTxFee + proofBaseFee) * BigInt(paymentCount);

  // Bundled privacy_invoke combines N note spends + memo into 1 single STARK proof
  const bundledTotal = proofBaseFee + baseTxFee * BigInt(Math.max(1, Math.ceil(paymentCount * 0.4)));

  const gasSavedWei = individualTotal > bundledTotal ? individualTotal - bundledTotal : 0n;

  const percentage = individualTotal > 0n
    ? Number((gasSavedWei * 100n) / individualTotal)
    : 0;

  return {
    individualTxGasFee: individualTotal,
    bundledTxGasFee: bundledTotal,
    gasSavedWei,
    savingsPercentage: Math.round(percentage),
    starkProofCount: 1, // Single proof for all bundled actions
  };
}
