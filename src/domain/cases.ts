import type {
  Canal,
  DentalCase,
  HistoryEntry,
  StageId,
  StageStatus,
} from "../types";
import { STAGE_ORDER, defaultCanalsFor } from "./teeth";

let seq = 0;
export function uid(prefix = "id"): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function now(): string {
  return new Date().toISOString();
}

function emptyStages(): Record<StageId, StageStatus> {
  return STAGE_ORDER.reduce(
    (acc, id) => {
      acc[id] = { completed: false, completedAt: null, note: "" };
      return acc;
    },
    {} as Record<StageId, StageStatus>,
  );
}

export function createCase(
  toothNumber: string,
  patientName: string,
  diagnosis: string,
): DentalCase {
  const ts = now();
  const canals: Canal[] = defaultCanalsFor(toothNumber).map((name) => ({
    id: uid("canal"),
    name,
    workingLength: null,
    updatedAt: null,
  }));
  return {
    id: uid("case"),
    toothNumber,
    patientName: patientName.trim(),
    diagnosis: diagnosis.trim(),
    canals,
    stages: emptyStages(),
    status: "active",
    reworkReasons: [],
    history: [{ id: uid("h"), at: ts, message: `建立 ${toothNumber} 治疗台账` }],
    createdAt: ts,
    updatedAt: ts,
  };
}

function pushHistory(c: DentalCase, message: string): void {
  const entry: HistoryEntry = { id: uid("h"), at: now(), message };
  c.history = [entry, ...c.history].slice(0, 200);
}

/** 工作长度合法范围（mm） */
export function isValidLength(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= 40;
}

/** 测长是否完成：每根根管都有有效工作长度 */
export function allCanalsMeasured(c: DentalCase): boolean {
  return c.canals.length > 0 && c.canals.every((x) => x.workingLength !== null);
}

/** 步骤是否可操作（上一步必须已完成；第一步总是可操作） */
export function canReachStage(c: DentalCase, stage: StageId): boolean {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === 0) return true;
  return c.stages[STAGE_ORDER[idx - 1]].completed;
}

/** 当前应进行的步骤（第一个未完成步骤） */
export function currentStage(c: DentalCase): StageId {
  return STAGE_ORDER.find((s) => !c.stages[s].completed) ?? "fill";
}

/**
 * 尝试完成某步骤，返回错误信息；null 表示成功。
 * 未完成上一步不能进入下一步。
 */
export function completeStage(
  c: DentalCase,
  stage: StageId,
  note: string,
): string | null {
  if (c.status === "filled") return "该牙已充填锁定，须填写返修原因重新打开";
  if (!canReachStage(c, stage)) {
    const idx = STAGE_ORDER.indexOf(stage);
    return `请先完成上一步：${stageLabel(STAGE_ORDER[idx - 1])}`;
  }
  if (stage === "measure" && !allCanalsMeasured(c)) {
    const missing = c.canals
      .filter((x) => x.workingLength === null)
      .map((x) => x.name)
      .join("、");
    return `以下根管尚未保存工作长度：${missing}`;
  }
  const st = c.stages[stage];
  const wasCompleted = st.completed;
  st.completed = true;
  st.completedAt = st.completedAt ?? now();
  st.note = note.trim();
  if (!wasCompleted) pushHistory(c, `完成【${stageLabel(stage)}】`);
  if (stage === "fill") {
    c.status = "filled";
    pushHistory(c, `${c.toothNumber} 根充完成，台账锁定`);
  }
  c.updatedAt = now();
  return null;
}

/** 仅允许撤销尚未被后续步骤依赖的步骤（撤销当前步骤或最后完成的步骤） */
export function canUncomplete(c: DentalCase, stage: StageId): boolean {
  if (c.status === "filled") return false;
  const idx = STAGE_ORDER.indexOf(stage);
  const next = STAGE_ORDER[idx + 1];
  return c.stages[stage].completed && (!next || !c.stages[next].completed);
}

export function uncompleteStage(c: DentalCase, stage: StageId): string | null {
  if (!canUncomplete(c, stage)) {
    return "后续步骤已完成，不能撤销该步骤";
  }
  const st = c.stages[stage];
  st.completed = false;
  st.completedAt = null;
  pushHistory(c, `退回【${stageLabel(stage)}】`);
  c.updatedAt = now();
  return null;
}

export function setStageNote(c: DentalCase, stage: StageId, note: string): void {
  c.stages[stage].note = note;
  c.updatedAt = now();
}

/** 保存单根根管的工作长度（每根独立保存） */
export function setCanalLength(
  c: DentalCase,
  canalId: string,
  value: number | null,
): string | null {
  if (c.status === "filled") return "已充填锁定，请先返修重开";
  if (value !== null && !isValidLength(value)) return "工作长度需在 0–40 mm 之间";
  const canal = c.canals.find((x) => x.id === canalId);
  if (!canal) return "根管不存在";
  canal.workingLength = value;
  canal.updatedAt = now();
  c.updatedAt = now();
  return null;
}

export function renameCanal(c: DentalCase, canalId: string, name: string): void {
  const canal = c.canals.find((x) => x.id === canalId);
  if (canal && name.trim()) {
    canal.name = name.trim();
    c.updatedAt = now();
  }
}

/** 充填前可增/减根管；充填后锁定 */
export function addCanal(c: DentalCase, name: string): string | null {
  if (c.status === "filled") return "已充填锁定，请先返修重开";
  if (c.canals.some((x) => x.name === name.trim())) return "根管名已存在";
  c.canals.push({
    id: uid("canal"),
    name: name.trim() || `根管${c.canals.length + 1}`,
    workingLength: null,
    updatedAt: null,
  });
  pushHistory(c, `新增根管：${name}`);
  c.updatedAt = now();
  return null;
}

export function removeCanal(c: DentalCase, canalId: string): string | null {
  if (c.status === "filled") return "已充填锁定，请先返修重开";
  if (c.canals.length <= 1) return "至少保留一根根管";
  const canal = c.canals.find((x) => x.id === canalId);
  c.canals = c.canals.filter((x) => x.id !== canalId);
  pushHistory(c, `删除根管：${canal?.name ?? ""}`);
  c.updatedAt = now();
  return null;
}

/**
 * 充填后重新打开：必须填写返修原因。
 * 只退回充填步骤，前面步骤保留，进入返修态。
 */
export function reopenForRework(c: DentalCase, reason: string): string | null {
  if (c.status !== "filled") return "仅已充填的病例需要返修重开";
  if (!reason.trim()) return "请先填写返修原因";
  c.stages.fill.completed = false;
  c.stages.fill.completedAt = null;
  c.status = "rework";
  c.reworkReasons.push({ id: uid("rw"), at: now(), reason: reason.trim() });
  pushHistory(c, `返修重开：${reason.trim()}`);
  c.updatedAt = now();
  return null;
}

export function stageLabel(stage: StageId): string {
  const map: Record<StageId, string> = {
    access: "开髓",
    measure: "测长",
    prepare: "预备",
    irrigate: "冲洗",
    medicate: "封药",
    fill: "充填",
  };
  return map[stage];
}

/** 测长步骤中未完成测长的根管数（用于门控提示） */
export function unmeasuredCount(c: DentalCase): number {
  return c.canals.filter((x) => x.workingLength === null).length;
}
