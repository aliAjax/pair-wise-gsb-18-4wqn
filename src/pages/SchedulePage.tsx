import { useMemo, useState } from "react";
import type { BookResult } from "../state/useLedger";
import type { Appointment } from "../lib/types";
import {
  CHAIRS,
  findConflicts,
  formatDateTime,
  formatTime,
  SLOT_MINUTES,
  slotEnd,
  slotEndIso,
  toLocalInputValue,
} from "../lib/treatment";

interface Props {
  appointments: Appointment[];
  teeth: string[];
  defaultTooth: string | null;
  onBook: (input: { tooth: string; chair: string; start: string; note: string }) => BookResult;
  onCancel: (id: string) => void;
  onOpenTooth: (tooth: string) => void;
}

export default function SchedulePage({
  appointments,
  teeth,
  defaultTooth,
  onBook,
  onCancel,
  onOpenTooth,
}: Props) {
  const today = toLocalInputValue(new Date()).slice(0, 10);
  const [tooth, setTooth] = useState(defaultTooth ?? teeth[0] ?? "");
  const [chair, setChair] = useState(CHAIRS[0]);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const startIso = date && time ? `${date}T${time}` : "";
  const conflicts = useMemo(
    () => (startIso ? findConflicts(appointments, { chair, start: startIso }) : []),
    [appointments, chair, startIso]
  );
  const inPast = startIso ? new Date(startIso).getTime() < Date.now() : false;
  const blocked = conflicts.length > 0 || inPast || !startIso || !tooth;

  const submit = () => {
    setSaved(false);
    if (!tooth) {
      setMsg("请选择牙位");
      return;
    }
    if (!startIso) {
      setMsg("请选择复诊日期和时间");
      return;
    }
    if (inPast) {
      setMsg("复诊时间不能早于当前时间");
      return;
    }
    const r = onBook({ tooth, chair, start: startIso, note: note.trim() });
    if (!r.ok) {
      setMsg(r.message);
      return;
    }
    setMsg(null);
    setNote("");
    setSaved(true);
  };

  const sorted = [...appointments].sort((a, b) => a.start.localeCompare(b.start));
  const upcoming = sorted.filter((a) => slotEnd(a.start) >= Date.now());
  const past = sorted.filter((a) => slotEnd(a.start) < Date.now()).reverse();

  const row = (a: Appointment, isPast: boolean) => (
    <div key={a.id} className={`appt-row ${isPast ? "past" : ""}`}>
      <strong>{formatDateTime(a.start)}</strong>
      <span>{a.chair}</span>
      <button className="link-btn" onClick={() => onOpenTooth(a.tooth)}>
        #{a.tooth}
      </button>
      <span className="hint">{a.note || "—"}</span>
      {!isPast && <button onClick={() => onCancel(a.id)}>取消</button>}
    </div>
  );

  return (
    <div className="two-col align-start">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p>安排复诊</p>
            <h2>每次复诊占用诊椅 {SLOT_MINUTES} 分钟</h2>
          </div>
        </div>
        {teeth.length === 0 && !defaultTooth ? (
          <p className="hint">还没有任何牙位建档，请先在牙位图中点选牙位。</p>
        ) : (
          <>
            <div className="appt-form">
              <label>
                <span>牙位</span>
                <select value={tooth} onChange={(e) => setTooth(e.target.value)}>
                  {teeth.map((t) => (
                    <option key={t} value={t}>
                      #{t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>诊椅</span>
                <select value={chair} onChange={(e) => setChair(e.target.value)}>
                  {CHAIRS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>日期</span>
                <input
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                <span>时间</span>
                <input
                  type="time"
                  step={900}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
              <label className="span-all">
                <span>备注</span>
                <input
                  value={note}
                  placeholder="如 封药后复查，准备充填"
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>

            {conflicts.length > 0 && (
              <div className="alert">
                <strong>时段冲突：</strong>
                {chair} 在该 {SLOT_MINUTES} 分钟时段内已有复诊——
                <ul>
                  {conflicts.map((c) => (
                    <li key={c.id}>
                      #{c.tooth} · {formatDateTime(c.start)} – {formatTime(slotEndIso(c.start))}
                    </li>
                  ))}
                </ul>
                请改换时间或诊椅，当前安排不会保存。
              </div>
            )}
            {inPast && conflicts.length === 0 && (
              <p className="alert">复诊时间不能早于当前时间。</p>
            )}
            {msg && <p className="alert">{msg}</p>}
            {saved && <p className="ok-msg">已保存复诊安排。</p>}

            <div className="row-actions">
              <button className="primary-action" disabled={blocked} onClick={submit}>
                保存复诊
              </button>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>复诊日程</p>
            <h2>待复诊 {upcoming.length} 条</h2>
          </div>
        </div>
        <div className="appt-list">
          {upcoming.length === 0 && <p className="hint">暂无待复诊安排。</p>}
          {upcoming.map((a) => row(a, false))}
        </div>
        {past.length > 0 && (
          <>
            <h3 className="subhead">已过期</h3>
            <div className="appt-list">{past.map((a) => row(a, true))}</div>
          </>
        )}
      </section>
    </div>
  );
}
