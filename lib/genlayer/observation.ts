import type { FinalizationStatus } from "@/lib/types";

export interface TransactionObservation {
  statusName: string | null;
  resultName: string | null;
  executionResultName: string | null;
  finalizationStatus: FinalizationStatus;
  detail: string;
}

const KNOWN_STATUSES = new Set([
  "PENDING",
  "PROPOSING",
  "COMMITTING",
  "REVEALING",
  "ACCEPTED",
  "FINALIZED",
  "CANCELED",
  "LEADER_TIMEOUT",
  "VALIDATORS_TIMEOUT",
  "UNDETERMINED",
]);

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function knownStatus(value: unknown): string | null {
  const status = text(value);
  return status && KNOWN_STATUSES.has(status) ? status : null;
}

function executionFrom(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = executionFrom(item);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  const direct = text(record.execution_result);
  if (direct) return direct;
  return executionFrom(record.leader_result) ?? executionFrom(record.leader_receipt) ?? executionFrom(record.consensus_results) ?? executionFrom(record.consensus_data) ?? executionFrom(record.consensus_history);
}

/** Leader receipt wins over a validator that was cancelled after quorum. */
function leaderExecution(record: Record<string, unknown>): string | null {
  const consensus = record.consensus_data;
  const source = consensus && typeof consensus === "object" ? (consensus as Record<string, unknown>).leader_receipt : record.leader_receipt;
  if (!Array.isArray(source)) return null;
  const results = source
    .map((item) => (item && typeof item === "object" ? text((item as Record<string, unknown>).execution_result) : null))
    .filter((item): item is string => Boolean(item));
  if (results.includes("SUCCESS")) return "SUCCESS";
  if (results.includes("FINISHED_WITH_RETURN")) return "FINISHED_WITH_RETURN";
  return results[0] ?? null;
}

export const FINALIZATION_TIMEOUT_MS = 10 * 60 * 1000;
/** Studio consensus can stay ACCEPTED well after the explorer first sees the transaction. */
export const CONSENSUS_TIMEOUT_MS = 30 * 60 * 1000;

/** Decide the stored status after one observation attempt. A missing observation stays in progress until the timeout. */
export function statusAfterWait(input: {
  ageMs: number;
  observed: FinalizationStatus | null;
  limitMs?: number;
  consensusLimitMs?: number;
}): { finalizationStatus: FinalizationStatus; timedOut: boolean } {
  const missingLimit = input.limitMs ?? FINALIZATION_TIMEOUT_MS;
  const consensusLimit = input.consensusLimitMs ?? CONSENSUS_TIMEOUT_MS;
  if (input.observed === "finalized" || input.observed === "failed" || input.observed === "disputed" || input.observed === "inconclusive") {
    return { finalizationStatus: input.observed, timedOut: false };
  }
  if (input.observed === null) {
    if (input.ageMs >= missingLimit) return { finalizationStatus: "unavailable", timedOut: true };
    return { finalizationStatus: "pending", timedOut: false };
  }
  if (input.ageMs >= consensusLimit) return { finalizationStatus: "failed", timedOut: true };
  if (input.observed === "submitted") return { finalizationStatus: "submitted", timedOut: false };
  return { finalizationStatus: input.observed, timedOut: false };
}

export function mapTransactionObservation(tx: unknown): TransactionObservation {
  const record = tx && typeof tx === "object" ? (tx as Record<string, unknown>) : {};
  const statusName = text(record.statusName) ?? text(record.status_name) ?? knownStatus(record.status);
  const resultName = text(record.resultName) ?? text(record.result_name);
  const executionResultName = text(record.txExecutionResultName) ?? text(record.execution_result) ?? leaderExecution(record) ?? executionFrom(record);
  let finalizationStatus: FinalizationStatus = "pending";
  let detail = "The transaction is still in progress. No finalized result has been confirmed.";

  if (resultName === "NO_MAJORITY" || statusName === "UNDETERMINED") {
    finalizationStatus = "inconclusive";
    detail = "The evaluation was inconclusive. No finalized result was created.";
  } else if (resultName === "DISAGREE" || resultName === "MAJORITY_DISAGREE") {
    finalizationStatus = "disputed";
    detail = "The evaluation is disputed. The earlier result was not replaced.";
  } else if (statusName === "CANCELED" || statusName === "LEADER_TIMEOUT" || statusName === "VALIDATORS_TIMEOUT") {
    finalizationStatus = "failed";
    detail = "The transaction did not succeed. No finalized result was created.";
  } else if (statusName === "FINALIZED") {
    const failedExecution = executionResultName === "FINISHED_WITH_ERROR" || executionResultName === "ERROR" || executionResultName === "FAILURE" || resultName === "FAILURE";
    const successExecution = executionResultName === "FINISHED_WITH_RETURN" || executionResultName === "SUCCESS" || resultName === "SUCCESS" || resultName === "MAJORITY_AGREE";
    if (failedExecution) {
      finalizationStatus = "failed";
      detail = "The transaction finalized with a failed execution. No FoodTrace result was accepted from it.";
    } else if (successExecution) {
      finalizationStatus = "finalized";
      detail = "The transaction is finalized.";
    } else {
      finalizationStatus = "pending";
      detail = "A finalized status was reported, but the execution result is not available yet.";
    }
  }

  return { statusName, resultName, executionResultName, finalizationStatus, detail };
}

export interface EvaluationLink {
  evaluationId: string;
  transactionId: string;
  lookupId: string;
}

export function readLinkedEvaluation(links: EvaluationLink[], transactionId: string): EvaluationLink | null {
  const target = transactionId.toLowerCase();
  return links.find((link) => link.transactionId.toLowerCase() === target) ?? null;
}

export function isTransactionHash(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}
