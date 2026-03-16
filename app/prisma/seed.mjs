import { PrismaClient } from "@prisma/client";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const attachmentRoot = path.join(process.cwd(), "storage", "task-attachments");
const workspaceAssetRoot = path.join(process.cwd(), "storage", "workspace-assets");

async function main() {
  await prisma.taskExecutionLog.deleteMany();
  await prisma.taskExecution.deleteMany();
  await prisma.authEvent.deleteMany();
  await prisma.agentCredential.deleteMany();
  await prisma.workspaceAsset.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.taskWatcher.deleteMany();
  await prisma.taskActivity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMembership.deleteMany();
  await prisma.project.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  await rm(attachmentRoot, { recursive: true, force: true });
  await mkdir(attachmentRoot, { recursive: true });
  await rm(workspaceAssetRoot, { recursive: true, force: true });
  await mkdir(workspaceAssetRoot, { recursive: true });

  const ownerEmail = process.env.OWNER_EMAIL || "owner@northstar.lab";
  const ownerName = "Workspace Owner";

  const owner = await prisma.user.create({
    data: {
      email: ownerEmail,
      displayName: ownerName
    }
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Main Workspace",
      slug: "north-star-lab",
      visibility: "personal",
      context: {
        title: "Workspace context",
        summary: "",
        bullets: []
      }
    }
  });

  await prisma.membership.create({
    data: {
      workspaceId: workspace.id,
      userId: owner.id,
      name: ownerName,
      kind: "human",
      workspaceRole: "owner",
      email: ownerEmail,
      roleLabel: "Owner",
      capabilities: [],
      agentPermissions: [],
      enabled: true
    }
  });

  console.log(`Seeded empty workspace "${workspace.name}" for ${ownerEmail}`);
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
