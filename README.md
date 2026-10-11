# FoodTrace

A transparent food-recall and product-batch verification platform powered by GenLayer Intelligent Contracts.

FoodTrace helps you trace products, check recall information, and understand the evidence behind every result.

FoodTrace is an information and verification tool. It does not guarantee that food is safe and does not replace official food-safety guidance.

## Why FoodTrace

A barcode scan or a product name is not a safety certification. FoodTrace keeps the product identity, the sources that were checked, and the resulting verdict together. A result can say that recall information was found, that no matching recall was found in the checked sources, that the supplied date is expired, that the sources conflict, or that the product could not be verified. It never says that a product is safe to eat.

## Features

- Public landing page at `/`, with Enter FoodTrace opening `/lookup`.
- Product lookup, evidence, verification reports, inventory, alerts, history, settings, and appeals.
- Local matching for barcode, lot, name, brand, expiration, conflicts, and missing lot numbers.
- Mock mode for local review, labeled as a mock result.
- Studio mode for GenLayer Studio Next, using a connected wallet and the deployed FoodTrace contract.
- Injected EVM wallets through EIP-6963, plus WalletConnect when a project id is configured.

## Consumer flow

1. Open the landing page and choose Enter FoodTrace.
2. Enter the product name, brand, barcode, lot or batch number, expiration date, and region.
3. Review the evidence before any wallet request.
4. In Studio mode, choose Verify with GenLayer, review the fee, and sign in the connected wallet.
5. Read the transaction hash, the GenLayer status, and the FoodTrace verdict.
6. Open the verification report. Appeal a finalized result when a new public evidence URL is available.

## Business flow

Business pages at `/for-businesses` explain how a manufacturer or retailer can supply evidence. Inventory at `/inventory` tracks products the operator has added. FoodTrace does not create a second dashboard and does not turn an inventory record into a safety certification.

## GenLayer integration

Studio mode uses GenLayer Studio Next:

| Setting | Value |
| --- | --- |
| Network | GenLayer Studio Next |
| Canonical name | `studio-dev` |
| Chain ID | `61997` |
| RPC | `https://studio-dev.genlayer.com/api` |
| Explorer | `https://explorer-studio-dev.genlayer.com` |
| Studio app | `https://studio-dev.genlayer.com` |
| Currency | GEN, 18 decimals |

The app accepts `NEXT_PUBLIC_GENLAYER_NETWORK=studio` for this network. Studionet (`https://studio.genlayer.com/api`, chain `61999`) is rejected. The JavaScript SDK chain object is `studioDevnet` from `genlayer-js` `2.0.0-rc.1`.

The contract source is `contracts/foodtrace.py`. Its methods are `submit_verification_request`, `get_verification_result`, `get_evidence_history`, `submit_appeal`, and `finalize_verification`. `finalize_verification` reads the stored verdict. Chain finality is the transaction status.

## Wallet support

