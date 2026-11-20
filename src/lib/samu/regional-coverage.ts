/*
 * Cobertura regional e referências de apoio.
 *
 * A regulação ainda não forneceu uma matriz de pactuação homologada entre os
 * municípios. Por isso, este módulo NUNCA usa a GERES como se fosse cobertura
 * oficial: enquanto não houver cadastro, ele lista todas as bases com endereço
 * da I Macrorregião como possibilidades de apoio, para que a tela possa
 * ordená-las por distância em linha reta.
 *
 * Quando a matriz oficial chegar, preencha COBERTURA_HOMOLOGADA_POR_MUNICIPIO
 * com { baseIds, fonte, atualizadoEm }. Só então a interface poderá exibir o
 * status "Cobertura homologada".
 */

interface CadastroCoberturaHomologada {
  baseIds: readonly string[];
  fonte?: string;
  atualizadoEm?: string;
}

export interface CoberturaVisual {
  id: string;
  label: string;
  color: string;
  neutra: boolean;
  territorioIds: readonly string[];
}

type CoberturaVisualBase = Omit<CoberturaVisual, "neutra"> & { neutra?: boolean };

interface TerritorioReferencia {
  id: string;
  island?: boolean;
}

export interface BasesApoioMunicipio {
  status: "homologada" | "proximidade";
  baseIds: string[];
  fonte: string;
  atualizadoEm: string;
}

export const COBERTURA_HOMOLOGADA_POR_MUNICIPIO: Readonly<
  Record<string, CadastroCoberturaHomologada>
> = Object.freeze({
  // Exemplo de cadastro futuro:
  // "2600000": { baseIds: ["2600000", "2600001"], fonte: "Pactuação ...", atualizadoEm: "2026-10-15" },
});

/*
 * Referência visual do quadro físico de "Cobertura SAMU" informado pela
 * operação. Ela existe somente para colorir e tornar o mapa regional mais
 * legível: não define pactuação, prioridade ou autorização de despacho.
 *
 * A matriz operacional homologada continua acima, separada desta referência.
 * Assim, uma cor nunca é interpretada pelo sistema como uma ordem de envio.
 */
const COBERTURAS_VISUAIS_SAMU_BASE: CoberturaVisualBase[] = [
  {
    id: "metropolitana",
    label: "Cobertura Metropolitana",
    color: "#0A9AAD",
    neutra: false,
    territorioIds: [
      "2600054",
      "2601052",
      "2602902",
      "2603454",
      "2605459",
      "2606804",
      "2607208",
      "2607604",
      "2607752",
      "2607901",
      "2609600",
      "2610707",
      "2611606",
      "2613701",
    ],
  },
  {
    id: "timbauba",
    label: "Cobertura Timbaúba",
    color: "#64748B",
    territorioIds: [
      "2600708",
      "2603603",
      "2604601",
      "2605509",
      "2607653",
      "2607802",
      "2609006",
      "2613800",
      "2615300",
    ],
  },
  {
    id: "goiana",
    label: "Cobertura Goiana",
    color: "#2563EB",
    territorioIds: ["2606200"],
  },
  {
    id: "carpina",
    label: "Cobertura Carpina",
    color: "#D4A72C",
    territorioIds: [
      "2602704",
      "2604007",
      "2608453",
      "2608503",
      "2609501",
      "2610608",
      "2615508",
      "2616308",
    ],
  },
  {
    id: "bom-jardim",
    label: "Cobertura Bom Jardim",
    color: "#A86C7C",
    territorioIds: ["2602209", "2604155", "2608107", "2616183"],
  },
  {
    id: "surubim",
    label: "Cobertura Surubim",
    color: "#A73568",
    territorioIds: ["2614501"],
  },
  {
    id: "limoeiro",
    label: "Cobertura Limoeiro",
    color: "#4D7C5A",
    territorioIds: ["2605400", "2608909"],
  },
  {
    id: "passira",
    label: "Cobertura Passira",
    color: "#6D8F45",
    territorioIds: ["2604908", "2609105", "2609709", "2610509", "2612109"],
  },
  {
    id: "gloria-do-goita",
    label: "Cobertura Glória do Goitá",
    color: "#C69C6D",
    territorioIds: ["2604403", "2606101"],
  },
  {
    id: "cha-grande",
    label: "Cobertura Chã Grande",
    color: "#BFAF7A",
    territorioIds: ["2604502", "2609402", "2611309"],
  },
  {
    id: "vitoria",
    label: "Cobertura Vitória",
    color: "#A55645",
    territorioIds: ["2616407"],
  },
  {
    id: "escada",
    label: "Cobertura Escada",
    color: "#8A9F36",
    territorioIds: ["2600906", "2604809", "2605202", "2611408", "2611804"],
  },
  {
    id: "palmares",
    label: "Cobertura Palmares",
    color: "#6F8429",
    territorioIds: [
      "2600401",
      "2601409",
      "2601508",
      "2604205",
      "2605905",
      "2607950",
      "2608206",
      "2608701",
      "2609204",
      "2610004",
      "2611507",
      "2611903",
      "2612901",
      "2613404",
      "2614204",
      "2614857",
      "2616506",
    ],
  },
];

export const COBERTURAS_VISUAIS_SAMU: readonly Readonly<CoberturaVisual>[] = Object.freeze(
  COBERTURAS_VISUAIS_SAMU_BASE.map((cobertura) =>
    Object.freeze({
      ...cobertura,
      neutra: cobertura.neutra ?? false,
      territorioIds: Object.freeze([...cobertura.territorioIds]),
    }),
  ),
);

const COBERTURA_VISUAL_PADRAO: Readonly<CoberturaVisual> = Object.freeze({
  id: "referencia-pendente",
  label: "Referência a confirmar",
  color: "#64748B",
  neutra: true,
  territorioIds: Object.freeze([]),
});

const COBERTURA_VISUAL_POR_TERRITORIO = new Map<string, Readonly<CoberturaVisual>>(
  COBERTURAS_VISUAIS_SAMU.flatMap((cobertura) =>
    cobertura.territorioIds.map((territorioId) => [territorioId, cobertura]),
  ),
);

export function obterCoberturaVisualDoTerritorio(
  territorioId: string | number,
): Readonly<CoberturaVisual> {
  return COBERTURA_VISUAL_POR_TERRITORIO.get(String(territorioId)) ?? COBERTURA_VISUAL_PADRAO;
}

export function obterBasesDeApoioDoMunicipio(
  territorio: TerritorioReferencia | null | undefined,
  territorios: readonly (TerritorioReferencia | null | undefined)[] = [],
): BasesApoioMunicipio {
  const cadastro = territorio ? COBERTURA_HOMOLOGADA_POR_MUNICIPIO[territorio.id] : undefined;
  if (cadastro?.baseIds?.length) {
    return {
      status: "homologada",
      baseIds: [...new Set<string>(cadastro.baseIds)],
      fonte: cadastro.fonte || "Matriz de cobertura homologada",
      atualizadoEm: cadastro.atualizadoEm || "",
    };
  }

  const baseIds = territorios
    .filter(
      (item): item is TerritorioReferencia =>
        item !== null && item !== undefined && item.id !== territorio?.id && !item.island,
    )
    .map((item) => item.id);

  return {
    status: "proximidade",
    baseIds: [...new Set(baseIds)],
    fonte: "I Macrorregião — ordenação por distância em linha reta",
    atualizadoEm: "",
  };
}
