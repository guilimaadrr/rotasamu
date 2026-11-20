import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BASES, type Base, type BaseStatus } from "@/lib/samu/data";
import type { StatusMap } from "@/lib/samu/dispatch";
import { STATUS_LABEL } from "@/lib/samu/use-station";
import { cn } from "@/lib/utils";
import { STATUS_DOT } from "./StatusPill";

const ORDER: BaseStatus[] = ["disponivel", "sem_viatura"];
type Filter = "todas" | BaseStatus;
const ACTIVE_TONE: Record<BaseStatus, string> = {
  disponivel: "bg-ok text-background",
  sem_viatura: "bg-off text-primary-foreground",
  nao_confirmado: "bg-busy text-background",
};

interface Props {
  statuses: StatusMap;
  activeBaseId: string | null;
  onConfirm: (id: string, status: BaseStatus) => void;
  locked?: boolean;
  shared?: boolean;
  onFocusBase?: (id: string) => void;
}

export function BasesPanel({
  statuses,
  activeBaseId,
  onConfirm,
  locked = false,
  shared = false,
}: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");
  const [pending, setPending] = useState<{ base: Base; status: BaseStatus } | null>(null);

  const counts = useMemo(() => {
    const c = { disponivel: 0, sem_viatura: 0, nao_confirmado: 0 } as Record<BaseStatus, number>;
    for (const b of BASES) c[statuses[b.id] ?? "disponivel"]++;
    return c;
  }, [statuses]);

  const list = BASES.filter((b) => {
    const s = statuses[b.id] ?? "disponivel";
    if (filter !== "todas" && s !== filter) return false;
    const t = q.trim().toLowerCase();
    return !t || `${b.nome} ${b.sigla} ${b.endereco} ${b.viaturas}`.toLowerCase().includes(t);
  });

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-border p-4">
        <div className="label-caps">03 · Bases e disponibilidade</div>
        <div className="grid grid-cols-2 gap-2">
          {ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(filter === s ? "todas" : s)}
              data-active={filter === s}
              className="rounded-md border border-border bg-background/40 p-2 text-left transition-colors hover:border-ring data-[active=true]:border-ring data-[active=true]:bg-accent"
            >
              <div className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", STATUS_DOT[s])} />
                <span className="font-display text-2xl font-bold leading-none tabular-nums">
                  {counts[s]}
                </span>
              </div>
              <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                {STATUS_LABEL[s]}
              </div>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar base ou viatura"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
          />
        </div>
      </div>

      {counts.nao_confirmado > 0 && (
        <p role="status" className="px-4 pt-3 text-xs text-busy">
          {counts.nao_confirmado} bases sem disponibilidade confirmada.
        </p>
      )}
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {list.map((b) => {
          const s = statuses[b.id] ?? "disponivel";
          const active = b.id === activeBaseId;
          return (
            <li
              key={b.id}
              className={cn(
                "rounded-lg border border-border bg-panel-raised p-3 transition-colors",
                active && "border-route/60 shadow-[0_0_0_1px_var(--route)]",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-md border-2 font-mono text-[11px] font-semibold",
                    s === "disponivel" && "border-ok",
                    s === "sem_viatura" && "border-off opacity-70",
                    active && "border-route bg-route text-background",
                  )}
                >
                  {b.sigla}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{b.nome}</span>
                    {active && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-route">
                        indicada
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{b.endereco}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {b.viaturas}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-background/50 p-1">
                {ORDER.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={locked}
                    data-active={s === opt}
                    data-tone={opt}
                    onClick={() => s !== opt && setPending({ base: b, status: opt })}
                    className={cn(
                      "rounded px-1 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors",
                      s === opt
                        ? ACTIVE_TONE[opt]
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {STATUS_LABEL[opt]}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
        {list.length === 0 && (
          <li className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma base encontrada.
          </li>
        )}
      </ul>

      <p className="border-t border-border px-4 py-2 font-mono text-[10px] text-muted-foreground">
        {shared
          ? "Status centrais · alteração confirmada pelo servidor e registrada em auditoria"
          : "Status salvos só nesta estação · não sincroniza com outros operadores"}
      </p>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="border-border bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl uppercase">
              Confirmar mudança de status
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending && (
                <>
                  <strong className="text-foreground">{pending.base.nome}</strong> passará para{" "}
                  <strong className="text-foreground">{STATUS_LABEL[pending.status]}</strong>.
                  Confirme somente depois do rádio ou do sistema oficial.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={locked}
              onClick={() => {
                if (pending) onConfirm(pending.base.id, pending.status);
                setPending(null);
              }}
            >
              Confirmar status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
