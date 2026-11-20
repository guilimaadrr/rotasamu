import { CentralAccess } from "./CentralAccess";
import { useCentral } from "@/lib/samu/central-context";
import { Link, useLocation } from "@tanstack/react-router";
import { Activity, Home, Map as MapIcon, Moon, Radio, Sun, Wifi } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useClock, useNetworkStatus } from "@/lib/samu/use-station";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/despacho", label: "Despacho Recife", icon: Radio },
  { to: "/regional", label: "Apoio regional", icon: MapIcon },
  { to: "/", label: "Início", icon: Home },
] as const;

export function SamuMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative grid size-10 place-items-center rounded-md bg-signal-gradient shadow-signal",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-6 text-primary-foreground"
        fill="currentColor"
        aria-hidden
      >
        <path d="M10 2h4v6.5l5.6-3.2 2 3.4L16 12l5.6 3.3-2 3.4L14 15.5V22h-4v-6.5l-5.6 3.2-2-3.4L8 12 2.4 8.7l2-3.4L10 8.5z" />
      </svg>
    </div>
  );
}

export function AppShell({
  ambiente,
  children,
  actions,
}: {
  ambiente: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { pathname } = useLocation();
  const now = useClock();
  const online = useNetworkStatus();
  const central = useCentral();
  const [dark, setDark] = useState(true);

  useEffect(() => {
    try {
      setDark(localStorage.getItem("samu.theme") !== "light");
    } catch {
      setDark(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("samu.theme", dark ? "dark" : "light");
    } catch {
      /* A estação continua funcional quando o armazenamento local não está disponível. */
    }
  }, [dark]);

  return (
    <div className="flex h-screen h-dvh overflow-hidden bg-background">
      <nav className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-border bg-rail py-3">
        <Link to="/" aria-label="Central SAMU 192">
          <SamuMark />
        </Link>
        <div className="my-2 h-px w-8 bg-border" />
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              title={label}
              aria-label={label}
              data-active={active}
              className="group relative grid size-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
            >
              <Icon className="size-5" />
              {active && <span className="absolute -left-3 h-6 w-1 rounded-r bg-primary" />}
              <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded border border-border bg-popover px-2 py-1 font-mono text-[11px] text-popover-foreground opacity-0 shadow-panel transition-opacity group-hover:opacity-100">
                {label}
              </span>
            </Link>
          );
        })}
        <div className="mt-auto flex flex-col items-center gap-1">
          <span className="font-display text-lg font-bold leading-none text-primary">192</span>
          <span className="label-caps !text-[9px]">PE</span>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-rail/90 px-4 shadow-[0_8px_24px_rgb(8_20_38_/_0.1)] backdrop-blur">
          <div className="min-w-0">
            <div className="label-caps">Central SAMU 192 · Estação de despacho</div>
            <h1 className="truncate font-display text-xl font-semibold uppercase leading-tight">
              {ambiente}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {actions}
            <CentralAccess />
            <div className="hidden items-center gap-2 rounded-md border border-ok/30 bg-ok/10 px-3 py-1.5 md:flex">
              <Wifi className={cn("size-3.5", online ? "text-ok" : "text-off")} />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ok">
                {online ? "Rede disponível" : "Sem rede"}
              </span>
            </div>
            <div className="hidden items-center gap-2 rounded-md border border-border bg-panel-raised px-3 py-1.5 xl:flex">
              <Activity className="size-3.5 text-route" />
              <span className="font-mono text-[10px] text-muted-foreground">
                {central.shared
                  ? central.phase === "ready"
                    ? "Status centrais confirmados"
                    : "Central não confirmada"
                  : "Status local à estação"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDark((current) => !current)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-panel-raised px-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              aria-label={dark ? "Usar modo claro" : "Usar modo escuro operacional"}
              title={dark ? "Usar modo claro" : "Usar modo escuro operacional"}
            >
              {dark ? (
                <Sun className="size-3.5 text-signal" />
              ) : (
                <Moon className="size-3.5 text-primary" />
              )}
              <span className="hidden sm:inline">{dark ? "Claro" : "Escuro"}</span>
            </button>
            <div className="flex items-center gap-2 rounded-md border border-border bg-panel-raised px-3 py-1.5">
              <span className="size-2 animate-pulse rounded-full bg-ok" />
              <span className="font-mono text-sm tabular-nums" suppressHydrationWarning>
                {now ? now.toLocaleTimeString("pt-BR", { timeZone: "America/Recife" }) : "--:--:--"}
              </span>
            </div>
          </div>
        </header>
        <main className="relative min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
