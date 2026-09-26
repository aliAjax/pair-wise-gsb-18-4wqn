import { useState } from "react";
import { useStore } from "../state/store";
import { addCanal, isValidLength, removeCanal, setCanalLength } from "../domain/cases";
import type { DentalCase } from "../types";

/** 测长步骤：每根根管的工作长度独立录入、独立保存 */
export function CanalTable({ dentalCase }: { dentalCase: DentalCase }) {
  const { mutateCase, notify } = useStore();
  const [newName, setNewName] = useState("");
  const locked = dentalCase.status === "filled";
  const allowEditCanals = !dentalCase.stages.measure.completed && !locked;

  return (
    <div className="canal-table-wrap">
      <table className="canal-table">
        <thead>
          <tr>
            <th>根管</th>
            <th className="num-col">工作长度 (mm)</th>
            <th>状态</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {dentalCase.canals.map((canal) => (
            <CanalRow
              key={canal.id}
              dentalCase={dentalCase}
              canalId={canal.id}
              name={canal.name}
              value={canal.workingLength}
              allowEditCanals={allowEditCanals}
              onError={(msg) => notify("error", msg)}
              onSaved={(n, v) => notify("success", `${n} 长度已保存：${v} mm`)}
            />
          ))}
        </tbody>
      </table>

      {allowEditCanals && (
        <form
          className="add-canal"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (!name) return;
            const err = mutateCase(dentalCase.id, (c) => addCanal(c, name));
            if (err) notify("error", err);
            else setNewName("");
          }}
        >
          <input
            value={newName}
            placeholder="新增根管名（如 MB2、近舌）"
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit">添加根管</button>
        </form>
      )}
      {dentalCase.stages.measure.completed && (
        <p className="field-hint">测长已完成；如需更改根管构成，请先退回测长步骤。</p>
      )}
    </div>
  );
}

function CanalRow({
  dentalCase,
  canalId,
  name,
  value,
  allowEditCanals,
  onError,
  onSaved,
}: {
  dentalCase: DentalCase;
  canalId: string;
  name: string;
  value: number | null;
  allowEditCanals: boolean;
  onError: (msg: string) => void;
  onSaved: (name: string, v: number) => void;
}) {
  const { mutateCase } = useStore();
  const [text, setText] = useState(value === null ? "" : String(value));
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);

  const saveLength = () => {
    const trimmed = text.trim();
    if (trimmed === "") {
      const err = mutateCase(dentalCase.id, (c) => setCanalLength(c, canalId, null));
      if (err) onError(err);
      return;
    }
    const v = Number(trimmed);
    if (!isValidLength(v)) {
      onError("工作长度需在 0–40 mm 之间");
      return;
    }
    const err = mutateCase(dentalCase.id, (c) => setCanalLength(c, canalId, v));
    if (err) onError(err);
    else onSaved(name, v);
  };

  return (
    <tr className={value === null ? "unmeasured" : ""}>
      <td>
        {editingName && allowEditCanals ? (
          <input
            className="canal-name-input"
            value={nameDraft}
            autoFocus
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              mutateCase(dentalCase.id, (c) => {
                const canal = c.canals.find((x) => x.id === canalId);
                if (canal && nameDraft.trim()) canal.name = nameDraft.trim();
                return null;
              });
              setEditingName(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <button
            type="button"
            className="canal-name"
            disabled={!allowEditCanals}
            onClick={() => setEditingName(true)}
            title={allowEditCanals ? "点击改名" : undefined}
          >
            {name}
          </button>
        )}
      </td>
      <td className="num-col">
        <div className="length-input">
          <input
            inputMode="decimal"
            value={text}
            disabled={dentalCase.status === "filled"}
            placeholder="未测"
            onChange={(e) => setText(e.target.value)}
            onBlur={saveLength}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
          <span>mm</span>
        </div>
      </td>
      <td>
        {value === null ? (
          <span className="badge badge-warn">待测长</span>
        ) : (
          <span className="badge badge-ok">已保存 {value} mm</span>
        )}
      </td>
      <td className="row-action">
        {allowEditCanals && (
          <button
            type="button"
            className="link-danger"
            onClick={() => {
              if (!window.confirm(`删除根管「${name}」？`)) return;
              const err = mutateCase(dentalCase.id, (c) => removeCanal(c, canalId));
              if (err) onError(err);
            }}
          >
            删除
          </button>
        )}
      </td>
    </tr>
  );
}
