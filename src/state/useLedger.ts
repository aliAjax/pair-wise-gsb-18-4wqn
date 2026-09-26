import { useEffect, useState } from "react";
import type { Appointment, LedgerData, StepId, ToothRecord } from "../lib/types";
import { loadLedger, saveLedger } from "../lib/records";
import {
  canCompleteStep,
  canReopen,
  completeStep,
  createToothRecord,
  findConflicts,
  newId,
  reopenTooth,
} from "../lib/treatment";

export type PageId = "chart" | "tooth" | "schedule";

const UI_KEY = "hxwl04.ui.v1";

interface UiState {
  page: PageId;
  tooth: string | null;
}

function loadUi(): UiState {
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UiState;
      if (
        parsed &&
        (parsed.page === "chart" || parsed.page === "tooth" || parsed.page === "schedule")
      ) {
        return { page: parsed.page, tooth: typeof parsed.tooth === "string" ? parsed.tooth : null };
      }
    }
  } catch {
    // 忽略损坏的界面状态
  }
  return { page: "chart", tooth: null };
}

export interface ActionResult {
  ok: boolean;
  message: string | null;
}

export interface BookResult extends ActionResult {
  conflicts: Appointment[];
}

/** 状态层：持有台账数据与界面位置，所有写操作都经过这里并即时持久化 */
export function useLedger() {
  const [data, setData] = useState<LedgerData>(loadLedger);
  const [ui, setUi] = useState<UiState>(loadUi);

  useEffect(() => {
    saveLedger(data);
  }, [data]);

  useEffect(() => {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify(ui));
    } catch {
      // 存储不可用时忽略
    }
  }, [ui]);

  const gotoPage = (page: PageId) => setUi((u) => ({ ...u, page }));

  const openTooth = (tooth: string) => {
    setData((d) =>
      d.teeth[tooth]
        ? d
        : {
            ...d,
            teeth: { ...d.teeth, [tooth]: createToothRecord(tooth, new Date().toISOString()) },
          }
    );
    setUi({ page: "tooth", tooth });
  };

  const updateTooth = (tooth: string, fn: (r: ToothRecord) => ToothRecord) =>
    setData((d) => {
      const rec = d.teeth[tooth];
      if (!rec) return d;
      return { ...d, teeth: { ...d.teeth, [tooth]: fn(rec) } };
    });

  const setDiagnosis = (tooth: string, diagnosis: string) =>
    updateTooth(tooth, (r) => ({ ...r, diagnosis, updatedAt: new Date().toISOString() }));

  const setCanalLength = (tooth: string, canalId: string, lengthMm: number | null) =>
    updateTooth(tooth, (r) => ({
      ...r,
      canals: r.canals.map((c) => (c.id === canalId ? { ...c, lengthMm } : c)),
      updatedAt: new Date().toISOString(),
    }));

  const addCanal = (tooth: string, name: string) =>
    updateTooth(tooth, (r) => ({
      ...r,
      canals: [...r.canals, { id: newId(), name, lengthMm: null }],
      updatedAt: new Date().toISOString(),
    }));

  const removeCanal = (tooth: string, canalId: string) =>
    updateTooth(tooth, (r) => ({
      ...r,
      canals: r.canals.filter((c) => c.id !== canalId),
      updatedAt: new Date().toISOString(),
    }));

  const doCompleteStep = (tooth: string, stepId: StepId): ActionResult => {
    const record = data.teeth[tooth];
    if (!record) return { ok: false, message: "未找到该牙位记录" };
    const check = canCompleteStep(record, stepId);
    if (!check.ok) return { ok: false, message: check.reason };
    const now = new Date().toISOString();
    updateTooth(tooth, (r) => completeStep(r, stepId, now));
    return { ok: true, message: null };
  };

  const doReopen = (tooth: string, reason: string): ActionResult => {
    const record = data.teeth[tooth];
    if (!record) return { ok: false, message: "未找到该牙位记录" };
    const check = canReopen(record, reason);
    if (!check.ok) return { ok: false, message: check.reason };
    const now = new Date().toISOString();
    updateTooth(tooth, (r) => reopenTooth(r, reason, now));
    return { ok: true, message: null };
  };

  const bookAppointment = (input: {
    tooth: string;
    chair: string;
    start: string;
    note: string;
  }): BookResult => {
    const conflicts = findConflicts(data.appointments, { chair: input.chair, start: input.start });
    if (conflicts.length > 0) {
      return { ok: false, conflicts, message: "该时段与现有复诊冲突，未保存" };
    }
    const appt: Appointment = { id: newId(), ...input, createdAt: new Date().toISOString() };
    setData((d) => ({ ...d, appointments: [...d.appointments, appt] }));
    return { ok: true, conflicts: [], message: null };
  };

  const cancelAppointment = (id: string) =>
    setData((d) => ({ ...d, appointments: d.appointments.filter((a) => a.id !== id) }));

  return {
    data,
    ui,
    gotoPage,
    openTooth,
    setDiagnosis,
    setCanalLength,
    addCanal,
    removeCanal,
    doCompleteStep,
    doReopen,
    bookAppointment,
    cancelAppointment,
  };
}
