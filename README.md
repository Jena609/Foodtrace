# FoodTrace

A transparent food-recall and product-batch verification platform powered by GenLayer Intelligent Contracts.

FoodTrace helps you trace products, check recall information, and understand the evidence behind every result.

FoodTrace is an information and verification tool. It does not guarantee that food is safe and does not replace official food-safety guidance.

The production app is https://foodtrace-six.vercel.app on the Vercel project `foodtrace`. Production data is hosted on Turso and is working. GenLayer Studio Next is configured. The submission notes are in [docs/SUBMISSION.md](docs/SUBMISSION.md).

## Why FoodTrace

A barcode scan or a product name is not a safety certification. FoodTrace keeps the product identity, the sources that were checked, and the resulting verdict together. A result can say that recall information was found, that no matching recall was found in the checked sources, that the supplied date is expired, that the sources conflict, or that the product could not be verified. It never says that a product is safe to eat.

## Features

- Public landing page at `/`, with Enter FoodTrace opening `/lookup`.
- Product lookup, evidence, verification reports, inventory, alerts, history, settings, and appeals.
- Local matching for barcode, lot, name, brand, expiration, conflicts, and missing lot numbers.
- Mock mode for local review, labeled as a mock result.
- Studio mode for GenLayer Studio Next. A normal product check is signed by the server. A wallet is not required for that check.
- Injected EVM wallets through EIP-6963, plus WalletConnect when a project id is configured.

## Consumer flow

1. Open https://foodtrace-six.vercel.app/ and choose Enter FoodTrace.
2. Enter the product name, brand, barcode, lot or batch number, expiration date, and region, or choose one of the four demo buttons. A demo button fills the form. Click Check Product to submit it.
3. The server stores the lookup, builds the evidence hash, and submits `submit_verification_request` to the FoodTrace contract.
4. The result page stays on GenLayer Verification: Pending while the transaction is processed.
5. It shows GenLayer Verification: Finalized only after the explorer transaction is finalized, execution succeeded, and `get_verification_result` returns that evaluation. The page then shows the network, chain ID, contract address, transaction ID, evaluation ID, explorer link, evidence hash, and evaluated time.
6. A failed or unavailable check shows the saved reason and can be retried. Refreshing a finalized result keeps it finalized.

## Demo scenarios

The demo records are fictional and are labeled `Fictional Demo Data — not an official recall notice`. They are not official recall notices.

| Demo button | Classification when finalized |
| --- | --- |
| Demo recall, exact lot | `EXACT_RECALL_MATCH` |
| Demo, no matching recall | `NO_MATCH` |
| Demo conflicting sources | `CONFLICTING_SOURCES` |
| Demo expired date | `EXPIRED_PRODUCT` |

Open https://foodtrace-six.vercel.app/lookup, choose a demo, click Check Product, and wait on the result page until the status is `FINALIZED`. A pending or unavailable row is not a successful verification.

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
| Contract address | `0x3973d96145dBe83d61b36C86266D758dD3655a14` |
| Contract deployment transaction | `0x9d468a212f615c8041ef9f0fea8652bb096ec9a8261997d89109117bdf089fa1` |
| Latest verification transaction | `0x84c3e2b9df9b98b2947d571b90e5dccb89ac40166e4f7428cbc7cce82ec2d523` |
| Latest evaluation ID | `ftv_e47a580bf59c4b66bc46c4654ac70bab` |

The contract address is the deployed FoodTrace contract. The deployment transaction created that contract. The verification transaction is a later call to the same contract, and the evaluation ID is the request id inside that call. Neither hash is the contract address.

- Contract: https://explorer-studio-dev.genlayer.com/address/0x3973d96145dBe83d61b36C86266D758dD3655a14
- Deployment transaction: https://explorer-studio-dev.genlayer.com/tx/0x9d468a212f615c8041ef9f0fea8652bb096ec9a8261997d89109117bdf089fa1
- Verification transaction: https://explorer-studio-dev.genlayer.com/tx/0x84c3e2b9df9b98b2947d571b90e5dccb89ac40166e4f7428cbc7cce82ec2d523

The explorer showed both transactions as `FINALIZED` on GenLayer Studio Next, chain `61997`. The deployment was created at 2026-10-11T16:33:15.326334Z. The verification was created at 2026-10-12T13:09:57.494762Z and the explorer recorded it `FINALIZED` at 2026-10-12T13:41:00.135Z. The public result for evaluation `ftv_e47a580bf59c4b66bc46c4654ac70bab` is https://foodtrace-six.vercel.app/results/lk_2fc5a313f48547e491b2737b1e2fa3ef.

