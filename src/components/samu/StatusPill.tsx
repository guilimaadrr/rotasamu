import type { BaseStatus } from "@/lib/samu/data";
import { STATUS_LABEL } from "@/lib/samu/use-station";
import { cn } from "@/lib/utils";

const TONE: Record<BaseStatus, string> = {
  disponivel: "bg-ok/15 text-ok border-ok/40",
  sem_viatura: "bg-off/15 text-off border-off/40",
  nao_confirmado: "bg-busy/15 text-busy border-busy/40",
};

const DOT: Record<BaseStatus, string> = {
  disponivel: "bg-ok",
  sem_viatura: "bg-off",
  nao_confirmado: "bg-busy",
};

export function StatusPill({ status, className }: { status: BaseStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        TONE[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export const STATUS_DOT = DOT;
