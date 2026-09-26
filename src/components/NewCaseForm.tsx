import { useState } from "react";
import { useStore } from "../state/store";
import { ALL_TEETH, toothLabel } from "../domain/teeth";

export function NewCaseForm({
  presetTooth,
  onDone,
}: {
  presetTooth?: string | null;
  onDone?: () => void;
}) {
  const { cases, createCase, notify } = useStore();
  const [toothNumber, setToothNumber] = useState(presetTooth ?? "");
  const [patientName, setPatientName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  const existing = toothNumber
    ? cases.find((c) => c.toothNumber === toothNumber)
    : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toothNumber) {
      notify("error", "请选择牙位");
      return;
    }
    if (existing) {
      notify("error", `#${toothNumber} 已有台账，请直接在牙位图上点击打开`);
      return;
    }
    if (!patientName.trim()) {
      notify("error", "请填写患者姓名");
      return;
    }
    createCase(toothNumber, patientName, diagnosis);
    notify("success", `#${toothNumber} 治疗台账已建立，从开髓开始推进`);
    onDone?.();
  };

  return (
    <form className="new-case-form" onSubmit={submit}>
      <label>
        <span>牙位（FDI）</span>
        <select
          value={toothNumber}
          onChange={(e) => setToothNumber(e.target.value)}
        >
          <option value="">请选择牙位</option>
          {ALL_TEETH.map((t) => (
            <option key={t.number} value={t.number}>
              {t.number} · {t.label}
            </option>
          ))}
        </select>
      </label>
      {toothNumber && <p className="field-hint">{toothLabel(toothNumber)}</p>}
      {existing && (
        <p className="conflict-box">该牙位已有台账（{existing.patientName}），将打开现有台账而非新建。</p>
      )}
      <label>
        <span>患者姓名 *</span>
        <input
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder="患者姓名"
        />
      </label>
      <label>
        <span>诊断</span>
        <input
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="如 急性牙髓炎、慢性根尖周炎"
        />
      </label>
      <button type="submit" className="primary-action">
        建立台账
      </button>
    </form>
  );
}
