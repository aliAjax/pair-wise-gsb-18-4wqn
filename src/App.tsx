import { StoreProvider, useStore } from "./state/store";
import { LedgerView } from "./pages/LedgerView";
import { ScheduleView } from "./pages/ScheduleView";
import { Toasts } from "./components/Toasts";
import "./styles.css";

function Shell() {
  const { ui, setView, cases, appointments } = useStore();
  const pendingCases = cases.filter((c) => c.status !== "filled").length;
  const bookedApts = appointments.filter((a) => a.status === "booked").length;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <h1>逐牙根管治疗台账</h1>
          <p>开髓 · 测长 · 预备 · 冲洗 · 封药 · 充填，逐步推进</p>
        </div>
        <nav className="main-nav">
          <button
            className={ui.view === "ledger" ? "nav-active" : ""}
            onClick={() => setView("ledger")}
          >
            治疗台账
            <em className="nav-count">{pendingCases}</em>
          </button>
          <button
            className={ui.view === "schedule" ? "nav-active" : ""}
            onClick={() => setView("schedule")}
          >
            复诊排班
            <em className="nav-count">{bookedApts}</em>
          </button>
        </nav>
      </header>

      {ui.view === "ledger" ? <LedgerView /> : <ScheduleView />}

      <footer className="app-footer">
        记录、排班状态与页面状态分开保存于本机浏览器，关闭后重新打开可接着处理。
      </footer>
      <Toasts />
    </main>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
