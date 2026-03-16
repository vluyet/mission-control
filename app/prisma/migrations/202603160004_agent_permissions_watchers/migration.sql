-- Add workspace-level agent permissions
ALTER TABLE "Membership" ADD COLUMN "agentPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "Membership" SET "agentPermissions" = ARRAY['comment','change_status','log_execution'] WHERE "kind" = 'agent';
ALTER TABLE "Membership" ALTER COLUMN "agentPermissions" SET NOT NULL;

-- Add task watchers
CREATE TABLE "TaskWatcher" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskWatcher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskWatcher_taskId_membershipId_key" ON "TaskWatcher"("taskId", "membershipId");
CREATE INDEX "TaskWatcher_taskId_createdAt_idx" ON "TaskWatcher"("taskId", "createdAt");
CREATE INDEX "TaskWatcher_membershipId_createdAt_idx" ON "TaskWatcher"("membershipId", "createdAt");

ALTER TABLE "TaskWatcher" ADD CONSTRAINT "TaskWatcher_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskWatcher" ADD CONSTRAINT "TaskWatcher_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
