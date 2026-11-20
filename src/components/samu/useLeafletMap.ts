import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { LatLng } from "@/lib/samu/data";

export type MapStyle = "claro" | "ruas" | "terreno" | "noturno";

export const MAP_STYLES: Record<
  MapStyle,
  { label: string; url: string; attribution: string; labels?: string }
> = {
  claro: {
    label: "Claro",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    labels:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri · HERE · OpenStreetMap",
  },
  ruas: {
    label: "Ruas",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap",
  },
  terreno: {
    label: "Terreno",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri · HERE · Garmin · OpenStreetMap",
  },
  noturno: {
    label: "Noturno",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    labels:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri · HERE · OpenStreetMap",
  },
};

/** Mantém a câmera acessível para estações que preferem reduzir movimento. */
export function mapMotionDuration() {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return 0;
  return 0.7;
}

/** Carrega o Leaflet só no navegador e cria o mapa uma vez. */
export function useLeafletMap(center: LatLng, zoom: number, style: MapStyle) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<{ L: typeof Leaflet; map: Leaflet.Map } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tileRef = useRef<Leaflet.LayerGroup | null>(null);

  useEffect(() => {
    let disposed = false;
    let map: Leaflet.Map | undefined;
    let observer: ResizeObserver | undefined;
    const element = containerRef.current;
    if (!element) return;

    const invalidate = () => {
      window.requestAnimationFrame(() => {
        if (!disposed) map?.invalidateSize();
      });
    };

    import("leaflet")
      .then((mod) => {
        const L =
          (mod as unknown as { default?: typeof Leaflet }).default ??
          (mod as unknown as typeof Leaflet);
        if (disposed) return;
        map = L.map(element, { zoomControl: false, attributionControl: true }).setView(
          center,
          zoom,
        );
        L.control.zoom({ position: "bottomright" }).addTo(map);
        const labelsPane = map.createPane("samu-labels");
        labelsPane.style.zIndex = "350";
        labelsPane.style.pointerEvents = "none";
        setApi({ L, map });
        invalidate();
      })
      .catch(() => {
        if (!disposed) setError("Não foi possível iniciar o mapa. Recarregue a página.");
      });

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(invalidate);
      observer.observe(element);
    } else {
      window.addEventListener("resize", invalidate);
    }

    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("resize", invalidate);
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!api) return;
    tileRef.current?.remove();
    setError(null);
    const s = MAP_STYLES[style];
    const group = api.L.layerGroup().addTo(api.map);
    const tiles = api.L.tileLayer(s.url, {
      attribution: s.attribution,
      maxZoom: 19,
      subdomains: "abc",
    }).addTo(group);
    let failed = false;
    tiles.on("loading", () => {
      failed = false;
    });
    tiles.on("tileerror", () => {
      failed = true;
      setError("Fundo do mapa indisponível. Confira a conexão ou escolha outro estilo.");
    });
    tiles.on("load", () => {
      if (!failed) setError(null);
    });
    if (s.labels) api.L.tileLayer(s.labels, { maxZoom: 19, pane: "samu-labels" }).addTo(group);
    tileRef.current = group;
    return () => {
      tiles.off();
      group.remove();
    };
  }, [api, style]);

  return { containerRef, api, error };
}
