export type Strk20ActionType = "withdraw" | "transfer" | "invoke" | "approve" | "deposit";

export interface Strk20Action {
  type: Strk20ActionType;
  token?: string;
  amount?: string;
  recipient?: string;
  contract?: string;
  calldata?: string[];
  spender?: string;
  commitment?: string;
}

export interface Strk20BridgeConfig {
  poolAddress: string;
  openNoteIds: string[];
  strkTokenAddress: string;
}

export interface InvokerExecutionResult {
  transaction_hash: string;
  compiledCallsCount: number;
  timestamp: number;
}
