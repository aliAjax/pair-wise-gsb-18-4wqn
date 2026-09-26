import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { AppointmentForm } from "../components/AppointmentForm";
import { endTimeLabel, todayStr } from "../domain/schedule";

export function ScheduleView() {
  const { appointments, chairs, cases, cancelAppointment } = useStore();
  const [date, setDate] = useState(todayStr());

  const booked = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "booked")
        .sort((a, b) =>
          (a.date + a.startTime).localeCompare(b.date + b.startTime),
        ),
    [appointments],
  );

  const dayAppointments = booked
    .filter((a) => a.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const upcoming = booked.filter((a) => a.date >= todayStr());

  return (
    <div className="view schedule-view">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">复诊排班</p>
            <h2>安排复诊（固定占用诊椅 60 分钟）</h2>
          </div>
        </div>
        <AppointmentForm />
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">诊椅占用</p>
            <h2>当日诊椅时段</h2>
          </div>
          <label className="date-picker">
            <span>日期</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <div className="chair-grid">
          {chairs.map((chair) => {
            const list = dayAppointments.filter((a) => a.chairId === chair.id);
            return (
              <div key={chair.id} className="chair-col">
                <h3>{chair.name}</h3>
                {list.length === 0 ? (
                  <p className="field-hint">当日无预约</p>
                ) : (
                  <ul className="chair-slots">
                    {list.map((a) => {
                      const linked = cases.find((c) => c.id === a.caseId);
                      return (
                        <li key={a.id} className="slot">
                          <div className="slot-time">
                            {a.startTime}–{endTimeLabel(a.startTime, a.durationMin)}
                          </div>
                          <div className="slot-body">
                            <strong>{a.patientName}</strong>
                            {linked && <span className="slot-tooth">#{linked.toothNumber}</span>}
                            {a.note && <p>{a.note}</p>}
                            <button
                              className="link-danger"
                              onClick={() => {
                                if (window.confirm("取消该复诊并释放诊椅时段？"))
                                  cancelAppointment(a.id);
                              }}
                            >
                              取消
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">全部复诊</p>
            <h2>今起的复诊计划</h2>
          </div>
        </div>
        {upcoming.length === 0 ? (
          <p className="field-hint">暂无复诊安排</p>
        ) : (
          <table className="apt-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>时间</th>
                <th>诊椅</th>
                <th>患者</th>
                <th>牙位</th>
                <th>事项</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((a) => {
                const linked = cases.find((c) => c.id === a.caseId);
                return (
                  <tr key={a.id}>
                    <td>{a.date}</td>
                    <td>{a.startTime}–{endTimeLabel(a.startTime, a.durationMin)}</td>
                    <td>{chairs.find((c) => c.id === a.chairId)?.name}</td>
                    <td>{a.patientName}</td>
                    <td>{linked ? `#${linked.toothNumber}` : "—"}</td>
                    <td>{a.note || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
