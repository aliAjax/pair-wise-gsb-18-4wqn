import type { LedgerData } from "../lib/types";
import { isObturated, progressLabel, QUADRANTS } from "../lib/treatment";

interface Props {
  data: LedgerData;
  onOpenTooth: (tooth: string) => void;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={tone} />
    </article>
  );
}

export default function ChartPage({ data, onOpenTooth }: Props) {
  const teeth = Object.values(data.teeth);
  const now = Date.now();
  const upcoming = data.appointments.filter((a) => new Date(a.start).getTime() >= now).length;
  const obturated = teeth.filter(isObturated).length;
  const medicated = teeth.filter((t) => t.steps.medication.done && !t.steps.obturation.done).length;
  const lengths = teeth
    .flatMap((t) => t.canals.map((c) => c.lengthMm))
    .filter((v): v is number => v !== null);
  const avgLength = lengths.length
    ? `${(lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1)} mm`
    : "—";

  return (
    <>
      <section className="metrics-grid">
        <Metric label="待复诊" value={String(upcoming)} tone="status-ok" />
        <Metric label="已充填" value={String(obturated)} tone="status-ok" />
        <Metric label="平均工作长度" value={avgLength} tone="status-watch" />
        <Metric label="封药病例" value={String(medicated)} tone="status-danger" />
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>牙位图 · FDI 记录法</p>
            <h2>点选牙位，进入该牙治疗台账</h2>
          </div>
          <div className="legend">
            <span>
              <i className="dot st-none" />
              未建档
            </span>
            <span>
              <i className="dot st-progress" />
              治疗中
            </span>
            <span>
              <i className="dot st-done" />
              已充填
            </span>
            <span>
              <i className="dot st-rework" />
              有返修记录
            </span>
          </div>
        </div>
        <div className="chart">
          {QUADRANTS.map((q) => (
            <div className="quadrant" key={q.label}>
              <span className="quadrant-label">{q.label}</span>
              <div className="teeth-row">
                {q.teeth.map((t) => {
                  const rec = data.teeth[t];
                  const cls = !rec ? "st-none" : isObturated(rec) ? "st-done" : "st-progress";
                  const label = progressLabel(rec);
                  return (
                    <button
                      key={t}
                      className={`tooth ${cls}`}
                      onClick={() => onOpenTooth(t)}
                      title={`#${t} · ${label}`}
                    >
                      {rec && rec.reworkLog.length > 0 && <i className="rework-dot" />}
                      <strong>{t}</strong>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
