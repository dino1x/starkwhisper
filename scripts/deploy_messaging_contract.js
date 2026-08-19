/**
 * Automated Deployment Script for StarkWhisperCore / MessagingAnonymizer
 * Uses starknet.js RpcProvider and Account to declare and deploy the Cairo contract.
 *
 * Usage:
 *   ACCOUNT_ADDRESS=0x... PRIVATE_KEY=0x... node scripts/deploy_messaging_contract.js
 */

const { Account, RpcProvider, json, Contract } = require("starknet");
const fs = require("fs");
const path = require("path");

async function main() {
  const accountAddress = process.env.ACCOUNT_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  const nodeUrl =
    process.env.STARKNET_NODE_URL ||
    "https://starknet-sepolia.public.blastapi.io/rpc/v0_7";

  if (!accountAddress || !privateKey) {
    console.log("================================================================");
    console.log("  StarkWhisper Smart Contract Deployment Helper");
    console.log("================================================================\n");
    console.log("ℹ️  To deploy to Starknet Sepolia, please set environment variables:");
    console.log("   export ACCOUNT_ADDRESS=\"0x...\"");
    console.log("   export PRIVATE_KEY=\"0x...\"");
    console.log("\n   Then re-run: node scripts/deploy_messaging_contract.js\n");
    console.log("Current Deployed Messaging Anonymizer Reference Address:");
    console.log("   Sepolia / Mainnet: 0x78ae662e0cc6d1ab2cfeaf2a51ba8783d88e31886f88a794d142f95a6f8735b\n");
    return;
  }

  console.log(`Connecting to Starknet Sepolia RPC: ${nodeUrl}`);
  const provider = new RpcProvider({ nodeUrl });
  const account = new Account(provider, accountAddress, privateKey);

  console.log(`Deployer Account: ${accountAddress}`);

  const sierraPath = path.join(
    __dirname,
    "../cairo/target/dev/strk20_invoke_helper_StarkWhisperCore.contract_class.json"
  );
  const casmPath = path.join(
    __dirname,
    "../cairo/target/dev/strk20_invoke_helper_StarkWhisperCore.compiled_contract_class.json"
  );

  if (!fs.existsSync(sierraPath)) {
    console.log(
      `Sierra file not found at ${sierraPath}. Please run 'cd cairo && scarb build' first.`
    );
    return;
  }

  const sierra = json.parse(fs.readFileSync(sierraPath).toString("ascii"));
  const casm = json.parse(fs.readFileSync(casmPath).toString("ascii"));

  console.log("Declaring StarkWhisperCore contract class...");
  const declareResponse = await account.declare({
    contract: sierra,
    casm: casm,
  });

  console.log(`Class Hash: ${declareResponse.class_hash}`);
  await provider.waitForTransaction(declareResponse.transaction_hash);

  console.log("Deploying contract instance via UDC...");
  const deployResponse = await account.deployContract({
    classHash: declareResponse.class_hash,
  });

  console.log(`Deployment Transaction: ${deployResponse.transaction_hash}`);
  await provider.waitForTransaction(deployResponse.transaction_hash);

  console.log("================================================================");
  console.log(`🎉 Deployed StarkWhisperCore Address: ${deployResponse.contract_address}`);
  console.log("================================================================\n");
  console.log("Please update your .env.local and strk20.json with this address!");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
