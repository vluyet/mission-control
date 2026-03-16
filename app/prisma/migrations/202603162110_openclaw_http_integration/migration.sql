CREATE TABLE "WorkspaceOpenClawIntegration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "label" TEXT,
    "baseUrl" TEXT NOT NULL,
    "gatewayToken" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceOpenClawIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceOpenClawIntegration_workspaceId_key" ON "WorkspaceOpenClawIntegration"("workspaceId");
CREATE INDEX "WorkspaceOpenClawIntegration_workspaceId_updatedAt_idx" ON "WorkspaceOpenClawIntegration"("workspaceId", "updatedAt");
ALTER TABLE "WorkspaceOpenClawIntegration" ADD CONSTRAINT "WorkspaceOpenClawIntegration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
