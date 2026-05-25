-- AlterTable
ALTER TABLE "UserSetting" ADD COLUMN IF NOT EXISTS "privacyMemoryEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserSetting" ADD COLUMN IF NOT EXISTS "privacyMemoryRetentionDays" INTEGER NOT NULL DEFAULT 90;
ALTER TABLE "UserSetting" ADD COLUMN IF NOT EXISTS "privacyMemoryUseForBlocking" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserSetting" ADD COLUMN IF NOT EXISTS "privacyMemoryUseForScoreBoost" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PrivacyMemoryProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "memoryType" TEXT NOT NULL DEFAULT 'privacy_context',
    "piiTypes" JSONB NOT NULL,
    "contextTags" JSONB NOT NULL,
    "riskyCombinations" JSONB NOT NULL,
    "sourceTypes" JSONB,
    "seenCount" INTEGER NOT NULL DEFAULT 1,
    "riskWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "lastRiskLevel" TEXT,
    "lastRiskScoreBand" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyMemoryProfile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PrivacyMemoryProfile_userId_isActive_idx" ON "PrivacyMemoryProfile"("userId", "isActive");
