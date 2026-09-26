import type { Appointment, Canal, StepId, StepState, ToothRecord } from "./types";

/** 根管治疗固定步骤，顺序即流程：未完成上一步不能进入下一步 */
export const STEPS: ReadonlyArray<{ id: StepId; label: string }> = [
  { id: "access", label: "开髓" },
  { id: "length", label: "测长" },
  { id: "prep", label: "预备" },
  { id: "irrigation", label: "冲洗" },
  { id: "medication", label: "封药" },
  { id: "obturation", label: "充填" },
];

/** 诊椅资源 */
export const CHAIRS = ["1号椅", "2号椅", "3号椅", "4号椅"];

/** 每次复诊固定占用 60 分钟 */
export const SLOT_MINUTES = 60;

/** 返修重新打开时回退的步骤（保留开髓/测长/预备/冲洗与根管长度） */
export const REOPEN_RESET_STEPS: ReadonlyArray<StepId> = ["medication", "obturation"];

/** FDI 牙位，按临床视图排列（患者右侧在左） */
export const QUADRANTS: ReadonlyArray<{ label: string; teeth: string[] }> = [
  { label: "右上", teeth: ["18", "17", "16", "15", "14", "13", "12", "11"] },
  { label: "左上", teeth: ["21", "22", "23", "24", "25", "26", "27", "28"] },
  { label: "右下", teeth: ["48", "47", "46", "45", "44", "43", "42", "41"] },
  { label: "左下", teeth: ["31", "32", "33", "34", "35", "36", "37", "38"] },
];

export function emptySteps(): Record<StepId, StepState> {
  return {
    access: { done: false, doneAt: null },
    length: { done: false, doneAt: null },
    prep: { done: false, doneAt: null },
    irrigation: { done: false, doneAt: null },
    medication: { done: false, doneAt: null },
    obturation: { done: false, doneAt: null },
  };
}

/** 按牙位给出常见根管模板，可在台账中增删 */
export function defaultCanals(tooth: string): Canal[] {
  const quadrant = Number(tooth[0]);
  const n = Number(tooth[1]);
  const upper = quadrant === 1 || quadrant === 2;
  let names: string[];
  if (n >= 6) names = upper ? ["MB", "DB", "P"] : ["MB", "ML", "D"];
  else if (n >= 4) names = upper ? ["B", "P"] : ["C"];
  else names = ["C"];
  return names.map((name, i) => ({ id: `${name}-${i}`, name, lengthMm: null }));
}

export function createToothRecord(tooth: string, now: string): ToothRecord {
  return {
    tooth,
    diagnosis: "",
    steps: emptySteps(),
    canals: defaultCanals(tooth),
    reworkLog: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function stepIndex(id: StepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

/** 第一个未完成的步骤；全部完成返回 null */
export function currentStep(record: ToothRecord): StepId | null {
  for (const s of STEPS) {
    if (!record.steps[s.id].done) return s.id;
  }
  return null;
}

export function isObturated(record: ToothRecord): boolean {
  return record.steps.obturation.done;
}

export interface Check {
  ok: boolean;
  reason: string | null;
}

/** 顺序门禁：上一步未完成不能完成本步；测长要求每根根管都有长度 */
export function canCompleteStep(record: ToothRecord, stepId: StepId): Check {
  const idx = stepIndex(stepId);
  if (record.steps[stepId].done) return { ok: false, reason: "该步骤已完成" };
  if (idx > 0) {
    const prev = STEPS[idx - 1];
    if (!record.steps[prev.id].done) {
      return { ok: false, reason: `请先完成上一步「${prev.label}」` };
    }
  }
  if (stepId === "length") {
    if (record.canals.length === 0) return { ok: false, reason: "请先添加至少一根根管" };
    const missing = record.canals.filter((c) => c.lengthMm === null);
    if (missing.length > 0) {
      return {
        ok: false,
        reason: `还有 ${missing.length} 根根管未填写工作长度（${missing
          .map((c) => c.name)
          .join("、")}）`,
      };
    }
  }
  return { ok: true, reason: null };
}

export function completeStep(record: ToothRecord, stepId: StepId, now: string): ToothRecord {
  return {
    ...record,
    steps: { ...record.steps, [stepId]: { done: true, doneAt: now } },
    updatedAt: now,
  };
}

/** 仅已充填的牙位可返修，且必须填写返修原因 */
export function canReopen(record: ToothRecord, reason: string): Check {
  if (!isObturated(record)) return { ok: false, reason: "仅已充填的牙位需要重新打开" };
  if (!reason.trim()) return { ok: false, reason: "请填写返修原因" };
  return { ok: true, reason: null };
}

export function reopenTooth(record: ToothRecord, reason: string, now: string): ToothRecord {
  const steps = { ...record.steps };
  for (const id of REOPEN_RESET_STEPS) {
    steps[id] = { done: false, doneAt: null };
  }
  return {
    ...record,
    steps,
    reworkLog: [...record.reworkLog, { reason: reason.trim(), at: now }],
    updatedAt: now,
  };
}

export function progressLabel(record: ToothRecord | undefined): string {
  if (!record) return "未建档";
  const cur = currentStep(record);
  return cur ? `待${STEPS[stepIndex(cur)].label}` : "已充填";
}

export function slotEnd(startIso: string): number {
  return new Date(startIso).getTime() + SLOT_MINUTES * 60_000;
}

export function slotEndIso(startIso: string): string {
  return toLocalInputValue(new Date(slotEnd(startIso)));
}

/** 同一诊椅上 60 分钟时段重叠即冲突 */
export function findConflicts(
  appointments: Appointment[],
  candidate: { chair: string; start: string },
  excludeId?: string
): Appointment[] {
  const s = new Date(candidate.start).getTime();
  if (Number.isNaN(s)) return [];
  const e = s + SLOT_MINUTES * 60_000;
  return appointments.filter((a) => {
    if (a.chair !== candidate.chair || a.id === excludeId) return false;
    const as = new Date(a.start).getTime();
    return as < e && s < as + SLOT_MINUTES * 60_000;
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local 输入框使用的本地时间格式 */
export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
