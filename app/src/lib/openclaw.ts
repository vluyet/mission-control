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

function assertBridgeResponse(
  response: Response,
  payload:
    | {
        ok?: boolean;
        result?: unknown;
        error?: { message?: string };
      }
    | null
) {
  if (!response.ok || payload?.ok === false) {
    const detail = payload?.error?.message || `OpenClaw bridge request failed with status ${response.status}.`;
    throw new Error(detail);
  }
}

export async function fetchOpenClawAgents(input: { baseUrl: string; gatewayToken: string }) {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${input.gatewayToken}`
  };

  try {
    const constructorResponse = await fetch(`${baseUrl}/admin/agents`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${input.gatewayToken}`
      },
      cache: "no-store"
    });
    const constructorPayload = (await constructorResponse.json().catch(() => null)) as { items?: unknown[] } | null;

    if (constructorResponse.ok) {
      return extractAgentList(constructorPayload?.items ?? constructorPayload)
        .map(normalizeAgent)
        .filter((agent): agent is OpenClawAgentDescriptor => Boolean(agent));
    }
  } catch {
    // fall through to compatibility bridge paths
  }

  try {
    const { response, payload } = await fetchJson(`${baseUrl}/agents`, {
      method: "GET",
      headers
    });

    assertBridgeResponse(response, payload);

    return extractAgentList(payload?.result)
      .map(normalizeAgent)
      .filter((agent): agent is OpenClawAgentDescriptor => Boolean(agent));
  } catch (error) {
    const { response, payload } = await fetchJson(`${baseUrl}/tools/invoke`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tool: "agents_list", args: {} })
    });

    if (!response.ok || payload?.ok === false) {
      throw error;
    }

    return extractAgentList(payload?.result)
      .map(normalizeAgent)
      .filter((agent): agent is OpenClawAgentDescriptor => Boolean(agent));
  }
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
  sessionKey: string;
  sessionId?: string | null;
  webhookUrl?: string;
  webhookToken?: string;
}) : Promise<OpenClawDispatchResult> {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const { response, payload } = await fetchJson(`${baseUrl}/dispatch`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.gatewayToken}`
    },
    body: JSON.stringify({
      agentId: input.agentId,
      taskId: input.taskId,
      workspaceId: input.workspaceId,
      prompt: input.message,
      sessionKey: input.sessionKey,
      sessionId: input.sessionId,
      webhookUrl: input.webhookUrl,
      webhookToken: input.webhookToken,
      source: "mission-control"
    })
  });

  assertBridgeResponse(response, payload);

  const result = payload?.result as Record<string, unknown> | undefined;
  const dispatchPayload = (result?.response ?? result ?? payload) as Record<string, unknown>;
  const responseId =
    (typeof dispatchPayload.responseId === "string" && dispatchPayload.responseId) ||
    (typeof dispatchPayload.runId === "string" && dispatchPayload.runId) ||
    (typeof dispatchPayload.id === "string" && dispatchPayload.id) ||
    null;
  const finalText = extractTextFromPayload(dispatchPayload);

  return {
    responseId,
    finalText,
    accepted: true,
    raw: payload
  };
}
