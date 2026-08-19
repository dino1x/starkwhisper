const { RpcProvider, Contract, num, uint256 } = require("starknet");

const STRK_TOKEN = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const ETH_TOKEN = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

async function checkBalance() {
  const provider = new RpcProvider({ nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" });
  const address = "0x00E45a8c0F4De0Bbd9FE24090b89C977eE27af5F59d3434D7Cf540e24790bF60";

  console.log(`Checking balances for: ${address}`);

  // Query STRK balance
  try {
    const strkRes = await provider.callContract({
      contractAddress: STRK_TOKEN,
      entrypoint: "balanceOf",
      calldata: [address],
    });
    const low = BigInt(strkRes[0] || "0");
    const high = BigInt(strkRes[1] || "0");
    const balance = (high << 128n) + low;
    console.log(`STRK Balance: ${(Number(balance) / 1e18).toFixed(4)} STRK`);
  } catch (err) {
    console.log(`Error reading STRK balance: ${err.message}`);
  }

  // Query ETH balance
  try {
    const ethRes = await provider.callContract({
      contractAddress: ETH_TOKEN,
      entrypoint: "balanceOf",
      calldata: [address],
    });
    const low = BigInt(ethRes[0] || "0");
    const high = BigInt(ethRes[1] || "0");
    const balance = (high << 128n) + low;
    console.log(`ETH Balance: ${(Number(balance) / 1e18).toFixed(4)} ETH`);
  } catch (err) {
    console.log(`Error reading ETH balance: ${err.message}`);
  }
}

checkBalance();
