# STRK20 Privacy Starter Kit

A minimal, batteries-included Next.js starter for building **privacy dApps on Starknet** with [STRK20](https://eprint.iacr.org/2026/474) — the note-based privacy pool for any ERC-20 — through **`WalletAccountV6`** (starknet.js v10). Shield, unshield, privately transfer, read shielded balances, and run an **anonymizer** (`privacy_invoke`) — all through the user's privacy-enabled wallet, never touching a viewing key.

Use it as a working reference for the two things that are hardest to get right the first time:

1. **Wallet-mediated privacy invocation** — connecting, building STRK20 actions, and the placeholder-string / event-verification quirks.
2. **A helper (anonymizer) contract** — a minimal `privacy_invoke` Cairo contract you deploy and call atomically from the pool.

> This is a **starter/demo**: fixed token (STRK), fixed amounts, and an *echo* helper (a no-op round-trip that just exercises the flow). Values marked `DEMO` in the code are meant to be replaced.

## Features

- **Connect** via `get-starknet` v6 wallet-standard discovery with a wallet picker (Ready / Xverse), and the `eip1193Adapters: []` fix that stops MetaMask unlock-popup spam.
- **Shield / Unshield / Private transfer** through `WalletAccountV6.strk20InvokeTransaction(...)`.
- **Shielded balances** via `strk20Balances([])` (wallet-mediated, no keys).
- **Echo anonymizer round-trip** — the `withdraw → privacy_invoke → refill open note` pattern, with on-chain `Invoked`-event verification.
- **Deploy the helper from the UI** (`deployContract` via UDC), network-aware (Mainnet / Sepolia).
- Lean, dependency-light: Next.js + React + starknet.js + zustand. No component framework.

## Stack

Next.js 16 · React 19 · TypeScript · `starknet@10.4.0` (`WalletAccountV6`) · `@starknet-io/get-starknet-discovery@6` + `-wallet-standard@6` · `zustand`. Cairo helper: Scarb + `starknet 2.18`.

## Quick start

```bash
git clone <your-fork-url>
cd Starknet-WalletAccount
npm install
cp .env.example .env.local        # then add your Alchemy key
npm run dev                        # http://localhost:3000
```

You need a free [Alchemy](https://alchemy.com) Starknet RPC key (`NEXT_PUBLIC_PROVIDER_URL`) and a **privacy-enabled wallet** (the Ready extension) on Sepolia or Mainnet. See `.env.example` for all variables.

## How it works

| Concern | Where | Notes |
|---|---|---|
| Connect + wallet picker | `src/app/components/client/WalletHandle/SelectWallet.tsx` | `createStore({ eip1193Adapters: [] })`, wallet-standard discovery, modal picker |
| STRK20 actions + UI | `src/app/components/client/WalletHandle/WalletAccountV6Tag.tsx` | shield/send/unshield/echo/balances tabs; action shapes; placeholder strings; receipt + event verification |
| Config (token, providers, helper) | `src/utils/constants.ts` | `DEMO`-labelled values to swap |
| App shell / theme | `src/app/page.tsx`, `src/app/uni.module.css` | |
| Wallet / provider state | `src/app/components/Wallet/walletContext.ts`, `.../provider/providerContext.ts` | zustand stores |
| Example anonymizer | `cairo/src/lib.cairo` | `StrkInvokeHelper` — the `privacy_invoke` entrypoint |

**The invoke placeholder rule** (a common footgun): in the `invoke` action, `"OPEN"`, `"${poolAddress}"`, and `"${openNoteIds[0]}"` are literal strings the wallet substitutes during proof assembly — do **not** hex-normalize them. Only real values (token, amounts) get `num.toHex`.

## The example anonymizer

`cairo/src/lib.cairo` is a complete minimal anonymizer. The pool calls its `privacy_invoke(token, pool_address, note_id) -> Span<OpenNoteDeposit>` atomically: it validates the caller is the pool, reads the tokens the pool just sent, approves them back, emits `Invoked`, and returns an open-note deposit the pool credits as a private note. Its class is already declared on Mainnet + Sepolia, so the UI can deploy a fresh instance with a single UDC deploy (no constructor).

**To build your own:** replace the echo body with a real protocol action (swap, vault deposit, lend). The `privacy_invoke` shape stays the same; only the middle changes. You own the review, `snforge` tests, and **audit** before mainnet.

## Adapting this starter

- **Token** → `addrSTRK` in `src/utils/constants.ts` (or make it a user selection).
- **Amounts** → the `DEMO` amounts in `WalletAccountV6Tag.tsx` (replace with real amount inputs).
- **Helper contract** → point `Strk20EchoHelper*` at your deployed anonymizer; swap `cairo/src/lib.cairo` for your real one.
- **Branding** → title/metadata in `src/app/layout.tsx`, the `2Ø`/STRK20 mark in the nav (`src/app/page.tsx`, `public/tokens/`), and copy in `page.tsx`.

## Deploy

Standard Next.js — deploy to [Vercel](https://vercel.com/new) and set `NEXT_PUBLIC_PROVIDER_URL` (and optionally `NEXT_PUBLIC_STRK20_ECHO_HELPER_SEPOLIA`) as env vars.

## Notes & caveats

- **Privacy wallets:** Ready today; Xverse's dapp-facing Wallet API is landing. Other wallets aren't STRK20-ready — the app degrades gracefully.
- **Testnet first.** Deposit amounts are the public ERC-20 legs and stay visible; the pool enforces deposit screening on-chain.
- Method names on the `next`-tag releases can drift — cross-check against the [WalletAccount guide](https://starknet-js.com/docs/next/guides/account/walletAccount/#with-get-starknet-v6).

## Links

- STRK20 by example: https://strk20-by-example.org/
- Privacy SDK monorepo: https://github.com/starkware-libs/starknet-privacy
- Wallet test dapp: https://starknet-wallet-account.vercel.app/

## Credits

Bootstrapped from [PhilippeR26/Starknet-WalletAccount](https://github.com/PhilippeR26/Starknet-WalletAccount) (the wallet-API demo dapp), then trimmed and refocused into a STRK20 privacy starter.
