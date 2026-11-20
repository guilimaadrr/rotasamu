import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Crosshair, Info, MapPinned, Search, ShieldAlert, Waves } from "lucide-react";
import { AppShell } from "@/components/samu/AppShell";
import { MapStyleSwitch } from "@/components/samu/MapStyleSwitch";
import { RegionalMap } from "@/components/samu/RegionalMap";
import type { MapStyle } from "@/components/samu/useLeafletMap";
import { GERES_LABEL, MUNICIPIOS, type Geres } from "@/lib/samu/data";
import { rankRegionalSupport, REGIONAL_KMH } from "@/lib/samu/dispatch";
import { useSessionState } from "@/lib/samu/use-station";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/regional")({
  head: () => ({
    meta: [
      { title: "Apoio regional · Central SAMU 192" },
      {
        name: "description",
        content:
          "Consulta territorial da I Macrorregião de Saúde de Pernambuco com bases por proximidade.",
      },
      { property: "og:title", content: "Apoio regional · Central SAMU 192" },
      {
        property: "og:description",
        content: "Municípios da I Macrorregião e bases de apoio ordenadas por distância.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Regional,
});

const GERES_ORDER: Geres[] = ["I", "II", "III", "XII"];
const GERES_DOT: Record<Geres, string> = {
  I: "bg-geres-1",
  II: "bg-geres-2",
  III: "bg-geres-3",
  XII: "bg-geres-12",
};

function Regional() {
  const [destinoNome, setDestinoNome] = useSessionState<string>("samu.regional.destino", "");
  const [origemNome, setOrigemNome] = useState<string>("");
  const [q, setQ] = useState("");
  const [style, setStyle] = useState<MapStyle>("noturno");
  const [centerRequest, setCenterRequest] = useState(0);

  const destino = MUNICIPIOS.find((m) => m.nome === destinoNome) ?? null;
  const ranking = useMemo(
    () => (destino ? rankRegionalSupport(destino, MUNICIPIOS) : []),
    [destino],
  );
  const origem = ranking.find((o) => o.municipio.nome === origemNome)?.municipio ?? null;

  const pick = (nome: string) => {
    setDestinoNome(nome);
    setOrigemNome("");
  };

  const filtered = MUNICIPIOS.filter((m) => m.nome.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <AppShell
      ambiente="Apoio regional · I Macrorregião"
      actions={
        <button
          type="button"
          onClick={() => setCenterRequest((value) => value + 1)}
          className="hidden h-9 items-center gap-2 rounded-md border border-border bg-panel-raised px-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary hover:text-primary xl:inline-flex"
        >
          <Crosshair className="size-3.5" /> Centralizar
        </button>
      }
    >
      <div className="grid h-full grid-rows-[minmax(120px,0.8fr)_minmax(220px,1fr)_minmax(160px,1fr)] lg:flex lg:flex-row">
        <aside className="flex min-h-0 w-full shrink-0 flex-col border-b border-border bg-card lg:max-h-none lg:w-[300px] lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-border p-4">
            <div className="label-caps">01 · Município de destino</div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar município"
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {GERES_ORDER.map((g) => {
              const items = filtered.filter((m) => m.geres === g);
              if (!items.length) return null;
              return (
                <div key={g} className="mb-3">
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <span className={cn("size-2 rounded-full", GERES_DOT[g])} />
                    <span className="label-caps">{GERES_LABEL[g]}</span>
                  </div>
                  {items.map((m) => (
                    <button
                      key={m.nome}
                      type="button"
                      onClick={() => pick(m.nome)}
                      data-active={m.nome === destinoNome}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                    >
                      <span className="flex-1 truncate">{m.nome}</span>
                      {m.base === "pendente" && (
                        <span className="font-mono text-[9px] uppercase text-muted-foreground">
                          pendente
                        </span>
                      )}
                      {m.base === "sem_terrestre" && (
                        <Waves className="size-3.5 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="relative isolate min-h-[220px] min-w-0 lg:min-h-[320px] flex-1 overflow-hidden">
          <RegionalMap
            municipios={MUNICIPIOS}
            destino={destino}
            origem={origem}
            style={style}
            centerRequest={centerRequest}
            onPick={pick}
          />
          <button
            type="button"
            aria-label="Centralizar mapa regional"
            onClick={() => setCenterRequest((value) => value + 1)}
            className="absolute left-3 top-3 z-[500] rounded-md border border-border bg-panel p-2 lg:hidden"
          >
            <Crosshair className="size-4" />
          </button>
          <div className="absolute right-3 top-3 z-[500]">
            <MapStyleSwitch value={style} onChange={setStyle} />
          </div>
          <div className="absolute bottom-3 left-3 z-[500] flex max-w-[calc(100%-1.5rem)] flex-wrap gap-3 rounded-md border border-border bg-panel px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground shadow-panel backdrop-blur">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-route" /> Cores: referência visual de
              cobertura
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-4 border-t-2 border-dashed border-signal" /> Origem → destino
            </span>
          </div>
        </section>

        <aside className="flex min-h-0 w-full shrink-0 flex-col border-t border-border bg-card lg:max-h-none lg:w-[360px] lg:border-l lg:border-t-0">
          <div className="border-b border-border p-4">
            <div className="label-caps">02 · Bases de apoio por proximidade</div>
            {destino ? (
              <div className="mt-2 animate-rise">
                <div className="font-display text-3xl font-bold uppercase leading-tight">
                  {destino.nome}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("size-2 rounded-full", GERES_DOT[destino.geres])} />
                  {GERES_LABEL[destino.geres]} · destino da ocorrência
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Escolha um município na lista ou no mapa.
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {!destino && (
              <div className="grid place-items-center rounded-lg border border-dashed border-border bg-grid px-6 py-10 text-center">
                <MapPinned className="mb-3 size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  As bases aparecerão ordenadas da mais próxima para a mais distante.
                </p>
              </div>
            )}
            {destino?.base === "sem_terrestre" && (
              <div className="flex gap-2 rounded-md border border-route/40 bg-route/10 p-3 text-sm">
                <Waves className="size-4 shrink-0 text-route" />
                Fernando de Noronha não participa de referência terrestre. Acione a regulação.
              </div>
            )}
            <ol className="space-y-1.5">
              {ranking.map((o, i) => {
                const active = o.municipio.nome === origemNome;
                return (
                  <li key={o.municipio.nome}>
                    <button
                      type="button"
                      onClick={() => setOrigemNome(active ? "" : o.municipio.nome)}
                      data-active={active}
                      className="flex w-full items-center gap-3 rounded-md border border-border bg-panel-raised px-3 py-2 text-left transition-colors hover:border-ring data-[active=true]:border-signal data-[active=true]:bg-signal/10"
                    >
                      <span
                        className={cn(
                          "w-6 font-mono text-xs tabular-nums text-muted-foreground",
                          i === 0 && "text-signal",
                        )}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: o.municipio.cobertura.color }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{o.municipio.nome}</span>
                        <span className="block truncate font-mono text-[10px] text-muted-foreground">
                          {o.municipio.enderecoBase || "Referência municipal"}
                        </span>
                      </span>
                      <span className="text-right font-mono text-xs tabular-nums">
                        {o.km.toFixed(1)} km
                        <span className="block text-[10px] text-muted-foreground">
                          ≈ {o.minutos} min
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="space-y-2 border-t border-border p-3 text-[11px] text-muted-foreground">
            <p className="flex gap-2">
              <Info className="size-3.5 shrink-0" />
              Linha reta da referência municipal até o destino, a {REGIONAL_KMH} km/h. Não é rota
              viária nem autorização de despacho.
            </p>
            <p className="flex gap-2 text-signal">
              <ShieldAlert className="size-3.5 shrink-0" />
              Confirme rádio, disponibilidade e regulação antes de solicitar apoio.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
