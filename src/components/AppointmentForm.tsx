import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import {
  APPOINTMENT_DURATION_MIN,
  endTimeLabel,
  findConflict,
  todayStr,
} from "../domain/schedule";

interface Props {
  defaultCaseId?: string | null;
  defaultPatientName?: string;
  onBooked?: () => void;
  compact?: boolean;
}

const START_SLOTS = [
  "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

/** 复诊预约：选诊椅 + 日期 + 60 分钟时段；同一诊椅重叠当场提示并阻止提交 */
export function AppointmentForm({
  defaultCaseId = null,
  defaultPatientName = "",
  onBooked,
  compact = false,
}: Props) {
  const { chairs, cases, appointments, bookAppointment } = useStore();
  const [chairId, setChairId] = useState(chairs[0]?.id ?? "");
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("09:00");
  const [patientName, setPatientName] = useState(defaultPatientName);
  const [caseId, setCaseId] = useState(defaultCaseId ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const liveConflict = useMemo(
    () =>
      chairId && date && startTime
        ? findConflict(appointments, chairId, date, startTime)
        : { conflict: false },
    [appointments, chairId, date, startTime],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = bookAppointment({
      chairId,
      date,
      startTime,
      patientName,
      caseId: caseId || null,
      note,
    });
    if (!result.ok) {
      setError(result.error ?? "预约失败");
      return;
    }
    setNote("");
    onBooked?.();
  };

  return (
    <form className={`appointment-form ${compact ? "compact" : ""}`} onSubmit={submit}>
      <div className="form-row">
        <label>
          <span>诊椅</span>
          <select value={chairId} onChange={(e) => setChairId(e.target.value)}>
            {chairs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>复诊日期</span>
          <input
            type="date"
            value={date}
            min={todayStr()}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          <span>开始时间（固定 {APPOINTMENT_DURATION_MIN} 分钟）</span>
          <select value={startTime} onChange={(e) => setStartTime(e.target.value)}>
            {START_SLOTS.map((t) => (
              <option key={t} value={t}>{t} – {endTimeLabel(t, APPOINTMENT_DURATION_MIN)}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          <span>患者姓名</span>
          <input
            value={patientName}
            placeholder="患者姓名"
            onChange={(e) => setPatientName(e.target.value)}
          />
        </label>
        <label className="grow">
          <span>关联牙位台账（可空）</span>
          <select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            <option value="">不关联</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.toothNumber} {c.patientName} · {c.diagnosis || "未填诊断"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="full">
        <span>复诊处理事项</span>
        <input
          value={note}
          placeholder="如：去封、根充、继续预备"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {liveConflict.conflict && (
        <div className="conflict-box" role="alert">
          <strong>诊椅时段冲突</strong>
          <p>{liveConflict.message}</p>
        </div>
      )}
      {error && !liveConflict.conflict && (
        <div className="conflict-box" role="alert">
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        className="primary-action"
        disabled={liveConflict.conflict || !patientName.trim()}
        title={!patientName.trim() ? "请填写患者姓名" : undefined}
      >
        安排复诊（占用诊椅 60 分钟）
      </button>
    </form>
  );
}
