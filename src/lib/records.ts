import type { Appointment, LedgerData, StepId, ToothRecord } from "./types";
import { completeStep, createToothRecord, newId, toLocalInputValue } from "./treatment";

const STORAGE_KEY = "hxwl04.ledger.v1";
export const LEDGER_VERSION = 1;

export function loadLedger(): LedgerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LedgerData;
      if (
        parsed &&
        parsed.version === LEDGER_VERSION &&
        parsed.teeth &&
        Array.isArray(parsed.appointments)
      ) {
        return parsed;
      }
    }
  } catch {
    // 数据损坏时回退到示例台账
  }
  const seeded = seedLedger();
  saveLedger(seeded);
  return seeded;
}

export function saveLedger(data: LedgerData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 存储不可用（如隐私模式）时仅保留内存状态
  }
}

function runSteps(record: ToothRecord, ids: StepId[], at: string): ToothRecord {
  return ids.reduce((rec, id) => completeStep(rec, id, at), record);
}

function withLengths(record: ToothRecord, lengths: Array<number | null>): ToothRecord {
  return {
    ...record,
    canals: record.canals.map((c, i) => ({ ...c, lengthMm: lengths[i] ?? null })),
  };
}

/** 首次打开时的示例台账（来自原示例清单的三颗牙） */
export function seedLedger(now: Date = new Date()): LedgerData {
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
  const inDays = (n: number, h: number, m: number) => {
    const d = new Date(now.getTime() + n * 86_400_000);
    d.setHours(h, m, 0, 0);
    return toLocalInputValue(d);
  };

  let t36 = createToothRecord("36", daysAgo(12));
  t36 = { ...t36, diagnosis: "慢性根尖周炎" };
  t36 = withLengths(t36, [19.5, 20.0, 20.5]);
  t36 = runSteps(t36, ["access", "length", "prep", "irrigation", "medication"], daysAgo(2));

  let t11 = createToothRecord("11", daysAgo(30));
  t11 = { ...t11, diagnosis: "外伤后变色" };
  t11 = withLengths(t11, [22.0]);
  t11 = runSteps(
    t11,
    ["access", "length", "prep", "irrigation", "medication", "obturation"],
    daysAgo(7)
  );

  let t46 = createToothRecord("46", daysAgo(3));
  t46 = { ...t46, diagnosis: "急性牙髓炎" };
  t46 = withLengths(t46, [18.5, 19.0, null]);
  t46 = runSteps(t46, ["access"], daysAgo(3));

  const appointments: Appointment[] = [
    {
      id: newId(),
      tooth: "46",
      chair: "2号椅",
      start: inDays(2, 9, 0),
      note: "继续测长（远中根管）后预备",
      createdAt: now.toISOString(),
    },
    {
      id: newId(),
      tooth: "36",
      chair: "2号椅",
      start: inDays(2, 10, 30),
      note: "封药后复查，准备充填",
      createdAt: now.toISOString(),
    },
    {
      id: newId(),
      tooth: "11",
      chair: "1号椅",
      start: inDays(5, 14, 0),
      note: "充填后复查",
      createdAt: now.toISOString(),
    },
  ];

  return {
    version: LEDGER_VERSION,
    teeth: { "11": t11, "36": t36, "46": t46 },
    appointments,
  };
}
