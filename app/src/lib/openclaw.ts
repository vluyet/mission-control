export type OpenClawAgentDescriptor = {
  id: string;
  name: string;
  capabilities: string[];
};

export type OpenClawDispatchResult = {
  responseId: string | null;
  finalText: string | null;
  accepted: boolean;
  raw: unknown;
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

function parseAgentIdFromSessionKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const match = /^agent:([^:]+):/.exec(trimmed);
  if (!match?.[1]) {
    return null;
  }

  return match[1].trim() || null;
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
  const useConnector = baseUrl.includes("openclaw-connector") || /127\.0\.0\.1:18890$/.test(baseUrl) || /localhost:18890$/.test(baseUrl) || /host\.docker\.internal:18890$/.test(baseUrl) || /127\.0\.0\.1:18891$/.test(baseUrl) || /localhost:18891$/.test(baseUrl) || /192\.168\.90\.90:18891$/.test(baseUrl);

  function extractAgentList(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }

    if (!value || typeof value !== "object") {
      return [];
    }

    const record = value as Record<string, unknown>;

    if (Array.isArray(record.agents)) {
      return record.agents;
    }

    if (record.details && typeof record.details === "object" && Array.isArray((record.details as { agents?: unknown[] }).agents)) {
      return (record.details as { agents: unknown[] }).agents;
    }

    if (Array.isArray(record.content)) {
      for (const entry of record.content) {
        if (entry && typeof entry === "object" && typeof (entry as { text?: unknown }).text === "string") {
          try {
            const parsed = JSON.parse((entry as { text: string }).text) as { agents?: unknown[] };
            if (Array.isArray(parsed.agents)) {
              return parsed.agents;
            }
          } catch {
            // ignore text blocks that are not JSON
          }
        }
      }
    }

    return [];
  }

  async function fetchJson(path: string, init: RequestInit) {
    const response = await fetch(path, { ...init, cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          result?: unknown;
          error?: { message?: string };
        }
      | null;

    return { response, payload };
  }

  if (useConnector) {
    const { response, payload } = await fetchJson(`${baseUrl}/agents`, {
      method: "GET",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${input.gatewayToken}`
      }
    });

    if (!response.ok || payload?.ok === false) {
      const detail = payload?.error?.message || `OpenClaw request failed with status ${response.status}.`;
      throw new Error(detail);
    }

    return extractAgentList(payload?.result).map(normalizeAgent).filter((agent): agent is OpenClawAgentDescriptor => Boolean(agent));
  }

  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${input.gatewayToken}`
  };

  const agentsResult = await fetchJson(`${baseUrl}/tools/invoke`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tool: "agents_list", args: {} })
  });

  if (agentsResult.response.ok && agentsResult.payload?.ok !== false) {
    const directAgents = extractAgentList(agentsResult.payload?.result)
      .map(normalizeAgent)
      .filter((agent): agent is OpenClawAgentDescriptor => Boolean(agent));

    if (directAgents.length > 0) {
      return directAgents;
    }
  }

  const sessionsResult = await fetchJson(`${baseUrl}/tools/invoke`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tool: "sessions_list", args: {} })
  });

  if (!sessionsResult.response.ok || sessionsResult.payload?.ok === false) {
    const detail = sessionsResult.payload?.error?.message || `OpenClaw request failed with status ${sessionsResult.response.status}.`;
    throw new Error(detail);
  }

  const sessionRecord = sessionsResult.payload?.result;
  const sessions = sessionRecord && typeof sessionRecord === "object" && Array.isArray((sessionRecord as { sessions?: unknown[] }).sessions)
    ? (sessionRecord as { sessions: unknown[] }).sessions
    : [];

  const agentIds = Array.from(
    new Set(
      sessions
        .map((entry) => (entry && typeof entry === "object" ? parseAgentIdFromSessionKey((entry as Record<string, unknown>).key) : null))
        .filter((value): value is string => Boolean(value))
    )
  );

  return agentIds.map((id) => ({ id, name: guessNameFromId(id), capabilities: ["derived:sessions_list"] }));
}


function extractTextFromPayload(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text || null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = extractTextFromPayload(entry);
      if (text) {
        return text;
      }
    }

    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  for (const key of ["response", "message", "output", "output_text", "text", "finalText", "resultText", "summary"]) {
    const text = extractTextFromPayload(record[key]);
    if (text) {
      return text;
    }
  }

  for (const key of ["result", "data", "details"]) {
    const text = extractTextFromPayload(record[key]);
    if (text) {
      return text;
    }
  }

  if (Array.isArray(record.content)) {
    for (const entry of record.content) {
      if (entry && typeof entry === "object") {
        const text = extractTextFromPayload((entry as Record<string, unknown>).text);
        if (text) {
          return text;
        }
      }
    }
  }

  return null;
}

export async function dispatchOpenClawTaskRun(input: {
  baseUrl: string;
  gatewayToken: string;
  hookToken?: string;
  agentId: string;
  taskId: string;
  workspaceId: string;
  message: string;
  webhookUrl?: string;
  webhookToken?: string;
}): Promise<OpenClawDispatchResult> {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const useConnector =
    baseUrl.includes("openclaw-connector") ||
    /127\.0\.0\.1:18890$/.test(baseUrl) ||
    /localhost:18890$/.test(baseUrl) ||
    /host\.docker\.internal:18890$/.test(baseUrl) ||
    /127\.0\.0\.1:18891$/.test(baseUrl) ||
    /localhost:18891$/.test(baseUrl) ||
    /192\.168\.90\.90:18891$/.test(baseUrl);

  const targetUrl = useConnector ? `${baseUrl}/dispatch` : `${baseUrl}/hooks/agent`;
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${input.hookToken ?? input.gatewayToken}`
  };

  const response = await fetch(targetUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(
      useConnector
        ? {
            agentId: input.agentId,
            taskId: input.taskId,
            prompt: input.message
          }
        : {
            agentId: input.agentId,
            message: input.message,
            wakeMode: "now",
            deliver: false,
            thinking: "medium",
            timeoutSeconds: 120
          }
    ),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        id?: string;
        runId?: string;
        result?: unknown;
        error?: { message?: string };
        ok?: boolean;
      }
    | null;

  if (!response.ok || payload?.ok === false) {
    const payloadPreview = payload ? JSON.stringify(payload).slice(0, 800) : "null";
    throw new Error((payload?.error?.message || `OpenClaw dispatch failed with status ${response.status}.`) + ` [status=${response.status} payload=${payloadPreview}]`);
  }

  const resultPayload = useConnector && payload && typeof payload === "object" ? payload.result ?? payload : payload?.result ?? payload;
  const responseId = payload?.id ?? payload?.runId ?? ((resultPayload as { id?: string } | undefined)?.id ?? null);
  const finalText = extractTextFromPayload(resultPayload);

  return {
    responseId,
    finalText,
    accepted: true,
    raw: payload
  };
}
