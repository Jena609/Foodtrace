# Deployment

These steps use GenLayer Studio Next. The canonical RPC is `https://studio-dev.genlayer.com/api` and the chain ID is `61997`.

## 1. Install dependencies

```bash
cd C:\Users\prade\foodtrace
npm install
npx prisma migrate deploy
npm run db:seed
```

The pinned GenLayer JavaScript SDK is `genlayer-js@2.0.0-rc.1`. The local CLI package is `genlayer@0.40.0-rc.3`.

## 2. Configure the environment

Copy `.env.example` to `.env`. For local review, keep:

```text
FOODTRACE_GENLAYER_MODE=mock
NEXT_PUBLIC_GENLAYER_NETWORK=studio
NEXT_PUBLIC_GENLAYER_RPC_URL=
NEXT_PUBLIC_FOODTRACE_CONTRACT_ADDRESS=
```

Do not commit `.env`.

## 3. Connect a wallet

Use an injected wallet or the unlocked CLI account `default` (`0x5F85c75F8442b92ba66C30371CEf6cF3D7B4c650`). See [WALLET_SETUP.md](WALLET_SETUP.md).

## 4. Switch to Studio Next

The browser wallet must be on chain `61997`. The CLI can read that network without changing its saved selection:

```bash
node .\node_modules\genlayer\dist\index.js account show --network studio-dev
```

`genlayer network set studio-dev` changes the saved CLI network for every project on the computer. FoodTrace does not require that change when the command passes the Studio Next RPC.

## 5. Fund a development wallet

Open https://studio-dev.genlayer.com, select the signer, and use the water-drop faucet. Compare the balance with `estimateTransactionFees` for a deployment or `estimateTransactionFeesForWrite` for a contract call. Do not invent a fee.

## 6. Deploy the contract

From the FoodTrace directory, with the local CLI and the Studio Next RPC:

```bash
node .\node_modules\genlayer\dist\index.js deploy --contract contracts/foodtrace.py --rpc https://studio-dev.genlayer.com/api
```

The constructor takes no arguments. Wait until the Studio Next explorer shows the deployment as `FINALIZED` and the execution result as successful. The contract source must be the `FoodTrace` class.

## 7. Save the contract address

Set `NEXT_PUBLIC_FOODTRACE_CONTRACT_ADDRESS` and `NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio-dev.genlayer.com/api` in `.env`. The address recorded from the explorer is in [TRANSACTIONS.md](TRANSACTIONS.md).

## 8. Run in mock mode

Set `FOODTRACE_GENLAYER_MODE=mock` and restart `npm run dev`. Results must show the mock label and must not include a GenLayer transaction hash.

## 9. Run in Studio mode

Set `FOODTRACE_GENLAYER_MODE=studio` only after the RPC and contract address are saved. Restart the dev server. If either value is wrong, the app stays in studio mode and says verification is unavailable.

## 10. Submit a verification

Look up a product at `/lookup`, open the result, review the evidence, and choose Verify with GenLayer. The wallet must sign `submit_verification_request`.

## 11. Wait for finalization

The app polls the transaction until the explorer or receipt shows a final status. `ACCEPTED` remains pending. A verdict is shown as finalized only when the status is `FINALIZED`, execution succeeded, and `get_verification_result` returns an allowed status for that evaluation id.

## 12. Verify a transaction

Open `https://explorer-studio-dev.genlayer.com/tx/{hash}`. Confirm the sender, the FoodTrace contract address, and the status.

## 13. Host the web app

The Vercel project is `foodtrace` on team `kira-68d0`. Production is https://foodtrace-six.vercel.app. Deploy this app only to that project.

Production data is stored in Turso (SQLite-compatible) through `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Those values come from the Vercel Turso integration on the Starter plan. They are server-only. `DATABASE_URL=file:./dev.db` remains the local SQLite file and is not the production database. The first production request creates the tables from `prisma/migrations/20261011120000_init/migration.sql` when the `User` table is missing.

`/api/health` returns `database: ok` and `databaseProvider: turso` when the connection works. A database failure returns HTTP 503 `database_unavailable` and does not invent a lookup result.

Production uses Studio mode. These values were checked on the Studio Next explorer and `/api/health`. Secret values stay in Vercel and are not listed here.

| Record | Value |
| --- | --- |
| Network | GenLayer Studio Next |
| Chain ID | `61997` |
| RPC | `https://studio-dev.genlayer.com/api` |
| Explorer | `https://explorer-studio-dev.genlayer.com` |
| Contract address | `0x3973d96145dBe83d61b36C86266D758dD3655a14` |
| Contract deployment transaction | `0x9d468a212f615c8041ef9f0fea8652bb096ec9a8261997d89109117bdf089fa1` |
| Latest verification transaction | `0x84c3e2b9df9b98b2947d571b90e5dccb89ac40166e4f7428cbc7cce82ec2d523` |
| Latest evaluation ID | `ftv_e47a580bf59c4b66bc46c4654ac70bab` |

`NEXT_PUBLIC_APP_URL` is the production origin above. `FOODTRACE_SESSION_SECRET`, `FOODTRACE_GENLAYER_SIGNER_PRIVATE_KEY`, `TURSO_DATABASE_URL`, and `TURSO_AUTH_TOKEN` stay in Vercel and are not stored in this repository. `DATABASE_URL=file:./dev.db` is only the local database.

- Contract: https://explorer-studio-dev.genlayer.com/address/0x3973d96145dBe83d61b36C86266D758dD3655a14
- Deployment transaction: https://explorer-studio-dev.genlayer.com/tx/0x9d468a212f615c8041ef9f0fea8652bb096ec9a8261997d89109117bdf089fa1
- Verification transaction: https://explorer-studio-dev.genlayer.com/tx/0x84c3e2b9df9b98b2947d571b90e5dccb89ac40166e4f7428cbc7cce82ec2d523

GitHub is not connected for automatic deploys. `.vercel` and `.env.local` stay gitignored.

## 14. Submit an appeal

An appeal is available for a finalized, non-mock result that has a public `https` evidence URL. The wallet signs `submit_appeal`. The appeal is stored beside the original verdict and does not replace it. No finalized appeal hash is recorded yet. Do not add one until the explorer shows it.