The app accepts `NEXT_PUBLIC_GENLAYER_NETWORK=studio` for this network. Studionet (`https://studio.genlayer.com/api`, chain `61999`) is rejected. The JavaScript SDK chain object is `studioDevnet` from `genlayer-js` `2.0.0-rc.1`. Production runs with `FOODTRACE_GENLAYER_MODE=studio`.

The contract source is `contracts/foodtrace.py`. Its methods are `submit_verification_request`, `get_verification_result`, `get_evidence_history`, `submit_appeal`, and `finalize_verification`. `finalize_verification` reads the stored verdict. Chain finality is the transaction status.

## Wallet support

FoodTrace uses wagmi, viem, and EIP-1193 providers. Injected wallets that announce themselves through EIP-6963 can connect, including MetaMask, Rabby, Coinbase Wallet, OKX Wallet, Trust Wallet, Brave Wallet, and other compatible EVM wallets. WalletConnect is included when `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set.

The app can connect, disconnect, read the active account and chain, request a switch to chain `61997`, and show the address. A rejected signature, a wrong network, an account change, or a chain change stays visible. The app does not ask for a private key, seed phrase, or wallet password.

## Studio Next setup

Copy `.env.example` to `.env`. Leave mock mode in place until the RPC and contract address are set. Studio mode uses the server signer to submit a product check. A connected wallet is not required for that check. Appeals can use a wallet. The signer needs test GEN on chain `61997`. Test GEN comes from the water-drop control in the Studio Next account selector at https://studio-dev.genlayer.com.

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
| `FOODTRACE_SESSION_SECRET` | Session signing secret. Never commit a real secret. |
| `FOODTRACE_ADMIN_TOKEN` | Admin API token. The admin API stays closed while this is empty. |
| `DATABASE_URL` | Local SQLite file, usually `file:./dev.db`. This is not the production database. |
| `TURSO_DATABASE_URL` | Production Turso database URL. Server-only. |
| `TURSO_AUTH_TOKEN` | Production Turso token. Server-only. |
| `FOODTRACE_GENLAYER_SIGNER_PRIVATE_KEY` | Server signer for Studio writes. Server-only. Never commit a real key. |

`.env.example` contains placeholders only. `.env` and `.env.local` are gitignored.

## Smart-contract deployment

Deployment steps, fee estimation, and the saved contract address are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). The finalized deployment recorded from the Studio Next explorer is in [docs/TRANSACTIONS.md](docs/TRANSACTIONS.md).

## Real transaction flow

In Studio mode the lookup stores the product, the evidence, and a local classification. That local classification is not a finalized result. The server then calls `submit_verification_request` with the product fields, one to six https evidence URLs, and the evidence hash. It stores the transaction id and the evaluation id.

The result page reads the GenLayer explorer and `get_verification_result`. The stored status becomes `FINALIZED` only when the transaction status is finalized, execution succeeded, and the contract returned an allowed verdict for that same evaluation id. A transaction hash, an evaluation id, or an evidence hash alone does not finalize the row.

`PENDING` means the GenLayer request exists and is still being processed. `FAILED` means GenLayer or the contract returned a failure. `UNAVAILABLE` means the RPC, contract, or signer call could not be completed. The saved reason is shown, and the check can be retried. A check with no transaction id, or an explorer and RPC that cannot be reached, becomes `UNAVAILABLE` after 10 minutes. A transaction the explorer still shows as in progress stays `PENDING` and becomes `FAILED` only after 30 minutes. Studio mode does not fall back to mock mode.

## Mock mode

`FOODTRACE_GENLAYER_MODE=mock` evaluates the configured local sources and labels the result:

`MOCK RESULT. Demo data was evaluated locally. GenLayer did not finalize this result.`

Mock mode does not send a blockchain transaction and does not claim that validators processed the result.

## Studio mode

`FOODTRACE_GENLAYER_MODE=studio` uses Studio Next only when the RPC is `https://studio-dev.genlayer.com/api` and the contract address is valid. If either value is missing or the RPC is a different network, verification is unavailable and no mock result is substituted.

## Testing

```bash
npm install
npm test
npm run typecheck
npm run lint
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
prisma/                        Application schema. Local SQLite, production Turso.
docs/                          Architecture, deployment, transactions, and checklists
tests/                         Unit and flow tests
```

## Deployment

Deploy only to the Vercel project `foodtrace` on team `kira-68d0`. The public site is https://foodtrace-six.vercel.app. Production environment values are set in Vercel: Studio mode, the Studio Next RPC, the contract address above, the public app URL, Turso, the session secret, and the server signer. Do not commit those secrets. Deployment details are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Safety disclaimer

FoodTrace is an information and verification tool. It does not guarantee that food is safe and does not replace official food-safety guidance.
