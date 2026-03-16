-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('workspace', 'project_members');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('lead', 'member', 'observer');

-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "visibility" "ProjectVisibility" NOT NULL DEFAULT 'workspace';

-- AlterTable
ALTER TABLE "ProjectMembership"
ADD COLUMN "role" "ProjectRole" NOT NULL DEFAULT 'member';

-- CreateIndex
CREATE INDEX "Project_workspaceId_status_visibility_idx" ON "Project"("workspaceId", "status", "visibility");
