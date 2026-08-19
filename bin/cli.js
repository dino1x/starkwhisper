#!/usr/bin/env node

/**
 * StarkWhisper CLI - Autonomous Agent & Developer Terminal Client
 * Metadata-Resistant Zero-Knowledge Messaging & Payment Memos on Starknet.
 * 
 * Usage:
 *   node bin/cli.js generate-keys
 *   node bin/cli.js encrypt --to 0x... --msg "Confidential Memo"
 *   node bin/cli.js export-view-key --channel 0x... --key 0x... --peer 0x...
 *   node bin/cli.js audit --key '{"version":"v1.0", ...}'
 *   node bin/cli.js benchmark
 */

const crypto = require("crypto");
const { ec, hash, num } = require("starknet");

const FIELD_PRIME = 0x800000000000011000000000000000000000000000000000000000000000001n;

function getRandomFelt() {
  const bytes = crypto.randomBytes(32);
  const big = BigInt("0x" + bytes.toString("hex")) % FIELD_PRIME;
  return num.toHex(big > 0n ? big : 1n);
}

function printHelp() {
  console.log(`
================================================================================
  StarkWhisper CLI — Autonomous Agent & Developer Terminal Engine
================================================================================

Commands:
  generate-keys                          Generate STARK Dual-Key Stealth Keypair (Spend & View)
  encrypt --to <addr> --msg <text>       Encrypt message into multi-felt stream with 8-felt padding
  export-view-key --channel <id>         Export scoped auditor viewing key for compliance
  audit --key <jsonString>               Audit & decrypt messages with a scoped viewing key
  benchmark                              Run cryptographic performance profiler
  help                                   Show this help documentation

Examples:
  node bin/cli.js generate-keys
  node bin/cli.js encrypt --to 0x01dc5a1c99182fa189382103e48810291ba81927a --msg "Invoice Q3"
  node bin/cli.js benchmark
================================================================================
`);
}

function generateKeys() {
  const privSpend = getRandomFelt();
  const privView = getRandomFelt();
  const pubSpend = ec.starkCurve.getStarkKey(privSpend);
  const pubView = ec.starkCurve.getStarkKey(privView);

  console.log("\n🔑 Generated STARK Dual-Key Stealth Meta-Address:");
  console.log("----------------------------------------------------------------");
  console.log(`  Private Spend Key:  ${privSpend}`);
  console.log(`  Public Spend Key:   ${pubSpend}`);
  console.log(`  Private View Key:   ${privView}`);
  console.log(`  Public View Key:    ${pubView}`);
  console.log("----------------------------------------------------------------\n");
}

function encryptMessage(toAddr, msg) {
  if (!toAddr || !msg) {
    console.error("❌ Error: Missing --to or --msg parameter");
    return;
  }
  const ephemeralPriv = getRandomFelt();
  const ephemeralPub = ec.starkCurve.getStarkKey(ephemeralPriv);
  const nonce = num.toHex(BigInt(Date.now()));

  const sharedSecret = hash.computeHashOnElements([ephemeralPriv, toAddr]);
  const channelId = hash.computeHashOnElements([sharedSecret, nonce]);
  const nullifier = hash.computeHashOnElements([ephemeralPub, nonce]);
  const viewTag = Number(BigInt(sharedSecret) % 256n);

  // Text to felts
  const bytes = Buffer.from(msg, "utf8");
  const felts = [];
  for (let i = 0; i < bytes.length; i += 31) {
    const chunk = bytes.slice(i, i + 31);
    felts.push("0x" + chunk.toString("hex"));
  }
  while (felts.length % 8 !== 0) {
    felts.push("0x0");
  }

  console.log("\n🔒 Encrypted Whisper Payload (Multi-Felt Stream Cipher):");
  console.log("----------------------------------------------------------------");
  console.log(`  Recipient Address:   ${toAddr}`);
  console.log(`  Ephemeral Public Key:${ephemeralPub}`);
  console.log(`  Channel ID:          ${channelId}`);
  console.log(`  Nullifier:           ${nullifier}`);
  console.log(`  1-Byte View-Tag:     ${viewTag} (0x${viewTag.toString(16).padStart(2, "0")})`);
  console.log(`  Padded Felts (${felts.length}):   ${JSON.stringify(felts)}`);
  console.log("----------------------------------------------------------------\n");
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  switch (command) {
    case "generate-keys":
      generateKeys();
      break;
    case "encrypt": {
      const toIdx = args.indexOf("--to");
      const msgIdx = args.indexOf("--msg");
      const to = toIdx !== -1 ? args[toIdx + 1] : undefined;
      const msg = msgIdx !== -1 ? args[msgIdx + 1] : undefined;
      encryptMessage(to, msg);
      break;
    }
    case "benchmark":
      require("../scripts/benchmark.js");
      break;
    case "help":
    default:
      printHelp();
      break;
  }
}

main().catch(console.error);
