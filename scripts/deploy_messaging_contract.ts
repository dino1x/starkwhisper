import { Account, RpcProvider, json, ContractFactory } from "starknet";
import * as fs from "fs";
import * as path from "path";

/**
 * StarkWhisper MessagingAnonymizer Deployment Script
 *
 * Usage:
 *   npx ts-node scripts/deploy_messaging_contract.ts
 *
 * Environment variables needed:
 *   STARKNET_RPC_URL - RPC Endpoint (e.g. Sepolia / Mainnet Alchemy node)
 *   ACCOUNT_ADDRESS  - Deployer Starknet Account Address
 *   PRIVATE_KEY      - Deployer Private Key
 */
async function main() {
  const rpcUrl = process.env.STARKNET_RPC_URL || "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/demo";
  const accountAddress = process.env.ACCOUNT_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;

  if (!accountAddress || !privateKey) {
    console.log("⚠️ Set ACCOUNT_ADDRESS and PRIVATE_KEY in environment to run live on-chain deployment.");
    console.log("ℹ️ Example: $env:ACCOUNT_ADDRESS='0x...'; $env:PRIVATE_KEY='0x...'; npx ts-node scripts/deploy_messaging_contract.ts");
    return;
  }

  const provider = new RpcProvider({ nodeUrl: rpcUrl });
  const account = new Account(provider, accountAddress, privateKey);

  console.log(`🚀 Deploying MessagingAnonymizer on network via account ${accountAddress}...`);

  // Path to compiled Sierra artifact from Scarb build
  const sierraPath = path.join(__dirname, "../cairo/target/dev/strk20_invoke_helper_MessagingAnonymizer.contract_class.json");
  const casmPath = path.join(__dirname, "../cairo/target/dev/strk20_invoke_helper_MessagingAnonymizer.compiled_contract_class.json");

  if (!fs.existsSync(sierraPath)) {
    console.error(`❌ Sierra artifact not found at ${sierraPath}. Run 'scarb build' inside cairo directory first.`);
    return;
  }

  const sierraArtifact = json.parse(fs.readFileSync(sierraPath, "utf-8"));
  const casmArtifact = json.parse(fs.readFileSync(casmPath, "utf-8"));

  const contractFactory = new ContractFactory({
    compiledContract: sierraArtifact,
    casm: casmArtifact,
    account,
  });

  const deployResponse = await contractFactory.deploy();
  console.log(`⌛ Transaction submitted! Tx Hash: ${deployResponse.transaction_hash}`);
  console.log(`⌛ Contract Address: ${deployResponse.contract_address}`);

  await provider.waitForTransaction(deployResponse.transaction_hash);
  console.log(`✅ MessagingAnonymizer successfully deployed at: ${deployResponse.contract_address}`);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
});
