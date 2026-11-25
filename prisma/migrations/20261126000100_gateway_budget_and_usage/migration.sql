ALTER TABLE "VirtualKey"
ADD COLUMN "reservedAmount" DECIMAL(12,8) NOT NULL DEFAULT 0;

ALTER TABLE "UsageLog"
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'openai',
ADD COLUMN "errorMessage" TEXT;

CREATE INDEX "UsageLog_createdAt_idx" ON "UsageLog"("createdAt");
