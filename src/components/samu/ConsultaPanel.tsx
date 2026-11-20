import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Route,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BAIRROS, type Base } from "@/lib/samu/data";
import type { DispatchDecision, StatusMap } from "@/lib/samu/dispatch";
import { geocodeSuggestions, type AddressSuggestion } from "@/lib/samu/geocode";
import type { RouteResult } from "@/lib/samu/route-service";
import { cn } from "@/lib/utils";
import { StatusPill } from "./StatusPill";

const REASON: Record<DispatchDecision["reason"], { label: string; tone: string }> = {
  responsavel: { label: "Base responsável", tone: "text-ok border-ok/40 bg-ok/10" },
  apoio: { label: "Apoio protocolar", tone: "text-busy border-busy/40 bg-busy/10" },
  alternativa: {
    label: "Alternativa por linha reta",
    tone: "text-route border-route/40 bg-route/10",
  },
  nenhuma: { label: "Sem base disponível", tone: "text-off border-off/40 bg-off/10" },
};

export type RouteState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; route: RouteResult }
  | { kind: "error"; message: string };

interface Props {
  endereco: string;
  bairro: string;
  onSubmit: (endereco: string, bairro: string) => void;
  consultando: boolean;
  posLabel: string | null;
  decision: DispatchDecision | null;
  route: RouteState;
  statuses: StatusMap;
  onRetry?: () => void;
}

