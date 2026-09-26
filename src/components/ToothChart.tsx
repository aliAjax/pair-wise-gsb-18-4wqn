import { LOWER_ARCH, UPPER_ARCH, toothLabel } from "../domain/teeth";
import type { CaseStatus, DentalCase } from "../types";

interface Props {
  cases: DentalCase[];
  selectedId: string | null;
  onSelect: (toothNumber: string, caseId: string | null) => void;
}

const STATUS_CLASS: Record<CaseStatus, string> = {
  active: "t-active",
  filled: "t-filled",
  rework: "t-rework",
};

function stageShort(c: DentalCase): string {
  const order = ["access", "measure", "prepare", "irrigate", "medicate", "fill"] as const;
  if (c.status === "filled") return "已充填";
  const first = order.find((s) => !c.stages[s].completed);
  const labels = ["开髓", "测长", "预备", "冲洗", "封药", "充填"] as const;
  return first ? `待${labels[order.indexOf(first)]}` : "已完成";
}

function ToothGrid({
  arch,
  caseByTooth,
  selectedId,
  onSelect,
}: {
  arch: typeof UPPER_ARCH;
  caseByTooth: Map<string, DentalCase>;
  selectedId: string | null;
  onSelect: Props["onSelect"];
}) {
  return (
    <div className="tooth-grid">
      {arch.map((t) => {
        const c = caseByTooth.get(t.number);
        const classes = ["tooth"];
        if (c) classes.push(STATUS_CLASS[c.status]);
        if (c && c.id === selectedId) classes.push("selected");
        return (
          <button
            key={t.number}
            type="button"
            className={classes.join(" ")}
            title={`${t.number} ${toothLabel(t.number)}${c ? ` · ${c.patientName} · ${stageShort(c)}` : ""}`}
            onClick={() => onSelect(t.number, c?.id ?? null)}
          >
            <strong>{t.number}</strong>
            {c && <em>{stageShort(c)}</em>}
          </button>
        );
      })}
    </div>
  );
}

export function ToothChart({ cases, selectedId, onSelect }: Props) {
  const caseByTooth = new Map<string, DentalCase>();
  for (const c of cases) caseByTooth.set(c.toothNumber, c);

  return (
    <div className="tooth-chart">
      <p className="arch-label">上颌（患者右侧 → 左侧）</p>
      <ToothGrid
        arch={UPPER_ARCH}
        caseByTooth={caseByTooth}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <div className="midline" />
      <ToothGrid
        arch={LOWER_ARCH}
        caseByTooth={caseByTooth}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <p className="arch-label">下颌</p>
      <div className="chart-legend">
        <span><i className="dot t-active" />治疗中</span>
        <span><i className="dot t-filled" />已充填</span>
        <span><i className="dot t-rework" />返修</span>
        <span className="hint">点击牙位建账或打开台账</span>
      </div>
    </div>
  );
}
