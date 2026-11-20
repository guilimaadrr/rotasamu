import { describe, expect, it } from "vitest";
import { BASES, BAIRROS, MUNICIPIOS } from "./data";
import { isLatLng } from "./coordinates";
describe("integridade do cadastro e do mapa", () => {
  it("não possui identificadores ou bairros duplicados", () => {
    expect(new Set(BASES.map((b) => b.id)).size).toBe(BASES.length);
    expect(new Set(BAIRROS.map((b) => b.nome)).size).toBe(BAIRROS.length);
    expect(new Set(MUNICIPIOS.map((m) => m.id)).size).toBe(MUNICIPIOS.length);
  });
  it("cada bairro possui responsável e apoio cadastrados", () => {
    const ids = new Set(BASES.map((b) => b.id));
    for (const bairro of BAIRROS) {
      expect(ids.has(bairro.responsavel), bairro.nome).toBe(true);
      if (bairro.apoio) expect(ids.has(bairro.apoio), bairro.nome).toBe(true);
    }
  });
  it("todos os marcadores e pontos de referência possuem coordenadas válidas", () => {
    for (const item of [...BASES, ...BAIRROS, ...MUNICIPIOS]) expect(isLatLng(item.pos)).toBe(true);
    for (const m of MUNICIPIOS) if (m.basePos) expect(isLatLng(m.basePos)).toBe(true);
  });
});
