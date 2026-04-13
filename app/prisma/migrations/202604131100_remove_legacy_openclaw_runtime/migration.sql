DROP TABLE IF EXISTS "WorkspaceOpenClawIntegration" CASCADE;

UPDATE "Task"
SET "assigneeId" = NULL
WHERE "assigneeId" IN (
  SELECT "id"
  FROM "Membership"
  WHERE "sourceSystem" = 'openclaw'
);

UPDATE "Task"
SET "reviewerId" = NULL
WHERE "reviewerId" IN (
  SELECT "id"
  FROM "Membership"
  WHERE "sourceSystem" = 'openclaw'
);

DELETE FROM "TaskWatcher"
WHERE "membershipId" IN (
  SELECT "id"
  FROM "Membership"
  WHERE "sourceSystem" = 'openclaw'
);

DELETE FROM "ProjectMembership"
WHERE "membershipId" IN (
  SELECT "id"
  FROM "Membership"
  WHERE "sourceSystem" = 'openclaw'
);

DELETE FROM "AgentCredential"
WHERE "membershipId" IN (
  SELECT "id"
  FROM "Membership"
  WHERE "sourceSystem" = 'openclaw'
);

UPDATE "Membership"
SET "enabled" = FALSE
WHERE "sourceSystem" = 'openclaw';