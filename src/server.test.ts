// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
const { handler } = vi.hoisted(() => ({ handler: vi.fn() }));
vi.mock("@tanstack/react-start/server-entry", () => ({ default: { fetch: handler } }));
import server from "./server";
afterEach(() => vi.restoreAllMocks());
describe("servidor SSR", () => {
  it("preserva a resposta e aplica proteção e ausência de cache", async () => {
    handler.mockResolvedValueOnce(
      new Response("Central SAMU", { headers: { "content-type": "text/html" } }),
    );
    const result = await server.fetch(new Request("https://samu.example/despacho"), {}, {});
    expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect(result.headers.get("X-Frame-Options")).toBe("DENY");
    expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await result.text()).toBe("Central SAMU");
  });
  it("entrega uma página de recuperação em português quando o SSR falha", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    handler.mockRejectedValueOnce(new Error("internal-secret-details"));
    const result = await server.fetch(new Request("https://samu.example/despacho"), {}, {});
    expect(result.status).toBe(500);
    const text = await result.text();
    expect(text).toContain("Tentar novamente");
    expect(text).not.toContain("internal-secret-details");
  });
  it("normaliza erro JSON interno para a página de recuperação", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    handler.mockResolvedValueOnce(
      new Response(JSON.stringify({ unhandled: true, message: "HTTPError" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
    const result = await server.fetch(new Request("https://samu.example/"), {}, {});
    expect(result.headers.get("content-type")).toContain("text/html");
    expect(await result.text()).toContain("Voltar ao início");
  });
});
