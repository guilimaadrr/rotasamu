import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BASES } from "./data";
const fake = vi.hoisted(() => ({
  callback: null as null | ((event: string, session: unknown) => void),
  read: vi.fn(),
  write: vi.fn(),
  audit: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("./central-api", () => ({
  centralMode: true,
  getCentralClient: async () => ({
    auth: {
      onAuthStateChange: (callback: typeof fake.callback) => {
        fake.callback = callback;
        queueMicrotask(() =>
          callback?.("INITIAL_SESSION", {
            user: { id: "operator-1", email: "operador@example.org" },
          }),
        );
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signInWithPassword: fake.login,
      signOut: fake.logout,
    },
  }),
  readSnapshot: fake.read,
  writeStatus: fake.write,
  readAudit: fake.audit,
}));
import { CentralProvider, useCentral, centralStatuses } from "./central-context";
const snapshot = (role = "operator") => ({
  operator: { id: "operator-1", name: "Operador", role },
  bases: BASES.map((b) => ({
    base_id: b.id,
    status: "disponivel",
    version: 1,
    updated_at: "2026-11-18T12:00:00Z",
  })),
  server_time: "2026-11-18T12:00:00Z",
});
beforeEach(() => {
  vi.clearAllMocks();
  fake.read.mockResolvedValue(snapshot());
  fake.logout.mockResolvedValue({ error: null });
});
afterEach(() => cleanup());
const setup = () => renderHook(useCentral, { wrapper: CentralProvider });
describe("acesso e sincronização central", () => {
  it("carrega snapshot autorizado e bloqueia status ao sair", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(centralStatuses(result.current)["central"]).toBe("disponivel");
    await act(async () => result.current.logout());
    expect(result.current.phase).toBe("login");
    expect(centralStatuses(result.current)["central"]).toBe("nao_confirmado");
  });
  it("falha de rede não reutiliza disponibilidade local", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    act(() => window.dispatchEvent(new Event("offline")));
    expect(result.current.phase).toBe("unavailable");
    expect(centralStatuses(result.current)["central"]).toBe("nao_confirmado");
  });
  it("recusa escrita pelo perfil de consulta", async () => {
    fake.read.mockResolvedValue(snapshot("viewer"));
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    await expect(result.current.changeStatus("central", "sem_viatura")).rejects.toThrow();
    expect(fake.write).not.toHaveBeenCalled();
  });
  it("não antecipa gravação e envia a versão esperada com identificador único", async () => {
    let finish!: (value: unknown) => void;
    fake.write.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    let save!: Promise<void>;
    act(() => {
      save = result.current.changeStatus("central", "sem_viatura");
    });
    expect(centralStatuses(result.current)["central"]).toBe("disponivel");
    expect(result.current.pending).toBe(true);
    expect(fake.write.mock.calls[0]?.slice(1, 4)).toEqual(["central", "sem_viatura", 1]);
    expect(fake.write.mock.calls[0]?.[4]).toMatch(/^[0-9a-f-]{36}$/);
    fake.read.mockResolvedValue({
      ...snapshot(),
      bases: snapshot().bases.map((b) =>
        b.base_id === "central" ? { ...b, status: "sem_viatura", version: 2 } : b,
      ),
    });
    await act(async () => {
      finish({
        base_id: "central",
        status: "sem_viatura",
        version: 2,
        updated_at: "2026-11-18T12:00:01Z",
      });
      await save;
    });
    expect(centralStatuses(result.current)["central"]).toBe("sem_viatura");
  });
  it("ignora leitura concluída depois de encerrar a sessão", async () => {
    let finish!: (value: unknown) => void;
    fake.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = setup();
    await waitFor(() => expect(fake.read).toHaveBeenCalled());
    await act(async () => result.current.logout());
    await act(async () => {
      finish(snapshot());
    });
    expect(result.current.phase).toBe("login");
    expect(result.current.snapshot).toBeNull();
  });
});
