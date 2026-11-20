import { useCallback, useEffect, useRef, useState } from "react";
import type { BaseStatus } from "./data";
import type { StatusMap } from "./dispatch";

const KEY = "samu.status.v1";
const VALID_STATUS = new Set<BaseStatus>(["disponivel", "sem_viatura"]);

/** Status salvo só nesta estação (navegador). Não sincroniza com outros operadores. */
export function useBaseStatuses() {
  const [storageError, setStorageError] = useState(false);
  const [ready, setReady] = useState(false);
  const [statuses, setStatuses] = useState<StatusMap>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, unknown>;
        const next = Object.fromEntries(
          Object.entries(saved).filter(([, status]) => VALID_STATUS.has(status as BaseStatus)),
        ) as StatusMap;
        setStatuses(next);
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);

  const setStatus = useCallback((id: string, status: BaseStatus) => {
    setStatuses((prev) => ({ ...prev, [id]: status }));
  }, []);

  useEffect(() => {
    const receive = (event: StorageEvent) => {
      if (event.key !== KEY) return;
      try {
        const saved = JSON.parse(event.newValue || "{}");
        setStatuses(
          Object.fromEntries(
            Object.entries(saved ?? {}).filter(([, status]) =>
              VALID_STATUS.has(status as BaseStatus),
            ),
          ) as StatusMap,
        );
      } catch {
        /* Preserva o estado em memória. */
      }
    };
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(statuses));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [statuses, ready]);

  return { statuses, setStatus, storageError };
}

/** Mantém a consulta ao trocar de ambiente (sessão desta aba). */
export function useSessionState<T>(
  key: string,
  initial: T,
  validate?: (value: unknown) => value is T,
) {
  const defaults = useRef({ initial, validate });
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const { initial, validate } = defaults.current;
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (validate ? validate(saved) : typeof saved === typeof initial && saved !== null)
          setValue(saved as T);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (ready) {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* Continua em memória. */
      }
    }
  }, [key, value, ready]);
  return [value, setValue] as const;
}

export function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export const STATUS_LABEL: Record<BaseStatus, string> = {
  disponivel: "Disponível",
  sem_viatura: "Sem viatura",
  nao_confirmado: "Não confirmado",
};

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
