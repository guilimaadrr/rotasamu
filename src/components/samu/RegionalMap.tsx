import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import { MACRO_CENTER, type Municipio } from "@/lib/samu/data";
import { mapMotionDuration, useLeafletMap, type MapStyle } from "./useLeafletMap";

interface Props {
  municipios: Municipio[];
  destino: Municipio | null;
  origem: Municipio | null;
  style: MapStyle;
  centerRequest?: number;
  onPick?: (nome: string) => void;
}

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#039;",
  '"': "&quot;",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => HTML_ENTITIES[char] ?? char);
}

export function RegionalMap({
  municipios,
  destino,
  origem,
  style,
  centerRequest = 0,
  onPick,
}: Props) {
  const { containerRef, api, error } = useLeafletMap(MACRO_CENTER, 11, style);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!api) return;
    const { L, map } = api;
    layerRef.current?.remove();
    const group = L.layerGroup().addTo(map);
    layerRef.current = group;

    const origemPos = origem?.basePos ?? origem?.pos;
    if (destino && origemPos) {
      L.polyline([origemPos, destino.pos], {
        className: "samu-line",
        weight: 3,
        dashArray: "8 8",
      }).addTo(group);
    }

    for (const m of municipios) {
      if (m.base === "sem_terrestre" && destino?.nome !== m.nome) continue;
      const role = m.nome === destino?.nome ? "destino" : m.nome === origem?.nome ? "origem" : "";
      const size = role === "destino" ? 20 : role === "origem" ? 18 : 12;
      const markerPos = role === "origem" ? (m.basePos ?? m.pos) : m.pos;
      const tooltip =
        role === "origem"
          ? `Origem · ${m.nome}<span>${m.enderecoBase ? escapeHtml(m.enderecoBase) : "Referência municipal"}</span>`
          : role === "destino"
            ? `Destino · ${m.nome}<span>Referência municipal</span>`
            : `${m.nome}${m.base === "pendente" ? " · cadastro pendente" : ""}`;
      const icon = L.divIcon({
        className: "",
        html: `<div class="samu-muni" data-geres="${m.geres}" data-base="${m.base}" data-role="${role}" style="--coverage-color:${m.cobertura.color}"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      L.marker(markerPos, { icon, zIndexOffset: role ? 1000 : 0 })
        .bindTooltip(tooltip, {
          className: role ? "samu-tip samu-muni-label" : "samu-tip",
          direction: "top",
          offset: [0, role ? -12 : -8],
          permanent: !!role,
        })
        .on("click", () => pickRef.current?.(m.nome))
        .addTo(group);
    }
  }, [api, municipios, destino, origem]);

  useEffect(() => {
    if (!api) return;
    const origemPos = origem?.basePos ?? origem?.pos;
    if (destino && origemPos) {
      api.map.flyToBounds(api.L.latLngBounds([destino.pos, origemPos]), {
        padding: [110, 110],
        duration: mapMotionDuration(),
        maxZoom: 10,
      });
    } else if (destino) {
      api.map.flyTo(destino.pos, destino.base === "sem_terrestre" ? 10 : 9, {
        duration: mapMotionDuration(),
      });
    }
  }, [api, destino, origem]);

  useEffect(() => {
    if (!api || centerRequest === 0) return;
    api.map.flyTo(MACRO_CENTER, 11, { duration: mapMotionDuration() });
  }, [api, centerRequest]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      {error && (
        <div
          role="alert"
          className="absolute inset-x-3 top-24 z-[600] rounded-md border border-off bg-panel p-3 text-sm text-off"
        >
          {error}
        </div>
      )}
    </>
  );
}
