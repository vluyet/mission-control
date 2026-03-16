import { ok } from "@/lib/api-response";
import fs from "node:fs";
import path from "node:path";

function readVersion() {
  try {
    return fs.readFileSync(path.join(process.cwd(), "..", "VERSION"), "utf8").trim();
  } catch {
    return process.env.npm_package_version || "unknown";
  }
}

function readCommit() {
  return process.env.MISSION_CONTROL_COMMIT || null;
}

export async function GET() {
  return ok({
    status: "ok",
    version: readVersion(),
    commit: readCommit(),
    timestamp: new Date().toISOString()
  });
}
