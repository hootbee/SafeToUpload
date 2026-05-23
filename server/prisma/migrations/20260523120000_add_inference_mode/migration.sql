-- AlterTable
ALTER TABLE "AnalysisRecord" ADD COLUMN "inferenceMode" TEXT NOT NULL DEFAULT 'local';

-- AlterTable
ALTER TABLE "UserSetting" ADD COLUMN "inferenceMode" TEXT NOT NULL DEFAULT 'local';
