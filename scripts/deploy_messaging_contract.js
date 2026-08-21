/**
 * Automated Deployment Script for StarkWhisperCore / MessagingAnonymizer
 * Deploys the contract instance to Starknet Sepolia via UDC.
 *
 * Usage:
 *   ACCOUNT_ADDRESS=0x... PRIVATE_KEY=0x... node scripts/deploy_messaging_contract.js
 */

const { Account, RpcProvider } = require("starknet");

const DEFAULT_CLASS_HASH = "0x2a4482a13cb7f70dce6f7ba99c4ee6ce404379abeddd9b831b6bf24eb71e137";

async function main() {
  const accountAddress = process.env.ACCOUNT_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  const classHash = process.env.CLASS_HASH || DEFAULT_CLASS_HASH;
  const nodeUrl =
    process.env.STARKNET_NODE_URL ||
    "https://api.cartridge.gg/x/starknet/sepolia";

  console.log("================================================================");
  console.log("  StarkWhisper Smart Contract Deployment on Starknet Sepolia");
  console.log("================================================================\n");

  if (!accountAddress || !privateKey) {
    console.log("ℹ️  To deploy a new contract instance on Sepolia, run with your wallet credentials:\n");
    console.log("   $env:ACCOUNT_ADDRESS=\"0x<your_argent_or_braavos_sepolia_address>\"");
    console.log("   $env:PRIVATE_KEY=\"0x<your_private_key>\"");
    console.log("   node scripts/deploy_messaging_contract.js\n");
    console.log("Current Reference Helper Address:");
    console.log("   0x78ae662e0cc6d1ab2cfeaf2a51ba8783d88e31886f88a794d142f95a6f8735b\n");
    return;
  }

  console.log(`Connecting to Starknet Sepolia RPC: ${nodeUrl}`);
  const provider = new RpcProvider({ nodeUrl });
  const account = new Account({
    provider,
    address: accountAddress,
    signer: privateKey,
  });

  console.log(`Deployer Account: ${accountAddress}`);
  console.log(`Target Class Hash: ${classHash}`);
  console.log("Submitting deployment transaction via Universal Deployer Contract (UDC)...");

  try {
    const deployResponse = await account.deployContract({
      classHash: classHash,
      constructorCalldata: [],
    });

    console.log(`Deployment Tx Sent: ${deployResponse.transaction_hash}`);
    console.log("Waiting for confirmation on Starknet Sepolia (this may take 10-30s)...");

    await provider.waitForTransaction(deployResponse.transaction_hash);

    console.log("\n================================================================");
    console.log(`[SUCCESS] Deployed Contract Address:`);
    console.log(`   ${deployResponse.contract_address}`);
    console.log(`Explorer: https://sepolia.voyager.online/contract/${deployResponse.contract_address}`);
    console.log("================================================================\n");
    console.log("Next step: Set this address in your environment and constants.ts:");
    console.log(`NEXT_PUBLIC_MESSAGING_HELPER_SEPOLIA=${deployResponse.contract_address}`);
  } catch (err) {
    console.error("\n[FAIL] Deployment failed:", err.message || err);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
