import type { LatLng } from "./data";
import { isLatLng } from "./coordinates";

// Serviços públicos de contingência, sem SLA. Para operação, trocar por gateway interno OSRM-compatível.
export const ROUTE_ENDPOINT = "https://router.project-osrm.org/route/v1/driving";
export const ROUTE_FALLBACK_ENDPOINT =
  "https://routing.openstreetmap.de/routed-car/route/v1/driving";
const gateway = (import.meta.env["VITE_ROUTING_URL"] || "").trim();
const usePublicFallback = import.meta.env["VITE_PUBLIC_ROUTING_FALLBACK"] !== "false";
const ROUTE_ENDPOINTS = [
  ...new Set([
    ...(gateway ? [gateway.replace(/\/+$/, "")] : []),
    ...(usePublicFallback ? [ROUTE_ENDPOINT, ROUTE_FALLBACK_ENDPOINT] : []),
  ]),
];
const TIMEOUT_MS = 6000;
const CACHE_TTL = 5 * 60 * 1000;

export type RouteErrorKind =
  "rede" | "timeout" | "limite" | "indisponivel" | "sem_rota" | "invalida";

export class RouteError extends Error {
  constructor(public kind: RouteErrorKind) {
    super(ROUTE_ERROR_TEXT[kind]);
  }
}

export const ROUTE_ERROR_TEXT: Record<RouteErrorKind, string> = {
  invalida: "As coordenadas ou a resposta do serviço de rotas são inválidas.",
  rede: "Sem conexão com o serviço de rotas.",
  timeout: "O serviço de rotas demorou demais para responder.",
  limite: "Limite de consultas atingido. Aguarde alguns segundos.",
  indisponivel: "Serviço de rotas indisponível no momento.",
  sem_rota: "Nenhuma rota viária encontrada entre a base e a ocorrência.",
};

export interface RouteResult {
  km: number;
  minutos: number;
  geometry: LatLng[];
  calculatedAt: number;
}

const cache = new Map<string, { at: number; value: RouteResult }>();

function urlDaRota(endpoint: string, from: LatLng, to: LatLng) {
  return `${endpoint}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=false`;
}

async function once(url: string, outer: AbortSignal): Promise<RouteResult> {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  outer.throwIfAborted();
  outer.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => ctrl.abort("timeout"), TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(url, { signal: ctrl.signal });
    } catch (e) {
      if (outer.aborted) throw e;
      throw new RouteError(ctrl.signal.reason === "timeout" ? "timeout" : "rede");
    }
    if (res.status === 429) throw new RouteError("limite");
    if (res.status >= 500) throw new RouteError("indisponivel");
    if (!res.ok) throw new RouteError("indisponivel");
    let data;
    try {
      data = await res.json();
    } catch {
      outer.throwIfAborted();
      throw new RouteError(ctrl.signal.aborted ? "timeout" : "invalida");
    }
    outer.throwIfAborted();
    const r = data?.routes?.[0];
    if (data?.code !== "Ok" || !r) throw new RouteError("sem_rota");
    if (
      !Number.isFinite(r.distance) ||
      r.distance < 0 ||
      !Number.isFinite(r.duration) ||
      r.duration < 0 ||
      r.geometry?.type !== "LineString" ||
      !Array.isArray(r.geometry.coordinates) ||
      r.geometry.coordinates.length < 2 ||
      !r.geometry.coordinates.every(
        (point: unknown) => Array.isArray(point) && isLatLng([point[1], point[0]]),
      )
    ) {
      throw new RouteError("invalida");
    }
    return {
      calculatedAt: Date.now(),
      km: r.distance / 1000,
      minutos: r.duration / 60,
      geometry: (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
    };
  } finally {
    clearTimeout(timer);
    outer.removeEventListener("abort", onAbort);
  }
}

/** Rota sempre no sentido base → ocorrência. */
export async function fetchRoute(
  from: LatLng,
  to: LatLng,
  signal: AbortSignal,
): Promise<RouteResult> {
  signal.throwIfAborted();
  if (!isLatLng(from) || !isLatLng(to)) throw new RouteError("invalida");
  const key = `${from.join(",")}|${to.join(",")}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.value;

  let lastErr: unknown = new RouteError("indisponivel");
  for (const endpoint of ROUTE_ENDPOINTS) {
    try {
      const value = await once(urlDaRota(endpoint, from, to), signal);
      signal.throwIfAborted();
      if (cache.size >= 120) cache.delete(cache.keys().next().value!);
      cache.set(key, { at: Date.now(), value });
      return value;
    } catch (e) {
      lastErr = e;
      if (signal.aborted) break;
      // Erros de limite, rede ou indisponibilidade podem ser exclusivos do
      // provedor atual; tenta o segundo serviço antes de informar falha.
      const podeTentarAlternativa =
        e instanceof RouteError &&
        (e.kind === "rede" ||
          e.kind === "indisponivel" ||
          e.kind === "timeout" ||
          e.kind === "limite" ||
          e.kind === "invalida");
      if (!podeTentarAlternativa) break;
    }
  }
  throw lastErr;
}
