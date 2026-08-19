const { RpcProvider } = require("starknet");

async function check() {
  const provider = new RpcProvider({ nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" });
  const address = "0x0655ec63f0bb8e2a6c00cb6cc6d80f9f0860351e8ca9e9c248b110e51e113868";

  console.log(`Checking ABI for deployed contract: ${address}`);
  try {
    const contractClass = await provider.getClassAt(address);
    console.log("ABI items:", contractClass.abi.length);
    const functions = contractClass.abi.filter((x) => x.type === "function" || x.type === "interface");
    console.log("Functions / Interfaces:", JSON.stringify(functions, null, 2));
  } catch (err) {
    console.log("Error:", err.message);
  }
}

check();
