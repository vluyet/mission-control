import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

export type OpenClawIntegrationConfig = {
  enabled: boolean;
  label?: string | null;
  dashboardUrl?: string | null;
  discoveryMode: "cli" | "config_file";
  executable?: string | null;
  arguments?: string[];
  configPath?: string | null;
};

export type DiscoveredOpenClawAgent = {
  sourceKey: string;
  name: string;
  capabilities: string[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function collectStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return [
          typeof record.name === "string" ? record.name : "",
          typeof record.id === "string" ? record.id : "",
          typeof record.label === "string" ? record.label : ""
        ];
      }

      return [];
    })
    .filter(Boolean);
}

function normalizeAgentEntry(entry: unknown, index: number): DiscoveredOpenClawAgent | null {
  if (typeof entry === "string") {
    const name = entry.trim();

    if (!name) {
      return null;
    }

    return {
      sourceKey: slugify(name) || `agent-${index + 1}`,
      name,
      capabilities: []
    };
  }

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const name =
    (typeof record.name === "string" && record.name.trim()) ||
    (typeof record.id === "string" && record.id.trim()) ||
    (typeof record.slug === "string" && record.slug.trim()) ||
    (typeof record.identity === "string" && record.identity.trim()) ||
    (typeof record.entry === "string" && record.entry.trim()) ||
    "";

  if (!name) {
    return null;
  }

  const sourceKey =
    (typeof record.id === "string" && record.id.trim()) ||
    (typeof record.slug === "string" && record.slug.trim()) ||
    (typeof record.identity === "string" && record.identity.trim()) ||
    slugify(name) ||
    `agent-${index + 1}`;

  const capabilities = uniqueStrings([
    ...collectStringArray(record.capabilities),
    ...collectStringArray(record.labels),
    ...collectStringArray(record.tags),
    ...collectStringArray(record.mcpServers),
    ...collectStringArray(record.tools),
    typeof record.defaultModel === "string" ? record.defaultModel : "",
    typeof record.entry === "string" ? record.entry : ""
  ]);

  return {
    sourceKey,
    name,
    capabilities
  };
}

function extractAgentList(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (record.agents && typeof record.agents === "object" && !Array.isArray(record.agents)) {
      const agentsRecord = record.agents as Record<string, unknown>;

      if (Array.isArray(agentsRecord.list)) {
        return agentsRecord.list;
      }
    }

    if (Array.isArray(record.list)) {
      return record.list;
    }

    if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
      const dataRecord = record.data as Record<string, unknown>;

      if (Array.isArray(dataRecord.agents)) {
        return dataRecord.agents;
      }
    }
  }

  return [];
}

function parseAgentsPayload(raw: string) {
  const payload = JSON.parse(raw) as unknown;
  const list = extractAgentList(payload);
  return list
    .map((entry, index) => normalizeAgentEntry(entry, index))
    .filter((entry): entry is DiscoveredOpenClawAgent => Boolean(entry));
}

function runCommand(executable: string, args: string[], timeoutMs = 15000) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(executable, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill("SIGTERM");
      reject(new Error("OpenClaw discovery command timed out."));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(stderr.trim() || `OpenClaw discovery command exited with code ${code}.`));
        return;
      }

      resolve({
        stdout,
        stderr
      });
    });
  });
}

export async function discoverOpenClawAgents(config: OpenClawIntegrationConfig) {
  if (!config.enabled) {
    throw new Error("OpenClaw integration is disabled.");
  }

  if (config.discoveryMode === "config_file") {
    const configPath = config.configPath?.trim();

    if (!configPath) {
      throw new Error("OpenClaw config path is required.");
    }

    const raw = await readFile(configPath, "utf8");
    return parseAgentsPayload(raw);
  }

  const executable = config.executable?.trim();
  const args = (config.arguments ?? []).map((value) => value.trim()).filter(Boolean);

  if (!executable) {
    throw new Error("OpenClaw CLI executable is required.");
  }

  const result = await runCommand(executable, args);
  return parseAgentsPayload(result.stdout);
}
