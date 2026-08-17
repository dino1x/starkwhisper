import { ProviderInterface, num } from "starknet";
import { Strk20EchoHelperClassHash } from "./constants";

export interface AuditReport {
  contractAddress: string;
  actualClassHash: string;
  expectedClassHash: string;
  isVerified: boolean;
  timestamp: number;
}

/**
 * Pre-Flight Contract Verification Audit Engine.
 * Queries Starknet node RPC for the deployed contract's actual class_hash
 * and compares it against the declared canonical Strk20EchoHelperClassHash.
 */
export async function auditAnonymizerContract(
  contractAddress: string,
  provider: ProviderInterface
): Promise<AuditReport> {
  const timestamp = Date.now();
  const expectedClassHash = Strk20EchoHelperClassHash;

  try {
    const fetchedClassHash = await provider.getClassHashAt(contractAddress);
    const actualClassHash = num.toHex(fetchedClassHash);

    const isVerified =
      actualClassHash.toLowerCase() === expectedClassHash.toLowerCase() ||
      num.toBigInt(actualClassHash) === num.toBigInt(expectedClassHash);

    return {
      contractAddress,
      actualClassHash,
      expectedClassHash,
      isVerified,
      timestamp,
    };
  } catch {
    return {
      contractAddress,
      actualClassHash: "0x0 (Un-deployed / Unavailable)",
      expectedClassHash,
      isVerified: false,
      timestamp,
    };
  }
}
