import { error, ok } from "@/lib/api-response";
import { addManualWorkspaceAgentInDb } from "@/lib/server/workspace-server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        agentId?: string;
        capabilities?: string[];
      }
    | null;

  if (!body?.name?.trim() || !body?.agentId?.trim()) {
    return error("Missing required fields", 422, {
      required: ["name", "agentId"]
    });
  }

  const result = await addManualWorkspaceAgentInDb({
    name: body.name,
    agentId: body.agentId,
    capabilities: body.capabilities
  });

  if (!result) {
    return error("Workspace not found", 404);
  }

  if ("error" in result) {
    return error("Agent name and agent id are required", 422, {
      code: result.error
    });
  }

  return ok({ agent: result }, { status: 201 });
}
