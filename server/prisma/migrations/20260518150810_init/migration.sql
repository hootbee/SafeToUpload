-- CreateTable
CREATE TABLE "AnalysisRecord" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "pageUrl" TEXT,
    "pageDomain" TEXT,
    "inputText" TEXT,
    "imagePath" TEXT,
    "status" TEXT NOT NULL,
    "riskScore" INTEGER,
    "riskLevel" TEXT,
    "summary" TEXT,
    "piiTypes" JSONB,
    "piiCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "piiItems" JSONB,
    "exifItems" JSONB,
    "imageRisks" JSONB,
    "contextResult" JSONB,
    "rewriteSuggestion" TEXT,
    "rawAiResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSetting" (
    "id" TEXT NOT NULL,
    "targetPlatforms" JSONB NOT NULL,
    "sensitivity" INTEGER NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "notificationEnabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisResult_analysisId_key" ON "AnalysisResult"("analysisId");

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "AnalysisRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
