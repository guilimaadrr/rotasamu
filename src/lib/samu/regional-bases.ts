/*
 * Bases informadas para a I Macrorregião de Saúde de Pernambuco.
 *
 * Fonte: lista de endereços enviada pela operação em 15/10/2026.
 * Estes registros preservam o endereço informado; eles NÃO transformam os
 * centroides municipais do mapa em coordenadas de base. A localização usada
 * para uma rota é consultada sob demanda e deve ser confirmada pela rádio /
 * regulação antes do despacho.
 */

const FONTE = "Lista de endereços recebida da operação";
const FONTE_COORDENADAS_REVISADAS =
  "Mapbox Geocoding v6 — resultado revisado pelo endereço cadastrado em 16/10/2026";

export interface BaseMetropolitana {
  endereco: string;
  referencia: string;
  telefone: string;
  observacao: string;
  fonte: string;
  geocodificacao: "pendente";
}

interface BaseOptions {
  referencia?: string;
  telefone?: string;
  observacao?: string;
}

export interface CoordenadaBaseMetropolitana {
  lat: number;
  lng: number;
  precisao: "endereco";
  status: "revisada";
  resultado: string;
  fonte: string;
}

function base(
  endereco: string,
  { referencia = "", telefone = "", observacao = "" }: BaseOptions = {},
): Readonly<BaseMetropolitana> {
  return Object.freeze({
    endereco,
    referencia,
    telefone,
    observacao,
    fonte: FONTE,
    geocodificacao: "pendente" as const,
  });
}

function coordenadaRevisada(
  lat: number,
  lng: number,
  resultado: string,
): Readonly<CoordenadaBaseMetropolitana> {
  return Object.freeze({
    lat,
    lng,
    precisao: "endereco",
    status: "revisada",
    resultado,
    fonte: FONTE_COORDENADAS_REVISADAS,
  });
}

/*
 * Pontos de origem revisados individualmente a partir dos endereços
 * cadastrados. Não complete esta lista por proximidade do centro municipal:
 * bases sem coordenada revisada devem continuar identificadas no mapa como
 * referência municipal até receberem uma confirmação operacional.
 */
export const COORDENADAS_BASES_METROPOLITANAS_REVISADAS: Readonly<
  Record<string, Readonly<CoordenadaBaseMetropolitana>>
> = Object.freeze({
  "2606200": coordenadaRevisada(-7.569278, -35.020752, "Rua Onilda Figueiredo 323, Goiana - PE"),
  "2607901": coordenadaRevisada(
    -8.163054,
    -34.915142,
    "Rua Comendador José Didier 300, Piedade, Jaboatão dos Guararapes - PE",
  ),
  "2607950": coordenadaRevisada(
    -8.729544,
    -35.796544,
    "Rua Vereador Luiz Nova Cosque 200, Jaqueira - PE",
  ),
  "2608453": coordenadaRevisada(
    -7.847082,
    -35.313034,
    "Rua Maria Luiza Hospital 10, Lagoa do Carro - PE",
  ),
  "2608909": coordenadaRevisada(-7.88226, -35.437855, "Rodovia PE-50 1238, Limoeiro - PE"),
  "2610509": coordenadaRevisada(-7.978454, -35.584215, "Avenida Alberto Benning 177, Passira - PE"),
  "2611606": coordenadaRevisada(
    -8.059536,
    -34.893753,
    "Avenida Manoel Borba 951, Boa Vista, Recife - PE",
  ),
  "2612901": coordenadaRevisada(
    -8.808789,
    -35.933392,
    "Rua Doutor José Mariano 103, São Benedito do Sul - PE",
  ),
  "2613701": coordenadaRevisada(
    -7.994634,
    -35.040363,
    "Rua Doutor Pedro Augusto Correia de Araújo 182, São Lourenço da Mata - PE",
  ),
});

export const BASES_METROPOLITANAS_POR_TERRITORIO: Readonly<
  Record<string, Readonly<BaseMetropolitana>>
