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

export type ConstructorTaskFileKind = "input" | "output";

export type ConstructorTaskFile = {
  id: string;
  fileName: string;
  mediaType: string | null;
  sizeBytes: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  creatorExecutionId: string | null;
  kind: ConstructorTaskFileKind;
  active: boolean;
};

export type ConstructorTaskFileCapabilities = {
  enabled: boolean;
  uploadMaxBytes: number | null;
  uploadTransport: string | null;
};

export type ConstructorCapabilities = {
  taskFiles: ConstructorTaskFileCapabilities;
};

type ConstructorTaskFilesResponse = {
  items?: unknown[];
  files?: unknown[];
  taskFiles?: unknown[];
  data?: unknown;
  error?: string;
  message?: string;
  deduplicated?: boolean;
};

type ConstructorCapabilitiesResponse = {
  taskFiles?: unknown;
  data?: unknown;
  error?: string;
  message?: string;
};

type ConstructorTaskFileMutationResponse = {
  item?: unknown;
  file?: unknown;
  taskFile?: unknown;
  data?: unknown;
  error?: string;
  message?: string;
  deduplicated?: boolean;
};

function normalizeBaseUrl(input: string) {
  return input.trim().replace(/\/+$/, "");
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeIdentifier(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return null;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "enabled"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "disabled"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function normalizeLowercaseString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeTimestamp(value: unknown) {
  return normalizeString(value);
}

function pickRecordValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
}

function hasTruthyString(record: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => Boolean(normalizeString(record[key])));
}

function extractArrayPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;

  for (const key of ["items", "files", "taskFiles"]) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return extractArrayPayload(record.data);
}

function extractItemPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const record = payload as Record<string, unknown>;

  for (const key of ["item", "file", "taskFile"]) {
    if (record[key] !== undefined) {
      return record[key];
    }
  }

  if (record.data !== undefined) {
    return extractItemPayload(record.data);
  }

  return payload;
}

function normalizeConstructorCapabilities(payload: unknown): ConstructorCapabilities {
  const record = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};
  const nestedData = record.data && typeof record.data === "object" && !Array.isArray(record.data)
    ? (record.data as Record<string, unknown>)
    : null;
  const taskFilesRecord = (() => {
    const candidate = record.taskFiles ?? nestedData?.taskFiles ?? nestedData;

    return candidate && typeof candidate === "object" && !Array.isArray(candidate)
      ? (candidate as Record<string, unknown>)
      : null;
  })();

  return {
    taskFiles: {
      enabled: normalizeBoolean(taskFilesRecord?.enabled) ?? false,
      uploadMaxBytes: normalizeNumber(taskFilesRecord?.uploadMaxBytes),
      uploadTransport: normalizeString(taskFilesRecord?.uploadTransport)
    }
  };
}

function normalizeTaskFileKind(record: Record<string, unknown>): ConstructorTaskFileKind {
  const rawKinds = [
    record.kind,
    record.fileKind,
    record.role,
    record.fileRole,
    record.category,
    record.origin,
    record.originType,
    record.type
  ]
    .map(normalizeLowercaseString)
    .filter((value): value is string => Boolean(value));

  if (
    record.isOutput === true ||
    record.generated === true ||
    hasTruthyString(record, ["creatorExecutionId", "executionId", "sourceExecutionId"]) ||
    rawKinds.some((value) => /(^|[_:-])(output|generated|result|artifact|deliverable)(s)?$/.test(value))
  ) {
    return "output";
  }

  return "input";
}

function normalizeTaskFileActive(record: Record<string, unknown>, kind: ConstructorTaskFileKind) {
  if (kind === "output") {
    return true;
  }

  if (typeof record.active === "boolean") {
    return record.active;
  }

  if (typeof record.enabled === "boolean") {
    return record.enabled;
  }

  if (typeof record.deleted === "boolean") {
    return !record.deleted;
  }

  if (hasTruthyString(record, ["deletedAt", "deactivatedAt", "removedAt"])) {
    return false;
  }

  const rawState = normalizeLowercaseString(record.status) ?? normalizeLowercaseString(record.state);

  if (rawState && ["deleted", "deactivated", "disabled", "inactive", "removed"].includes(rawState)) {
    return false;
  }

  return true;
}

