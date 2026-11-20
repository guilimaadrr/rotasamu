import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Building2, Crosshair, Maximize2, Minimize2, PanelLeft } from "lucide-react";
import { AppShell } from "@/components/samu/AppShell";
import { BasesPanel } from "@/components/samu/BasesPanel";
import { ConsultaPanel, type RouteState } from "@/components/samu/ConsultaPanel";
import { DispatchMap } from "@/components/samu/DispatchMap";
import { MapStyleSwitch } from "@/components/samu/MapStyleSwitch";
import type { MapStyle } from "@/components/samu/useLeafletMap";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BAIRROS, BASES, type LatLng } from "@/lib/samu/data";
import { isLatLng } from "@/lib/samu/coordinates";
import { canWrite } from "@/lib/samu/central-contract";
import { useCentral, centralStatuses } from "@/lib/samu/central-context";
import { decideDispatch } from "@/lib/samu/dispatch";
import { geocodeAddress } from "@/lib/samu/geocode";
import { fetchRoute, RouteError } from "@/lib/samu/route-service";
import { useBaseStatuses, useSessionState } from "@/lib/samu/use-station";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/despacho")({
  head: () => ({
    meta: [
      { title: "Despacho Recife · Central SAMU 192" },
      {
        name: "description",
        content:
          "Consulta de cobertura, disponibilidade das bases e rota base → ocorrência no Recife.",
      },
      { property: "og:title", content: "Despacho Recife · Central SAMU 192" },
      {
        property: "og:description",
        content: "Base responsável, apoio e rota até a ocorrência em uma única tela.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Despacho,
});

interface Consulta {
  endereco: string;
  bairro: string;
  pos: LatLng | null;
  posLabel: string | null;
}

function isConsulta(value: unknown): value is Consulta {
  if (!value || typeof value !== "object") return false;
  const item = value as Consulta;
  return (
    typeof item.endereco === "string" &&
    typeof item.bairro === "string" &&
    (item.pos === null || isLatLng(item.pos)) &&
    (item.posLabel === null || typeof item.posLabel === "string")
  );
}

function Despacho() {
  const local = useBaseStatuses();
  const central = useCentral();
  const statuses = central.shared ? centralStatuses(central) : local.statuses;
  const storageError = !central.shared && local.storageError;
  const centralLocked =
    central.shared &&
    (central.phase !== "ready" || central.pending || !canWrite(central.snapshot?.operator.role));
  const [consulta, setConsulta] = useSessionState<Consulta>(
    "samu.consulta.recife",
    {
      endereco: "",
      bairro: "",
      pos: null,
      posLabel: null,
    },
    isConsulta,
  );
  const [consultando, setConsultando] = useState(false);
  const [retry, setRetry] = useState(0);
  const [route, setRoute] = useState<RouteState>({ kind: "idle" });
  const [style, setStyle] = useState<MapStyle>("noturno");
  const [foco, setFoco] = useState(false);
  const [centerRequest, setCenterRequest] = useState(0);
  const [drawer, setDrawer] = useState<"consulta" | "bases" | null>(null);
  const geoAbort = useRef<AbortController | null>(null);

  useEffect(() => () => geoAbort.current?.abort(), []);

  const bairro = BAIRROS.find((b) => b.nome === consulta.bairro) ?? null;
  const occurrence = consultando ? null : (consulta.pos ?? bairro?.pos ?? null);

  const decision = useMemo(
    () =>
      bairro && occurrence && (!central.shared || central.phase === "ready")
        ? decideDispatch(bairro, occurrence, BASES, statuses)
        : null,
    [bairro, occurrence, statuses, central.shared, central.phase],
  );
  const activeId = decision?.base?.id ?? null;

  // Avisa quando a indicação muda por troca de status.
  const prevActive = useRef<string | null>(null);
  useEffect(() => {
    if (prevActive.current && activeId && prevActive.current !== activeId && decision?.base) {
      toast.warning(`Indicação passou para ${decision.base.nome}`, {
        description: "A disponibilidade mudou a indicação. Confirme na regulação.",
      });
    }
    prevActive.current = activeId;
  }, [activeId, decision?.base]);

  // Uma rota por vez, sempre base → ocorrência; cancela ao trocar a consulta.
  useEffect(() => {
    if (!decision?.base || !occurrence) {
      setRoute({ kind: "idle" });
      return;
    }
    const ctrl = new AbortController();
    setRoute({ kind: "loading" });
    fetchRoute(decision.base.pos, occurrence, ctrl.signal)
      .then((r) => !ctrl.signal.aborted && setRoute({ kind: "ok", route: r }))
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setRoute({
          kind: "error",
          message: e instanceof RouteError ? e.message : "Falha ao calcular a rota.",
        });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision?.base?.id, occurrence?.[0], occurrence?.[1], retry]);

  async function handleSubmit(endereco: string, nomeBairro: string) {
    const b = BAIRROS.find((x) => x.nome === nomeBairro);
    if (!b) return;
    geoAbort.current?.abort();
    setDrawer(null);
    setConsultando(false);
    if (!endereco) {
      setConsulta({
        endereco,
        bairro: nomeBairro,
        pos: null,
        posLabel: `Referência: centro do bairro ${nomeBairro}`,
      });
      return;
    }
    const ctrl = new AbortController();
    geoAbort.current = ctrl;
    setConsultando(true);
    try {
      const hit = await geocodeAddress(endereco, nomeBairro, b.pos, ctrl.signal);
      if (ctrl.signal.aborted || geoAbort.current !== ctrl) return;
      setConsulta({
        endereco,
        bairro: nomeBairro,
        pos: hit?.pos ?? null,
        posLabel: hit
          ? hit.label
          : `Endereço não localizado no bairro — usando o centro de ${nomeBairro}`,
      });
    } catch {
      if (ctrl.signal.aborted) return;
      setConsulta({
        endereco,
        bairro: nomeBairro,
        pos: null,
        posLabel: `Sem geocodificação — usando o centro de ${nomeBairro}`,
      });
    } finally {
      if (geoAbort.current === ctrl) {
        geoAbort.current = null;
        setConsultando(false);
      }
    }
  }

  const consultaPanel = (
    <ConsultaPanel
      key={`${consulta.bairro}|${consulta.endereco}`}
      endereco={consulta.endereco}
      bairro={consulta.bairro}
      onSubmit={handleSubmit}
      consultando={consultando}
      posLabel={consulta.posLabel}
      decision={decision}
      route={route}
      statuses={statuses}
      onRetry={() => setRetry((value) => value + 1)}
    />
  );
  const basesPanel = (
    <BasesPanel
      statuses={statuses}
      activeBaseId={activeId}
      shared={central.shared}
      locked={centralLocked}
      onConfirm={async (id, s) => {
        if (s === "nao_confirmado") return;
        if (central.shared) {
          try {
            await central.changeStatus(id, s);
            toast.success("Status confirmado e auditado pela central");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Alteração não confirmada pela central.",
            );
          }
        } else {
          local.setStatus(id, s);
          toast.success("Status atualizado nesta estação");
        }
      }}
    />
  );

  return (
    <AppShell
      ambiente="Despacho Recife"
      actions={
        <>
          <Button
            variant="console"
            size="sm"
            onClick={() => setCenterRequest((value) => value + 1)}
            className="hidden xl:inline-flex"
          >
            <Crosshair /> Centralizar
          </Button>
          <Button
            variant="console"
            size="sm"
            onClick={() => setFoco((f) => !f)}
            className="hidden xl:inline-flex"
          >
            {foco ? <Minimize2 /> : <Maximize2 />}
            {foco ? "Sair do foco" : "Foco no mapa"}
          </Button>
        </>
      }
    >
      {central.shared && central.phase !== "ready" && (
        <div
          role="alert"
          className="absolute inset-x-0 top-0 z-[700] border-b border-busy bg-panel p-3 text-sm text-busy"
        >
          {central.error ||
            "Conecte um operador para confirmar a disponibilidade central. Abra Operador no cabeçalho."}
        </div>
      )}
      {storageError && (
        <div
          role="alert"
          className="absolute inset-x-0 top-0 z-[700] bg-off p-3 text-sm text-white"
        >
          Armazenamento indisponível: os status serão perdidos ao fechar esta página. Confirme pelo
          rádio.
        </div>
      )}
      <div className="flex h-full">
        <aside
          className={cn(
            "hidden w-[312px] shrink-0 border-r border-border bg-card xl:block",
            foco && "xl:hidden",
          )}
        >
          {consultaPanel}
        </aside>

        <section className="relative isolate min-w-0 flex-1 overflow-hidden">
          <DispatchMap
            bases={BASES}
            statuses={statuses}
            activeBaseId={activeId}
            occurrence={occurrence}
            route={route.kind === "ok" ? route.route.geometry : null}
            style={style}
            centerRequest={centerRequest}
          />

          <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex flex-wrap items-start gap-2">
            <div className={cn("pointer-events-auto flex gap-2", !foco && "xl:hidden")}>
              <Button variant="console" size="sm" onClick={() => setDrawer("consulta")}>
                <PanelLeft /> Consulta
              </Button>
              <Button variant="console" size="sm" onClick={() => setDrawer("bases")}>
                <Building2 /> Bases
              </Button>
            </div>
            <div className="pointer-events-auto ml-auto">
              <MapStyleSwitch value={style} onChange={setStyle} />
            </div>
          </div>

          {route.kind === "error" && (
            <div className="absolute left-1/2 top-16 z-[500] flex -translate-x-1/2 items-center gap-2 rounded-md border border-off/50 bg-panel px-3 py-2 text-xs text-off shadow-panel backdrop-blur">
              <AlertTriangle className="size-4" /> {route.message}
            </div>
          )}

          <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap items-center gap-3 rounded-md border border-border bg-panel px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground shadow-panel backdrop-blur">
            <Legend className="bg-primary rounded-full" label="Ocorrência" />
            <Legend className="bg-route" label="Indicada / rota" />
            <Legend className="border-2 border-ok" label="Disponível" />
            <Legend className="border-2 border-off" label="Sem viatura" />
          </div>
        </section>

        <aside
          className={cn(
            "hidden w-[320px] shrink-0 border-l border-border bg-card xl:block",
            foco && "xl:hidden",
          )}
        >
          {basesPanel}
        </aside>
      </div>

      <Sheet open={drawer !== null} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent
          side={drawer === "bases" ? "right" : "left"}
          className="w-[92vw] max-w-[380px] border-border bg-card p-0"
        >
          <SheetTitle className="sr-only">{drawer === "bases" ? "Bases" : "Consulta"}</SheetTitle>
          {drawer === "consulta" ? consultaPanel : basesPanel}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-sm", className)} />
      {label}
    </span>
  );
}
