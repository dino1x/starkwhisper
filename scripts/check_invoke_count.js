const { RpcProvider } = require("starknet");

async function check() {
  const provider = new RpcProvider({ nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" });
  const address = "0x0655ec63f0bb8e2a6c00cb6cc6d80f9f0860351e8ca9e9c248b110e51e113868";

  console.log(`Querying on-chain invoke count from: ${address}`);
  try {
    const res = await provider.callContract({
      contractAddress: address,
      entrypoint: "get_invoke_count",
      calldata: [],
    });
    console.log("On-Chain Invoke Count Result:", res);
    console.log("Anonymity Count:", BigInt(res[0] || "0").toString());
  } catch (err) {
    console.error("Error querying get_invoke_count:", err.message);
  }
}

check();
