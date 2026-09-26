import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { ToothChart } from "../components/ToothChart";
import { CasePanel } from "../components/CasePanel";
import { NewCaseForm } from "../components/NewCaseForm";
import { STAGE_LABELS, STAGE_ORDER } from "../domain/teeth";
import type { DentalCase, StageId } from "../types";

type Filter = "all" | StageId | "filled" | "rework";

export function LedgerView() {
  const { cases, ui, selectCase, resetDemo, clearAll, appointments } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [showNew, setShowNew] = useState(false);
  const [presetTooth, setPresetTooth] = useState<string | null>(null);
  const selected = cases.find((c) => c.id === ui.selectedCaseId) ?? null;

  const pendingAptCount = useMemo(
    () => appointments.filter((a) => a.status === "booked").length,
    [appointments],
  );

  const matches = (c: DentalCase): boolean => {
    if (filter === "all") return true;
    if (filter === "filled") return c.status === "filled";
    if (filter === "rework") return c.status === "rework";
    // 步骤筛选：停在该步骤（未完成且上一步完成）
    const idx = STAGE_ORDER.indexOf(filter as StageId);
    return (
      !c.stages[filter as StageId].completed &&
      (idx === 0 || c.stages[STAGE_ORDER[idx - 1]].completed)
    );
  };

  const filtered = cases.filter(matches);

  if (selected) {
    return (
      <div className="view">
        <CasePanel key={selected.id} dentalCase={selected} />
      </div>
    );
  }

  return (
    <div className="view ledger-view">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">逐牙治疗台账</p>
            <h2>点选牙位开始 / 继续治疗</h2>
          </div>
          <div className="head-buttons">
            <button className="primary-action" onClick={() => setShowNew((v) => !v)}>
              {showNew ? "收起新建" : "＋ 新建台账"}
            </button>
          </div>
        </div>
        {showNew && (
          <div className="new-case-wrap">
            <NewCaseForm
              key={presetTooth ?? "blank"}
              presetTooth={presetTooth}
              onDone={() => setShowNew(false)}
            />
          </div>
        )}
        <ToothChart
          cases={cases}
          selectedId={ui.selectedCaseId}
          onSelect={(toothNumber, caseId) => {
            if (caseId) {
              selectCase(caseId);
            } else {
              setPresetTooth(toothNumber);
              setShowNew(true);
            }
          }}
        />
        <p className="field-hint">
          共 {cases.length} 份台账 · 已排复诊 {pendingAptCount} 次。治疗须按 开髓→测长→预备→冲洗→封药→充填 顺序推进，未完成上一步不能进入下一步。
        </p>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">病例列表</p>
            <h2>治疗中病例</h2>
          </div>
          <div className="filter-chips">
            <FilterChip label="全部" active={filter === "all"} onClick={() => setFilter("all")} />
            {STAGE_ORDER.map((s) => (
              <FilterChip
                key={s}
                label={`待${STAGE_LABELS[s]}`}
                active={filter === s}
                onClick={() => setFilter(s)}
              />
            ))}
            <FilterChip label="已充填" active={filter === "filled"} onClick={() => setFilter("filled")} />
            <FilterChip label="返修" active={filter === "rework"} onClick={() => setFilter("rework")} />
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="field-hint">没有符合筛选条件的病例</p>
        ) : (
          <div className="case-cards">
            {filtered.map((c) => (
              <CaseCard key={c.id} dentalCase={c} onOpen={() => selectCase(c.id)} />
            ))}
          </div>
        )}
      </section>

      <section className="panel data-tools">
        <p className="eyebrow">数据</p>
        <p className="field-hint">
          台账、排班与页面状态分别保存在本机浏览器，关闭后重开自动恢复到上次查看的牙位。
        </p>
        <div className="head-buttons">
          <button
            onClick={() => {
              if (window.confirm("恢复为初始示例数据？当前修改将被覆盖。")) resetDemo();
            }}
          >
            恢复示例数据
          </button>
          <button
            className="link-danger"
            onClick={() => {
              if (window.confirm("清空全部台账与复诊记录？此操作不可恢复。")) clearAll();
            }}
          >
            清空全部数据
          </button>
        </div>
      </section>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={active ? "chip active" : "chip"} onClick={onClick}>
      {label}
    </button>
  );
}

function CaseCard({
  dentalCase,
  onOpen,
}: {
  dentalCase: DentalCase;
  onOpen: () => void;
}) {
  const cur = STAGE_ORDER.find((s) => !dentalCase.stages[s].completed);
  const lengths = dentalCase.canals
    .map((c) => `${c.name} ${c.workingLength === null ? "—" : c.workingLength}`)
    .join("　");
  return (
    <article className={`case-card status-${dentalCase.status}`} onClick={onOpen}>
      <div className="case-card-top">
        <strong>#{dentalCase.toothNumber}</strong>
        {dentalCase.status === "filled" ? (
          <span className="badge badge-filled">已充填</span>
        ) : dentalCase.status === "rework" ? (
          <span className="badge badge-rework">返修中</span>
        ) : (
          <span className="badge badge-active">待{cur ? STAGE_LABELS[cur] : "完成"}</span>
        )}
      </div>
      <p className="case-card-name">{dentalCase.patientName} · {dentalCase.diagnosis || "未填诊断"}</p>
      <p className="case-card-lengths">{lengths}</p>
      <p className="case-card-open">打开台账 →</p>
    </article>
  );
}
