# GenLayer Studio Next

FoodTrace uses the Studio development preview, called Studio Next in this app.

| Setting | Value |
| --- | --- |
| SDK chain | `studioDevnet` from `genlayer-js` `2.0.0-rc.1` |
| Chain ID | `61997` (`0xf22d`) |
| RPC | `https://studio-dev.genlayer.com/api` |
| Explorer | `https://explorer-studio-dev.genlayer.com` |
| Web app | `https://studio-dev.genlayer.com` |
| Currency | GEN, 18 decimals |

The environment value for this network is `NEXT_PUBLIC_GENLAYER_NETWORK=studio`. The value `studio-next` is not accepted by the current configuration check. Studionet uses a different chain and RPC and is not a substitute.

## Modes

`FOODTRACE_GENLAYER_MODE=mock` does not send a transaction. The result is labeled `MOCK RESULT` and is not described as finalized on GenLayer.

`FOODTRACE_GENLAYER_MODE=studio` sends a real transaction when the RPC and contract address match Studio Next. A missing or mismatched setting keeps the mode on studio and reports that verification is unavailable. The app does not silently fall back to mock mode.

## Fees

A write calls `estimateTransactionFeesForWrite` and passes the returned `distribution` and `feeValue`. FoodTrace does not attach user GEN to the contract method. A zero balance or a balance below the quote stops the submission. The displayed insufficient-funds sentence is: "Your wallet does not have enough GenLayer Studio funds to submit this verification."

## Contract

The deployed contract and finalized transaction hashes are recorded in [TRANSACTIONS.md](TRANSACTIONS.md). Method names and verdicts are listed in [../contracts/INTERFACE.md](../contracts/INTERFACE.md).