> = Object.freeze({
  "2600054": base("Rua Tupã, s/n — Caetés Velho"),
  "2600401": base("Praça dos Três Poderes, s/n — Centro", {
    referencia: "Ao lado da Secretaria de Saúde e da Delegacia de Polícia",
    telefone: "3681-2146",
  }),
  "2600708": base("Rua Genésio Gomes de Moraes, s/n — Centro"),
  "2600906": base("Rua das Acácias, nº 1455 — João Paulo II", {
    observacao: "A grafia do logradouro deve ser confirmada no cadastro oficial.",
  }),
  "2601052": base("Rua João José de Freiras, s/n", { referencia: "Em frente ao campo" }),
  "2601409": base("Rodovia PE-60, km 72,5 — Engenho Alegre", {
    referencia: "Ao lado da emergência do Hospital Municipal Jailton Messias",
  }),
  "2601508": base("Travessa Marechal Rondon, nº 05 — Centro"),
  "2602209": base("Rua Alto do Derby, s/n — Centro", {
    referencia: "Próximo ao Hospital Miguel Arraes",
  }),
  "2602704": base("Avenida João Teobaldo de Azevedo, s/n — Santa Iracema"),
  "2602902": base("Base Itapuama (administração), Rua 01, s/n — Itapuama"),
  "2603454": base("Rua Rubem Correia, nº 277 — Jardim Santo Antônio, Vila da Inabi", {
    referencia: "Em frente à Garagem dos Veículos da Prefeitura",
  }),
  "2603603": base("Avenida Moisés Correia, s/n — Centro"),
  "2604007": base("Avenida Presidente Getúlio Vargas, s/n — Santa Cruz", {
    referencia: "Por trás da Unidade Mista Virgínia Guerra",
  }),
  "2604155": base("Rua Maria Cecília Leal de Miranda, s/n — Centro"),
  "2604205": base("Rua da Caixa d’Água, s/n — Centro"),
  "2604403": base("Rua Manoel Borba, s/n — Centro", {
    referencia: "Dentro da Unidade Mista Virgínia Guerra",
  }),
  "2604502": base("Avenida 20 de Dezembro, s/n — Centro", {
    observacao: "A lista de origem traz a classificação da via de forma ambígua.",
  }),
  "2604601": base("Avenida 15 de Dezembro, s/n — Centro"),
  "2604809": base("PE-85, km 27, s/n — Centro"),
  "2604908": base("Rua Severino Lemos, s/n — Centro", {
    referencia: "Anexo da Unidade Mista Santa Terezinha",
  }),
  "2605202": base("Rua Beatriz Ramos Lins, s/n — Bela Vista"),
  "2605400": base("Trevo, PE-50, 02 — Sítio Lagoa do Sapo", {
    observacao: "A identificação da rodovia foi transcrita como consta na lista recebida.",
  }),
  "2605459": base("Praça Flamboyant, BR-363"),
  "2605509": base("", { observacao: "Endereço da base ainda não informado na lista recebida." }),
  "2605905": base("Travessa Luiz Rodolfo, s/n", {
    referencia: "Dentro da Unidade Hospitalar do Município",
  }),
  "2606101": base("Rua Santa Cruz, s/n — Centro"),
  "2606200": base("Onilda Figueiredo, nº 323 — Flexeiras", {
    referencia: "Entrada em frente ao restaurante Bode Grill",
    observacao: "A lista de origem não informa o tipo do logradouro.",
  }),
  "2606804": base("Avenida Duarte Coelho, s/n — Campina de Feira", {
    referencia: "Dentro do campo murado",
    telefone: "9 9238.5564",
  }),
  "2607208": base("Rodovia PE-38, km 9 — Nossa Senhora do Ó", {
    referencia: "Complexo Hospitalar Carozita Brito",
    telefone: "3527-9347",
  }),
  "2607604": base("Rua Dr. Carlos Luiz de Freitas, nº 1800", {
    referencia: "Ao lado do Mercado Santa Terezinha",
  }),
  "2607653": base("Rua Luiz Roberto Guimarães, s/n — Centro"),
  "2607752": base("Rua da Saudade, s/n", { referencia: "Hospital João Ribeiro" }),
  "2607802": base("", { observacao: "Endereço da base ainda não informado na lista recebida." }),
  "2607901": base("Rua Comendador José Didier, nº 300 — Piedade", {
    referencia: "Na rua da Faculdade Guararapes",
  }),
  "2607950": base("Rua Vereador Luís Novacosque, nº 200 — Centro", {
    observacao: "A grafia do sobrenome deve ser confirmada no cadastro oficial.",
  }),
  "2608107": base("Rua Treze de Maio, nº 293 — Centro", {
    referencia: "Ao lado do Posto de Combustível Maria Beatriz",
  }),
  "2608206": base("", { observacao: "Endereço da base ainda não informado na lista recebida." }),
  "2608453": base("Rua Maria Luiza, nº 10 — Recanto Carpina"),
  "2608503": base("Rua Manoel José da Silva, nº 14", { referencia: "Ao lado da Unidade Mista" }),
  "2608701": base("Rua São Sebastião, s/n — Centro", {
    referencia: "Ao lado da Unidade Mista Santa Rosa, nº 170",
  }),
  "2608909": base("PE-50, nº 1238"),
  "2609006": base("Rodovia PE-089, nº 8632 — A", {
    referencia: "Ao lado do Posto Alceu Araújo",
    observacao: "Há trecho pouco legível após o número na lista recebida.",
  }),
  "2609105": base("", { observacao: "Endereço da base ainda não informado na lista recebida." }),
  "2609204": base("", { observacao: "Endereço da base ainda não informado na lista recebida." }),
  "2609402": base("Rua Prefeito Antônio de Lemos, nº 1947", {
    referencia: "Policlínica Dr. Beiró Uchôa",
    observacao: "A lista também menciona a Secretaria próxima ao Hospital Regional.",
  }),
  "2609501": base("BR-408 — UBS Cinco Corações, s/n", {
    observacao: "A sigla aparece como USB na lista recebida; confirmar no cadastro oficial.",
  }),
  "2609600": base("Avenida Santos Dumont, nº 177 — Umuarama", {
    referencia: "Entrar à direita da Padaria Globo",
  }),
  "2609709": base("Rua Dez de Janeiro, s/n — Centro", {
    referencia: "Próximo à Secretaria de Obras",
  }),
  "2610004": base("Travessa Dr. Costa Maia, s/n — São Sebastião"),
  "2610509": base("Avenida Alberto Bening, nº 177", {
    referencia: "Ao lado do Posto BR",
    telefone: "9 7110.9015",
    observacao: "Confirmar a grafia oficial do logradouro.",
  }),
  "2610608": base("BR-408, km 70, s/n", { referencia: "Ao lado da UPA Paudalho" }),
  "2610707": base("Avenida Antônio Cabral de Souza, PE-22, nº 825 — Maranguape I", {
    referencia: "Ao lado do CAPS-AD e da ALPAC Recepções",
    telefone: "3372-3962",
    observacao: "A lista também traz ‘PE 02’; confirmar a composição oficial do endereço.",
  }),
  "2611309": base("Rua Prefeito Edward Cavalcanti, s/n — Centro", { telefone: "9 9946.9993" }),
  "2611408": base("Rua São Severino, s/n — Vila João Murilo"),
  "2611507": base("Praça Umbelino Cavalcanti, s/n — Centro"),
  "2611606": base("Rua Manoel Borba, nº 951 — Boa Vista", {
    observacao: "Registro da lista metropolitana; não substitui o cadastro da Central SAMU Recife.",
  }),
  "2611804": base("Rua Procurador Pedro Jorge, s/n — Vila Rica"),
  "2611903": base("Praça 7 de Fevereiro, s/n — Centro", {
    referencia: "Ao lado do Hospital Municipal",
  }),
  "2612109": base("", { observacao: "Endereço da base ainda não informado na lista recebida." }),
  "2612901": base("Rua Dr. José Mariano, nº 103 — Centro", {
    referencia: "Ao lado da Polícia Militar",
  }),
  "2613404": base("Avenida João Francisco de Melo, s/n", {
    referencia: "Anexo do Hospital Municipal da Cidade",
    observacao: "A lista utiliza a sigla S.J.C.G.; associada a São José da Coroa Grande.",
  }),
  "2613701": base("Rua Dr. Pedro Augusto Correia de Araújo, nº 182 — Centro"),
  "2613800": base("Rua Inojosa, s/n — Centro", {
    observacao: "A lista usa ‘São Vicente Ferrer’; associado ao município São Vicente Férrer.",
  }),
  "2614204": base("Avenida Marques de Olinda, s/n — Centro", {
    referencia: "Ao lado da antiga Maternidade Municipal de Sirinhaém",
  }),
  "2614501": base("Rua José Natal Carneiro da Cunha, s/n — PE-90", {
    referencia: "Próximo à Vila de Jacó",
  }),
  "2614857": base("Avenida Leopoldo Lins, s/n — Centro"),
  "2615300": base("BR-408, s/n"),
  "2615508": base("", { observacao: "Endereço da base ainda não informado na lista recebida." }),
  "2616183": base("", { observacao: "Endereço da base ainda não informado na lista recebida." }),
  "2616308": base("Rua Dr. José Otávio Maciel, s/n — Centro"),
  "2616407": base("Avenida Henrique de Holanda, s/n — Redenção", {
    referencia: "Em frente ao Complexo Policial",
  }),
  "2616506": base("Travessa do Ipiranga", {
    referencia: "Ao lado do Hospital Santa Joana",
    observacao: "A classificação da via deve ser confirmada no cadastro oficial.",
  }),
});

export function obterBaseMetropolitana(
  territorioId: string | number,
): Readonly<BaseMetropolitana> | null {
  return BASES_METROPOLITANAS_POR_TERRITORIO[String(territorioId)] || null;
}

export function obterCoordenadasRevisadasDaBaseMetropolitana(
  territorioId: string | number,
): Readonly<CoordenadaBaseMetropolitana> | null {
  return COORDENADAS_BASES_METROPOLITANAS_REVISADAS[String(territorioId)] || null;
}

export function baseMetropolitanaTemEndereco(
  baseMetropolitana: Pick<BaseMetropolitana, "endereco"> | null | undefined,
) {
  return Boolean(baseMetropolitana?.endereco?.trim());
}
