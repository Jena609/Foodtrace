-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'consumer',
    "defaultRegion" TEXT NOT NULL DEFAULT '',
    "emailAlerts" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT,
    "ownerWalletAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductLookup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "barcode" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "brand" TEXT NOT NULL DEFAULT '',
    "lotNumber" TEXT NOT NULL DEFAULT '',
    "expirationDate" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductLookup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecallRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lookupId" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "barcode" TEXT NOT NULL DEFAULT '',
    "lotNumbers" TEXT NOT NULL,
    "recallReason" TEXT NOT NULL,
    "recallDate" TEXT NOT NULL,
    "geographicScope" TEXT NOT NULL,
    "rawEvidence" TEXT NOT NULL,
    "retrievedAt" DATETIME NOT NULL,
    "isDemoData" BOOLEAN NOT NULL DEFAULT false,
    "sourcePriority" INTEGER NOT NULL,
    "recordKind" TEXT NOT NULL DEFAULT 'recall',
    "region" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "RecallRecord_lookupId_fkey" FOREIGN KEY ("lookupId") REFERENCES "ProductLookup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lookupId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "evidenceText" TEXT NOT NULL,
    "evidenceHash" TEXT NOT NULL,
    "sourcePriority" INTEGER NOT NULL,
    "retrievedAt" DATETIME NOT NULL,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "recordKind" TEXT NOT NULL DEFAULT 'context',
    "matchCriteria" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "EvidenceRecord_lookupId_fkey" FOREIGN KEY ("lookupId") REFERENCES "ProductLookup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lookupId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "reasoningSummary" TEXT NOT NULL,
    "matchedCriteria" TEXT NOT NULL,
    "sourcesChecked" TEXT NOT NULL,
    "preliminaryStatus" TEXT NOT NULL,
    "preliminarySummary" TEXT NOT NULL,
    "genlayerTransactionId" TEXT NOT NULL DEFAULT '',
    "genlayerEvaluationId" TEXT NOT NULL DEFAULT '',
    "proposedEvaluationId" TEXT NOT NULL DEFAULT '',
    "evidenceHash" TEXT NOT NULL,
    "evaluatedAt" DATETIME NOT NULL,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "finalizationStatus" TEXT NOT NULL,
    "chainPayload" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "VerificationResult_lookupId_fkey" FOREIGN KEY ("lookupId") REFERENCES "ProductLookup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "barcode" TEXT NOT NULL DEFAULT '',
    "lotNumber" TEXT NOT NULL DEFAULT '',
    "expirationDate" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL,
    "supplier" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'unverified',
    "lastCheckedAt" DATETIME,
    "lastLookupId" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Appeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "verificationResultId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "newEvidence" TEXT NOT NULL,
    "explanation" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL,
    "outcomeStatus" TEXT NOT NULL DEFAULT '',
    "outcomeSummary" TEXT NOT NULL DEFAULT '',
    "genlayerTransactionId" TEXT NOT NULL DEFAULT '',
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "Appeal_verificationResultId_fkey" FOREIGN KEY ("verificationResultId") REFERENCES "VerificationResult" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReplayNonce" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wallet" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "usedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Business_ownerWalletAddress_idx" ON "Business"("ownerWalletAddress");

-- CreateIndex
CREATE INDEX "ProductLookup_userId_idx" ON "ProductLookup"("userId");

-- CreateIndex
CREATE INDEX "ProductLookup_createdAt_idx" ON "ProductLookup"("createdAt");

-- CreateIndex
CREATE INDEX "ProductLookup_status_idx" ON "ProductLookup"("status");

-- CreateIndex
CREATE INDEX "ProductLookup_barcode_idx" ON "ProductLookup"("barcode");

-- CreateIndex
CREATE INDEX "ProductLookup_lotNumber_idx" ON "ProductLookup"("lotNumber");

-- CreateIndex
CREATE INDEX "RecallRecord_lookupId_idx" ON "RecallRecord"("lookupId");

-- CreateIndex
CREATE INDEX "RecallRecord_barcode_idx" ON "RecallRecord"("barcode");

-- CreateIndex
CREATE INDEX "RecallRecord_brand_idx" ON "RecallRecord"("brand");

-- CreateIndex
CREATE INDEX "RecallRecord_isDemoData_idx" ON "RecallRecord"("isDemoData");

-- CreateIndex
CREATE INDEX "EvidenceRecord_lookupId_idx" ON "EvidenceRecord"("lookupId");

-- CreateIndex
CREATE INDEX "EvidenceRecord_evidenceHash_idx" ON "EvidenceRecord"("evidenceHash");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationResult_lookupId_key" ON "VerificationResult"("lookupId");

-- CreateIndex
CREATE INDEX "VerificationResult_genlayerEvaluationId_idx" ON "VerificationResult"("genlayerEvaluationId");

-- CreateIndex
CREATE INDEX "VerificationResult_genlayerTransactionId_idx" ON "VerificationResult"("genlayerTransactionId");

-- CreateIndex
CREATE INDEX "VerificationResult_finalizationStatus_idx" ON "VerificationResult"("finalizationStatus");

-- CreateIndex
CREATE INDEX "InventoryItem_businessId_idx" ON "InventoryItem"("businessId");

-- CreateIndex
CREATE INDEX "InventoryItem_status_idx" ON "InventoryItem"("status");

-- CreateIndex
CREATE INDEX "InventoryItem_expirationDate_idx" ON "InventoryItem"("expirationDate");

-- CreateIndex
CREATE INDEX "InventoryItem_barcode_idx" ON "InventoryItem"("barcode");

-- CreateIndex
CREATE INDEX "Appeal_verificationResultId_idx" ON "Appeal"("verificationResultId");

-- CreateIndex
CREATE INDEX "Appeal_status_idx" ON "Appeal"("status");

-- CreateIndex
CREATE INDEX "ReplayNonce_usedAt_idx" ON "ReplayNonce"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReplayNonce_wallet_nonce_key" ON "ReplayNonce"("wallet", "nonce");

