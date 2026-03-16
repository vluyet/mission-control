export type OpenClawAgentDescriptor = {
  id: string;
  name: string;
  capabilities: string[];
};

function normalizeBaseUrl(input: string) {
  return input.trim().replace(/\/+$/, "");
}

function guessNameFromId(id: string) {
  return id
    .split(/[\/_:-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toStringArray(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function normalizeAgent(value: unknown): OpenClawAgentDescriptor | null {
  if (typeof value === "string") {
    const id = value.trim();
    return id ? { id, name: guessNameFromId(id), capabilities: [] } : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const idCandidates = [record.id, record.agentId, record.key, record.name];
  const rawId = idCandidates.find((candidate) => typeof candidate === "string" && candidate.trim());

  if (typeof rawId !== "string") {
    return null;
  }

  const id = rawId.trim();
  const rawName = typeof record.name === "string" && record.name.trim() ? record.name.trim() : guessNameFromId(id);
  const capabilityValues: unknown[] = [];

  for (const key of ["capabilities", "labels", "tags", "tools", "mcpServers", "mcp_servers"]) {
    const entry = record[key];
    if (Array.isArray(entry)) {
      capabilityValues.push(...entry);
    }
  }

  if (typeof record.model === "string" && record.model.trim()) {
    capabilityValues.push(`model:${record.model.trim()}`);
  }

  return {
    id,
    name: rawName,
    capabilities: toStringArray(capabilityValues)
  };
}

export async function fetchOpenClawAgents(input: { baseUrl: string; gatewayToken: string }) {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const useConnector = baseUrl.includes("openclaw-connector");
  const agentsUrl = useConnector ? `${baseUrl}/agents` : `${baseUrl}/tools/invoke`;
  const response = await fetch(agentsUrl, {
    method: useConnector ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.gatewayToken}`
    },
    ...(useConnector ? {} : { body: JSON.stringify({ tool: "agents_list", args: {} }) }),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        result?: unknown;
        error?: { message?: string };
      }
    | null;

  if (!response.ok || payload?.ok === false) {
    const detail = payload?.error?.message || `OpenClaw request failed with status ${response.status}.`;
    throw new Error(detail);
  }

  const raw = payload?.result;
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { agents?: unknown[] }).agents)
      ? (raw as { agents: unknown[] }).agents
      : [];

  return list.map(normalizeAgent).filter((agent): agent is OpenClawAgentDescriptor => Boolean(agent));
}


export async function dispatchOpenClawTaskRun(input: {
  baseUrl: string;
  gatewayToken: string;
  agentId: string;
  taskId: string;
  prompt: string;
}) {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const dispatchUrl = baseUrl.includes('openclaw-connector') ? `${baseUrl}/dispatch` : `${baseUrl}/v1/responses`;
  const response = await fetch(dispatchUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.gatewayToken}`
    },
    body: JSON.stringify(dispatchUrl.endsWith('/dispatch') ? { agentId: input.agentId, taskId: input.taskId, prompt: input.prompt } : { model: `agent:${input.agentId}`, user: `mission-control-task:${input.taskId}`, input: input.prompt }),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        id?: string;
        result?: { id?: string };
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenClaw dispatch failed with status ${response.status}.`);
  }

  return {
    responseId: payload?.id ?? payload?.result?.id ?? null,
    raw: payload
  };
}
