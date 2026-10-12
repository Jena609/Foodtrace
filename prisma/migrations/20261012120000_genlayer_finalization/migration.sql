-- Additive columns for an existing FoodTrace database.
-- ensureDatabase applies these with a column check so a second run is safe.
ALTER TABLE "VerificationResult" ADD COLUMN "lastError" TEXT NOT NULL DEFAULT '';
ALTER TABLE "VerificationResult" ADD COLUMN "submittedAt" DATETIME;
ALTER TABLE "VerificationResult" ADD COLUMN "finalizedAt" DATETIME;
ALTER TABLE "VerificationResult" ADD COLUMN "genlayerNetwork" TEXT NOT NULL DEFAULT '';
ALTER TABLE "VerificationResult" ADD COLUMN "genlayerChainId" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VerificationResult" ADD COLUMN "contractAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE "VerificationResult" ADD COLUMN "explorerTransactionUrl" TEXT NOT NULL DEFAULT '';
