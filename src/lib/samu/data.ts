/*
 * Dados de apoio da Central SAMU 192.
 *
 * Endereços e pontos importados da estação operacional anterior a pedido da
 * operação. Eles continuam sendo referência de apoio: a cobertura, a posição
 * da ocorrência e a disponibilidade devem ser confirmadas pela regulação.
 */

import bairrosCoords from "./bairros-coords.json";
import {
  obterBaseMetropolitana,
  obterCoordenadasRevisadasDaBaseMetropolitana,
} from "./regional-bases";
import { obterCoberturaVisualDoTerritorio } from "./regional-coverage";
import { TERRITORIOS_MACRORREGIAO_I } from "./macrorregiao-i";
import { COBERTURA } from "./recife-coverage";

export type LatLng = [number, number];
export type BaseStatus = "disponivel" | "sem_viatura" | "nao_confirmado";
export type Geres = "I" | "II" | "III" | "XII";

export interface Base {
  id: string;
  sigla: string;
  nome: string;
  endereco: string;
  pos: LatLng;
  viaturas: string;
  moto?: string;
  eligibleForFallback?: boolean;
}

export interface Bairro {
  nome: string;
  pos: LatLng;
  rpa?: number;
  responsavel: string;
  apoio?: string;
}

export interface Municipio {
  id: string;
  nome: string;
  pos: LatLng;
  geres: Geres;
  base: "cadastrada" | "pendente" | "sem_terrestre";
  enderecoBase?: string;
  referenciaBase?: string;
  basePos?: LatLng;
  cobertura: { id: string; label: string; color: string; neutra: boolean };
}

export const BASES: Base[] = [
  {
    id: "pcr",
    sigla: "PCR",
    nome: "PCR",
    endereco: "Cais do Apolo, 925 - Recife, PE, 50030-230",
    pos: [-8.05482, -34.872131],
    viaturas: "USB 01 · USB 22",
  },
  {
    id: "central",
    sigla: "CEN",
    nome: "Central",
    endereco: "R. Dom Bôsco, 687-709 - Boa Vista, Recife - PE, 50070-070",
    pos: [-8.0581, -34.8946],
    viaturas: "USB 02, 03, 04, 05, 11, 19",
    moto: "Moto 01",
  },
  {
    id: "bandeira",
    sigla: "BAN",
    nome: "Bandeira Filho",
    endereco: "R. Londrina, s/n - Afogados, Recife - PE, 50770-400",
    pos: [-8.078977, -34.910799],
    viaturas: "USB 06, 07, 08",
    moto: "Moto 02",
  },
  {
    id: "arnaldo",
    sigla: "ARN",
    nome: "Arnaldo Marques",
    endereco: "Av. Dois Rios, s/n - Ibura, Recife - PE, 51230-000",
    pos: [-8.120777, -34.944039],
    viaturas: "USB 09 · USB 10",
  },
  {
    id: "barroslima",
    sigla: "BAR",
    nome: "Barros Lima",
    endereco: "Av. Norte Miguel Arraes de Alencar, 6465 - Casa Amarela, Recife - PE, 52081-000",
    pos: [-8.020665, -34.9234],
    viaturas: "USB 12 · USB 13",
  },
  {
    id: "albertsabin",
    sigla: "ABS",
    nome: "Albert Sabin",
    endereco: "R. Padre Roma, 191 - Tamarineira, Recife - PE, 52050-150",
    pos: [-8.034056, -34.905194],
    viaturas: "USB 14",
  },
  {
    id: "salomao",
    sigla: "SAL",
    nome: "Salomão Kelner",
    endereco: "Estr. Velha de Água Fria, 1652 - Água Fria, Recife - PE, 52110-125",
    pos: [-8.025531, -34.897786],
    viaturas: "USB 15 · USB 16",
  },
  {
    id: "ceasa",
    sigla: "CEA",
    nome: "CEASA",
    endereco: "BR-101 Sul, Km 70, nº 550 - Curado, Recife - PE, 50790-640",
    pos: [-8.072035, -34.942693],
    viaturas: "USB 17, 18, 21",
  },
  {
    id: "hmr",
    sigla: "HMR",
    nome: "HMR",
    endereco: "BR-101 Sul, 485 - Curado, Recife - PE, 53520-015",
    pos: [-8.0707, -34.9411],
    viaturas: "Motolância",
    moto: "Moto 03",
    eligibleForFallback: false,
  },
  {
    id: "hec",
    sigla: "HEC",
    nome: "HEC / HECPI",
    endereco: "Av. Recife, 810 - Estância, Recife - PE, 50870-901",
    pos: [-8.100011, -34.925593],
    viaturas: "USB 20 · USB 23",
  },
];

