import type { FinalizationStatus } from "@/lib/types";

export interface TransactionObservation {
  statusName: string | null;
  resultName: string | null;
  executionResultName: string | null;
  finalizationStatus: FinalizationStatus;
  detail: string;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function mapTransactionObservation(tx: unknown): TransactionObservation {
  const record = tx && typeof tx === "object" ? (tx as Record<string, unknown>) : {};
  const statusName = text(record.statusName) ?? text(record.status_name);
  const resultName = text(record.resultName) ?? text(record.result_name);
  const executionResultName = text(record.txExecutionResultName) ?? text(record.execution_result);
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
    const failedExecution = executionResultName === "FINISHED_WITH_ERROR" || resultName === "FAILURE";
    const successExecution =
      executionResultName === "FINISHED_WITH_RETURN" || resultName === "SUCCESS" || resultName === "MAJORITY_AGREE" || resultName === null;
    if (failedExecution) {
      finalizationStatus = "failed";
      detail = "The transaction finalized with a failed execution. No FoodTrace result was accepted from it.";
    } else if (successExecution && executionResultName !== null) {
      finalizationStatus = "finalized";
      detail = "The transaction is finalized.";
    } else if (resultName === "SUCCESS" || resultName === "MAJORITY_AGREE") {
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
