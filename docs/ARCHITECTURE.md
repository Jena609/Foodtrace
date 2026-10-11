# FoodTrace architecture

FoodTrace is a Next.js application with a Python Intelligent Contract. The public page, the application, and the marketing pages use separate layouts. `/` renders the animated landing page only. Enter FoodTrace links to `/lookup`. Application links such as Lookup, History, Alerts, Inventory, and Settings are mounted by the application layout, not by the landing page.

## Routes

| Route | Role |
| --- | --- |
| `/` | Public landing page |
| `/lookup` | Product lookup |
| `/results/[id]` | Evidence and GenLayer verification |
| `/report/[id]` | Verification report |
| `/inventory` | Saved products |
| `/alerts` | Alert list |
| `/history` | Earlier lookups |
| `/settings` | Local settings |
| `/appeal/[id]` | Appeal form |
| `/product`, `/how-it-works`, `/for-businesses`, `/trust-evidence` | Information pages |

## Data

Prisma and SQLite store lookups, evidence, reports, inventory, and appeal records. The database file is local and gitignored. Product matching lives in `lib/matching`. Source adapters live in `lib/sources`. The demo catalog is fictional and labeled. openFDA, manufacturer, and retailer adapters run only when their environment values are set.

## GenLayer

`lib/genlayer/config.ts` resolves mock or studio mode. Studio mode is ready only for the Studio Next RPC and a valid contract address. `lib/genlayer/browser.ts` estimates the write fee and submits `distribution` and `feeValue` from that estimate. `lib/genlayer/studio.ts` prepares the payload, stores the transaction hash, and reads the contract. `lib/genlayer/observation.ts` maps explorer and receipt status. A verdict is applied only when the transaction is finalized and `get_verification_result` returns an allowed status for the same evaluation id.

## Wallet

`lib/wallet/config.ts` uses the SDK `studioDevnet` chain. `components/wallet` connects injected EIP-1193 wallets and, when configured, WalletConnect. The wallet state machine records connection, rejection, disconnection, account changes, and chain changes. FoodTrace does not store private keys, seed phrases, or wallet passwords.
