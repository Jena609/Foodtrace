import type { FinalizationStatus, VerdictStatus } from "@/lib/types";

export interface StatusCopy {
  label: string;
  explanation: string;
  tone: "recall" | "clear" | "expired" | "conflict" | "unknown" | "pending";
}

export const STATUS_COPY: Record<VerdictStatus, StatusCopy> = {
  RECALL_FOUND: {
    label: "Recall found",
    explanation: "Recall information was detected in the configured sources.",
    tone: "recall",
  },
  NO_MATCHING_RECALL_FOUND: {
    label: "No matching recall found",
    explanation: "No matching recall was found in the configured sources as of the time of this check.",
    tone: "clear",
  },
  EXPIRED: {
    label: "Expired",
    explanation: "The expiration date provided is before the day of this check.",
    tone: "expired",
  },
  CONFLICTING_INFORMATION: {
    label: "Conflicting information",
    explanation: "The available sources contain conflicting information.",
    tone: "conflict",
  },
  UNABLE_TO_VERIFY: {
    label: "Unable to verify",
    explanation: "We were unable to verify this product with the available data.",
    tone: "unknown",
  },
};

export const FINALIZATION_COPY: Record<FinalizationStatus, string> = {
  preliminary: "Preliminary result from FoodTrace matching. This is not a GenLayer-finalized result.",
  mock: "MOCK RESULT. Demo data was evaluated locally. GenLayer did not finalize this result.",
  pending: "Verification is pending. No finalized result has been confirmed for this transaction.",
  finalized: "GenLayer finalized this evaluation.",
  disputed: "The GenLayer transaction is disputed. The earlier result was not replaced.",
  inconclusive: "The GenLayer evaluation was inconclusive. No finalized result was created.",
  failed: "The GenLayer transaction failed. No finalized result was created.",
  unavailable: "GenLayer verification is currently unavailable. No finalized result was created.",
};

export const SAFETY_DISCLAIMER =
  "FoodTrace is not a food-safety authority and does not guarantee that a product is safe to eat. A result reports what the configured sources showed at a specific time. Check the package, the retailer, and official notices before you decide what to do with a product.";

export const FORBIDDEN_STATUS_LABELS = [
  "SAFE_TO_EAT",
  "DEFINITELY_SAFE",
  "MEDICALLY_SAFE",
  "NO_HEALTH_RISK",
] as const;