FoodTrace uses wagmi, viem, and EIP-1193 providers. Injected wallets that announce themselves through EIP-6963 can connect, including MetaMask, Rabby, Coinbase Wallet, OKX Wallet, Trust Wallet, Brave Wallet, and other compatible EVM wallets. WalletConnect is included when `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set.

The app can connect, disconnect, read the active account and chain, request a switch to chain `61997`, and show the address. A rejected signature, a wrong network, an account change, or a chain change stays visible. The app does not ask for a private key, seed phrase, or wallet password.

## Studio Next setup

Copy `.env.example` to `.env`. Leave mock mode in place until the RPC and contract address are set. Studio mode also needs a wallet on chain `61997` with enough GEN for the quoted fee. Test GEN comes from the water-drop control in the Studio Next account selector at https://studio-dev.genlayer.com.

## Local development

```bash
cd C:\Users\prade\foodtrace
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open http://localhost:3460.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `FOODTRACE_GENLAYER_MODE` | `mock` or `studio`. Any other value stays in mock. |
| `NEXT_PUBLIC_GENLAYER_NETWORK` | `studio` for Studio Next. |
| `NEXT_PUBLIC_GENLAYER_RPC_URL` | `https://studio-dev.genlayer.com/api` in Studio mode. |
| `NEXT_PUBLIC_FOODTRACE_CONTRACT_ADDRESS` | Deployed FoodTrace contract. Empty until Studio mode is intended. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional WalletConnect project id. |
| `NEXT_PUBLIC_APP_URL` | Public origin. Localhost evidence is not sent to validators. |
| `FOODTRACE_OPENFDA_ENABLED` | Enables the openFDA adapter when `true`. |
| `FOODTRACE_MANUFACTURER_API_URL` | Optional manufacturer evidence API. |
| `FOODTRACE_RETAILER_API_URL` | Optional retailer evidence API. |
| `FOODTRACE_SESSION_SECRET` | Local session signing secret. Never commit a real secret. |
| `FOODTRACE_ADMIN_TOKEN` | Admin API token. The admin API stays closed while this is empty. |

`.env.example` contains placeholders only. `.env` and `.env.local` are gitignored.

## Smart-contract deployment

Deployment steps, fee estimation, and the saved contract address are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). The finalized deployment recorded from the Studio Next explorer is in [docs/TRANSACTIONS.md](docs/TRANSACTIONS.md).

## Real transaction flow

In Studio mode the lookup stores a local result, then the verification panel prepares a contract call. The wallet signs `submit_verification_request`. The app stores the transaction hash and reads the explorer and the contract until the transaction is finalized and the stored verdict matches that evaluation id. A result is not described as finalized before that receipt exists. A Studio error stays in Studio mode and does not switch the app to mock mode.

## Mock mode

`FOODTRACE_GENLAYER_MODE=mock` evaluates the configured local sources and labels the result:

`MOCK RESULT. Demo data was evaluated locally. GenLayer did not finalize this result.`

Mock mode does not send a blockchain transaction and does not claim that validators processed the result.

## Studio mode

`FOODTRACE_GENLAYER_MODE=studio` uses Studio Next only when the RPC is `https://studio-dev.genlayer.com/api` and the contract address is valid. If either value is missing or the RPC is a different network, verification is unavailable and no mock result is substituted.

## Testing

```bash
npm test
npm run typecheck
npm run build
```

The automated tests cover matching, source safeguards, wallet state, mock and Studio configuration, transaction observation, reports, and fee coverage. The browser checklist is [docs/MANUAL_TEST_CHECKLIST.md](docs/MANUAL_TEST_CHECKLIST.md).

## Project structure

FoodTrace uses the Next.js App Router at the repository root. The routes and libraries below are the running application. They are not nested under `src/`.

```text
app/(public)/page.tsx          Public landing page
app/(app)/                     Lookup, results, reports, inventory, alerts, history, settings, appeals
app/(marketing)/               Product, how it works, businesses, and trust pages
app/api/                       Lookup, evidence, reports, inventory, appeals, and GenLayer routes
components/intro/              Landing page and animated scene
components/wallet/             Wallet connection
components/results/            Evidence and verification panel
contracts/foodtrace.py         Intelligent Contract
lib/genlayer/                  Studio Next client, fees, and transaction observation
lib/wallet/                    Chain, wallet state, and fee coverage
lib/matching/                  Recall matching
prisma/                        SQLite application data
docs/                          Architecture, deployment, transactions, and checklists
tests/                         Unit and flow tests
```

## Roadmap

- Show the quoted Studio Next fee before the wallet signature prompt.
- Decode named contract methods in the transaction history.
- Record an appeal only after an explorer receipt for `submit_appeal` is finalized.
- Publish the public site from this repository without committing secrets.

## Safety disclaimer

FoodTrace is an information and verification tool. It does not guarantee that food is safe and does not replace official food-safety guidance.
