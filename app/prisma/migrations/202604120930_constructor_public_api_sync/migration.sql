ALTER TABLE "WorkspaceConstructorIntegration"
ADD COLUMN "apiToken" TEXT,
ADD COLUMN "lastSyncAt" TIMESTAMP(3),
ADD COLUMN "lastSyncStatus" TEXT,
ADD COLUMN "lastSyncError" TEXT;