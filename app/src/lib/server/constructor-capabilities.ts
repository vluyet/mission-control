import { fetchConstructorCapabilities, type ConstructorCapabilities } from "@/lib/constructor";

const DEFAULT_CAPABILITIES_TTL_MS = 5 * 60 * 1000;

type ConstructorCapabilitiesCacheEntry = {
  workspaceId: string;
  baseUrl: string;
  apiToken: string;
  fetchedAtMs: number;
  capabilities: ConstructorCapabilities;
};

export type ConstructorCapabilitiesSnapshot = {
  capabilities: ConstructorCapabilities;
  fetchedAt: string;
  source: "cache" | "live";
};

declare global {
  var __missionControlConstructorCapabilitiesCache:
    | Map<string, ConstructorCapabilitiesCacheEntry>
    | undefined;
}

const constructorCapabilitiesCache =
  globalThis.__missionControlConstructorCapabilitiesCache ??
  (globalThis.__missionControlConstructorCapabilitiesCache = new Map<string, ConstructorCapabilitiesCacheEntry>());

function normalizeBaseUrl(input: string) {
  return input.trim().replace(/\/+$/, "");
}

function getFreshEntry(input: {
  workspaceId: string;
  baseUrl: string;
  apiToken: string;
  maxAgeMs?: number;
}) {
  const entry = constructorCapabilitiesCache.get(input.workspaceId);

  if (!entry) {
    return null;
  }

  if (entry.baseUrl !== normalizeBaseUrl(input.baseUrl) || entry.apiToken !== input.apiToken) {
    constructorCapabilitiesCache.delete(input.workspaceId);
    return null;
  }

  if (Date.now() - entry.fetchedAtMs > (input.maxAgeMs ?? DEFAULT_CAPABILITIES_TTL_MS)) {
    return null;
  }

  return entry;
}

export function peekConstructorCapabilitiesSnapshot(input: {
  workspaceId: string;
  baseUrl: string;
  apiToken: string;
  maxAgeMs?: number;
}): ConstructorCapabilitiesSnapshot | null {
  const entry = getFreshEntry(input);

  if (!entry) {
    return null;
  }

  return {
    capabilities: entry.capabilities,
    fetchedAt: new Date(entry.fetchedAtMs).toISOString(),
    source: "cache"
  };
}

export function clearConstructorCapabilitiesSnapshot(workspaceId: string) {
  constructorCapabilitiesCache.delete(workspaceId);
}

export async function getConstructorCapabilitiesSnapshot(
  input: {
    workspaceId: string;
    baseUrl: string;
    apiToken: string;
  },
  options?: {
    maxAgeMs?: number;
    forceRefresh?: boolean;
  }
): Promise<ConstructorCapabilitiesSnapshot> {
  const cached = options?.forceRefresh
    ? null
    : peekConstructorCapabilitiesSnapshot({
        workspaceId: input.workspaceId,
        baseUrl: input.baseUrl,
        apiToken: input.apiToken,
        maxAgeMs: options?.maxAgeMs
      });

  if (cached) {
    return cached;
  }

  const response = await fetchConstructorCapabilities({
    baseUrl: input.baseUrl,
    apiToken: input.apiToken
  });

  if (!response.response.ok) {
    const detail = response.payload?.message ?? response.payload?.error ?? `Constructor capabilities request failed with status ${response.response.status}.`;
    const failure = new Error(detail) as Error & {
      status?: number;
      code?: string;
    };
    failure.status = response.response.status;
    failure.code = typeof response.payload?.error === "string" && response.payload.error.trim()
      ? response.payload.error.trim()
      : "CONSTRUCTOR_CAPABILITIES_FAILED";
    throw failure;
  }

  const fetchedAtMs = Date.now();
  constructorCapabilitiesCache.set(input.workspaceId, {
    workspaceId: input.workspaceId,
    baseUrl: normalizeBaseUrl(input.baseUrl),
    apiToken: input.apiToken,
    fetchedAtMs,
    capabilities: response.capabilities
  });

  return {
    capabilities: response.capabilities,
    fetchedAt: new Date(fetchedAtMs).toISOString(),
    source: "live"
  };
}