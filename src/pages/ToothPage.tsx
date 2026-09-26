import { useEffect, useState } from "react";
import type { ActionResult } from "../state/useLedger";
import type { Appointment, Canal, StepId, ToothRecord } from "../lib/types";
import {
  canCompleteStep,
  currentStep,
  formatDateTime,
  isObturated,
  progressLabel,
  STEPS,
} from "../lib/treatment";

interface Props {
  tooth: string;
  record: ToothRecord;
  nextAppointment: Appointment | null;
  onBack: () => void;
  onDiagnosis: (text: string) => void;
  onSetCanalLength: (canalId: string, lengthMm: number | null) => void;
  onAddCanal: (name: string) => void;
  onRemoveCanal: (canalId: string) => void;
  onCompleteStep: (stepId: StepId) => ActionResult;
  onReopen: (reason: string) => ActionResult;
  onGotoSchedule: () => void;
}

function CanalRow({
  canal,
  editable,
  onCommit,
  onRemove,
}: {
  canal: Canal;
  editable: boolean;
  onCommit: (lengthMm: number | null) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(canal.lengthMm === null ? "" : String(canal.lengthMm));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(canal.lengthMm === null ? "" : String(canal.lengthMm));
  }, [canal.lengthMm]);

  const commit = () => {
    const text = draft.trim();
    if (text === "") {
      setError(null);
      onCommit(null);
      return;
    }
    const num = Number(text);
    if (!Number.isFinite(num) || num <= 0 || num > 40) {
      setError("需为 0–40 之间的数字");
      return;
    }
    setError(null);
    onCommit(Math.round(num * 10) / 10);
  };

  if (!editable) {
    return (
      <tr>
        <td>{canal.name}</td>
        <td>{canal.lengthMm === null ? "—" : `${canal.lengthMm} mm`}</td>
        <td />
      </tr>
    );
  }

  return (
    <tr>
      <td>{canal.name}</td>
      <td>
        <input
          className="length-input"
          type="text"
          inputMode="decimal"
          placeholder="如 19.5"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        {error && <span className="hint warn"> {error}</span>}
      </td>
      <td>
        <button className="link-btn" onClick={onRemove}>
          删除
        </button>
      </td>
    </tr>
  );
}

export default function ToothPage(props: Props) {
  const { tooth, record } = props;
  const cur = currentStep(record);
  const obturated = isObturated(record);
  const lengthLocked = record.steps.length.done;
  const [stepMsg, setStepMsg] = useState<string | null>(null);
  const [newCanal, setNewCanal] = useState("");
  const [reason, setReason] = useState("");
  const [reopenMsg, setReopenMsg] = useState<string | null>(null);

  return (
    <>
      <section className="panel tooth-head">
        <button onClick={props.onBack}>← 牙位图</button>
        <div className="tooth-title">
          <h2>#{tooth}</h2>
          <span className="badge">{progressLabel(record)}</span>
        </div>
        <label className="diagnosis">
          <span>诊断</span>
          <input
            value={record.diagnosis}
            placeholder="填写诊断，如 慢性根尖周炎"
            onChange={(e) => props.onDiagnosis(e.target.value)}
          />
        </label>
        <div className="next-appt">
          {props.nextAppointment ? (
            <span>
              下次复诊 {formatDateTime(props.nextAppointment.start)} · {props.nextAppointment.chair}
            </span>
          ) : (
            <span>暂无复诊安排</span>
          )}
          <button onClick={props.onGotoSchedule}>安排复诊</button>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p>治疗流程</p>
              <h2>按顺序推进，未完成上一步不能进入下一步</h2>
            </div>
          </div>
          <ol className="steps">
            {STEPS.map((s) => {
              const st = record.steps[s.id];
              const isCurrent = cur === s.id;
              const check = canCompleteStep(record, s.id);
              return (
                <li
                  key={s.id}
                  className={`step ${st.done ? "done" : isCurrent ? "current" : "locked"}`}
                >
                  <span className="step-marker">{st.done ? "✓" : isCurrent ? "●" : "○"}</span>
                  <div className="step-body">
                    <strong>{s.label}</strong>
                    {st.done && st.doneAt && (
                      <span className="hint">完成于 {formatDateTime(st.doneAt)}</span>
                    )}
                    {!st.done && isCurrent && !check.ok && (
                      <span className="hint warn">{check.reason}</span>
                    )}
                    {!st.done && !isCurrent && <span className="hint">完成上一步后解锁</span>}
                  </div>
                  {isCurrent && (
                    <button
                      className="primary-action"
                      disabled={!check.ok}
                      onClick={() => {
                        const r = props.onCompleteStep(s.id);
                        setStepMsg(r.ok ? null : r.message);
                      }}
                    >
                      完成「{s.label}」
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          {stepMsg && <p className="alert">{stepMsg}</p>}
          {obturated && (
            <p className="ok-msg">该牙已完成充填。如需返修，请在下方填写返修原因后重新打开。</p>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>根管工作长度</p>
              <h2>每根根管单独保存</h2>
            </div>
            {lengthLocked && <span className="badge">测长已完成 · 长度锁定</span>}
          </div>
          {record.canals.length === 0 ? (
            <p className="hint">尚未添加根管。</p>
          ) : (
            <table className="canal-table">
              <thead>
                <tr>
                  <th>根管</th>
                  <th>工作长度（mm）</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {record.canals.map((c) => (
                  <CanalRow
                    key={c.id}
                    canal={c}
                    editable={!lengthLocked}
                    onCommit={(v) => props.onSetCanalLength(c.id, v)}
                    onRemove={() => props.onRemoveCanal(c.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
          {!lengthLocked && (
            <>
              <p className="hint">填写后移开焦点或按回车即逐根保存。</p>
              <div className="add-canal">
                <input
                  value={newCanal}
                  placeholder="根管名，如 MB2"
                  onChange={(e) => setNewCanal(e.target.value)}
                />
                <button
                  onClick={() => {
                    const name = newCanal.trim();
                    if (name) {
                      props.onAddCanal(name);
                      setNewCanal("");
                    }
                  }}
                >
                  添加根管
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {obturated && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p>返修</p>
              <h2>充填后重新打开，必须填写返修原因</h2>
            </div>
          </div>
          <textarea
            rows={3}
            value={reason}
            placeholder="例如：充填后持续叩痛，需去除充填物重新封药"
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="row-actions">
            <button
              className="danger"
              disabled={!reason.trim()}
              onClick={() => {
                const r = props.onReopen(reason);
                setReopenMsg(r.ok ? null : r.message);
                if (r.ok) setReason("");
              }}
            >
              重新打开（回退封药与充填）
            </button>
          </div>
          {reopenMsg && <p className="alert">{reopenMsg}</p>}
          {record.reworkLog.length > 0 && (
            <>
              <h3 className="subhead">返修记录</h3>
              <ul className="rework-log">
                {record.reworkLog.map((e, i) => (
                  <li key={i}>
                    <strong>{formatDateTime(e.at)}</strong>　{e.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </>
  );
}
