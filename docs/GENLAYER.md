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

FoodTrace sends product checks to the deployed Intelligent Contract on GenLayer Studio Next.

| Record | Value |
| --- | --- |
| Network | GenLayer Studio Next |
| Chain ID | `61997` |
| Contract address | `0x3973d96145dBe83d61b36C86266D758dD3655a14` |
| Contract deployment transaction | `0x9d468a212f615c8041ef9f0fea8652bb096ec9a8261997d89109117bdf089fa1` |
| Latest verification transaction | `0x84c3e2b9df9b98b2947d571b90e5dccb89ac40166e4f7428cbc7cce82ec2d523` |
| Latest evaluation ID | `ftv_e47a580bf59c4b66bc46c4654ac70bab` |

The contract address is not a transaction hash. The deployment transaction is the type `1` transaction that created the contract. A verification transaction is a later type `2` call to that contract. The evaluation ID is the FoodTrace request id, shaped as `ftv_` plus 32 hex characters. The server sends that id to `submit_verification_request`, stores it with the transaction hash, and reads `get_verification_result` for the same id after the explorer reports the transaction `FINALIZED`.

Reviewers can check the records independently:

- Contract: https://explorer-studio-dev.genlayer.com/address/0x3973d96145dBe83d61b36C86266D758dD3655a14
- Deployment transaction: https://explorer-studio-dev.genlayer.com/tx/0x9d468a212f615c8041ef9f0fea8652bb096ec9a8261997d89109117bdf089fa1
- Verification transaction: https://explorer-studio-dev.genlayer.com/tx/0x84c3e2b9df9b98b2947d571b90e5dccb89ac40166e4f7428cbc7cce82ec2d523

The explorer showed the latest verification as `FINALIZED`. Its calldata includes evaluation `ftv_e47a580bf59c4b66bc46c4654ac70bab`. The public result is https://foodtrace-six.vercel.app/results/lk_2fc5a313f48547e491b2737b1e2fa3ef. Earlier transactions remain in [TRANSACTIONS.md](TRANSACTIONS.md). Method names and verdicts are listed in [../contracts/INTERFACE.md](../contracts/INTERFACE.md).
