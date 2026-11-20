import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Map as MapIcon, Radio, ShieldAlert } from "lucide-react";
import heroImg from "@/assets/recife-noite.jpg";
import { SamuMark } from "@/components/samu/AppShell";
import { BASES, BAIRROS, MUNICIPIOS } from "@/lib/samu/data";
import { useClock } from "@/lib/samu/use-station";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Central SAMU 192 · Estação de despacho" },
      {
        name: "description",
        content:
          "Estação de apoio ao rádio-operador: cobertura, disponibilidade das bases e rotas até a ocorrência no Recife.",
      },
      { property: "og:title", content: "Central SAMU 192 · Estação de despacho" },
      {
        property: "og:description",
        content:
          "Cobertura, disponibilidade e rotas para o despacho do SAMU no Recife e na I Macrorregião.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const now = useClock();
  return (
    <div className="relative min-h-screen min-h-dvh overflow-hidden bg-rail">
      <img
        src={heroImg}
        alt="Recife à noite com uma ambulância cruzando a ponte"
        width={1920}
        height={1088}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-hero-fade" />
      <div className="absolute inset-0 bg-grid opacity-40" />

      <div className="relative z-10 flex min-h-screen min-h-dvh flex-col px-6 py-6 md:px-12">
        <header className="flex items-center gap-3">
          <SamuMark />
          <div>
            <div className="font-display text-xl font-bold uppercase leading-none">
              Central SAMU 192
            </div>
            <div className="label-caps mt-1">Recife · Pernambuco</div>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-1.5 backdrop-blur">
            <span className="size-2 animate-pulse rounded-full bg-ok" />
            <span className="font-mono text-sm tabular-nums">
              {now ? now.toLocaleTimeString("pt-BR", { timeZone: "America/Recife" }) : "--:--:--"}
            </span>
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center py-12">
          <div className="max-w-2xl animate-rise">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Estação de
              despacho
            </div>
            <h1 className="font-display text-6xl font-bold uppercase leading-[0.9] md:text-8xl">
              Cada minuto
              <br />
              <span className="text-primary">conta.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Base responsável, apoio e rota até a ocorrência em uma única tela. Escolha o ambiente
              de trabalho.
            </p>
          </div>

          <div className="mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
            <EnvCard
              to="/despacho"
              icon={Radio}
              index="01"
              title="Despacho Recife"
              text="Endereço, bairro, base responsável, apoio, disponibilidade e rota local."
              stat={`${BASES.length} bases · ${BAIRROS.length} bairros`}
              primary
            />
            <EnvCard
              to="/regional"
              icon={MapIcon}
              index="02"
              title="Apoio regional"
              text="I Macrorregião de Saúde: bases por proximidade até o município de destino."
              stat={`${MUNICIPIOS.length} municípios · GERES I, II, III e XII`}
            />
          </div>
        </div>

        <footer className="flex max-w-3xl gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="size-4 shrink-0 text-signal" />
          <p>
            Ferramenta de apoio com dados de demonstração. Cobertura, endereços e regras de
            contingência devem ser homologados pela coordenação/regulação do SAMU antes do uso
            operacional.
          </p>
        </footer>
      </div>
    </div>
  );
}

function EnvCard({
  to,
  icon: Icon,
  index,
  title,
  text,
  stat,
  primary,
}: {
  to: "/despacho" | "/regional";
  icon: typeof Radio;
  index: string;
  title: string;
  text: string;
  stat: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-xl border border-border bg-panel p-5 shadow-panel backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary data-[primary=true]:border-primary/50"
      data-primary={primary}
    >
      <div className="flex items-center justify-between">
        <div className="grid size-11 place-items-center rounded-md bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-5" />
        </div>
        <span className="font-mono text-xs text-muted-foreground">{index}</span>
      </div>
      <h2 className="mt-5 font-display text-3xl font-bold uppercase">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {stat}
        </span>
        <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
