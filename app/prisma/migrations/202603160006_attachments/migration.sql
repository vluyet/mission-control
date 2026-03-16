-- CreateTable
CREATE TABLE "Attachment" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "authorId" TEXT,
  "originalName" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "artifactType" TEXT NOT NULL DEFAULT 'reference',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attachment_taskId_createdAt_idx" ON "Attachment"("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "Attachment"
ADD CONSTRAINT "Attachment_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment"
ADD CONSTRAINT "Attachment_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "Membership"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
