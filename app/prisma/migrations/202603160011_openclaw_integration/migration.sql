-- CreateEnum
CREATE TYPE "OpenClawDiscoveryMode" AS ENUM ('cli', 'config_file');

-- AlterTable
ALTER TABLE "Membership"
ADD COLUMN "sourceSystem" TEXT,
ADD COLUMN "sourceKey" TEXT;

-- CreateTable
CREATE TABLE "WorkspaceOpenClawIntegration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "label" TEXT,
    "dashboardUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "discoveryMode" "OpenClawDiscoveryMode" NOT NULL DEFAULT 'cli',
    "executable" TEXT,
    "arguments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "configPath" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceOpenClawIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Membership_workspaceId_sourceSystem_sourceKey_key" ON "Membership"("workspaceId", "sourceSystem", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceOpenClawIntegration_workspaceId_key" ON "WorkspaceOpenClawIntegration"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceOpenClawIntegration_workspaceId_updatedAt_idx" ON "WorkspaceOpenClawIntegration"("workspaceId", "updatedAt");

-- AddForeignKey
ALTER TABLE "WorkspaceOpenClawIntegration" ADD CONSTRAINT "WorkspaceOpenClawIntegration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
