# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""
FoodTrace evidence contract.

Validators fetch the submitted https URLs and apply FoodTrace policy v1.
The contract stores the verdict under the caller-supplied request id.
It does not read "the latest result for this wallet".
An appeal is stored separately and does not replace the original verdict.

Allowed verdicts:
  RECALL_FOUND
  NO_MATCHING_RECALL_FOUND
  EXPIRED
  CONFLICTING_INFORMATION
  UNABLE_TO_VERIFY

This contract never returns a verdict that a product is safe.
"""

import datetime
import json

import genlayer as gl

ALLOWED = (
    "RECALL_FOUND",
    "NO_MATCHING_RECALL_FOUND",
    "EXPIRED",
    "CONFLICTING_INFORMATION",
    "UNABLE_TO_VERIFY",
)
POLICY = "foodtrace-v1"
STOP = {
    "oz", "ounce", "ounces", "lb", "lbs", "g", "kg", "ml", "l", "pack", "ct",
    "count", "the", "a", "an", "of", "and", "size", "net", "wt", "weight",
}


def _digits(value):
    return "".join(ch for ch in str(value) if ch.isdigit())


def _lot(value):
    return "".join(ch for ch in str(value).upper() if ch.isalnum())


def _name(value):
    cleaned = []
    for ch in str(value).lower():
        cleaned.append(ch if ch.isalnum() else " ")
    return " ".join("".join(cleaned).split())


def _tokens(value):
    tokens = []
    for token in _name(value).split(" "):
        if token and token not in STOP and not token.isdigit():
            tokens.append(token)
    return tokens


def _jaccard(left, right):
    a = set(left)
    b = set(right)
    if not a or not b:
        return 0
    inter = len(a.intersection(b))
    return inter / float(len(a.union(b)))


def _semantic(left, right):
    a = _tokens(left)
    b = _tokens(right)
    if not a or not b:
        return False
    if _jaccard(a, b) >= 0.55:
        return True
    short = a if len(a) <= len(b) else b
    long = set(b if len(a) <= len(b) else a)
    significant = [token for token in short if len(token) > 2]
    return len(significant) >= 2 and all(token in long for token in significant)


def _brand(left, right):
    a = _name(left)
    b = _name(right)
    if not a or not b:
        return "unknown"
    if a == b or _semantic(left, right):
        return "match"
    initials = "".join(part[0] for part in b.split(" ") if part)
    if len(a.replace(" ", "")) >= 2 and a.replace(" ", "") == initials:
        return "match"
    return "mismatch"


def _host(url):
    try:
        return url.split("/")[2].lower()
    except Exception:
        return ""


def _priority(url):
    host = _host(url)
    if host == "fda.gov" or host.endswith(".fda.gov") or host.endswith(".usda.gov"):
        return 1
    if host == "cdc.gov" or host.endswith(".cdc.gov"):
        return 3
    return 6


def _line(text, label):
    prefix = label.lower() + ":"
    for line in text.splitlines():
        cleaned = line.strip()
        if cleaned.lower().startswith(prefix):
            return cleaned.split(":", 1)[1].strip()
    return ""


def _record(url, product, brand, barcode, lots, reason, kind, retrieved):
    return {
        "url": url,
        "product": product,
        "brand": brand,
        "barcode": _digits(barcode),
        "lots": [_lot(lot) for lot in lots if _lot(lot)],
        "reason": reason[:500],
        "kind": "clearance" if kind == "clearance" else "recall",
        "priority": _priority(url),
        "retrieved": retrieved,
    }


def _from_document(url, text):
    if "foodtrace-evidence:" not in text.lower():
        return None
    lots = [part.strip() for part in _line(text, "Lots").split(",") if part.strip()]
    return _record(
        url,
        _line(text, "Product"),
        _line(text, "Brand"),
        _line(text, "Barcode"),
        lots,
        _line(text, "Reason"),
        _line(text, "Kind").lower(),
        _line(text, "Retrieved"),
    )


def _from_fda(url, item):
    if not isinstance(item, dict):
        return None
    description = str(item.get("product_description") or "")
    code = str(item.get("code_info") or "")
    lots = [part.strip() for part in code.replace(";", ",").split(",") if len(part.strip()) >= 4]
    return _record(
        url,
        description[:180],
        str(item.get("recalling_firm") or ""),
        "",
        lots[:12],
        str(item.get("reason_for_recall") or ""),
        "recall",
        str(item.get("report_date") or ""),
    )


def _pages(urls):
    records = []
    notes = []
    for url in urls:
        try:
            text = gl.nondet.web.render(url, mode="text")
        except Exception:
            notes.append({"url": url, "status": "unread"})
            continue
        if not isinstance(text, str) or text.strip() == "":
            notes.append({"url": url, "status": "unread"})
            continue
        document = _from_document(url, text)
        if document:
            records.append(document)
            notes.append({"url": url, "status": "parsed"})
            continue
        stripped = text.lstrip()
        if stripped.startswith("{") or stripped.startswith("["):
            try:
                data = json.loads(stripped[:20000])
            except Exception:
                notes.append({"url": url, "status": "malformed"})
                continue
            results = data.get("results") if isinstance(data, dict) else None
            if isinstance(results, list):
                parsed = 0
                for item in results[:8]:
                    record = _from_fda(url, item)
                    if record:
                        records.append(record)
                        parsed += 1
                notes.append({"url": url, "status": "parsed" if parsed else "empty"})
                continue
        notes.append({"url": url, "status": "unstructured"})
    return {"records": records, "notes": notes}


def _expired(value, today):
    if len(value) != 10 or value[4] != "-" or value[7] != "-":
        return False
    return value < today


def _decide(payload, fetched, today):
    barcode = _digits(payload.get("barcode", ""))
    lot = _lot(payload.get("lot_number", ""))
    name = str(payload.get("product_name", ""))
    brand = str(payload.get("brand", ""))
    expired = _expired(str(payload.get("expiration_date", "")), today)
    notes = fetched["notes"]
    parsed = [note for note in notes if note["status"] == "parsed"]
    unread = [note for note in notes if note["status"] in ("unread", "malformed")]
    recalls = []
    clearances = []
    brand_clash = False
    missing_lot = False

    for record in fetched["records"]:
        same_barcode = bool(barcode and record["barcode"] and barcode == record["barcode"])
        barcode_conflict = bool(barcode and record["barcode"] and barcode != record["barcode"])
        same_lot = bool(lot and lot in record["lots"])
        lot_conflict = bool(lot and record["lots"] and lot not in record["lots"])
        missing = (not lot) and len(record["lots"]) > 0
        relation = _brand(brand, record["brand"])
        level = 0
        if same_barcode and same_lot:
            level = 5
        elif same_lot and (barcode_conflict or relation == "mismatch"):
            brand_clash = True
        elif same_lot:
            level = 4
        elif same_barcode and lot_conflict:
            level = 0
        elif barcode and not record["barcode"]:
            level = 0
        elif same_barcode:
            level = 3
            missing_lot = missing_lot or missing
        elif barcode_conflict:
            level = 0
        elif _name(name) and (_name(name) == _name(record["product"]) or _semantic(name, record["product"])):
            if relation == "mismatch":
                brand_clash = True
            elif not lot_conflict:
                level = 2 if _name(name) == _name(record["product"]) else 1
                missing_lot = missing_lot or missing
        if level > 0:
            item = {"level": level, "priority": record["priority"], "kind": record["kind"], "url": record["url"]}
            if record["kind"] == "clearance":
                clearances.append(item)
            else:
                recalls.append(item)

    def _best(items):
        chosen = None
        for item in items:
            if chosen is None or item["level"] > chosen["level"] or (item["level"] == chosen["level"] and item["priority"] < chosen["priority"]):
                chosen = item
        return chosen

    best_recall = _best(recalls)
    best_clearance = _best(clearances)
    if best_recall and best_clearance and best_recall["level"] >= 3 and best_clearance["level"] >= 3 and best_clearance["priority"] <= 3:
        return _result("CONFLICTING_INFORMATION", "low", ["conflicting_sources"], "The available sources contain conflicting information.", notes)
    if missing_lot and not any(item["level"] >= 3 and not (not lot and True) for item in recalls):
        if not any(item for item in recalls if item["level"] >= 3):
            pass
    if best_recall and missing_lot and best_recall["level"] <= 3 and not lot:
        detail = "A lot-specific record was found and no lot number was provided. A missing lot is not proof that a recall does not apply."
        status = "EXPIRED" if expired else "UNABLE_TO_VERIFY"
        return _result(status, "low", ["missing_lot"], detail, notes)
    if best_recall:
        criteria = ["official_source_match" if best_recall["priority"] <= 2 else "source_match"]
        if best_recall["level"] >= 5:
            criteria.append("exact_barcode_and_lot")
        elif best_recall["level"] == 4:
            criteria.append("exact_lot_number")
        elif best_recall["level"] == 3:
            criteria.append("exact_barcode")
        elif best_recall["level"] == 2:
            criteria.append("exact_product_name_and_brand")
        else:
            criteria.append("semantic_product_name")
        confidence = "high" if best_recall["level"] >= 4 and best_recall["priority"] <= 2 else "medium" if best_recall["level"] >= 2 else "low"
        return _result("RECALL_FOUND", confidence, criteria, "Recall information was detected.", notes)
    if brand_clash and not best_recall:
        return _result("CONFLICTING_INFORMATION" if lot else "NO_MATCHING_RECALL_FOUND", "low", ["brand_mismatch"], "A similar record under a different brand was not applied as a recall.", notes)
    if not parsed and unread:
        return _result("UNABLE_TO_VERIFY", "low", ["source_unavailable"], "We were unable to verify this product with the available data.", notes)
    if not fetched["records"] and unread and not parsed:
        return _result("UNABLE_TO_VERIFY", "low", ["source_unavailable"], "We were unable to verify this product with the available data.", notes)
    if expired:
        return _result("EXPIRED", "low", ["expired"], "The expiration date provided is before the evaluation day. No matching recall was found in the fetched sources.", notes)
    if not parsed:
        return _result("UNABLE_TO_VERIFY", "low", ["source_unavailable"], "We were unable to verify this product with the available data.", notes)
    return _result("NO_MATCHING_RECALL_FOUND", "medium", [], "No matching recall was found in the configured sources.", notes)


def _result(status, confidence, criteria, summary, notes):
    if status not in ALLOWED:
        status = "UNABLE_TO_VERIFY"
    return {
        "status": status,
        "confidence": confidence,
        "reasoningSummary": summary,
        "matchedCriteria": criteria,
        "sourcesChecked": notes,
    }


def _collect(urls, payload):
    def work():
        now = datetime.datetime.now(datetime.timezone.utc)
        fetched = _pages(urls)
        decision = _decide(payload, fetched, now.strftime("%Y-%m-%d"))
        decision["evaluatedAt"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        return json.dumps(decision, sort_keys=True)

    return json.loads(gl.eq_principle.strict_eq(work))


def _load_payload(payload_json):
    if not isinstance(payload_json, str) or len(payload_json) > 20000:
        raise gl.vm.UserError("Verification payload is missing or too large")
    try:
        payload = json.loads(payload_json)
    except Exception as exc:
        raise gl.vm.UserError("Verification payload is not JSON") from exc
    if not isinstance(payload, dict):
        raise gl.vm.UserError("Verification payload must be an object")
    if payload.get("policy") != POLICY:
        raise gl.vm.UserError("Unsupported FoodTrace policy")
    urls = payload.get("evidence_urls")
    if not isinstance(urls, list) or len(urls) == 0 or len(urls) > 6:
        raise gl.vm.UserError("Submit between 1 and 6 https evidence URLs")
    clean = []
    for url in urls:
        if not isinstance(url, str) or not url.startswith("https://") or len(url) > 400:
            raise gl.vm.UserError("Each evidence URL must start with https://")
        clean.append(url)
    payload["evidence_urls"] = clean
    return payload


def _request_id(value):
    if not isinstance(value, str) or len(value) < 8 or len(value) > 80:
        raise gl.vm.UserError("Request id is not valid")
    for ch in value:
        if not (ch.isalnum() or ch in "-_"):
            raise gl.vm.UserError("Request id is not valid")
    return value


class FoodTrace(gl.contract.Contract):
    policy_version: str
    verifications: gl.storage.TreeMap[str, str]
    appeals: gl.storage.TreeMap[str, str]
    appeal_index: gl.storage.TreeMap[str, str]

    def __init__(self):
        self.policy_version = POLICY

    @gl.public.write
    def submit_verification_request(self, request_id: str, payload_json: str) -> str:
        request_key = _request_id(request_id)
        if self.verifications.get(request_key) is not None:
            raise gl.vm.UserError("A verification with this request id already exists")
        payload = _load_payload(payload_json)
        decision = _collect(payload["evidence_urls"], payload)
        record = {
            "request_id": request_key,
            "wallet": str(gl.message.sender_address).lower(),
            "status": decision["status"],
            "confidence": decision["confidence"],
            "reasoningSummary": decision["reasoningSummary"],
            "matchedCriteria": decision["matchedCriteria"],
            "sourcesChecked": decision["sourcesChecked"],
            "evidenceHash": str(payload.get("evidence_hash") or ""),
            "evaluatedAt": decision["evaluatedAt"],
            "policy": POLICY,
        }
        self.verifications[request_key] = json.dumps(record)
        return request_key

    @gl.public.view
    def get_verification_result(self, request_id: str) -> dict:
        raw = self.verifications.get(_request_id(request_id))
        if raw is None:
            return {}
        return json.loads(raw)

    @gl.public.view
    def get_evidence_history(self, request_id: str) -> dict:
        request_key = _request_id(request_id)
        raw = self.verifications.get(request_key)
        if raw is None:
            return {}
        index_raw = self.appeal_index.get(request_key)
        appeal_ids = json.loads(index_raw) if index_raw else []
        history = []
        for appeal_id in appeal_ids:
            appeal_raw = self.appeals.get(str(appeal_id))
            if appeal_raw:
                history.append(json.loads(appeal_raw))
        return {"verification": json.loads(raw), "appeals": history}

    @gl.public.write
    def submit_appeal(self, appeal_id: str, request_id: str, payload_json: str) -> str:
        appeal_key = _request_id(appeal_id)
        request_key = _request_id(request_id)
        if self.verifications.get(request_key) is None:
            raise gl.vm.UserError("Original verification was not found")
        if self.appeals.get(appeal_key) is not None:
            raise gl.vm.UserError("An appeal with this id already exists")
        payload = _load_payload(payload_json)
        decision = _collect(payload["evidence_urls"], payload)
        original = json.loads(self.verifications.get(request_key))
        appeal = {
            "appeal_id": appeal_key,
            "request_id": request_key,
            "original_status": original.get("status"),
            "status": decision["status"],
            "confidence": decision["confidence"],
            "reasoningSummary": decision["reasoningSummary"],
            "matchedCriteria": decision["matchedCriteria"],
            "sourcesChecked": decision["sourcesChecked"],
            "evaluatedAt": decision["evaluatedAt"],
            "wallet": str(gl.message.sender_address).lower(),
        }
        self.appeals[appeal_key] = json.dumps(appeal)
        index_raw = self.appeal_index.get(request_key)
        index = json.loads(index_raw) if index_raw else []
        index.append(appeal_key)
        self.appeal_index[request_key] = json.dumps(index)
        return appeal_key

    @gl.public.view
    def finalize_verification(self, request_id: str) -> dict:
        """Return the stored verdict for this request id.

        Chain finality is the transaction status. This method does not
        recompute a verdict and does not look up another wallet result.
        """
        raw = self.verifications.get(_request_id(request_id))
        if raw is None:
            return {"stored": False}
        record = json.loads(raw)
        record["stored"] = True
        return record
