import type { Base, BaseStatus, Bairro, LatLng, Municipio } from "./data";

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export type DispatchReason = "responsavel" | "apoio" | "alternativa" | "nenhuma";

export interface DispatchDecision {
  base: Base | null;
  reason: DispatchReason;
  responsavel: Base | undefined;
  apoio: Base | undefined;
}

export type StatusMap = Record<string, BaseStatus>;

export const isAvailable = (statuses: StatusMap, id: string) =>
  (statuses[id] ?? "disponivel") === "disponivel";

/**
 * Ordem: base responsável disponível → apoio protocolar disponível →
 * base disponível mais próxima da ocorrência (linha reta) → nenhuma.
 */
export function decideDispatch(
  bairro: Bairro,
  occurrence: LatLng,
  bases: Base[],
  statuses: StatusMap,
): DispatchDecision {
  const responsavel = bases.find((b) => b.id === bairro.responsavel);
  const apoio = bases.find((b) => b.id === bairro.apoio);

  if (responsavel && isAvailable(statuses, responsavel.id)) {
    return { base: responsavel, reason: "responsavel", responsavel, apoio };
  }
  if (apoio && isAvailable(statuses, apoio.id)) {
    return { base: apoio, reason: "apoio", responsavel, apoio };
  }
  const alternativa = bases
    .filter((b) => b.eligibleForFallback !== false && isAvailable(statuses, b.id))
    .sort((a, b) => haversineKm(a.pos, occurrence) - haversineKm(b.pos, occurrence))[0];
  if (alternativa) return { base: alternativa, reason: "alternativa", responsavel, apoio };
  return { base: null, reason: "nenhuma", responsavel, apoio };
}

/** Velocidade média usada só para a estimativa em linha reta do apoio regional. */
export const REGIONAL_KMH = 60;

export interface RegionalOption {
  municipio: Municipio;
  km: number;
  minutos: number;
}

/** Bases cadastradas ordenadas pela menor distância em linha reta até o destino. */
export function rankRegionalSupport(
  destino: Municipio,
  todos: Municipio[],
  limite = 6,
): RegionalOption[] {
  if (destino.base === "sem_terrestre") return [];
  return todos
    .filter((m) => m.base === "cadastrada" && m.nome !== destino.nome)
    .map((m) => {
      // Quando a base possui coordenada revisada, ela é a origem do cálculo;
      // nos demais casos permanece a referência municipal cadastrada.
      const km = haversineKm(m.basePos ?? m.pos, destino.pos);
      return { municipio: m, km, minutos: Math.round((km / REGIONAL_KMH) * 60) };
    })
    .sort((a, b) => a.km - b.km)
    .slice(0, limite);
}
