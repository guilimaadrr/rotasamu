import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { SupabaseClient, Session } from "@supabase/supabase-js";
import { centralMode, getCentralClient, readSnapshot, writeStatus, readAudit } from "./central-api";
import {
  canWrite,
  unknownStatuses,
  type StationSnapshot,
  type ConfirmedStatus,
  type AuditEntry,
} from "./central-contract";
export type CentralPhase = "local" | "connecting" | "login" | "ready" | "unavailable";
interface CentralState {
  shared: boolean;
  phase: CentralPhase;
  snapshot: StationSnapshot | null;
  email: string;
  error: string;
  pending: boolean;
  audit: AuditEntry[];
  auditError: string;
  lastSync: number;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  changeStatus: (id: string, status: ConfirmedStatus) => Promise<void>;
  loadAudit: () => Promise<void>;
}
const noop = async () => {};
const initial: CentralState = {
  shared: centralMode,
  phase: centralMode ? "connecting" : "local",
  snapshot: null,
  email: "",
  error: "",
  pending: false,
  audit: [],
  auditError: "",
  lastSync: 0,
  login: noop,
  logout: noop,
  refresh: noop,
  changeStatus: noop,
  loadAudit: noop,
};
const Context = createContext<CentralState>(initial);
export const useCentral = () => useContext(Context);
export function CentralProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial);
  const client = useRef<SupabaseClient | null>(null);
  const session = useRef<Session | null>(null);
  const snapshot = useRef<StationSnapshot | null>(null);
  const generation = useRef(0);
  const requests = useRef(new Set<AbortController>());
  const refreshing = useRef<Promise<void> | null>(null);
  const writing = useRef(false);
  const lastSync = useRef(0);
  const station = useRef("");
  function abortRequests() {
    for (const ctrl of requests.current) ctrl.abort();
    requests.current.clear();
    refreshing.current = null;
  }
  async function timed<T>(fn: (signal: AbortSignal) => Promise<T>) {
    const ctrl = new AbortController();
    requests.current.add(ctrl);
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      return await fn(ctrl.signal);
    } finally {
      clearTimeout(timer);
      requests.current.delete(ctrl);
    }
  }
  async function refresh() {
    if (!client.current || !session.current) return;
    if (refreshing.current) return refreshing.current;
    const epoch = generation.current;
    const task = (async () => {
      try {
        const next = await timed((signal) => readSnapshot(client.current!, signal));
        if (epoch !== generation.current) return;
        if (next.operator.id !== session.current?.user.id)
          throw new Error("A autorização não corresponde à sessão atual.");
        snapshot.current = next;
        lastSync.current = Date.now();
        setState((s) => ({
          ...s,
          phase: "ready",
          snapshot: next,
          error: "",
          lastSync: lastSync.current,
        }));
      } catch {
        if (epoch !== generation.current) return;
        snapshot.current = null;
        setState((s) => ({
          ...s,
          phase: "unavailable",
          snapshot: null,
          error:
            "A central não confirmou os status ou seu acesso. Atualize ou entre novamente. Confirme a disponibilidade pelo rádio.",
        }));
      }
    })();
    refreshing.current = task;
    try {
      await task;
    } finally {
      if (epoch === generation.current) refreshing.current = null;
    }
  }
  useEffect(() => {
    if (!centralMode) return;
    let disposed = false;
    let unsubscribe = () => {};
    try {
      station.current = localStorage.getItem("samu.station.id") || crypto.randomUUID();
      localStorage.setItem("samu.station.id", station.current);
    } catch {
      station.current = crypto.randomUUID();
    }
    getCentralClient()
      .then((api) => {
        if (disposed) return;
        client.current = api;
        const { data } = api.auth.onAuthStateChange((_event, next) => {
          generation.current++;
          abortRequests();
          session.current = next;
          snapshot.current = null;
          setState((s) => ({
            ...s,
            phase: next ? "connecting" : "login",
            email: next?.user.email || "",
            snapshot: null,
            audit: [],
            auditError: "",
            error: "",
            pending: false,
          }));
          // Supabase recommends keeping this auth callback synchronous.
          if (next)
            window.setTimeout(() => {
              if (!disposed) void refresh();
            }, 0);
        });
        unsubscribe = () => data.subscription.unsubscribe();
      })
      .catch(() => {
        if (!disposed)
          setState((s) => ({
            ...s,
            phase: "unavailable",
            error:
              "Configuração da central incompleta. Informe URL e chave publicável válidas e gere uma nova versão.",
          }));
      });
    const poll = window.setInterval(() => {
      void refresh();
    }, 15000);
    const freshness = window.setInterval(() => {
      if (snapshot.current && Date.now() - lastSync.current > 45000) {
        snapshot.current = null;
        setState((s) => ({
          ...s,
          phase: "unavailable",
          snapshot: null,
          error: "Status centrais desatualizados. Atualize antes de indicar uma base.",
        }));
      }
    }, 5000);
    const resume = () => {
      void refresh();
    };
    const offline = () => {
      generation.current++;
      abortRequests();
      snapshot.current = null;
      setState((s) => ({
        ...s,
        phase: session.current ? "unavailable" : "login",
        snapshot: null,
        pending: false,
        error: "Sem conexão com a central. Alterações centrais estão bloqueadas.",
      }));
    };
    window.addEventListener("online", resume);
    window.addEventListener("offline", offline);
    window.addEventListener("focus", resume);
    return () => {
      disposed = true;
      generation.current++;
      abortRequests();
      unsubscribe();
      window.clearInterval(poll);
      window.clearInterval(freshness);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", offline);
      window.removeEventListener("focus", resume);
      client.current = null;
      session.current = null;
      snapshot.current = null;
    };
    // Stable provider lifecycle: callbacks read current client/session through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function login(email: string, password: string) {
    const api = client.current;
    if (!api) throw new Error("Central não configurada.");
    const { error } = await api.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error("Acesso não autorizado. Confira as credenciais com a coordenação.");
  }
  async function logout() {
    generation.current++;
    abortRequests();
    session.current = null;
    snapshot.current = null;
    setState((s) => ({
      ...s,
      phase: "login",
      email: "",
      snapshot: null,
      audit: [],
      error: "",
      pending: false,
    }));
    const { error } = await client.current!.auth.signOut({ scope: "local" });
    if (error)
      throw new Error(
        "Acesso bloqueado nesta tela; não foi possível limpar a sessão. Feche esta aba antes de trocar de operador.",
      );
  }
  async function changeStatus(id: string, status: ConfirmedStatus) {
    const current = snapshot.current,
      api = client.current;
    if (
      !api ||
      !session.current ||
      !current ||
      Date.now() - lastSync.current > 45000 ||
      !canWrite(current.operator.role)
    )
      throw new Error("Seu acesso ou os status centrais não permitem esta alteração.");
    const record = current.bases.find((b) => b.base_id === id);
    if (!record || writing.current) throw new Error("Aguarde a confirmação da alteração anterior.");
    if (record.status === status) return;
    const epoch = generation.current;
    writing.current = true;
    setState((s) => ({ ...s, pending: true }));
    try {
      const saved = await timed((signal) =>
        writeStatus(api, id, status, record.version, crypto.randomUUID(), station.current, signal),
      );
      if (epoch !== generation.current)
        throw new Error("A sessão mudou durante a alteração. Confira o histórico.");
      if (saved.base_id !== id || saved.status !== status || saved.version <= record.version)
        throw new Error("A resposta central não confirmou a alteração solicitada.");
      // A fresh full snapshot, rather than a local optimistic write, remains authoritative.
      if (refreshing.current) await refreshing.current;
      await refresh();
    } catch (error) {
      if (epoch === generation.current) await refresh();
      throw error;
    } finally {
      writing.current = false;
      if (epoch === generation.current) setState((s) => ({ ...s, pending: false }));
    }
  }
  async function loadAudit() {
    if (!client.current || !session.current || !snapshot.current)
      throw new Error("Conecte um operador autorizado.");
    const epoch = generation.current;
    try {
      const audit = await timed((signal) => readAudit(client.current!, signal));
      if (epoch === generation.current) setState((s) => ({ ...s, audit, auditError: "" }));
    } catch {
      if (epoch === generation.current)
        setState((s) => ({
          ...s,
          audit: [],
          auditError: "Histórico indisponível ou acesso não autorizado.",
        }));
    }
  }
  return (
    <Context.Provider value={{ ...state, login, logout, refresh, changeStatus, loadAudit }}>
      {children}
    </Context.Provider>
  );
}
export function centralStatuses(state: Pick<CentralState, "phase" | "snapshot">) {
  return state.phase === "ready" && state.snapshot
    ? Object.fromEntries(state.snapshot.bases.map((b) => [b.base_id, b.status]))
    : unknownStatuses();
}
