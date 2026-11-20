import type { LatLng } from "./data";
export function isLatLng(value: unknown): value is LatLng {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    Math.abs(value[0]) <= 90 &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1]) &&
    Math.abs(value[1]) <= 180
  );
}
