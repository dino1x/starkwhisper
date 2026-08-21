const { RpcProvider, Contract, num } = require("starknet");

async function check() {
  const provider = new RpcProvider({ nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" });
  const address = "0x041488ec033AFB2bB6Fc991c3B38FC30473051FF02aaD40cA517E73D76e1F133";
  const strkTokenAddress = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

  console.log(`Checking account: ${address}`);
  try {
    const classHash = await provider.getClassHashAt(address);
    console.log(`[OK] Account is initialized on-chain with class hash: ${classHash}`);
  } catch (err) {
    console.log(`[FAIL] Account is not yet initialized on Sepolia: ${err.message}`);
    console.log(`Note: To initialize it: Open Argent X / Braavos on Sepolia, make sure you have test STRK, and complete the account setup transaction.`);
  }
}

check();
