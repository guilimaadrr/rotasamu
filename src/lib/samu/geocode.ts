import { BAIRROS, type LatLng } from "./data";
import { isLatLng } from "./coordinates";
import { haversineKm } from "./dispatch";

type NominatimAddress = {
  road?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  quarter?: string;
  village?: string;
  [key: string]: string | undefined;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
};

export interface AddressSuggestion {
  /** Texto curto que permanece no campo de endereço após a seleção. */
  endereco: string;
  /** Texto completo para o operador confirmar a referência encontrada. */
  label: string;
  /** Bairro de Recife reconhecido a partir do retorno do geocodificador. */
  bairro?: string;
  pos: LatLng;
}

// Nominatim recebe a caixa como esquerda, topo, direita, base.
const GEOCODING_URL = (
  import.meta.env["VITE_GEOCODING_URL"] || "https://nominatim.openstreetmap.org/search"
).trim();
const RECIFE_VIEWBOX = "-35.10,-7.82,-34.78,-8.20";

function normalizar(texto: string) {
  return texto
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-BR");
}

function bairroConhecido(endereco?: NominatimAddress, displayName = "") {
  const candidatos = [
    endereco?.neighbourhood,
    endereco?.suburb,
    endereco?.city_district,
    endereco?.quarter,
    endereco?.village,
    displayName,
  ]
    .filter((item): item is string => Boolean(item))
    .map(normalizar);

  return BAIRROS.find((bairro) => {
    const nome = normalizar(bairro.nome);
    return candidatos.some(
      (candidato) =>
        candidato === nome || candidato.split(",").some((parte) => parte.trim() === nome),
    );
  })?.nome;
}

function textoCurto(result: NominatimResult) {
  const rua = result.address?.road;
  const numero = result.address?.house_number;
  if (rua && numero) return `${rua}, ${numero}`;
  if (rua) return rua;
  return result.display_name.split(",").slice(0, 2).join(",");
}

function paraSugestao(result: NominatimResult): AddressSuggestion | null {
  if (
    !result ||
    typeof result.lat !== "string" ||
    !result.lat.trim() ||
    typeof result.lon !== "string" ||
    !result.lon.trim() ||
    typeof result.display_name !== "string"
  )
    return null;
  // A caixa de busca também contém municípios vizinhos; nunca aceitar outro município.
  const city =
    result.address?.["city"] ?? result.address?.["town"] ?? result.address?.["municipality"];
  if (!city || normalizar(city) !== "RECIFE") return null;
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (!isLatLng([lat, lng])) return null;

  const bairro = bairroConhecido(result.address, result.display_name);
  return {
    endereco: textoCurto(result),
    label: result.display_name,
    ...(bairro ? { bairro } : {}),
    pos: [lat, lng],
  };
}

const searchCache = new Map<string, { at: number; items: NominatimResult[] }>();
let nextSearchAt = 0;
async function respectSearchInterval(signal: AbortSignal) {
  signal.throwIfAborted();
  const wait = Math.max(0, nextSearchAt - Date.now());
  nextSearchAt = Date.now() + wait + 1100;
  if (!wait) return;
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Consulta cancelada", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, wait);
    signal.addEventListener("abort", abort, { once: true });
  });
}

async function buscarNominatim(query: string, signal: AbortSignal, limit: number) {
  signal.throwIfAborted();
  const cached = searchCache.get(query);
  if (cached && Date.now() - cached.at < 300000) return cached.items;
  await respectSearchInterval(signal);
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: String(limit),
    countrycodes: "br",
    bounded: "1",
    viewbox: RECIFE_VIEWBOX,
    q: query,
  });
  signal.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${GEOCODING_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { "Accept-Language": "pt-BR" },
    });
    if (!res.ok) throw new Error("Serviço de endereços indisponível.");
    const data: unknown = await res.json();
    signal.throwIfAborted();
    if (!Array.isArray(data)) throw new Error("Resposta de endereço inválida.");
    if (searchCache.size >= 120) searchCache.delete(searchCache.keys().next().value!);
    searchCache.set(query, { at: Date.now(), items: data as NominatimResult[] });
    return data as NominatimResult[];
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

/**
 * Sugestões de endereço restritas à área do Recife. A consulta é somente um
 * apoio de digitação: a regulação ainda deve confirmar a ocorrência no rádio.
 */
export async function geocodeSuggestions(
  endereco: string,
  bairro: string | undefined,
  signal: AbortSignal,
) {
  const consulta = endereco.trim();
  if (consulta.length < 3) return [] as AddressSuggestion[];

  const query = [consulta, bairro, "Recife", "PE", "Brasil"].filter(Boolean).join(", ");
  const resultados = await buscarNominatim(query, signal, 5);
  return resultados.map(paraSugestao).filter((item): item is AddressSuggestion => item !== null);
}

/** Busca o endereço no bairro informado; tolera a área aproximada do bairro. */
export async function geocodeAddress(
  endereco: string,
  bairro: string,
  ref: LatLng,
  signal: AbortSignal,
) {
  const sugestoes = await geocodeSuggestions(endereco, bairro, signal);
  const proxima = sugestoes.find(
    (item) => item.bairro === bairro && haversineKm(item.pos, ref) <= 5,
  );
  if (!proxima) return null;
  return { pos: proxima.pos, label: proxima.label };
}
