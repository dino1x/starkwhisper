const { Account, RpcProvider, ec, hash, num } = require("starknet");

const ARGENT_CLASS_HASH = "0x036078334509b514626504edc9fb252328d1a240e4e948bef8d0c08dff45927f";
const OZ_CLASS_HASH = "0x061dac032f228ac40e00adc64724b5c704e1ff1e9f8cf69fb4d39f4d47dc8c8f";

async function tryDeploy() {
  const provider = new RpcProvider({ nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" });
  const address = "0x041488ec033AFB2bB6Fc991c3B38FC30473051FF02aaD40cA517E73D76e1F133";
  const privateKey = "0x05db04fbfe5f8d754552a90e96a96b2d060a7e4f46d809c7f11f89c5c279c7e9";
  const publicKey = ec.starkCurve.getStarkKey(privateKey);

  console.log(`Attempting account initialization on Sepolia for: ${address}`);
  console.log(`Public Key: ${publicKey}`);

  const account = new Account({
    provider,
    address,
    signer: privateKey,
  });

  // Try standard deployAccount
  try {
    const res = await account.deployAccount({
      classHash: OZ_CLASS_HASH,
      constructorCalldata: [publicKey],
      addressSalt: publicKey,
    });
    console.log(`Account deployed! Tx: ${res.transaction_hash}`);
    await provider.waitForTransaction(res.transaction_hash);
  } catch (err) {
    console.log(`Auto deploy failed: ${err.message}`);
    console.log("ℹ️ Please open Argent X and click 'Setup Account' or send a transaction.");
  }
}

tryDeploy();
