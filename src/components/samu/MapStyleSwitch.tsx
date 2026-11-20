import { Layers } from "lucide-react";
import { MAP_STYLES, type MapStyle } from "./useLeafletMap";

export function MapStyleSwitch({
  value,
  onChange,
}: {
  value: MapStyle;
  onChange: (s: MapStyle) => void;
}) {
  return (
    <div className="flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-1 rounded-md border border-border bg-panel p-1 shadow-panel backdrop-blur">
      <Layers className="mx-1 size-3.5 shrink-0 text-muted-foreground sm:mx-1.5" />
      {(Object.keys(MAP_STYLES) as MapStyle[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          data-active={value === k}
          className="rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground sm:px-2.5 sm:text-[11px]"
        >
          {MAP_STYLES[k].label}
        </button>
      ))}
    </div>
  );
}
