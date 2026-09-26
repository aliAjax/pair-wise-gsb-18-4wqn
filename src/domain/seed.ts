import type { Appointment, DentalCase } from "../types";
import { createCase } from "./cases";
import { STAGE_ORDER } from "./teeth";
import { createAppointment } from "./schedule";

/** 首次打开时写入的示例台账，替代原来的静态示例清单 */
export function seedCases(): DentalCase[] {
  // #36 急性牙髓炎：测长完成、预备中
  const c36 = createCase("36", "李伟", "急性牙髓炎");
  c36.canals = [
    { id: "seed_c1", name: "近颊", workingLength: 19.5, updatedAt: c36.createdAt },
    { id: "seed_c2", name: "近舌", workingLength: 19, updatedAt: c36.createdAt },
    { id: "seed_c3", name: "远中", workingLength: 21, updatedAt: c36.createdAt },
  ];
  c36.stages.access = { completed: true, completedAt: c36.createdAt, note: "局麻下开髓，揭全髓室顶" };
  c36.stages.measure = {
    completed: true,
    completedAt: c36.createdAt,
    note: "电测 + X线复核",
  };
  c36.stages.prepare.note = "ProTaper 预备至 F2";

  // #11 外伤后变色：已充填（锁定态）
  const c11 = createCase("11", "王芳", "外伤后变色");
  c11.canals = [
    { id: "seed_c4", name: "单根管", workingLength: 22, updatedAt: c11.createdAt },
  ];
  for (const s of STAGE_ORDER) {
    c11.stages[s] = { completed: true, completedAt: c11.createdAt, note: "" };
  }
  c11.stages.fill.note = "冷侧压充填，暂封；择期冠修复";
  c11.status = "filled";

  // #46 慢性根尖周炎：封药后待复诊
  const c46 = createCase("46", "赵敏", "慢性根尖周炎");
  c46.canals = [
    { id: "seed_c5", name: "近中", workingLength: 20, updatedAt: c46.createdAt },
    { id: "seed_c6", name: "远中", workingLength: 21.5, updatedAt: c46.createdAt },
  ];
  c46.stages.access = { completed: true, completedAt: c46.createdAt, note: "" };
  c46.stages.measure = { completed: true, completedAt: c46.createdAt, note: "" };
  c46.stages.prepare = { completed: true, completedAt: c46.createdAt, note: "主尖锉 #30" };
  c46.stages.irrigate = { completed: true, completedAt: c46.createdAt, note: "次氯酸钠 3% + 超声冲洗" };
  c46.stages.medicate = {
    completed: true,
    completedAt: c46.createdAt,
    note: "氢氧化钙封药，Caviton 暂封",
  };

  return [c36, c11, c46];
}

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function seedAppointments(cases: DentalCase[]): Appointment[] {
  const c36 = cases.find((c) => c.toothNumber === "36") ?? null;
  const c46 = cases.find((c) => c.toothNumber === "46") ?? null;
  return [
    createAppointment({
      chairId: "chair_1",
      date: dateOffset(1),
      startTime: "10:00",
      patientName: "赵敏",
      caseId: c46?.id ?? null,
      note: "46 去封、根充",
    }),
    createAppointment({
      chairId: "chair_1",
      date: dateOffset(2),
      startTime: "14:30",
      patientName: "李伟",
      caseId: c36?.id ?? null,
      note: "36 继续预备",
    }),
  ];
}
