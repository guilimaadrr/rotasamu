import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LatLng } from "./data";
import { fetchRoute, RouteError } from "./route-service";
const from: LatLng = [-8.05, -34.89];
const to: LatLng = [-8.08, -34.91];
const valid = {
  code: "Ok",
  routes: [
    {
      distance: 2400,
      duration: 300,
      geometry: {
        type: "LineString",
        coordinates: [
          [-34.89, -8.05],
          [-34.91, -8.08],
        ],
      },
    },
  ],
};
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe("rotas", () => {
  it("mantém sentido base para ocorrência e converte longitude/latitude", async () => {
    const request = vi.fn().mockResolvedValue(reply(valid));
    vi.stubGlobal("fetch", request);
    const { fetchRoute } = await import("./route-service");
    const route = await fetchRoute(from, to, new AbortController().signal);
    expect(request.mock.calls[0]?.[0]).toContain("-34.89,-8.05;-34.91,-8.08");
    expect(route).toMatchObject({ km: 2.4, minutos: 5, geometry: [from, to] });
    expect(route.calculatedAt).toBeGreaterThan(0);
  });
  it("não consulta com coordenada inválida", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(fetchRoute([NaN, 0], to, new AbortController().signal)).rejects.toBeInstanceOf(
      RouteError,
    );
    expect(request).not.toHaveBeenCalled();
  });
  it("rejeita geometria e métricas inválidas e tenta contingência", async () => {
    const request = vi.fn().mockResolvedValue(
      reply({
        code: "Ok",
        routes: [{ distance: -1, duration: 100, geometry: { coordinates: [[null, null]] } }],
      }),
    );
    vi.stubGlobal("fetch", request);
    const { fetchRoute } = await import("./route-service");
    await expect(fetchRoute(from, to, new AbortController().signal)).rejects.toMatchObject({
      kind: "invalida",
    });
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("usa contingência após falha do primeiro serviço", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(reply({}, 503)).mockResolvedValueOnce(reply(valid)),
    );
    const { fetchRoute } = await import("./route-service");
    await expect(fetchRoute(from, to, new AbortController().signal)).resolves.toMatchObject({
      km: 2.4,
    });
  });
  it("respeita cancelamento mesmo se a rota estiver em cache", async () => {
    const request = vi.fn().mockResolvedValue(reply(valid));
    vi.stubGlobal("fetch", request);
    const { fetchRoute } = await import("./route-service");
    await fetchRoute(from, to, new AbortController().signal);
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(fetchRoute(from, to, ctrl.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
