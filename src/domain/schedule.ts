import type { Appointment, Chair } from "../types";
import { uid } from "./cases";

export const APPOINTMENT_DURATION_MIN = 60;

export function defaultChairs(): Chair[] {
  return [
    { id: "chair_1", name: "1号诊椅" },
    { id: "chair_2", name: "2号诊椅" },
    { id: "chair_3", name: "3号诊椅" },
  ];
}

/** HH:MM → 当日分钟数 */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

export interface ConflictResult {
  conflict: boolean;
  /** 与之冲突的已排复诊 */
  with?: Appointment;
  /** 给医生的当场说明 */
  message?: string;
}

/**
 * 检测同一诊椅、同一天、时段重叠（固定 60 分钟）。
 * 已取消的复诊不占椅。
 */
export function findConflict(
  appointments: Appointment[],
  chairId: string,
  date: string,
  startTime: string,
  durationMin: number = APPOINTMENT_DURATION_MIN,
  excludeId?: string,
): ConflictResult {
  const start = timeToMinutes(startTime);
  const end = start + durationMin;
  const hit = appointments.find((a) => {
    if (a.id === excludeId || a.status === "cancelled") return false;
    if (a.chairId !== chairId || a.date !== date) return false;
    return overlaps(
      start,
      end,
      timeToMinutes(a.startTime),
      timeToMinutes(a.startTime) + a.durationMin,
    );
  });
  if (!hit) return { conflict: false };
  const hitEnd = endTimeLabel(hit.startTime, hit.durationMin);
  return {
    conflict: true,
    with: hit,
    message: `冲突：该诊椅当日 ${hit.startTime}–${hitEnd} 已安排 ${hit.patientName || "患者"} 的复诊，60 分钟时段重叠，请更换诊椅或时间`,
  };
}

export function endTimeLabel(startTime: string, durationMin: number): string {
  const total = timeToMinutes(startTime) + durationMin;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function createAppointment(input: {
  chairId: string;
  date: string;
  startTime: string;
  patientName: string;
  caseId: string | null;
  note: string;
}): Appointment {
  return {
    id: uid("apt"),
    chairId: input.chairId,
    date: input.date,
    startTime: input.startTime,
    durationMin: APPOINTMENT_DURATION_MIN,
    patientName: input.patientName.trim(),
    caseId: input.caseId,
    note: input.note.trim(),
    status: "booked",
    createdAt: new Date().toISOString(),
  };
}

export function cancelAppointment(a: Appointment): void {
  a.status = "cancelled";
}

/** YYYY-MM-DD 本地日期 */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function isFutureOrToday(date: string): boolean {
  return date >= todayStr();
}
