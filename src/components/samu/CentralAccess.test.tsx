import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
  loadAudit: vi.fn(),
}));
vi.mock("@/lib/samu/central-context", () => ({ useCentral: () => fake.state }));
import { CentralAccess } from "./CentralAccess";
beforeEach(() => {
  vi.clearAllMocks();
  fake.state = {
    shared: true,
    phase: "login",
    email: "",
    error: "",
    audit: [],
    lastSync: 0,
    pending: false,
    login: fake.login,
    logout: fake.logout,
    refresh: fake.refresh,
    loadAudit: fake.loadAudit,
  };
  fake.login.mockResolvedValue(undefined);
});
afterEach(cleanup);
describe("painel de acesso", () => {
  it("não oferece login central no modo local", () => {
    fake.state["shared"] = false;
    render(<CentralAccess />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("envia as credenciais somente após ação explícita e limpa a senha", async () => {
    render(<CentralAccess />);
    fireEvent.click(screen.getByRole("button", { name: "Acesso do operador central" }));
    fireEvent.change(screen.getByLabelText("E-mail institucional"), {
      target: { value: "operador@example.org" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senha-somente-de-teste" },
    });
    expect(fake.login).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() =>
      expect(fake.login).toHaveBeenCalledWith("operador@example.org", "senha-somente-de-teste"),
    );
    await waitFor(() => expect(screen.getByLabelText("Senha")).toHaveValue(""));
  });
  it("mostra recusa do acesso sem exibir sucesso", async () => {
    fake.login.mockRejectedValue(new Error("Acesso não autorizado."));
    render(<CentralAccess />);
    fireEvent.click(screen.getByRole("button", { name: "Acesso do operador central" }));
    fireEvent.submit(screen.getByLabelText("Senha").closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("Acesso não autorizado.");
  });
});
