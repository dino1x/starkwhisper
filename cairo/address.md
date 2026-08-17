# StarkWhisper Cairo Contract Deployments & Addresses

## Deployed Anonymizer Contracts (Mainnet & Sepolia)

- **MessagingAnonymizer Class Hash**: `0x2a4482a13cb7f70dce6f7ba99c4ee6ce404379abeddd9b831b6bf24eb71e137`
- **Mainnet Helper Address**: `0x78ae662e0cc6d1ab2cfeaf2a51ba8783d88e31886f88a794d142f95a6f8735b`
- **Sepolia Helper Address**: Set via `NEXT_PUBLIC_MESSAGING_HELPER_SEPOLIA` environment variable.

## Deploying a Custom Anonymizer Helper Instance

To deploy a fresh instance of `MessagingAnonymizer`:
1. Compile Cairo contract in `cairo/`: `scarb build`
2. Execute UDC deployment using `MessagingAnonymizerClassHash` with 0 constructor arguments.
3. Update `.env.local` or environment variables:
   ```env
   NEXT_PUBLIC_MESSAGING_HELPER_MAINNET=0xYourDeployedAddress
   NEXT_PUBLIC_MESSAGING_HELPER_SEPOLIA=0xYourDeployedAddress
   ```
