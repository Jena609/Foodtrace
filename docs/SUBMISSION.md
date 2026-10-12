# FoodTrace submission notes

FoodTrace is an information and verification tool. It does not guarantee that food is safe and does not replace official government recall notices.

## 1. Product overview

FoodTrace lets a person enter a barcode, product name, brand, lot or batch number, expiration date, and region. It gathers the configured recall evidence, compares those sources, and stores a result that can be opened again. A wallet is not required for that check. A wallet is required only when someone signs a GenLayer verification, an on-chain appeal, or a business inventory change.

## 2. Problem

Recall information is split across government notices, manufacturer statements, and retailer alerts. Those sources can be missing, stale, or in disagreement. A single private database can hide which source was used and can change a stored result later. A reviewer needs to see the product, the excerpts, the time they were retrieved, and whether the sources agree.

## 3. Why GenLayer

A FoodTrace server can collect evidence and apply local match rules. That result is useful, and the app labels it as a FoodTrace classification. It is not a GenLayer result. GenLayer is the place where the same public evidence URLs are fetched and compared by the Intelligent Contract, and where the verdict is stored with the request. That matters most when sources disagree, because the contract returns `CONFLICTING_INFORMATION` instead of collapsing the disagreement into one side. The result page says which classification came from FoodTrace rules and which one GenLayer finalized.

## 4. System architecture

```text
User input → FoodTrace frontend → Evidence collection → GenLayer Intelligent Contract → Evidence evaluation → Finalized result → Evidence and transaction displayed to the user
```

The frontend is a Next.js app. The backend stores lookups in Turso in production and in SQLite locally. Source adapters supply demo records and, when configured, openFDA, manufacturer, and retailer APIs. Studio mode submits `submit_verification_request` from the server signer to the deployed `FoodTrace` contract on GenLayer Studio Next. A wallet is not required for that check. The contract fetches the https evidence URLs, evaluates them, and stores the verdict. The result page shows that verdict only after `get_verification_result` returns it for the same request id.

## 5. Data flow

1. The user submits the product fields at `/lookup`.
2. `POST /api/lookup` collects records from the configured adapters.
3. The local matcher produces one of five verdicts and stores the lookup, evidence, and a pending result. That local verdict is not shown as finalized.
4. The server submits `submit_verification_request` and stores the transaction id and evaluation id. A missing signer, a missing public evidence URL, or an RPC error leaves the lookup `UNAVAILABLE` and saves the reason. If the signer deposit is already reserved, the lookup stays `PENDING` and is submitted when the deposit is free. It does not fall back to a local verified result.
5. The user opens `/results/{id}`. `GET /api/lookup/{id}` reads the explorer and the contract again while the row is `SUBMITTED` or `PENDING`.
6. The result page polls every few seconds for up to 30 minutes. Refreshing the page continues that read. A transaction id by itself does not make the row finalized.
7. The stored verdict is replaced only when the transaction is `FINALIZED`, execution succeeded, and `get_verification_result` returned an allowed verdict for that same request id. The clock starts at the latest submission. A retry stores a new evaluation and starts that window again. A check with no transaction id becomes `UNAVAILABLE` after 10 minutes. If the explorer and RPC cannot be reached for 10 minutes, the status becomes `UNAVAILABLE`. A transaction that is still in progress becomes `FAILED` after 30 minutes, and the saved error is the real reason.

## 6. GenLayer contract

The contract class is `FoodTrace` in `contracts/foodtrace.py`. Policy `foodtrace-v1`.

Inputs to `submit_verification_request` are a request id and a JSON payload: product name, brand, barcode, lot number, expiration date, region, one to six https evidence URLs, an evidence hash, and a request timestamp.

The contract renders each URL as text. A page is parsed when it contains `foodtrace-evidence:` and lines for product, brand, barcode, lots, reason, kind, and retrieved time. It can also parse openFDA JSON. It then compares barcode, lot, name, and brand. Conflicting recall and clearance records can return `CONFLICTING_INFORMATION` when both sides meet the contract's priority rule.

The contract returns only:

- `RECALL_FOUND`
- `NO_MATCHING_RECALL_FOUND`
- `EXPIRED`
- `CONFLICTING_INFORMATION`
- `UNABLE_TO_VERIFY`

The public labels on the result page are mapped from those verdicts:

| Contract verdict | Public classification |
| --- | --- |
| `RECALL_FOUND` with an exact lot criterion | `EXACT_RECALL_MATCH` |
| `RECALL_FOUND` without an exact lot criterion | `PARTIAL_MATCH` |
| `NO_MATCHING_RECALL_FOUND` | `NO_MATCH` |
| `CONFLICTING_INFORMATION` | `CONFLICTING_SOURCES` |
| `EXPIRED` | `EXPIRED_PRODUCT` |
| `UNABLE_TO_VERIFY` | `SOURCE_UNAVAILABLE` |

`PARTIAL_MATCH` is a FoodTrace label. The contract does not return that string. The frontend receives the result from `GET /api/lookup/{id}` after the database has stored either the preliminary verdict or the contract verdict.

## 7. Evidence handling

Each evidence row stores the source name, URL, retrieval time, excerpt, match flag, and whether the record is demo data. Disagreeing sources stay on the result. The source-agreement line says `Sources conflict` when the verdict is `CONFLICTING_INFORMATION` or when a matched recall and a matched clearance are both present. FoodTrace does not invent official recall records. The built-in catalog is fictional and labeled **Fictional Demo Data**.

## 8. Demo mode and live mode

The four reviewer scenarios use fictional products and fictional notices. Their result pages say **Fictional Demo Data**.

