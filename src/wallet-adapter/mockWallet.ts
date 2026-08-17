import { Call, num } from "starknet";

export interface Strk20Action {
  type: "APPROVE" | "DEPOSIT" | "INVOKE_EXTERNAL" | "WITHDRAW" | "withdraw" | "transfer" | "invoke";
  token?: string;
  spender?: string;
  pool?: string;
  amount?: string;
  noteCommitment?: string;
  targetContract?: string;
  contract?: string;
  entrypoint?: string;
  calldata?: (string | number | bigint)[];
  attachedNoteId?: string;
  nullifier?: string;
  recipient?: string;
}

export interface WalletShieldedState {
  poolAddress: string;
  openNotes: string[];
  spendingKey: string;
}

export class MockStrk20WalletBridge {
  constructor(
    private account?: any,
    private state: WalletShieldedState = {
      poolAddress: "0x078ae662e0cc6d1ab2cfeaf2a51ba8783d88e31886f88a794d142f95a6f8735b",
      openNotes: ["0x071b69fa021884c98112345e89a7162543bda71289123891048bca61234a9128"],
      spendingKey: "0x0123456789abcdef",
    }
  ) {}

  /** Substitute template variables like ${poolAddress} and ${openNoteIds[0]} */
  private substitute(val: string | number | bigint): string {
    if (!val) return "";
    let str = val.toString();
    str = str.replace(/\$\{poolAddress\}/g, this.state.poolAddress);
    str = str.replace(/\$\{openNoteIds\[0\]\}/g, this.state.openNotes[0] || "0x0");
    if (str === "OPEN") str = this.state.openNotes[0] || "0x0";
    return str;
  }

  /** Assemble declarative STRK20 actions into atomic Starknet Calls */
  public assembleCalls(actions: Strk20Action[]): Call[] {
    const calls: Call[] = [];

    for (const action of actions) {
      if (action.type === "APPROVE" || action.type === "withdraw") {
        const token = this.substitute(action.token || "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d");
        const spender = this.substitute(action.spender || action.recipient || this.state.poolAddress);
        const amt = action.amount?.startsWith("0x") ? action.amount : num.toHex(BigInt(action.amount || "1"));
        const amtBig = num.toBigInt(amt);
        const low = num.toHex(amtBig & 0xffffffffffffffffffffffffffffffffn);
        const high = num.toHex(amtBig >> 128n);

        calls.push({
          contractAddress: token,
          entrypoint: "approve",
          calldata: [spender, low, high],
        });
      } else if (action.type === "DEPOSIT" && action.noteCommitment) {
        const pool = this.substitute(action.pool || this.state.poolAddress);
        const amt = action.amount?.startsWith("0x") ? action.amount : num.toHex(BigInt(action.amount || "1"));
        calls.push({
          contractAddress: pool,
          entrypoint: "deposit",
          calldata: [action.noteCommitment, amt, "0x0", "0"],
        });
      } else if ((action.type === "INVOKE_EXTERNAL" || action.type === "invoke") && (action.targetContract || action.contract)) {
        const target = this.substitute(action.targetContract || action.contract || this.state.poolAddress);
        const entrypoint = action.entrypoint || "privacy_invoke";
        const rawCalldata = action.calldata || [];
        const substitutedCalldata = rawCalldata.map((c) => this.substitute(c));

        calls.push({
          contractAddress: target,
          entrypoint,
          calldata: substitutedCalldata,
        });
      }
    }
    return calls;
  }

  /**
   * The Core Method: strk20InvokeTransaction
   * Enables the dApp to run live on Starknet Mainnet & Testnet without crashing
   */
  public async strk20InvokeTransaction(actions: Strk20Action[]): Promise<{ transaction_hash: string }> {
    if (this.account && typeof this.account.strk20InvokeTransaction === "function") {
      return this.account.strk20InvokeTransaction(actions);
    }

    const calls = this.assembleCalls(actions);

    if (this.account && typeof this.account.execute === "function") {
      const response = await this.account.execute(calls);
      return { transaction_hash: response.transaction_hash };
    }

    const simHash = "0x0" + num.toHex(BigInt(Date.now())).slice(2) + "0000000000000000";
    return { transaction_hash: simHash.slice(0, 66) };
  }
}
