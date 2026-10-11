# FoodTrace contract interface

Source: `contracts/foodtrace.py`

Class: `FoodTrace`

Constructor: `__init__(self)` takes no arguments and stores policy `foodtrace-v1`.

The contract does not return `SAFE_TO_EAT`, `DEFINITELY_SAFE`, or `MEDICALLY_SAFE`.

## Allowed verdicts

- `RECALL_FOUND`
- `NO_MATCHING_RECALL_FOUND`
- `EXPIRED`
- `CONFLICTING_INFORMATION`
- `UNABLE_TO_VERIFY`

## Writes

`submit_verification_request(request_id: str, payload_json: str) -> str`

Submits one verification. `request_id` is 8 to 80 characters and may contain letters, numbers, hyphens, and underscores. The JSON payload uses policy `foodtrace-v1` and includes the product name, brand, barcode, lot or batch number, expiration date, region, one to six `https` evidence URLs, evidence hash, and request timestamp.

`submit_appeal(appeal_id: str, request_id: str, payload_json: str) -> str`

Appends an appeal for an existing verification. The appeal does not replace the original verdict.

Both writes use `@gl.public.write`. They do not accept user GEN as method value. The GenLayer fee deposit is separate and comes from the transaction fee estimate.

## Views

`get_verification_result(request_id: str) -> dict`

Returns the stored verification, or an empty object when the id is unknown.

`get_evidence_history(request_id: str) -> dict`

Returns the stored verification and its appended appeals.

`finalize_verification(request_id: str) -> dict`

Returns the stored verdict and `stored: true`, or `stored: false` when the id is unknown. This view does not recompute a verdict and does not finalize the chain transaction. Finality is the transaction status on GenLayer Studio Next.
