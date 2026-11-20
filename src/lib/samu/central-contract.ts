import { BASES, type BaseStatus } from "./data";
export type ConfirmedStatus = Exclude<BaseStatus, "nao_confirmado">;
export type OperatorRole = "viewer" | "operator" | "supervisor";
export interface CentralRecord {
  base_id: string;
  status: BaseStatus;
  version: number;
  updated_at: string;
}
export interface Operator {
  id: string;
  name: string;
  role: OperatorRole;
}
export interface StationSnapshot {
  operator: Operator;
  bases: CentralRecord[];
  server_time: string;
}
export interface AuditEntry {
  id: string;
  base_id: string;
  previous_status: BaseStatus;
  current_status: ConfirmedStatus;
  changed_at: string;
  operator_name: string;
  station_id: string;
}
export function isStatus(value: unknown): value is BaseStatus {
  return ["disponivel", "sem_viatura", "nao_confirmado"].includes(String(value));
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Resposta central inválida.");
  return value as Record<string, unknown>;
};
function date(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
export function parseRecord(value: unknown): CentralRecord {
  const item = object(value);
  if (
    !BASES.some((b) => b.id === item["base_id"]) ||
    !isStatus(item["status"]) ||
    !Number.isSafeInteger(item["version"]) ||
    Number(item["version"]) < 0 ||
    !date(item["updated_at"])
  )
    throw new Error("Registro central inválido.");
  return item as unknown as CentralRecord;
}
export function parseSnapshot(value: unknown): StationSnapshot {
  const item = object(value),
    operator = object(item["operator"]);
  if (
    typeof operator["id"] !== "string" ||
    !operator["id"] ||
    typeof operator["name"] !== "string" ||
    !["viewer", "operator", "supervisor"].includes(String(operator["role"])) ||
    !Array.isArray(item["bases"]) ||
    !date(item["server_time"])
  )
    throw new Error("Operador ou snapshot central inválido.");
  const bases = item["bases"].map(parseRecord);
  if (bases.length !== BASES.length || new Set(bases.map((b) => b.base_id)).size !== BASES.length)
    throw new Error("A central não devolveu todas as bases.");
  return {
    operator: operator as unknown as Operator,
    bases,
    server_time: item["server_time"] as string,
  };
}
export function parseAudit(value: unknown): AuditEntry[] {
  if (!Array.isArray(value)) throw new Error("Histórico central inválido.");
  return value.map((raw) => {
    const item = object(raw);
    if (
      (typeof item["id"] !== "string" && typeof item["id"] !== "number") ||
      !BASES.some((b) => b.id === item["base_id"]) ||
      !isStatus(item["previous_status"]) ||
      !["disponivel", "sem_viatura"].includes(String(item["current_status"])) ||
      !date(item["changed_at"]) ||
      typeof item["operator_name"] !== "string" ||
      typeof item["station_id"] !== "string"
    )
      throw new Error("Evento de auditoria inválido.");
    return { ...item, id: String(item["id"]) } as unknown as AuditEntry;
  });
}
export function unknownStatuses(): Record<string, BaseStatus> {
  return Object.fromEntries(BASES.map((b) => [b.id, "nao_confirmado"]));
}
export function canWrite(role: OperatorRole | undefined) {
  return role === "operator" || role === "supervisor";
}