export const RECIFE_CENTER: LatLng = [-8.065, -34.933];
const BASE_BY_ID = new Map(BASES.map((base) => [base.id, base]));

const BAIRRO_ALIASES: Record<string, string> = {
  "RECIFE ANTIGO": "RECIFE",
  "JOANA BEZERRA": "ILHA JOANA BEZERRA",
  "PAU-FERRO": "PAU FERRO",
};

function chave(texto: string) {
  return texto
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-BR");
}

const COORDS_BAIRROS = bairrosCoords as Record<string, { lat: number; lng: number }>;
type CoverageEntry = readonly [string, string | null];
const COBERTURA_TIPADA = COBERTURA as unknown as Record<string, CoverageEntry>;

function posicaoDoBairro(nome: string, responsavel: string): LatLng {
  const ponto = COORDS_BAIRROS[BAIRRO_ALIASES[chave(nome)] ?? chave(nome)];
  if (ponto) return [ponto.lat, ponto.lng];
  return BASE_BY_ID.get(responsavel)?.pos ?? RECIFE_CENTER;
}

export const BAIRROS: Bairro[] = Object.entries(COBERTURA_TIPADA)
  .map(([nome, [responsavel, apoio]]) => ({
    nome,
    pos: posicaoDoBairro(nome, responsavel),
    responsavel,
    ...(apoio ? { apoio } : {}),
  }))
  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

export function localizarBairro(nome: string) {
  const procurado = chave(nome);
  return BAIRROS.find((bairro) => chave(bairro.nome) === procurado) ?? null;
}

type TerritorioLegado = {
  id: string;
  name: string;
  group: Geres;
  lat: number;
  lng: number;
  island?: boolean;
};

const TERRITORIOS = TERRITORIOS_MACRORREGIAO_I as TerritorioLegado[];

export const MUNICIPIOS: Municipio[] = TERRITORIOS.map((territorio) => {
  const base = obterBaseMetropolitana(territorio.id);
  const coordenadaRevisada = obterCoordenadasRevisadasDaBaseMetropolitana(territorio.id);
  const cobertura = obterCoberturaVisualDoTerritorio(territorio.id);
  return {
    id: territorio.id,
    nome: territorio.name,
    pos: [territorio.lat, territorio.lng],
    geres: territorio.group,
    base: territorio.island ? "sem_terrestre" : base?.endereco ? "cadastrada" : "pendente",
    ...(base?.endereco ? { enderecoBase: base.endereco } : {}),
    ...(base?.referencia ? { referenciaBase: base.referencia } : {}),
    ...(coordenadaRevisada
      ? { basePos: [coordenadaRevisada.lat, coordenadaRevisada.lng] as LatLng }
      : {}),
    cobertura: {
      id: cobertura.id,
      label: cobertura.label,
      color: cobertura.color,
      neutra: cobertura.neutra ?? false,
    },
  };
});

export const GERES_LABEL: Record<Geres, string> = {
  I: "I GERES · Recife",
  II: "II GERES · Limoeiro",
  III: "III GERES · Palmares",
  XII: "XII GERES · Goiana",
};

export const MACRO_CENTER: LatLng = [-8.04, -34.96];
