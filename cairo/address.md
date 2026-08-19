# StarkWhisper Cairo Contract Deployments & Addresses

## Deployed Anonymizer Contracts (Mainnet & Sepolia)

- **StarkWhisperCore Class Hash**: `0x2a4482a13cb7f70dce6f7ba99c4ee6ce404379abeddd9b831b6bf24eb71e137`
- **Sepolia Deployed Contract**: [`0x0655ec63f0bb8e2a6c00cb6cc6d80f9f0860351e8ca9e9c248b110e51e113868`](https://sepolia.voyager.online/contract/0x0655ec63f0bb8e2a6c00cb6cc6d80f9f0860351e8ca9e9c248b110e51e113868)
- **Deployment Tx**: [`0x9a8141dba83a9d588960f84419b5524c0889006e7a74f7cc384f5441060c20`](https://sepolia.voyager.online/tx/0x9a8141dba83a9d588960f84419b5524c0889006e7a74f7cc384f5441060c20)

## Deploying a Custom Anonymizer Helper Instance

To deploy a fresh instance of `MessagingAnonymizer`:
1. Compile Cairo contract in `cairo/`: `scarb build`
2. Execute UDC deployment using `MessagingAnonymizerClassHash` with 0 constructor arguments.
3. Update `.env.local` or environment variables:
   ```env
   NEXT_PUBLIC_MESSAGING_HELPER_MAINNET=0xYourDeployedAddress
   NEXT_PUBLIC_MESSAGING_HELPER_SEPOLIA=0xYourDeployedAddress
   ```
