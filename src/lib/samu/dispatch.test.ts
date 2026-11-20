import { describe, expect, it } from "vitest";
import { BASES, BAIRROS, MUNICIPIOS } from "./data";
import { decideDispatch, rankRegionalSupport } from "./dispatch";

const iputinga = BAIRROS.find((b) => b.nome === "Iputinga")!; // responsável Central, apoio CEASA

describe("decideDispatch", () => {
  it("indica a base responsável quando está disponível", () => {
    const d = decideDispatch(iputinga, iputinga.pos, BASES, {});
    expect(d.reason).toBe("responsavel");
    expect(d.base?.id).toBe("central");
  });

  it("passa para o apoio protocolar quando a responsável está sem viatura", () => {
    const d = decideDispatch(iputinga, iputinga.pos, BASES, { central: "sem_viatura" });
    expect(d.reason).toBe("apoio");
    expect(d.base?.id).toBe("ceasa");
  });

  it("usa a alternativa disponível mais próxima quando responsável e apoio estão sem viatura", () => {
    const d = decideDispatch(iputinga, iputinga.pos, BASES, {
      central: "sem_viatura",
      ceasa: "sem_viatura",
    });
    expect(d.reason).toBe("alternativa");
    expect(d.base?.id).not.toBe("central");
    expect(d.base?.id).not.toBe("ceasa");
    expect(d.base?.eligibleForFallback).not.toBe(false);
  });

  it("não indica base quando nenhuma está disponível", () => {
    const all = Object.fromEntries(BASES.map((b) => [b.id, "sem_viatura" as const]));
    const d = decideDispatch(iputinga, iputinga.pos, BASES, all);
    expect(d.reason).toBe("nenhuma");
    expect(d.base).toBeNull();
  });
});

describe("rankRegionalSupport", () => {
  it("ordena pelo menor km e ignora pendentes e o próprio destino", () => {
    const goiana = MUNICIPIOS.find((m) => m.nome === "Goiana")!;
    const list = rankRegionalSupport(goiana, MUNICIPIOS);
    expect(list).toHaveLength(6);
    expect(list.every((o, i) => i === 0 || o.km >= (list[i - 1]?.km ?? 0))).toBe(true);
    expect(list.every((o) => o.municipio.base === "cadastrada")).toBe(true);
    expect(list.some((o) => o.municipio.nome === "Goiana")).toBe(false);
  });

  it("Fernando de Noronha não recebe referência terrestre", () => {
    const fn = MUNICIPIOS.find((m) => m.nome === "Fernando de Noronha")!;
    expect(rankRegionalSupport(fn, MUNICIPIOS)).toEqual([]);
  });
});
