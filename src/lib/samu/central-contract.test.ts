import { describe, expect, it } from "vitest";
import { BASES, BAIRROS } from "./data";
import {
  parseSnapshot,
  parseRecord,
  parseAudit,
  unknownStatuses,
  canWrite,
} from "./central-contract";
import { validateCentralConfig } from "./central-api";
import { decideDispatch } from "./dispatch";
const record = {
  base_id: "central",
  status: "disponivel",
  version: 1,
  updated_at: "2026-11-18T12:00:00Z",
};
const snapshot = () => ({
  operator: { id: "operator-1", name: "Operador", role: "operator" },
  bases: BASES.map((base) => ({ ...record, base_id: base.id })),
  server_time: record.updated_at,
});
describe("contrato central", () => {
  it("exige todas as bases sem duplicação", () => {
    expect(parseSnapshot(snapshot()).bases).toHaveLength(BASES.length);
    const invalid = snapshot();
    invalid.bases[1] = invalid.bases[0]!;
    expect(() => parseSnapshot(invalid)).toThrow();
    expect(() => parseSnapshot({ ...snapshot(), bases: [] })).toThrow();
  });
  it("rejeita status, versão ou data inválidos", () => {
    for (const invalid of [
      { status: "livre" },
      { version: -1 },
      { version: 1.5 },
      { updated_at: "ontem" },
      { base_id: "inexistente" },
    ])
      expect(() => parseRecord({ ...record, ...invalid })).toThrow();
  });
  it("não concede escrita ao perfil de consulta", () => {
    expect(canWrite("viewer")).toBe(false);
    expect(canWrite(undefined)).toBe(false);
    expect(canWrite("operator")).toBe(true);
    expect(canWrite("supervisor")).toBe(true);
  });
  it("status desconhecidos nunca geram indicação de base", () => {
    expect(decideDispatch(BAIRROS[0]!, BAIRROS[0]!.pos, BASES, unknownStatuses()).base).toBeNull();
  });
  it("não aceita histórico sem autoria e data", () => {
    expect(() =>
      parseAudit([{ id: 1, base_id: "central", current_status: "disponivel" }]),
    ).toThrow();
  });
  it("recusa chaves administrativas no navegador", () => {
    expect(() => validateCentralConfig("https://central.example", "sb_secret_invalido")).toThrow();
    expect(() =>
      validateCentralConfig("http://central.example", "sb_publishable_publico"),
    ).toThrow();
    expect(() => validateCentralConfig("https://central.example", "chave_invalida")).toThrow();
    expect(() =>
      validateCentralConfig("https://central.example", "sb_publishable_publico"),
    ).not.toThrow();
  });
});
