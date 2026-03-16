-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('owner', 'admin', 'member', 'viewer');

-- AlterTable
ALTER TABLE "Membership"
ADD COLUMN "workspaceRole" "WorkspaceRole" NOT NULL DEFAULT 'member';

-- Seed baseline roles for existing data
UPDATE "Membership"
SET "workspaceRole" = CASE
  WHEN "name" IN ('Ari Chen', 'Mila Soto') THEN 'owner'::"WorkspaceRole"
  WHEN "name" IN ('Nora Vale', 'Omar Idris') THEN 'admin'::"WorkspaceRole"
  WHEN "name" = 'Reviewer-03' THEN 'viewer'::"WorkspaceRole"
  ELSE 'member'::"WorkspaceRole"
END;
