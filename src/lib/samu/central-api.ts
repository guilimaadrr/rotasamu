import type { SupabaseClient } from "@supabase/supabase-js";
import { parseSnapshot, parseRecord, parseAudit, type ConfirmedStatus } from "./central-contract";
export const centralMode = (import.meta.env["VITE_SAMU_MODE"] || "local") !== "local";
const url = (import.meta.env["VITE_SUPABASE_URL"] || "").trim();
const key = (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "").trim();
export function validateCentralConfig(endpoint: string, publicKey: string) {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error("Configure a URL pública da central.");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  )
    throw new Error("Use uma URL HTTPS válida para a central.");
  if (!publicKey || publicKey.startsWith("sb_secret_"))
    throw new Error("Use somente a chave publicável da central.");
  if (!publicKey.startsWith("sb_publishable_")) {
    try {
      const payload = JSON.parse(
        atob(publicKey.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (payload.role !== "anon") throw new Error();
    } catch {
      throw new Error("A chave deve ser publicável ou anon; chaves administrativas são proibidas.");
    }
  }
}
let client: SupabaseClient | undefined;
export async function getCentralClient() {
  if (typeof window === "undefined") throw new Error("O acesso do operador ocorre no navegador.");
  validateCentralConfig(url, key);
  if (!client) {
    const { createClient } = await import("@supabase/supabase-js");
    client = createClient(url, key, {
      auth: {
        storage: window.sessionStorage,
        storageKey: "samu.central.auth.v1",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
export async function readSnapshot(client: SupabaseClient, signal: AbortSignal) {
  const { data, error } = await client.rpc("samu_station_snapshot").abortSignal(signal);
  if (error) throw new Error("A central não confirmou seu acesso ou está indisponível.");
  return parseSnapshot(data);
}
export async function writeStatus(
  client: SupabaseClient,
  baseId: string,
  status: ConfirmedStatus,
  version: number,
  requestId: string,
  stationId: string,
  signal: AbortSignal,
) {
  const { data, error } = await client
    .rpc("samu_set_base_status", {
      p_base_id: baseId,
      p_status: status,
      p_expected_version: version,
      p_request_id: requestId,
      p_station_id: stationId,
    })
    .abortSignal(signal);
  if (error)
    throw new Error(
      error.code === "40001"
        ? "Outro operador alterou esta base. Atualize e confirme o novo status."
        : "A gravação não foi confirmada. Atualize os status e confira o histórico antes de repetir.",
    );
  if (!data || typeof data.audit_id !== "string")
    throw new Error("A central não confirmou a auditoria da alteração.");
  return parseRecord(data.record);
}
export async function readAudit(client: SupabaseClient, signal: AbortSignal) {
  const { data, error } = await client
    .rpc("samu_status_audit", { p_limit: 50 })
    .abortSignal(signal);
  if (error) throw new Error("Não foi possível consultar o histórico autorizado.");
  return parseAudit(data);
}
