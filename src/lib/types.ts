export type StepId =
  | "access"
  | "length"
  | "prep"
  | "irrigation"
  | "medication"
  | "obturation";

export interface StepState {
  done: boolean;
  doneAt: string | null;
}

export interface Canal {
  id: string;
  name: string;
  lengthMm: number | null;
}

export interface ReworkEntry {
  reason: string;
  at: string;
}

export interface ToothRecord {
  tooth: string;
  diagnosis: string;
  steps: Record<StepId, StepState>;
  canals: Canal[];
  reworkLog: ReworkEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  tooth: string;
  chair: string;
  start: string;
  note: string;
  createdAt: string;
}

export interface LedgerData {
  version: number;
  teeth: Record<string, ToothRecord>;
  appointments: Appointment[];
}
