-- CreateTable
CREATE TABLE "WorkspaceAsset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "authorId" TEXT,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "assetType" TEXT NOT NULL DEFAULT 'reference',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceAsset_workspaceId_createdAt_idx" ON "WorkspaceAsset"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkspaceAsset" ADD CONSTRAINT "WorkspaceAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAsset" ADD CONSTRAINT "WorkspaceAsset_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
