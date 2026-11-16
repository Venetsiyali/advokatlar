-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "extCreateMs" BIGINT,
ADD COLUMN     "extReason" INTEGER,
ADD COLUMN     "extState" INTEGER,
ADD COLUMN     "periodDays" INTEGER NOT NULL DEFAULT 30;

-- CreateIndex
CREATE INDEX "Payment_provider_extCreateMs_idx" ON "Payment"("provider", "extCreateMs");

-- CreateIndex
CREATE INDEX "Payment_lawyerId_createdAt_idx" ON "Payment"("lawyerId", "createdAt");
