// 领域模型：逐牙根管治疗台账

/** 治疗推进顺序：开髓 → 测长 → 预备 → 冲洗 → 封药 → 充填 */
export type StageId =
  | "access"
  | "measure"
  | "prepare"
  | "irrigate"
  | "medicate"
  | "fill";

/** 单根根管：工作长度按根管独立保存 */
export interface Canal {
  id: string;
  /** 根管名，如 MB / DB / P / 近中 / 远中 */
  name: string;
  /** 工作长度 mm，未测长为 null */
  workingLength: number | null;
  updatedAt: string | null;
}

/** 单个步骤的状态 */
export interface StageStatus {
  completed: boolean;
  completedAt: string | null;
  /** 步骤备注（开髓情况 / 主尖锉 / 冲洗液 / 封药 / 充填方式等） */
  note: string;
}

export interface HistoryEntry {
  id: string;
  at: string;
  message: string;
}

/** active 治疗中；filled 已充填（锁定）；rework 充填后返修重开 */
export type CaseStatus = "active" | "filled" | "rework";

export interface DentalCase {
  id: string;
  /** FDI 两位牙位，如 36、11 */
  toothNumber: string;
  patientName: string;
  diagnosis: string;
  canals: Canal[];
  stages: Record<StageId, StageStatus>;
  status: CaseStatus;
  /** 历次返修原因 */
  reworkReasons: { id: string; at: string; reason: string }[];
  history: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Chair {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  chairId: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM 开始时间 */
  startTime: string;
  /** 固定 60 分钟 */
  durationMin: number;
  patientName: string;
  /** 关联牙位病例，可空 */
  caseId: string | null;
  note: string;
  status: "booked" | "cancelled";
  createdAt: string;
}

/** 页面状态：关闭重开后恢复到上次查看位置 */
export interface UiState {
  view: "ledger" | "schedule";
  selectedCaseId: string | null;
}
