export type ConstructorAgentDescriptor = {
  id: string;
  name: string;
  description: string | null;
  source: string | null;
  isDefault: boolean;
  capabilities: string[];
};

export type ConstructorTaskRequest = {
  externalTaskId: string;
  idempotencyKey: string;
  targetAgent: string;
  instruction: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  routingHints?: Record<string, unknown>;
  callback?: {
    required?: boolean;
    url?: string;
  };
  retryPolicy?: {
    maxDispatchAttempts?: number;
    maxCallbackAttempts?: number;
  };
  timeoutPolicy?: {
    executionTimeoutMs?: number;
    dispatchTimeoutMs?: number;
    callbackTimeoutMs?: number;
  };
};

export type ConstructorTaskResponse = {
  accepted?: boolean;
  deduplicated?: boolean;
  bridgeExecutionId?: string;
  externalTaskId?: string;
  executionState?: string;
  message?: string;
  rejection?: {
    code?: string;
    reason?: string;
  };
  error?: string;
};

export type ConstructorTaskSummaryItem = {
  bridgeExecutionId?: string;
  externalTaskId?: string | null;
  sessionId?: string | null;
  targetAgent?: string | null;
  runtimeName?: string | null;
  executionState?: string | null;
  cancellationState?: string | null;
  callbackState?: string | null;
  latestResult?: {
    type?: string | null;
    text?: string | null;
    terminalReason?: string | null;
    createdAt?: string | null;
    structured?: unknown;
  } | null;
};

export type ConstructorTaskSummaryResponse = {
  item?: ConstructorTaskSummaryItem;
  error?: string;
  message?: string;
};

function normalizeBaseUrl(input: string) {
  return input.trim().replace(/\/+$/, "");
}

export function normalizeConstructorPublicApiBaseUrl(input: string) {
  const normalized = normalizeBaseUrl(input);
  return /\/api\/v1$/i.test(normalized) ? normalized : `${normalized}/api/v1`;
}

function guessNameFromId(id: string) {
  return id
    .split(/[\/_:-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toStringArray(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function normalizeAgent(value: unknown): ConstructorAgentDescriptor | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const rawId = typeof record.id === "string" && record.id.trim() ? record.id.trim() : null;

  if (!rawId) {
    return null;
  }

  const rawName = typeof record.name === "string" && record.name.trim() ? record.name.trim() : guessNameFromId(rawId);
  const source = typeof record.source === "string" && record.source.trim() ? record.source.trim() : null;
  const description = typeof record.description === "string" && record.description.trim() ? record.description.trim() : null;
  const capabilities = toStringArray([
    typeof record.isDefault === "boolean" && record.isDefault ? "default" : null,
    source ? `source:${source}` : null
  ]);

  return {
    id: rawId,
    name: rawName,
    description,
    source,
    isDefault: record.isDefault === true,
    capabilities
  };
}

export async function fetchConstructorAgents(input: { baseUrl: string; apiToken: string }) {
  const response = await fetch(`${normalizeConstructorPublicApiBaseUrl(input.baseUrl)}/agents`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${input.apiToken}`
    },
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        items?: unknown[];
        error?: string;
        message?: string;
      }
    | null;

  if (!response.ok) {
    const detail = payload?.message ?? payload?.error ?? `Constructor agent listing failed with status ${response.status}.`;
    throw new Error(detail);
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items
    .map(normalizeAgent)
    .filter((agent): agent is ConstructorAgentDescriptor => Boolean(agent));
}

export async function dispatchConstructorTask(input: {
  baseUrl: string;
  apiToken: string;
  body: ConstructorTaskRequest;
}) {
  const response = await fetch(`${normalizeConstructorPublicApiBaseUrl(input.baseUrl)}/tasks`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(input.body),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as ConstructorTaskResponse | null;

  return {
    response,
    payload,
    location: response.headers.get("location")
  };
}

export async function fetchConstructorTaskSummary(input: {
  baseUrl: string;
  apiToken: string;
  bridgeExecutionId?: string;
  externalTaskId?: string;
}) {
  const bridgeExecutionId = input.bridgeExecutionId?.trim() || null;
  const externalTaskId = input.externalTaskId?.trim() || null;
  const lookupPath = bridgeExecutionId
    ? `/tasks/${encodeURIComponent(bridgeExecutionId)}`
    : externalTaskId
      ? `/tasks/by-external/${encodeURIComponent(externalTaskId)}`
      : null;

  if (!lookupPath) {
    throw new Error("Constructor task lookup requires bridgeExecutionId or externalTaskId.");
  }

  const response = await fetch(`${normalizeConstructorPublicApiBaseUrl(input.baseUrl)}${lookupPath}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${input.apiToken}`
    },
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as ConstructorTaskSummaryResponse | null;

  return {
    response,
    payload
  };
}