function normalizeTaskFile(value: unknown): ConstructorTaskFile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = normalizeIdentifier(pickRecordValue(record, ["id", "taskFileId", "fileId"]));

  if (!id) {
    return null;
  }

  const fileName =
    normalizeString(pickRecordValue(record, ["fileName", "name", "originalName", "downloadName", "title"])) ??
    `file-${id}`;
  const kind = normalizeTaskFileKind(record);

  return {
    id,
    fileName,
    mediaType: normalizeString(pickRecordValue(record, ["contentType", "mediaType", "mimeType", "type"])),
    sizeBytes: normalizeNumber(pickRecordValue(record, ["sizeBytes", "byteSize", "size", "contentLength"])),
    createdAt: normalizeTimestamp(pickRecordValue(record, ["createdAt", "uploadedAt", "generatedAt"])),
    updatedAt: normalizeTimestamp(pickRecordValue(record, ["updatedAt", "modifiedAt", "lastModifiedAt", "createdAt"])),
    creatorExecutionId:
      normalizeIdentifier(pickRecordValue(record, ["creatorExecutionId", "executionId", "sourceExecutionId"])) ?? null,
    kind,
    active: normalizeTaskFileActive(record, kind)
  };
}

export function getStableConstructorExternalTaskId(taskId: string) {
  return `mc-task-${taskId}`;
}

export function createConstructorDispatchIdempotencyKey(taskId: string) {
  return `${getStableConstructorExternalTaskId(taskId)}-dispatch-${crypto.randomUUID()}`;
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

export async function fetchConstructorCapabilities(input: { baseUrl: string; apiToken: string }) {
  const response = await fetch(`${normalizeConstructorPublicApiBaseUrl(input.baseUrl)}/capabilities`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${input.apiToken}`
    },
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as ConstructorCapabilitiesResponse | null;

  return {
    response,
    payload,
    capabilities: normalizeConstructorCapabilities(payload)
  };
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

export async function fetchConstructorTaskFiles(input: {
  baseUrl: string;
  apiToken: string;
  externalTaskId: string;
}) {
  const response = await fetch(
    `${normalizeConstructorPublicApiBaseUrl(input.baseUrl)}/tasks/${encodeURIComponent(input.externalTaskId)}/files`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${input.apiToken}`
      },
      cache: "no-store"
    }
  );

  const payload = (await response.json().catch(() => null)) as ConstructorTaskFilesResponse | null;
  const items = extractArrayPayload(payload).map(normalizeTaskFile).filter((item): item is ConstructorTaskFile => Boolean(item));

  return {
    response,
    payload,
    items
  };
}

export async function uploadConstructorTaskFile(input: {
  baseUrl: string;
  apiToken: string;
  externalTaskId: string;
  body: {
    fileName: string;
    contentBase64: string;
    contentType?: string;
  };
}) {
  const response = await fetch(
    `${normalizeConstructorPublicApiBaseUrl(input.baseUrl)}/tasks/${encodeURIComponent(input.externalTaskId)}/files`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.apiToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(input.body),
      cache: "no-store"
    }
  );

  const payload = (await response.json().catch(() => null)) as ConstructorTaskFileMutationResponse | null;
  const item = normalizeTaskFile(extractItemPayload(payload));

  return {
    response,
    payload,
    item
  };
}

export async function deleteConstructorTaskFile(input: {
  baseUrl: string;
  apiToken: string;
  externalTaskId: string;
  fileId: string;
}) {
  const response = await fetch(
    `${normalizeConstructorPublicApiBaseUrl(input.baseUrl)}/tasks/${encodeURIComponent(input.externalTaskId)}/files/${encodeURIComponent(input.fileId)}`,
    {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${input.apiToken}`
      },
      cache: "no-store"
    }
  );

  const payload = (await response.json().catch(() => null)) as ConstructorTaskFileMutationResponse | null;

  return {
    response,
    payload,
    item: normalizeTaskFile(extractItemPayload(payload))
  };
}

export async function downloadConstructorTaskFile(input: {
  baseUrl: string;
  apiToken: string;
  externalTaskId: string;
  fileId: string;
}) {
  const response = await fetch(
    `${normalizeConstructorPublicApiBaseUrl(input.baseUrl)}/tasks/${encodeURIComponent(input.externalTaskId)}/files/${encodeURIComponent(input.fileId)}/download`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${input.apiToken}`
      },
      cache: "no-store"
    }
  );

  return {
    response
  };
}