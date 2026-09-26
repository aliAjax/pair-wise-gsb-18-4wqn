import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Appointment, DentalCase, UiState } from "../types";
import * as CaseDomain from "../domain/cases";
import {
  createAppointment,
  defaultChairs,
  findConflict,
} from "../domain/schedule";
import { seedAppointments, seedCases } from "../domain/seed";
import { clearAllStores, loadStore, saveStore } from "./storage";

interface RecordsState {
  cases: DentalCase[];
  seeded: boolean;
}

interface ScheduleState {
  appointments: Appointment[];
  seeded: boolean;
}

export interface Toast {
  id: string;
  type: "success" | "error";
  message: string;
}

interface StoreValue {
  cases: DentalCase[];
  chairs: ReturnType<typeof defaultChairs>;
  appointments: Appointment[];
  ui: UiState;
  toasts: Toast[];
  setView: (view: UiState["view"]) => void;
  selectCase: (id: string | null) => void;
  createCase: (
    toothNumber: string,
    patientName: string,
    diagnosis: string,
  ) => DentalCase;
  mutateCase: (
    id: string,
    fn: (c: DentalCase) => string | null,
    successMessage?: string,
  ) => string | null;
  deleteCase: (id: string) => void;
  bookAppointment: (input: {
    chairId: string;
    date: string;
    startTime: string;
    patientName: string;
    caseId: string | null;
    note: string;
  }) => { ok: boolean; error?: string };
  cancelAppointment: (id: string) => void;
  resetDemo: () => void;
  clearAll: () => void;
  notify: (type: Toast["type"], message: string) => void;
  dismissToast: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function clone<T>(v: T): T {
  return structuredClone(v);
}

const defaultUi: UiState = { view: "ledger", selectedCaseId: null };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<RecordsState>(() => {
    const loaded = loadStore<RecordsState>("records", { cases: [], seeded: false });
    if (!loaded.seeded || loaded.cases.length === 0) {
      const seededCases = seedCases();
      return { cases: seededCases, seeded: true };
    }
    return loaded;
  });

  const [schedule, setSchedule] = useState<ScheduleState>(() => {
    const loaded = loadStore<ScheduleState>("schedule", {
      appointments: [],
      seeded: false,
    });
    if (!loaded.seeded) {
      return {
        appointments: seedAppointments(records.cases),
        seeded: true,
      };
    }
    return loaded;
  });

  const [ui, setUi] = useState<UiState>(() =>
    loadStore<UiState>("ui", defaultUi),
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  // 最新数据的同步引用，供事件回调在 setState 前先跑领域校验
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const scheduleRef = useRef(schedule);
  scheduleRef.current = schedule;

  // 三类数据分别持久化
  useEffect(() => saveStore("records", records), [records]);
  useEffect(() => saveStore("schedule", schedule), [schedule]);
  useEffect(() => saveStore("ui", ui), [ui]);

  useEffect(
    () => () => timers.current.forEach((t) => window.clearTimeout(t)),
    [],
  );

  const notify = useCallback((type: Toast["type"], message: string) => {
    const id = CaseDomain.uid("toast");
    setToasts((ts) => [...ts, { id, type, message }]);
    const t = window.setTimeout(() => {
      setToasts((ts) => ts.filter((x) => x.id !== id));
    }, 3800);
    timers.current.push(t);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((ts) => ts.filter((x) => x.id !== id));
  }, []);

  const setView = useCallback((view: UiState["view"]) => {
    setUi((u) => ({ ...u, view }));
  }, []);

  const selectCase = useCallback((id: string | null) => {
    setUi((u) => ({ ...u, selectedCaseId: id }));
  }, []);

  const createCase = useCallback(
    (toothNumber: string, patientName: string, diagnosis: string) => {
      const c = CaseDomain.createCase(toothNumber, patientName, diagnosis);
      setRecords((r) => ({ ...r, cases: [c, ...r.cases] }));
      setUi((u) => ({ ...u, view: "ledger", selectedCaseId: c.id }));
      return c;
    },
    [],
  );

  const mutateCase = useCallback(
    (
      id: string,
      fn: (c: DentalCase) => string | null,
      successMessage?: string,
    ): string | null => {
      const next = clone(recordsRef.current);
      const c = next.cases.find((x) => x.id === id);
      if (!c) return "病例不存在";
      const error = fn(c);
      if (error) return error;
      setRecords(next);
      if (successMessage) notify("success", successMessage);
      return null;
    },
    [notify],
  );

  const deleteCase = useCallback(
    (id: string) => {
      setRecords((r) => ({ ...r, cases: r.cases.filter((c) => c.id !== id) }));
      setSchedule((s) => ({
        ...s,
        appointments: s.appointments.map((a) =>
          a.caseId === id ? { ...a, caseId: null } : a,
        ),
      }));
      setUi((u) => ({
        ...u,
        selectedCaseId: u.selectedCaseId === id ? null : u.selectedCaseId,
      }));
      notify("success", "台账已删除");
    },
    [notify],
  );

  const bookAppointment = useCallback(
    (input: {
      chairId: string;
      date: string;
      startTime: string;
      patientName: string;
      caseId: string | null;
      note: string;
    }): { ok: boolean; error?: string } => {
      if (!input.chairId) return { ok: false, error: "请选择诊椅" };
      if (!input.date || !input.startTime)
        return { ok: false, error: "请选择复诊日期与开始时间" };
      const result = findConflict(
        schedule.appointments,
        input.chairId,
        input.date,
        input.startTime,
      );
      if (result.conflict) {
        return { ok: false, error: result.message };
      }
      const apt = createAppointment(input);
      setSchedule((s) => ({ ...s, appointments: [apt, ...s.appointments] }));
      notify("success", "复诊已排入诊椅（60 分钟）");
      return { ok: true };
    },
    [schedule.appointments, notify],
  );

  const cancelAppointment = useCallback(
    (id: string) => {
      setSchedule((s) => ({
        ...s,
        appointments: s.appointments.map((a) =>
          a.id === id ? { ...a, status: "cancelled" as const } : a,
        ),
      }));
      notify("success", "复诊已取消，时段已释放");
    },
    [notify],
  );

  const resetDemo = useCallback(() => {
    clearAllStores();
    const cases = seedCases();
    setRecords({ cases, seeded: true });
    setSchedule({ appointments: seedAppointments(cases), seeded: true });
    setUi(defaultUi);
    notify("success", "已恢复示例数据");
  }, [notify]);

  const clearAll = useCallback(() => {
    clearAllStores();
    setRecords({ cases: [], seeded: true });
    setSchedule({ appointments: [], seeded: true });
    setUi(defaultUi);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      cases: records.cases,
      chairs: defaultChairs(),
      appointments: schedule.appointments,
      ui,
      toasts,
      setView,
      selectCase,
      createCase,
      mutateCase,
      deleteCase,
      bookAppointment,
      cancelAppointment,
      resetDemo,
      clearAll,
      notify,
      dismissToast,
    }),
    [
      records.cases,
      schedule.appointments,
      ui,
      toasts,
      setView,
      selectCase,
      createCase,
      mutateCase,
      deleteCase,
      bookAppointment,
      cancelAppointment,
      resetDemo,
      clearAll,
      notify,
      dismissToast,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore 必须在 StoreProvider 内使用");
  return ctx;
}
