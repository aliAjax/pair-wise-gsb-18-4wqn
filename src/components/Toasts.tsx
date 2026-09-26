import { useStore } from "../state/store";

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.type === "error" ? "⚠" : "✓"}</span>
          <p>{t.message}</p>
          <button onClick={() => dismissToast(t.id)} aria-label="关闭">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