export function ConsultaPanel({
  endereco,
  bairro,
  onSubmit,
  consultando,
  posLabel,
  decision,
  route,
  statuses,
  onRetry,
}: Props) {
  const [end, setEnd] = useState(endereco);
  const [bai, setBai] = useState(bairro);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  const addressAbort = useRef<AbortController | null>(null);
  const [addressMessage, setAddressMessage] = useState("");
  useEffect(() => () => addressAbort.current?.abort(), []);

  async function searchAddress() {
    addressAbort.current?.abort();
    const controller = new AbortController();
    addressAbort.current = controller;
    setSearchingAddress(true);
    setAddressMessage("");
    try {
      const items = await geocodeSuggestions(end.trim(), undefined, controller.signal);
      if (controller.signal.aborted) return;
      setSuggestions(items);
      if (!items.length)
        setAddressMessage("Nenhum endereço localizado no Recife. Confira a rua e o bairro.");
    } catch {
      if (!controller.signal.aborted)
        setAddressMessage("Busca indisponível. Você pode consultar a cobertura pelo bairro.");
    } finally {
      if (addressAbort.current === controller) setSearchingAddress(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <form
        className="space-y-3 border-b border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (bai) onSubmit(end.trim(), bai);
        }}
      >
        <div className="label-caps">01 · Consulta da ocorrência</div>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Endereço (opcional)</span>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={end}
              onChange={(e) => {
                addressAbort.current?.abort();
                setSearchingAddress(false);
                setSuggestions([]);
                setSelectedAddress(null);
                setEnd(e.target.value);
              }}
              placeholder="Rua, número"
              maxLength={160}
              autoComplete="street-address"
              aria-autocomplete="list"
              aria-expanded={suggestions.length > 0}
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
            />
            {searchingAddress && (
              <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={`${suggestion.label}-${suggestion.pos.join(",")}`}
                    className="flex w-full flex-col gap-0.5 rounded px-2.5 py-2 text-left text-xs transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
                    onClick={() => {
                      setEnd(suggestion.endereco);
                      setSelectedAddress(suggestion.endereco);
                      if (suggestion.bairro) setBai(suggestion.bairro);
                      setSuggestions([]);
                    }}
                  >
                    <span className="truncate font-medium text-foreground">
                      {suggestion.endereco}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {suggestion.bairro ? `${suggestion.bairro} · ` : ""}
                      {suggestion.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="console"
            size="sm"
            className="mt-2"
            disabled={end.trim().length < 3 || searchingAddress || end === selectedAddress}
            onClick={searchAddress}
          >
            Buscar endereço
          </Button>
          {addressMessage && (
            <p role="status" className="mt-1 text-xs text-signal">
              {addressMessage}
            </p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            Digite uma rua ou referência; ao selecionar, o bairro é preenchido quando reconhecido.
          </p>
        </label>

        <div>
          <span className="mb-1 block text-xs text-muted-foreground">Bairro de referência</span>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm outline-none transition-colors hover:border-ring"
              >
                <span className={cn(!bai && "text-muted-foreground")}>
                  {bai || "Selecione o bairro"}
                </span>
                <ChevronsUpDown className="size-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar bairro…" />
                <CommandList>
                  <CommandEmpty>Nenhum bairro encontrado.</CommandEmpty>
                  <CommandGroup>
                    {BAIRROS.map((b) => (
                      <CommandItem
                        key={b.nome}
                        value={b.nome}
                        onSelect={() => {
                          setBai(b.nome);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn("size-4", bai === b.nome ? "opacity-100" : "opacity-0")}
                        />
                        {b.nome}
                        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                          RPA {b.rpa}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <Button
          type="submit"
          variant="signal"
          size="lg"
          className="w-full"
          disabled={!bai || consultando}
        >
          {consultando ? <Loader2 className="animate-spin" /> : <Search />}
          Consultar cobertura
        </Button>
      </form>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="label-caps">02 · Indicação de despacho</div>

        {!decision ? (
          <div className="grid place-items-center rounded-lg border border-dashed border-border bg-grid px-6 py-10 text-center">
            <Navigation className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Selecione o bairro e consulte para ver a base indicada e a rota até a ocorrência.
            </p>
          </div>
        ) : (
          <>
            <DecisionCard decision={decision} route={route} statuses={statuses} />
            {route.kind === "error" && (
              <Button variant="console" onClick={onRetry}>
                Tentar rota novamente
              </Button>
            )}
            {posLabel && (
              <p className="flex gap-2 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                <span>{posLabel}</span>
              </p>
            )}
            <div className="space-y-2">
              <div className="label-caps">Tabela de cobertura</div>
              <CoverageRow
                papel="Responsável"
                base={decision.responsavel}
                statuses={statuses}
                active={decision.base?.id}
              />
              <CoverageRow
                papel="Apoio"
                base={decision.apoio}
                statuses={statuses}
                active={decision.base?.id}
              />
            </div>
          </>
        )}

        <div className="flex gap-2 rounded-md border border-signal/30 bg-signal/5 p-3 text-xs text-muted-foreground">
          <ShieldAlert className="size-4 shrink-0 text-signal" />
          <p>
            Ferramenta de apoio. Confirme rádio, disponibilidade e decisão na regulação. A
            estimativa de rota não substitui protocolo ou decisão clínica.
          </p>
        </div>
      </div>
    </div>
  );
}

function DecisionCard({
  decision,
  route,
  statuses,
}: {
  decision: DispatchDecision;
  route: RouteState;
  statuses: StatusMap;
}) {
  const r = REASON[decision.reason];
  const base = decision.base;
  const eta =
    route.kind === "ok" ? new Date(route.route.calculatedAt + route.route.minutos * 60000) : null;

  return (
    <div className="relative animate-rise overflow-hidden rounded-lg border border-border bg-panel-raised shadow-panel">
      <div className={cn("absolute inset-y-0 left-0 w-1", base ? "bg-route" : "bg-off")} />
      <div className="p-4 pl-5">
        <span
          className={cn(
            "inline-flex rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
            r.tone,
          )}
        >
          {r.label}
        </span>
        {base ? (
          <>
            <div className="mt-3 flex items-end gap-3">
              <span className="font-display text-5xl font-bold leading-none text-route">
                {base.sigla}
              </span>
              <div className="min-w-0 pb-0.5">
                <div className="truncate font-display text-lg font-semibold uppercase leading-tight">
                  {base.nome}
                </div>
                <div className="truncate text-xs text-muted-foreground">{base.viaturas}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border">
              <Metric
                icon={Route}
                label="Distância"
                value={route.kind === "ok" ? `${route.route.km.toFixed(1)} km` : "—"}
              />
              <Metric
                icon={Clock}
                label="Tempo estimado"
                value={route.kind === "ok" ? `${Math.round(route.route.minutos)} min` : "—"}
              />
              <Metric
                icon={Navigation}
                label="Previsão"
                value={
                  eta
                    ? eta.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/Recife",
                      })
                    : "—"
                }
              />
            </div>
            {route.kind === "loading" && (
              <p className="mt-3 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Calculando rota base → ocorrência…
              </p>
            )}
            {route.kind === "error" && (
              <p className="mt-3 flex items-start gap-2 text-xs text-off">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {route.message} A indicação
                da base não muda.
              </p>
            )}
            <div className="mt-3">
              <StatusPill status={statuses[base.id] ?? "disponivel"} />
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm">
            Nenhuma base está disponível. Acione a regulação e confirme o status pelo rádio.
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Route;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-panel-raised px-2.5 py-2">
      <div className="flex items-center gap-1 label-caps !text-[9px]">
        <Icon className="size-3" /> {label}
      </div>
      <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function CoverageRow({
  papel,
  base,
  statuses,
  active,
}: {
  papel: string;
  base: Base | undefined;
  statuses: StatusMap;
  active: string | undefined;
}) {
  if (!base) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-background/40 px-3 py-2",
        active === base.id && "border-route/50",
      )}
    >
      <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {papel}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{base.nome}</span>
      <StatusPill status={statuses[base.id] ?? "disponivel"} />
    </div>
  );
}
