import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBaseStatuses, useSessionState } from "./use-station";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});
describe("persistência da estação", () => {
  it("continua alterando status se o armazenamento falhar", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(useBaseStatuses);
    act(() => result.current.setStatus("central", "sem_viatura"));
    expect(result.current.statuses["central"]).toBe("sem_viatura");
    expect(result.current.storageError).toBe(true);
  });
  it("restaura status sem substituir o valor salvo pelo estado inicial", async () => {
    localStorage.setItem(
      "samu.status.v1",
      JSON.stringify({ central: "sem_viatura", pcr: "invalido" }),
    );
    const { result } = renderHook(useBaseStatuses);
    await waitFor(() => expect(result.current.statuses).toEqual({ central: "sem_viatura" }));
    expect(JSON.parse(localStorage.getItem("samu.status.v1")!)).toEqual({ central: "sem_viatura" });
  });
  it("rejeita consulta salva com formato inválido", () => {
    sessionStorage.setItem("query", "123");
    const { result } = renderHook(() => useSessionState("query", ""));
    expect(result.current[0]).toBe("");
  });
  it("recebe status alterado por outra aba", () => {
    const { result } = renderHook(useBaseStatuses);
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "samu.status.v1",
          newValue: JSON.stringify({ central: "sem_viatura" }),
        }),
      ),
    );
    expect(result.current.statuses["central"]).toBe("sem_viatura");
  });
});
