import { useState } from "react";
import { UserRound, RefreshCw, History, LogOut } from "lucide-react";
import { useCentral } from "@/lib/samu/central-context";
import { BASES } from "@/lib/samu/data";
import { STATUS_LABEL } from "@/lib/samu/use-station";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export function CentralAccess() {
  const central = useCentral();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(false);
  if (!central.shared) return null;
  const roles = { viewer: "Consulta", operator: "Operador", supervisor: "Supervisor" };
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A central não confirmou a ação.");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setPassword("");
          setMessage("");
          setHistory(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="console" size="sm" aria-label="Acesso do operador central">
          <UserRound />
          <span className="hidden sm:inline">
            {central.phase === "ready" ? "Operador conectado" : "Operador"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-card sm:max-w-2xl">
        <DialogTitle>Acesso à central</DialogTitle>
        <DialogDescription>
          Disponibilidade compartilhada com identificação de operador e histórico de alterações.
        </DialogDescription>
        {central.email ? (
          <div className="space-y-4">
            <div className="rounded border border-border p-3 text-sm">
              <strong>{central.snapshot?.operator.name || central.email}</strong>
              <p className="text-muted-foreground">
                {central.snapshot
                  ? roles[central.snapshot.operator.role]
                  : "Aguardando autorização central"}
              </p>
              {central.lastSync > 0 && (
                <p className="mt-1 text-xs">
                  Última confirmação:{" "}
                  {new Date(central.lastSync).toLocaleTimeString("pt-BR", {
                    timeZone: "America/Recife",
                  })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="console"
                disabled={busy || central.pending}
                onClick={() => void run(central.refresh)}
              >
                <RefreshCw /> Atualizar status
              </Button>
              <Button
                variant="console"
                disabled={busy || central.phase !== "ready"}
                onClick={() => {
                  setHistory(true);
                  void run(central.loadAudit);
                }}
              >
                <History /> Histórico
              </Button>
              <Button
                variant="console"
                disabled={busy || central.pending}
                onClick={() => void run(central.logout)}
              >
                <LogOut /> Encerrar acesso
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(() => central.login(email, password));
            }}
          >
            <label className="block text-sm">
              E-mail institucional
              <input
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 w-full rounded border border-input bg-background px-3"
              />
            </label>
            <label className="block text-sm">
              Senha
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-10 w-full rounded border border-input bg-background px-3"
              />
            </label>
            <Button
              type="submit"
              variant="signal"
              disabled={busy || central.phase === "connecting"}
            >
              {busy ? "Verificando acesso…" : "Entrar"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Acesso concedido pela coordenação. Contas sem autorização central não podem consultar
              nem alterar status.
            </p>
          </form>
        )}
        {(message || central.error) && (
          <p role="alert" className="rounded border border-busy/50 p-3 text-sm text-busy">
            {message || central.error}
          </p>
        )}
        {history && (
          <section className="space-y-3">
            <h3 className="font-semibold">Últimas 50 alterações confirmadas</h3>
            {central.auditError && (
              <p role="alert" className="text-sm text-off">
                {central.auditError}
              </p>
            )}
            {!busy && !central.auditError && !central.audit.length && (
              <p className="text-sm text-muted-foreground">
                Nenhuma alteração disponível para seu acesso.
              </p>
            )}
            <ol className="space-y-2">
              {central.audit.map((item) => (
                <li key={item.id} className="rounded border border-border p-3 text-sm">
                  <strong>
                    {BASES.find((base) => base.id === item.base_id)?.nome || item.base_id}
                  </strong>
                  : {STATUS_LABEL[item.previous_status]} → {STATUS_LABEL[item.current_status]}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.operator_name} ·{" "}
                    {new Date(item.changed_at).toLocaleString("pt-BR", {
                      timeZone: "America/Recife",
                    })}
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    Estação {item.station_id}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
