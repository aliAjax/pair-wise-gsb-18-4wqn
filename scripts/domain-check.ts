import { assert } from "console";
import {
  addCanal,
  allCanalsMeasured,
  canReachStage,
  completeStage,
  createCase,
  currentStage,
  reopenForRework,
  setCanalLength,
  uncompleteStage,
} from "./src/domain/cases";
import {
  APPOINTMENT_DURATION_MIN,
  createAppointment,
  findConflict,
} from "./src/domain/schedule";

let pass = 0;
const ok = (cond: unknown, msg: string) => {
  assert(cond, msg);
  pass++;
};

// 1. 新建病例默认 36 有 3 根管，停在开髓
const c = createCase("36", "测试患者", "牙髓炎");
ok(c.canals.length === 3, "36 默认三根管");
ok(currentStage(c) === "access", "初始停在开髓");

// 2. 未完成开髓不能进入测长
ok(canReachStage(c, "measure") === false, "未开髓不能测长");
ok(!!completeStage(c, "measure", ""), "跳过开髓应报错");

// 3. 完成开髓
ok(completeStage(c, "access", "开髓") === null, "开髓成功");
ok(currentStage(c) === "measure", "进入测长");

// 4. 测长：根管长度独立保存，缺一根不能完成
ok(setCanalLength(c, c.canals[0].id, 19.5) === null, "保存第一根长度");
ok(allCanalsMeasured(c) === false, "还有根管未测");
ok(!!completeStage(c, "measure", ""), "未全部测长不能完成");
setCanalLength(c, c.canals[1].id, 19);
setCanalLength(c, c.canals[2].id, 21);
ok(allCanalsMeasured(c), "全部测长完成");
ok(completeStage(c, "measure", "电测") === null, "测长完成");

// 5. 顺序推进至封药
for (const s of ["prepare", "irrigate", "medicate"] as const) {
  ok(completeStage(c, s, s) === null, `${s} 完成`);
}
// 6. 不能跳过充填之前的步骤顺序：已充填锁定
ok(completeStage(c, "fill", "冷侧压") === null, "充填完成");
ok(c.status === "filled", "状态为已充填");
ok(!!completeStage(c, "access", "x"), "充填后不能改步骤");
ok(!!setCanalLength(c, c.canals[0].id, 20), "充填后不能改长度");
ok(!!addCanal(c, "MB2"), "充填后不能加根管");

// 7. 返修必须填原因
ok(!!reopenForRework(c, ""), "返修原因为空应拒绝");
ok(reopenForRework(c, "冠部渗漏") === null, "返修重开");
ok(c.status === "rework", "返修态");
ok(c.stages.fill.completed === false, "充填步骤退回");
ok(c.stages.access.completed === true, "前序步骤保留");
ok(c.reworkReasons.length === 1, "记录返修原因");
ok(completeStage(c, "fill", "再充填") === null, "返修后再次充填");
ok(c.status === "filled", "重新锁定");

// 8. 退回规则：后续完成时不能退
const c2 = createCase("11", "另一人", "");
completeStage(c2, "access", "");
ok(uncompleteStage(c2, "access") === null, "只完成一步时可退");
completeStage(c2, "access", "");
setCanalLength(c2, c2.canals[0].id, 22);
completeStage(c2, "measure", "");
ok(!!uncompleteStage(c2, "access"), "后续完成不能退开髓");
ok(uncompleteStage(c2, "measure") === null, "可退最后一步");

// 9. 长度校验
const c3 = createCase("11", "p", "");
ok(!!setCanalLength(c3, c3.canals[0].id, 0), "0mm 非法");
ok(!!setCanalLength(c3, c3.canals[0].id, 50), "50mm 非法");
ok(setCanalLength(c3, c3.canals[0].id, 22.5) === null, "22.5mm 合法");

// 10. 诊椅冲突：同日同椅 60 分钟重叠
const a1 = createAppointment({
  chairId: "chair_1",
  date: "2026-10-01",
  startTime: "10:00",
  patientName: "甲",
  caseId: null,
  note: "",
});
ok(APPOINTMENT_DURATION_MIN === 60, "固定 60 分钟");
const list = [a1];
ok(findConflict(list, "chair_1", "2026-10-01", "10:30").conflict, "重叠 10:30 冲突");
ok(findConflict(list, "chair_1", "2026-10-01", "11:00").conflict === false, "11:00 衔接不冲突");
ok(findConflict(list, "chair_1", "2026-10-01", "09:00").conflict === false, "09:00 不冲突");
ok(findConflict(list, "chair_2", "2026-10-01", "10:30").conflict === false, "不同诊椅不冲突");
ok(findConflict(list, "chair_1", "2026-10-02", "10:30").conflict === false, "不同日不冲突");
const msg = findConflict(list, "chair_1", "2026-10-01", "10:30").message;
ok(!!msg && msg.includes("甲"), "冲突说明包含患者信息");
// 取消后不再冲突
a1.status = "cancelled";
ok(findConflict([a1], "chair_1", "2026-10-01", "10:30").conflict === false, "取消后释放时段");

console.log(`全部 ${pass} 项领域规则断言通过 ✔`);
