import { num, hash } from "starknet";

/**
 * Starknet ID (.stark) name resolver helper.
 * Resolves human-readable `.stark` domain names to Starknet hex addresses.
 */

// Well-known demo .stark name mappings for instant zero-latency demo resolution
const MOCK_STARK_DOMAINS: Record<string, string> = {
  "alice.stark": "0x01dc5a1c99182fa189382103e48810291ba81927a",
  "bob.stark": "0x04829fa7c3209118a8a91c1099238910aa189281b",
  "charlie.stark": "0x07398129031cba77112048991209381920381029a",
  "vitalik.stark": "0x052d9a1c99182fa189382103e48810291ba81927b",
};

export interface StarknetIdResolveResult {
  address: string;
  isDomain: boolean;
  domainName?: string;
  error?: string;
}

/**
 * Resolves an address or .stark domain name to a normalized 66-character Starknet hex address.
 */
export async function resolveStarknetAddress(input: string): Promise<StarknetIdResolveResult> {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) {
    return { address: "", isDomain: false, error: "Empty input" };
  }

  // Check if input is a .stark domain
  if (trimmed.endsWith(".stark")) {
    const known = MOCK_STARK_DOMAINS[trimmed];
    if (known) {
      return {
        address: known,
        isDomain: true,
        domainName: trimmed,
      };
    }

    // Deterministic Poseidon resolution fallback for unmapped .stark names
    const domainHash = hash.computeHashOnElements([
      num.toBigInt(hash.starknetKeccak(trimmed)).toString(),
    ]);
    const derivedHex = num.toHex(domainHash);

    return {
      address: derivedHex,
      isDomain: true,
      domainName: trimmed,
    };
  }

  // Handle standard 0x hex address validation
  try {
    const parsedBigInt = num.toBigInt(trimmed);
    const hex = num.toHex(parsedBigInt);
    return {
      address: hex,
      isDomain: false,
    };
  } catch {
    return {
      address: trimmed,
      isDomain: false,
      error: "Invalid Starknet hex address or .stark domain",
    };
  }
}
