import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import type { DentalCase, StageId } from "../types";
import { STAGE_HINTS, STAGE_LABELS, STAGE_ORDER, toothLabel } from "../domain/teeth";
import {
  allCanalsMeasured,
  canReachStage,
  canUncomplete,
  completeStage,
  currentStage,
  reopenForRework,
  uncompleteStage,
  unmeasuredCount,
} from "../domain/cases";
import { endTimeLabel } from "../domain/schedule";
import { StageStepper } from "./StageStepper";
import { CanalTable } from "./CanalTable";
import { AppointmentForm } from "./AppointmentForm";

const NOTE_PLACEHOLDER: Record<StageId, string> = {
  access: "开髓情况：麻醉、髓室顶、根管口…",
  measure: "测长方法与影像（每根根管长度在下表单独保存）",
  prepare: "主尖锉号、预备器械与顺序…",
  irrigate: "冲洗液、浓度、用量、超声…",
  medicate: "封药名称、暂封材料…",
  fill: "根充技术、主尖、封闭剂…",
};

export function CasePanel({ dentalCase }: { dentalCase: DentalCase }) {
  const { mutateCase, selectCase, deleteCase, notify, appointments, chairs } =
    useStore();
  const [activeStage, setActiveStage] = useState<StageId>(() =>
    currentStage(dentalCase),
  );
  const [notes, setNotes] = useState<Record<StageId, string>>(() =>
    STAGE_ORDER.reduce(
      (acc, s) => {
        acc[s] = dentalCase.stages[s].note;
        return acc;
      },
      {} as Record<StageId, string>,
    ),
  );
  const [reworkReason, setReworkReason] = useState("");
  const [showRework, setShowRework] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  const locked = dentalCase.status === "filled";
  const cur = currentStage(dentalCase);
  const stage = dentalCase.stages[activeStage];
  const reachable = canReachStage(dentalCase, activeStage);
  const caseAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.caseId === dentalCase.id)
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)),
    [appointments, dentalCase.id],
  );

  const doComplete = () => {
    const err = mutateCase(
      dentalCase.id,
      (c) => completeStage(c, activeStage, notes[activeStage] ?? ""),
      `【${STAGE_LABELS[activeStage]}】已完成`,
    );
    if (!err) {
      const idx = STAGE_ORDER.indexOf(activeStage);
      if (idx < STAGE_ORDER.length - 1) setActiveStage(STAGE_ORDER[idx + 1]);
    } else {
      notify("error", err);
    }
  };

  const doUncomplete = () => {
    const err = mutateCase(dentalCase.id, (c) =>
      uncompleteStage(c, activeStage),
    );
    if (err) notify("error", err);
  };

  const doRework = () => {
    const err = mutateCase(
      dentalCase.id,
      (c) => reopenForRework(c, reworkReason),
      "已按返修原因重新打开，可继续处理",
    );
    if (err) {
      notify("error", err);
    } else {
      setShowRework(false);
      setReworkReason("");
      setActiveStage("fill");
    }
  };

  const statusBadge =
    dentalCase.status === "filled" ? (
      <span className="badge badge-filled">已充填 · 锁定</span>
    ) : dentalCase.status === "rework" ? (
      <span className="badge badge-rework">返修中</span>
    ) : (
      <span className="badge badge-active">治疗中 · 当前：{STAGE_LABELS[cur]}</span>
    );

  return (
    <div className="case-panel">
      <header className="case-head">
        <div>
          <div className="case-title-row">
            <h2>
              <span className="tooth-number">#{dentalCase.toothNumber}</span>
              {toothLabel(dentalCase.toothNumber)}
            </h2>
            {statusBadge}
          </div>
          <p className="case-meta">
            患者：<strong>{dentalCase.patientName || "未填写"}</strong>
            <span className="divider">|</span>
            诊断：{dentalCase.diagnosis || "未填写"}
          </p>
        </div>
        <div className="case-head-actions">
          <button onClick={() => setShowBooking((v) => !v)}>
            {showBooking ? "收起预约" : "安排复诊"}
          </button>
          <button
            className="link-danger"
            onClick={() => {
              if (!window.confirm(`删除 #${dentalCase.toothNumber} 的治疗台账？此操作不可恢复。`))
                return;
              deleteCase(dentalCase.id);
            }}
          >
            删除台账
          </button>
          <button onClick={() => selectCase(null)}>返回牙位图</button>
        </div>
      </header>

      {showBooking && (
        <section className="inline-booking">
          <AppointmentForm
            defaultCaseId={dentalCase.id}
            defaultPatientName={dentalCase.patientName}
            compact
            onBooked={() => setShowBooking(false)}
          />
        </section>
      )}

      <StageStepper dentalCase={dentalCase} onJump={setActiveStage} />

      {/* 步骤工作区 */}
      <section className={`stage-card ${stage.completed ? "done" : ""}`}>
        <div className="stage-card-head">
          <h3>
            {STAGE_LABELS[activeStage]}
            {stage.completed && <span className="done-tag">已完成</span>}
          </h3>
          {!reachable && !stage.completed && (
            <span className="gate-hint">
              🔒 请先完成【{STAGE_LABELS[STAGE_ORDER[STAGE_ORDER.indexOf(activeStage) - 1]]}】
            </span>
          )}
        </div>
        <p className="stage-hint">{STAGE_HINTS[activeStage]}</p>

        {activeStage === "measure" && (
          <CanalTable dentalCase={dentalCase} />
        )}

        <label className="stage-note">
          <span>步骤记录</span>
          <textarea
            rows={2}
            value={notes[activeStage]}
            disabled={locked || !reachable}
            placeholder={NOTE_PLACEHOLDER[activeStage]}
            onChange={(e) => {
              const v = e.target.value;
              setNotes((n) => ({ ...n, [activeStage]: v }));
              mutateCase(dentalCase.id, (c) => {
                c.stages[activeStage].note = v;
                return null;
              });
            }}
          />
        </label>

        {!locked && (
          <div className="stage-actions">
            {!stage.completed ? (
              <button
                className="primary-action"
                disabled={!reachable}
                onClick={doComplete}
              >
                完成【{STAGE_LABELS[activeStage]}】，进入下一步
              </button>
            ) : canUncomplete(dentalCase, activeStage) ? (
              <button onClick={doUncomplete}>
                退回【{STAGE_LABELS[activeStage]}】
              </button>
            ) : (
              <span className="field-hint">后续步骤已完成，如需修改请从后往前退回</span>
            )}
            {activeStage === "measure" && !stage.completed && (
              <span className={`gate-hint ${allCanalsMeasured(dentalCase) ? "ok" : ""}`}>
                {allCanalsMeasured(dentalCase)
                  ? `全部 ${dentalCase.canals.length} 根根管长度已保存，可以完成测长`
                  : `还有 ${unmeasuredCount(dentalCase)} 根根管未保存长度`}
              </span>
            )}
          </div>
        )}
      </section>

      {/* 充填 / 返修控制 */}
      {activeStage === "fill" && (
        <section className="fill-box">
          {locked ? (
            <>
              <p>根充已完成，治疗记录已锁定，不能直接修改。若需重新打开处理，必须填写返修原因。</p>
              {!showRework ? (
                <button className="danger-action" onClick={() => setShowRework(true)}>
                  返修：重新打开该牙
                </button>
              ) : (
                <div className="rework-form">
                  <label>
                    <span>返修原因（必填）</span>
                    <textarea
                      rows={2}
                      autoFocus
                      value={reworkReason}
                      placeholder="如：冠部渗漏 / 再感染 / 根充欠填…"
                      onChange={(e) => setReworkReason(e.target.value)}
                    />
                  </label>
                  <div className="stage-actions">
                    <button
                      className="danger-action"
                      disabled={!reworkReason.trim()}
                      onClick={doRework}
                    >
                      确认返修重开
                    </button>
                    <button onClick={() => setShowRework(false)}>取消</button>
                  </div>
                </div>
              )}
              {dentalCase.reworkReasons.length > 0 && (
                <ul className="rework-list">
                  {dentalCase.reworkReasons.map((r) => (
                    <li key={r.id}>
                      <time>{new Date(r.at).toLocaleString("zh-CN")}</time>
                      {r.reason}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : dentalCase.status === "rework" ? (
            <p className="rework-banner">
              返修处理中：前序步骤记录已保留，完成充填后将再次锁定。
            </p>
          ) : null}
        </section>
      )}

      {/* 本牙复诊 */}
      <section className="case-appointments">
        <h3>本牙复诊安排</h3>
        {caseAppointments.length === 0 ? (
          <p className="field-hint">尚未安排复诊</p>
        ) : (
          <ul className="apt-mini-list">
            {caseAppointments.map((a) => {
              const chair = chairs.find((c) => c.id === a.chairId);
              return (
                <li key={a.id} className={a.status === "cancelled" ? "cancelled" : ""}>
                  <span className="apt-date">{a.date}</span>
                  <span>
                    {a.startTime}–{endTimeLabel(a.startTime, a.durationMin)}
                  </span>
                  <span>{chair?.name}</span>
                  <span className="apt-note">{a.note}</span>
                  {a.status === "cancelled" && <em className="cancelled-tag">已取消</em>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 操作历史 */}
      <section className="history-box">
        <h3>操作历史</h3>
        <ul>
          {dentalCase.history.map((h) => (
            <li key={h.id}>
              <time>{new Date(h.at).toLocaleString("zh-CN")}</time>
              {h.message}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
