CREATE TABLE "WorkspaceConstructorIntegration" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "label" TEXT,
  "baseUrl" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "callbackToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceConstructorIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceConstructorIntegration_workspaceId_key" ON "WorkspaceConstructorIntegration"("workspaceId");
CREATE INDEX "WorkspaceConstructorIntegration_workspaceId_updatedAt_idx" ON "WorkspaceConstructorIntegration"("workspaceId", "updatedAt");

ALTER TABLE "WorkspaceConstructorIntegration"
ADD CONSTRAINT "WorkspaceConstructorIntegration_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
