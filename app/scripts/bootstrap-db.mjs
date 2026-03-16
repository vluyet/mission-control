import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.OWNER_EMAIL || "owner@northstar.lab";
  const ownerName = "Workspace Owner";

  const user = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      displayName: ownerName
    }
  });

  const workspaceCount = await prisma.workspace.count();

  let workspace = null;

  if (workspaceCount === 0) {
    workspace = await prisma.workspace.create({
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
  } else {
    workspace = await prisma.workspace.findFirst({
      orderBy: {
        createdAt: "asc"
      }
    });
  }

  if (!workspace) {
    throw new Error("Workspace bootstrap failed.");
  }

  const existingMembership = await prisma.membership.findFirst({
    where: {
      workspaceId: workspace.id,
      userId: user.id
    }
  });

  if (!existingMembership) {
    await prisma.membership.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
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
  }

  console.log(`Bootstrap ensured owner workspace access for ${ownerEmail}`);
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
