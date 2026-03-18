import { ok } from "@/lib/api-response";
import { getDeploymentMetadata } from "@/lib/runtime-metadata";

export const dynamic = "force-dynamic";

export async function GET() {
  const deployment = getDeploymentMetadata();

  return ok({
    status: "ok",
    version: deployment.version,
    branch: deployment.branch,
    commit: deployment.commit,
    ref: deployment.ref,
    timestamp: new Date().toISOString()
  });
}
