# FoodTrace manual test checklist

Automated tests cover matching, mock and Studio configuration, transaction observation, wallet rejection, wrong network, account changes, and fee coverage. The checks below need a browser.

## Landing

- `/` shows the FoodTrace landing page and the animated scene.
- Enter FoodTrace opens `/lookup` without reloading the whole origin into the landing page.
- Lookup, History, Alerts, Inventory, and Settings are not the landing-page navigation.
- The application header appears on `/lookup` and does not replace the landing page.

## Lookup and evidence

- An exact barcode and lot produces a recall result when the source record matches both.
- An exact barcode, an exact lot, and an exact name plus brand each stay distinct.
- A different brand is not reported as a recall.
- An expired date with no matching recall is `EXPIRED`.
- Conflicting recall and clearance sources are `CONFLICTING_INFORMATION`.
- A missing lot on a lot-specific record is not treated as proof that no recall applies.
- Sources that respond without a match are `NO_MATCHING_RECALL_FOUND`.
- That summary does not say the product is safe.
- An unreadable source is `UNABLE_TO_VERIFY`.

## Mock mode

- `FOODTRACE_GENLAYER_MODE=mock` shows the mock-result label.
- No wallet signature is requested for the mock result.
- The screen does not say GenLayer finalized the result.

## Studio mode

- The wallet can connect and disconnect.
- The address and chain id match the wallet.
- Chain `61997` is Studio Next. Another chain asks for a switch and does not submit.
- A rejected connection or signature leaves no successful transaction.
- A balance below the quoted fee shows that the wallet does not have enough GenLayer Studio funds.
- Verify with GenLayer shows the evidence before the signature request.
- The submitted screen shows the hash returned by the wallet.
- The result is not labeled finalized until the explorer receipt is `FINALIZED` and the stored verdict matches the evaluation id.
- A Studio configuration error stays in Studio mode.

## Appeal

- An appeal form is available only for a finalized non-mock result with a public https evidence URL.
- A mock result does not submit `submit_appeal`.
