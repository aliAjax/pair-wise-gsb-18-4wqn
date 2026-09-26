import { STAGE_LABELS, STAGE_ORDER } from "../domain/teeth";
import { canReachStage } from "../domain/cases";
import type { DentalCase, StageId } from "../types";

export function StageStepper({
  dentalCase,
  onJump,
}: {
  dentalCase: DentalCase;
  onJump: (stage: StageId) => void;
}) {
  const locked = dentalCase.status === "filled";
  return (
    <ol className={`stepper ${locked ? "locked" : ""}`}>
      {STAGE_ORDER.map((id, i) => {
        const s = dentalCase.stages[id];
        const reachable = canReachStage(dentalCase, id);
        const classes = ["step"];
        if (s.completed) classes.push("done");
        else if (reachable) classes.push("current");
        else classes.push("blocked");
        return (
          <li key={id} className={classes.join(" ")}>
            <button
              type="button"
              disabled={!reachable && !s.completed}
              onClick={() => onJump(id)}
              title={!reachable && !s.completed ? "未完成上一步" : STAGE_LABELS[id]}
            >
              <span className="step-index">
                {s.completed ? "✓" : reachable ? i + 1 : "🔒"}
              </span>
              <span className="step-name">{STAGE_LABELS[id]}</span>
            </button>
            {i < STAGE_ORDER.length - 1 && <span className="step-arrow" />}
          </li>
        );
      })}
    </ol>
  );
}
