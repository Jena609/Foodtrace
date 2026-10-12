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

These later calls were sent by FoodTrace as `submit_verification_request`. Each one reached explorer status `FINALIZED`, execution `SUCCESS`, and `get_verification_result` returned the same evaluation id.

| Demo | Lookup | Evaluation | Transaction | Contract verdict |
| --- | --- | --- | --- | --- |
| Exact lot | `lk_f955826a00bb43188b3a129dd663847d` | `ftv_f8a28a3d728f48b1973d3d509d985354` | `0xcec7487e75b3a4e6e8512ca48d2161ef4b4bf1e911ca5e3a43cbdb754d42c353` | `RECALL_FOUND` |
| No matching recall | `lk_6c968000175c412f867e3e55bbae277c` | `ftv_5bc9f07be0764d8394a982438e29d72a` | `0xe687505abc8124b7653dcac43fbcfc2beb577fa80d37549bb2d8bf46e895db30` | `NO_MATCHING_RECALL_FOUND` |
| Conflicting sources | `lk_1b0897be2032427dad4174a2ddae60d7` | `ftv_9d5373e52ebd45cabf4694190daf6ea2` | `0xc980974a9cec3fb58b19e0023ea719035fd5408c6d84f5015961dd1cbcf74003` | `RECALL_FOUND` |
| Expired date | `lk_b773674f5b004cbf925341f28df7762e` | `ftv_a8c0fc862f0e47908bd2cbc2a40c7df6` | `0xb2e5a7d26ec72b1214788dc57251d613633d604059ea195b0b26bce748604fac` | `EXPIRED` |

The conflicting-sources contract verdict is `RECALL_FOUND` because the clearance page is hosted on this site, which the contract scores below FDA, USDA, and CDC. The result page still shows both excerpts and `CONFLICTING_SOURCES`.

Lookup `lk_49bed2e3a4e2465ba7964c0e33c4159d` stayed `pending` in the database after transaction `0x3d78ddc5e8ed366c85cd03ea7231f4da192a8c0a136f5ea80bc31242d5916fd8` had already finalized. Reading the lookup back from the explorer and `get_verification_result` stored `RECALL_FOUND` for evaluation `ftv_08fcacff2940466e8afda5d27838dfab`. No second transaction was sent for that check.

These checks were sent after that read-back fix. Each one was `FINALIZED` on a later `GET /api/lookup/{id}`.

| Demo | Lookup | Evaluation | Transaction | Contract verdict | Public classification |
| --- | --- | --- | --- | --- | --- |
| Exact lot | `lk_a4e2b41104c2495bb15c5823773d9bfd` | `ftv_101008da25e24b6b8b8fa0d740b10ee3` | `0x350bdf85f6899a4c88a1d34ba7ce404bc9f5cf2f5d8cd0609797796f91a5f8c1` | `RECALL_FOUND` | `EXACT_RECALL_MATCH` |
| No matching recall | `lk_8ee0875c952647c39ff81170830fcd1d` | `ftv_edf66e2975d2418dbca0d7c664c54a9f` | `0x8b618c3809df42b9adee55df5b44a8263dc442fff3fd2a011782e2bf06a2d676` | `NO_MATCHING_RECALL_FOUND` | `NO_MATCH` |
| Conflicting sources | `lk_aa049df25c02497986dbd69a2d2ccff7` | `ftv_b64c4739efa747c19b950ef426e18652` | `0x9acfca2239adb176417280763fb82eb8c605f74d2c3fb77daf505a069cbe1ce6` | `RECALL_FOUND` | `CONFLICTING_SOURCES` |
| Expired date | `lk_62f9f5f075fb4fccb52faaf24336f5d8` | `ftv_882fac9216434b6ca703852386864b7a` | `0x4b0c9d00aacff9075ead8fcb4fa900940e76a962876846744763f6152bf4b533` | `EXPIRED` | `EXPIRED_PRODUCT` |
