import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import { RECIFE_CENTER, type Base, type LatLng } from "@/lib/samu/data";
import type { StatusMap } from "@/lib/samu/dispatch";
import { mapMotionDuration, useLeafletMap, type MapStyle } from "./useLeafletMap";

interface Props {
  bases: Base[];
  statuses: StatusMap;
  activeBaseId: string | null;
  occurrence: LatLng | null;
  route: LatLng[] | null;
  style: MapStyle;
  centerRequest?: number;
  onBaseClick?: (id: string) => void;
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

export function DispatchMap({
  bases,
  statuses,
  activeBaseId,
  occurrence,
  route,
  style,
  centerRequest = 0,
  onBaseClick,
}: Props) {
  const { containerRef, api, error } = useLeafletMap(RECIFE_CENTER, 12, style);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const clickRef = useRef(onBaseClick);
  clickRef.current = onBaseClick;

  useEffect(() => {
    if (!api) return;
    const { L, map } = api;
    layerRef.current?.remove();
    const group = L.layerGroup().addTo(map);
    layerRef.current = group;

    if (route && route.length > 1) {
      L.polyline(route, { className: "samu-route-halo", weight: 9, opacity: 0.9 }).addTo(group);
      L.polyline(route, { className: "samu-route", weight: 4.5, opacity: 1 }).addTo(group);
    }

    for (const b of bases) {
      const status = statuses[b.id] ?? "disponivel";
      const icon = L.divIcon({
        className: "",
        html: `<div class="samu-base" data-status="${status}" data-active="${b.id === activeBaseId}" aria-label="Base ${escapeHtml(b.nome)}"><span aria-hidden="true">✚</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      L.marker(b.pos, { icon, zIndexOffset: b.id === activeBaseId ? 1000 : 0 })
        .bindTooltip(
          `<strong>${escapeHtml(b.nome)}</strong><span>${escapeHtml(b.sigla)} · ${escapeHtml(b.viaturas)}</span>`,
          {
            className: "samu-tip samu-base-label",
            direction: b.id === "hmr" ? "left" : b.id === "central" ? "top" : "right",
            offset: b.id === "hmr" ? [-16, 0] : b.id === "central" ? [0, -16] : [16, 0],
            permanent: true,
            opacity: 1,
          },
        )
        .on("click", () => clickRef.current?.(b.id))
        .addTo(group);
    }

    if (occurrence) {
      const icon = L.divIcon({
        className: "",
        html: `<div class="samu-incident"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      L.marker(occurrence, { icon, zIndexOffset: 2000 })
        .bindTooltip("Ocorrência", { className: "samu-tip", direction: "top", offset: [0, -12] })
        .addTo(group);
    }
  }, [api, bases, statuses, activeBaseId, occurrence, route]);

  // Enquadramento: rota inteira, senão a ocorrência.
  useEffect(() => {
    if (!api) return;
    if (route && route.length > 1) {
      api.map.flyToBounds(api.L.latLngBounds(route), {
        padding: [70, 70],
        duration: mapMotionDuration(),
        maxZoom: 15,
      });
    } else if (occurrence) {
      api.map.flyTo(occurrence, 14, { duration: mapMotionDuration() });
    } else if (activeBaseId) {
      const base = bases.find((item) => item.id === activeBaseId);
      if (base) api.map.flyTo(base.pos, 14, { duration: mapMotionDuration() });
    }
  }, [api, route, occurrence, activeBaseId, bases]);

  useEffect(() => {
    if (!api || centerRequest === 0) return;
    api.map.flyTo(RECIFE_CENTER, 12, { duration: mapMotionDuration() });
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
