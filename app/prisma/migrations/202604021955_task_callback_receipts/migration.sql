CREATE TABLE "TaskCallbackReceipt" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "bridgeExecutionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskCallbackReceipt_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TaskCallbackReceipt"
ADD CONSTRAINT "TaskCallbackReceipt_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "TaskCallbackReceipt_taskId_source_eventType_bridgeExecutionI_key"
ON "TaskCallbackReceipt"("taskId", "source", "eventType", "bridgeExecutionId");

CREATE INDEX "TaskCallbackReceipt_taskId_createdAt_idx"
ON "TaskCallbackReceipt"("taskId", "createdAt");