Live data appears only when a configured adapter returns a non-demo record. openFDA is off unless `FOODTRACE_OPENFDA_ENABLED=true`. Manufacturer and retailer APIs are off unless their URLs are set. An empty or failed live source does not become a successful recall.

Mock mode (`FOODTRACE_GENLAYER_MODE=mock`) evaluates locally and is labeled as a mock. It is not described as GenLayer-finalized. Studio mode does not fall back to mock. Production uses studio mode.

Result states:

- `SUBMITTED` — the contract call has a transaction id. The page still says Pending.
- `PENDING` — GenLayer is still processing the evaluation.
- `FINALIZED` — the explorer transaction succeeded and the contract result for this request was read back.
- `FAILED` — the transaction failed, the validators disagreed, or 30 minutes passed while the explorer still had not finalized it. The page shows the saved reason.
- `UNAVAILABLE` — the signer, evidence URL, RPC, or contract call could not complete. The page shows the saved reason and offers a retry.

## 9. Deployment

- Frontend and API: Vercel project `foodtrace`, https://foodtrace-six.vercel.app
- Database: Turso Starter, connected to that project. Environment variables `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
- Local database: `DATABASE_URL=file:./dev.db`
- GenLayer: the contract already deployed on Studio Next. See [TRANSACTIONS.md](TRANSACTIONS.md).
- Required variables are listed in `.env.example`. Secret values are not committed. `FOODTRACE_SESSION_SECRET` and `TURSO_AUTH_TOKEN` must stay server-side.

## 10. Contract information

These values were read from the Studio Next explorer and the deployed contract code:

- Network: GenLayer Studio Next (`studio-dev`)
- Chain ID: `61997`
- RPC: `https://studio-dev.genlayer.com/api`
- Explorer: `https://explorer-studio-dev.genlayer.com`
- Contract: `0x3973d96145dBe83d61b36C86266D758dD3655a14`
- Deployment transaction: `0x9d468a212f615c8041ef9f0fea8652bb096ec9a8261997d89109117bdf089fa1` (`FINALIZED`)

A finalized product check read back from `get_verification_result`:

- Lookup: `lk_f955826a00bb43188b3a129dd663847d`
- Evaluation ID: `ftv_f8a28a3d728f48b1973d3d509d985354`
- Transaction: `0xcec7487e75b3a4e6e8512ca48d2161ef4b4bf1e911ca5e3a43cbdb754d42c353`
- Explorer: `https://explorer-studio-dev.genlayer.com/tx/0xcec7487e75b3a4e6e8512ca48d2161ef4b4bf1e911ca5e3a43cbdb754d42c353`
- Contract verdict: `RECALL_FOUND`
- Public classification: `EXACT_RECALL_MATCH`

The conflicting peanut-butter demo `lk_1b0897be2032427dad4174a2ddae60d7` finalized as transaction `0xc980974a9cec3fb58b19e0023ea719035fd5408c6d84f5015961dd1cbcf74003`. The contract stored `RECALL_FOUND` because both pages are on this site. The result still shows both excerpts, `Sources conflict`, and the public classification `CONFLICTING_SOURCES`.

A new product check receives a transaction id when the server signer submits it. Until that submission exists, the result page shows **Not available** and does not call the result finalized. The server signer is `FOODTRACE_GENLAYER_SIGNER_PRIVATE_KEY`, and it must be the key for `0x5F85c75F8442b92ba66C30371CEf6cF3D7B4c650`. The value is not committed and is not exposed to the browser.

## 11. Known limitations

- Consumer lookup submits the GenLayer transaction from the server signer. The signer needs enough GEN for the fee quoted by `estimateTransactionFeesForWrite` at submission time. A lookup is marked unavailable when the balance is below that quote. No transaction is sent in that case.
- Required variables: `FOODTRACE_GENLAYER_MODE`, `NEXT_PUBLIC_GENLAYER_NETWORK`, `NEXT_PUBLIC_GENLAYER_RPC_URL`, `NEXT_PUBLIC_FOODTRACE_CONTRACT_ADDRESS`, `NEXT_PUBLIC_APP_URL`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `FOODTRACE_GENLAYER_SIGNER_PRIVATE_KEY`, and `FOODTRACE_SESSION_SECRET`. Optional: `FOODTRACE_OPENFDA_ENABLED`, `FOODTRACE_MANUFACTURER_API_URL`, `FOODTRACE_RETAILER_API_URL`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `FOODTRACE_ADMIN_TOKEN`.
- The contract assigns priority `6` to hosts other than FDA, USDA, and CDC. The fictional demo pages are hosted on the FoodTrace domain, so an on-chain evaluation of the conflicting peanut-butter demo can return `RECALL_FOUND` rather than `CONFLICTING_INFORMATION`. The local result still shows the conflict.
- Demo evidence URLs point at this app only when `NEXT_PUBLIC_APP_URL` is `https`. Local development keeps the non-routable `demo.foodtrace.invalid` URLs so localhost is not sent to validators.
- No finalized appeal transaction is recorded.
- openFDA and the optional manufacturer and retailer APIs are not enabled in production.
- WalletConnect is unset. Injected wallets can still connect.
- Business inventory changes and alerts for a real wallet require a signature. The pages also include a labeled fictional demo inventory that is not stored as a wallet record.

## 12. Safety disclaimer

FoodTrace is not a food-safety authority and does not guarantee that a product is safe to eat. A result reports what the configured sources showed at a specific time. Check the package, the retailer, and official notices before you decide what to do with a product. “No matching recall found” is not a statement that a product is safe.
