import fs from "node:fs";
import path from "node:path";

export type DeploymentMetadata = {
  version: string;
  branch: string | null;
  commit: string | null;
  shortCommit: string | null;
  ref: string | null;
  updatedAt: string | null;
};

type DeploymentFilePayload = Partial<{
  version: string;
  branch: string;
  commit: string;
  ref: string;
  updatedAt: string;
}>;

function cleanValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readDeploymentFile(): DeploymentFilePayload | null {
  try {
    const filePath = path.join(process.cwd(), "DEPLOYMENT.json");
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as DeploymentFilePayload;
  } catch {
    return null;
  }
}

function readVersionFallback() {
  try {
    return fs.readFileSync(path.join(process.cwd(), "..", "VERSION"), "utf8").trim();
  } catch {
    return process.env.npm_package_version || "unknown";
  }
}

export function getDeploymentMetadata(): DeploymentMetadata {
  const filePayload = readDeploymentFile();
  const version = cleanValue(process.env.MISSION_CONTROL_VERSION) ?? cleanValue(filePayload?.version) ?? readVersionFallback();
  const branch = cleanValue(process.env.MISSION_CONTROL_BRANCH) ?? cleanValue(filePayload?.branch);
  const commit = cleanValue(process.env.MISSION_CONTROL_COMMIT) ?? cleanValue(filePayload?.commit);
  const ref = cleanValue(process.env.MISSION_CONTROL_DEPLOY_REF) ?? cleanValue(filePayload?.ref);
  const updatedAt = cleanValue(filePayload?.updatedAt);

  return {
    version,
    branch,
    commit,
    shortCommit: commit ? commit.slice(0, 7) : null,
    ref,
    updatedAt
  };
}