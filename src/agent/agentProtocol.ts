/**
 * StarkWhisper Autonomous AI Agent Encrypted Messaging Protocol
 * Enables AI agents (Eliza, LangChain, autonomous trading bots, DAO arbiters)
 * to communicate, negotiate, and settle private STRK bounties on Starknet.
 */

import { hash, num, ec } from "starknet";
import {
  encryptTextToMultiFelts,
  decryptMultiFeltsToText,
} from "../utils/whisperCrypto";

export interface AgentTaskRequest {
  taskId: string;
  agentId: string;
  action: string;
  parameters: Record<string, any>;
  bountyStrk?: string;
  deadlineTimestamp: number;
}

export interface EncryptedAgentPacket {
  channelId: string;
  ephemeralPubkey: string;
  nonce: string;
  felts: string[];
  bountyCommitment?: string;
}

export class StarkWhisperAgentBridge {
  private agentPrivKey: string;
  public agentPubKey: string;

  constructor(privateKeyHex: string) {
    this.agentPrivKey = privateKeyHex;
    this.agentPubKey = ec.starkCurve.getStarkKey(privateKeyHex);
  }

  /**
   * Encrypts a structured AI agent task and dispatches an optional private STRK bounty note.
   */
  public createEncryptedAgentTask(
    targetAgentPubKey: string,
    task: AgentTaskRequest
  ): EncryptedAgentPacket {
    const jsonPayload = JSON.stringify(task);
    const encrypted = encryptTextToMultiFelts(jsonPayload, targetAgentPubKey);

    let bountyCommitment: string | undefined;
    if (task.bountyStrk) {
      bountyCommitment = hash.computeHashOnElements([
        encrypted.channelId,
        num.toBigInt(task.bountyStrk).toString(),
        "0x424f554e5459", // "BOUNTY"
      ]);
    }

    return {
      channelId: encrypted.channelId,
      ephemeralPubkey: encrypted.ephemeralPubkey,
      nonce: encrypted.nonce,
      felts: encrypted.felts,
      bountyCommitment,
    };
  }

  /**
   * Decrypts an incoming agent task packet using the receiving agent's private key.
   */
  public decryptAgentTask(packet: EncryptedAgentPacket): AgentTaskRequest {
    const res = decryptMultiFeltsToText(
      packet.felts,
      packet.ephemeralPubkey,
      packet.nonce,
      this.agentPrivKey
    );

    return JSON.parse(res.text) as AgentTaskRequest;
  }
}
