# Transactions

These rows come from the GenLayer Studio Next explorer API. Status `FINALIZED` was returned for each hash. No appeal transaction is listed because no finalized `submit_appeal` receipt has been identified. The three contract calls are explorer type `2`. The API did not provide a decoded function name, so this file does not name them.

Network: GenLayer Studio Next. Chain ID `61997`. RPC `https://studio-dev.genlayer.com/api`.

Signer: `0x5F85c75F8442b92ba66C30371CEf6cF3D7B4c650`.

Contract: `0x3973d96145dBe83d61b36C86266D758dD3655a14`.

| Kind | Hash | Status | Created (UTC) |
| --- | --- | --- | --- |
| Deployment | `0x9d468a212f615c8041ef9f0fea8652bb096ec9a8261997d89109117bdf089fa1` | FINALIZED | 2026-10-11T16:33:15.326334Z |
| Contract call | `0x63716a1f7eb2169f994144982493c38bca782f97938ba521cb721036236cd212` | FINALIZED | 2026-10-11T16:37:55.795305Z |
| Contract call | `0xbd5bb0cc821b0fd9c7b17706c0774f527cdfe3a2e8b7b8311106cac275a919fd` | FINALIZED | 2026-10-11T16:56:20.254500Z |
| Contract call | `0xff00e8edb4fe80227bee8100ecb74ca1ef56fcd2376a6df688b6d39073f45cd2` | FINALIZED | 2026-10-11T16:56:31.659402Z |

Explorer pages:

- https://explorer-studio-dev.genlayer.com/address/0x3973d96145dBe83d61b36C86266D758dD3655a14
- https://explorer-studio-dev.genlayer.com/tx/0x9d468a212f615c8041ef9f0fea8652bb096ec9a8261997d89109117bdf089fa1
- https://explorer-studio-dev.genlayer.com/tx/0x63716a1f7eb2169f994144982493c38bca782f97938ba521cb721036236cd212
- https://explorer-studio-dev.genlayer.com/tx/0xbd5bb0cc821b0fd9c7b17706c0774f527cdfe3a2e8b7b8311106cac275a919fd
- https://explorer-studio-dev.genlayer.com/tx/0xff00e8edb4fe80227bee8100ecb74ca1ef56fcd2376a6df688b6d39073f45cd2

The deployed code returned by the CLI for that contract address is the `FoodTrace` class in `contracts/foodtrace.py`.
