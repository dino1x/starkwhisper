# Application PR Draft for `starkience/strk20-hackathon`

**PR Title:** `[Application] StarkWhisper - Encrypted Messaging & Private Payment Memos`

**PR Body:**
```markdown
## Project Name
**StarkWhisper**

## Description
StarkWhisper is a metadata-resistant, end-to-end encrypted messaging & private payment memo application on Starknet powered by the STRK20 Privacy Pool. 

It allows users to send encrypted messages to any registered pool participant and attach private STRK transfers as payment memos—executing both the note spend and encrypted message storage atomically in a single zero-knowledge transaction.

## Team
- **GitHub:** @dino1x
- **Telegram:** @marvelmarvinn

## Repository
https://github.com/dino1x/starkwhisper

## Stack & Technologies Used
- STRK20 Privacy Pool (`WalletAccountV6` via `starknet.js` v10.4.0)
- Cairo 2024_07 (`IMessagingAnonymizer` contract & `privacy_invoke` adapter)
- Next.js 16, React 19, TypeScript
- Client-side ECDH key derivation & Poseidon/felt-packing string encryption

## Submission Manifest (`strk20.json`)
Included at project root (`/strk20.json`).
```
