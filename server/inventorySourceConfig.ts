import { TRPCError } from "@trpc/server";
import type { VerifiedInventoryRawRecord } from "./inventoryImport";

type InventorySourceEnv = {
  url?: string;
  token?: string;
  sourceName?: string;
};

export type VerifiedInventorySourceStatus = {
  configured: boolean;
  sourceName: string;
  endpointHost: string | null;
  authMode: "server-token" | "none";
  credentialPolicy: string;
  requiredSecrets: string[];
};

export function readVerifiedInventorySourceEnv(env: NodeJS.ProcessEnv = process.env): InventorySourceEnv {
  return {
    url: env.CTTX_VERIFIED_INVENTORY_SOURCE_URL,
    token: env.CTTX_VERIFIED_INVENTORY_SOURCE_TOKEN,
    sourceName: env.CTTX_VERIFIED_INVENTORY_SOURCE,
  };
}

function endpointHost(url: string | undefined) {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return "Invalid URL";
  }
}

export function getVerifiedInventorySourceStatus(env: NodeJS.ProcessEnv = process.env): VerifiedInventorySourceStatus {
  const source = readVerifiedInventorySourceEnv(env);
  const host = endpointHost(source.url);
  return {
    configured: Boolean(source.url && source.token && host !== "Invalid URL"),
    sourceName: source.sourceName ?? "Existing CTTX verified inventory database",
    endpointHost: host,
    authMode: source.token ? "server-token" : "none",
    credentialPolicy: "Credentials are read only from server-side environment secrets and are never rendered, stored, or accepted in the browser.",
    requiredSecrets: ["CTTX_VERIFIED_INVENTORY_SOURCE_URL", "CTTX_VERIFIED_INVENTORY_SOURCE_TOKEN", "CTTX_VERIFIED_INVENTORY_SOURCE"],
  };
}

export async function fetchVerifiedInventoryRecordsFromSource(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<VerifiedInventoryRawRecord[]> {
  const source = readVerifiedInventorySourceEnv(env);
  if (!source.url || !source.token) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Verified CTTX inventory source is not configured. Add CTTX_VERIFIED_INVENTORY_SOURCE_URL and CTTX_VERIFIED_INVENTORY_SOURCE_TOKEN as server-side secrets before importing directly from the source database.",
    });
  }

  let url: URL;
  try {
    url = new URL(source.url);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Verified inventory source URL is invalid." });
  }

  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${source.token}`,
    },
  });

  if (!response.ok) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: `Verified inventory source returned ${response.status}.` });
  }

  const payload = await response.json() as unknown;
  const records = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null && Array.isArray((payload as { records?: unknown }).records)
      ? (payload as { records: unknown[] }).records
      : null;

  if (!records) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Verified inventory source did not return a JSON array or { records: [...] }." });
  }

  return records as VerifiedInventoryRawRecord[];
}
