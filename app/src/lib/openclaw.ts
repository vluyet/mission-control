export type OpenClawAgentDescriptor = {
  id: string;
  name: string;
  capabilities: string[];
};

export type OpenClawDispatchResult = {
  responseId: string | null;
  finalText: string;
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

  const list = extractAgentList(raw);

  return list.map(normalizeAgent).filter((agent): agent is OpenClawAgentDescriptor => Boolean(agent));
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
  agentId: string;
  taskId: string;
  message: string;
}): Promise<OpenClawDispatchResult> {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${input.gatewayToken}`
  };

  async function parseDispatchResponse(response: Response, mode: "hook" | "bridge") {
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
      return {
        ok: false as const,
        status: response.status,
        message: payload?.error?.message || `OpenClaw dispatch failed with status ${response.status}.`,
        payload
      };
    }

    const resultPayload = mode === "bridge" && payload && typeof payload === "object" && "result" in payload ? payload.result : payload;
    const finalText = extractTextFromPayload(resultPayload);

    if (!finalText) {
      return {
        ok: false as const,
        status: response.status,
        message: "OpenClaw dispatch did not return a final response.",
        payload
      };
    }

    return {
      ok: true as const,
      result: {
        responseId: payload?.id ?? payload?.runId ?? ((payload?.result as { id?: string } | undefined)?.id ?? null),
        finalText,
        raw: payload
      }
    };
  }

  const hookResponse = await fetch(`${baseUrl}/hooks/agent`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      agentId: input.agentId,
      message: input.message,
      wakeMode: "now",
      deliver: false,
      thinking: "medium",
      timeoutSeconds: 120
    }),
    cache: "no-store"
  });

  const hookResult = await parseDispatchResponse(hookResponse, "hook");
  if (hookResult.ok) {
    return hookResult.result;
  }

  if (hookResult.status !== 401 && hookResult.status !== 404) {
    throw new Error(hookResult.message);
  }

  const bridgeResponse = await fetch(`${baseUrl}/dispatch`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      agentId: input.agentId,
      taskId: input.taskId,
      prompt: input.message
    }),
    cache: "no-store"
  });

  const bridgeResult = await parseDispatchResponse(bridgeResponse, "bridge");
  if (bridgeResult.ok) {
    return bridgeResult.result;
  }

  if (bridgeResult.status !== 401 && bridgeResult.status !== 404) {
    throw new Error(bridgeResult.message || hookResult.message);
  }

  const legacyResponse = await fetch(`${baseUrl}/v1/responses`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: `agent:${input.agentId}`,
      user: `mission-control-task:${input.taskId}`,
      input: input.message
    }),
    cache: "no-store"
  });

  const legacyResult = await parseDispatchResponse(legacyResponse, "hook");
  if (legacyResult.ok) {
    return legacyResult.result;
  }

  throw new Error(legacyResult.message || bridgeResult.message || hookResult.message);
}
