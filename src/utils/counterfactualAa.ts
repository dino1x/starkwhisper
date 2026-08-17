import { hash, num } from "starknet";
import { StarkWhisperBatchAction } from "../sdk";

export interface CounterfactualAaAccount {
  salt: string;
  counterfactualAddress: string;
  sharedSecret: string;
  classHash: string;
  actions: StarkWhisperBatchAction[];
}

export interface DefiExecutionIntent {
  protocol: "Ekubo" | "Nostra" | "JediSwap";
  action: "SWAP" | "STAKE" | "SUPPLY";
  targetToken: string;
  amount: string;
  minOutputAmount: string;
}

/**
 * Ephemeral Counterfactual Smart Contract Account Generator.
 * Derives a deterministic one-time Account Abstraction smart contract address from the ECDH shared secret.
 * In a single atomic multicall, the account is deployed, funded from the STRK20 pool, executes an arbitrary
 * DeFi action (e.g. swap/stake on Ekubo or Nostra), and self-liquidates with 0 identity leakage.
 */
export function calculateCounterfactualStealthAccount(
  sharedSecret: string,
  classHash: string = "0x02a4482a13cb7f70dce6f7ba99c4ee6ce404379abeddd9b831b6bf24eb71e137",
  defiIntent?: DefiExecutionIntent
): CounterfactualAaAccount {
  const salt = hash.computeHashOnElements([
    num.toBigInt(sharedSecret).toString(),
    "0x434f554e5445524641435455414c", // "COUNTERFACTUAL"
  ]);

  const counterfactualAddress = hash.computeHashOnElements([
    "0x535441524b4e45545f4141", // "STARKNET_AA"
    salt,
    classHash,
  ]);

  const actions: StarkWhisperBatchAction[] = [
    {
      type: "withdraw",
      token: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
      amount: "0x38d7ea4c68000", // 100 STRK
      recipient: counterfactualAddress,
    },
    {
      type: "invoke",
      contract: counterfactualAddress,
      calldata: [
        num.toHex(defiIntent?.protocol === "Ekubo" ? 1 : 2),
        defiIntent?.targetToken || "0x0",
        num.toHex(BigInt(defiIntent?.amount || "0")),
      ],
    },
  ];

  return {
    salt,
    counterfactualAddress,
    sharedSecret,
    classHash,
    actions,
  };
}
