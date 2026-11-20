import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geocodeSuggestions, geocodeAddress } from "./geocode";
import { BAIRROS } from "./data";
beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());
function mock(items: unknown[]) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(items))));
}
const signal = () => new AbortController().signal;
describe("validação territorial", () => {
  it("rejeita endereço de outro município mesmo dentro da caixa de busca", async () => {
    const { geocodeSuggestions, geocodeAddress } = await import("./geocode");
    mock([
      {
        lat: "-8.05",
        lon: "-34.9",
        display_name: "Rua, Olinda",
        address: { city: "Olinda", suburb: "Boa Vista" },
      },
    ]);
    expect(await geocodeSuggestions("Rua", undefined, signal())).toEqual([]);
  });
  it("não associa bairro por substring do nome de uma rua", async () => {
    const { geocodeSuggestions, geocodeAddress } = await import("./geocode");
    mock([
      {
        lat: "-8.05",
        lon: "-34.9",
        display_name: "Rua Boa Vista, Recife",
        address: { city: "Recife", road: "Rua Boa Vista" },
      },
    ]);
    const result = await geocodeSuggestions("Rua Boa Vista", undefined, signal());
    expect(result[0]?.bairro).toBeUndefined();
  });
  it("não usa endereço de bairro diferente mesmo sendo próximo", async () => {
    const ref = BAIRROS.find((b) => b.nome === "Boa Vista")!.pos;
    const { geocodeSuggestions, geocodeAddress } = await import("./geocode");
    mock([
      {
        lat: String(ref[0]),
        lon: String(ref[1]),
        display_name: "Rua, Derby, Recife",
        address: { city: "Recife", suburb: "Derby" },
      },
    ]);
    expect(await geocodeAddress("Rua", "Boa Vista", ref, signal())).toBeNull();
  });
  it("rejeita coordenadas vazias", async () => {
    const { geocodeSuggestions, geocodeAddress } = await import("./geocode");
    mock([{ lat: "", lon: "", display_name: "Recife", address: { city: "Recife" } }]);
    expect(await geocodeSuggestions("Rua", undefined, signal())).toEqual([]);
  });
});
