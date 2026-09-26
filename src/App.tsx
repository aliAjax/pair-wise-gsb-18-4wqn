import ChartPage from "./pages/ChartPage";
import SchedulePage from "./pages/SchedulePage";
import ToothPage from "./pages/ToothPage";
import { slotEnd } from "./lib/treatment";
import { useLedger } from "./state/useLedger";
import "./styles.css";

export default function App() {
  const ledger = useLedger();
  const { data, ui } = ledger;
  const tooth = ui.tooth;
  const record = tooth ? data.teeth[tooth] : undefined;

  const nextAppointment = tooth
    ? data.appointments
        .filter((a) => a.tooth === tooth && slotEnd(a.start) >= Date.now())
        .sort((a, b) => a.start.localeCompare(b.start))[0] ?? null
    : null;

  const recordedTeeth = Object.keys(data.teeth).sort((a, b) => Number(a) - Number(b));

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">hxwl-04 · 牙体牙髓</p>
          <h1>根管治疗台账</h1>
        </div>
        <nav className="tabs">
          <button
            className={ui.page === "chart" ? "active" : ""}
            onClick={() => ledger.gotoPage("chart")}
          >
            牙位图
          </button>
          <button
            className={ui.page === "tooth" ? "active" : ""}
            disabled={!record}
            onClick={() => ledger.gotoPage("tooth")}
          >
            治疗台账{tooth ? ` · #${tooth}` : ""}
          </button>
          <button
            className={ui.page === "schedule" ? "active" : ""}
            onClick={() => ledger.gotoPage("schedule")}
          >
            复诊日程
          </button>
        </nav>
      </header>

      {ui.page === "tooth" && tooth && record ? (
        <ToothPage
          tooth={tooth}
          record={record}
          nextAppointment={nextAppointment}
          onBack={() => ledger.gotoPage("chart")}
          onDiagnosis={(text) => ledger.setDiagnosis(tooth, text)}
          onSetCanalLength={(canalId, v) => ledger.setCanalLength(tooth, canalId, v)}
          onAddCanal={(name) => ledger.addCanal(tooth, name)}
          onRemoveCanal={(canalId) => ledger.removeCanal(tooth, canalId)}
          onCompleteStep={(stepId) => ledger.doCompleteStep(tooth, stepId)}
          onReopen={(reason) => ledger.doReopen(tooth, reason)}
          onGotoSchedule={() => ledger.gotoPage("schedule")}
        />
      ) : ui.page === "schedule" ? (
        <SchedulePage
          appointments={data.appointments}
          teeth={recordedTeeth}
          defaultTooth={tooth}
          onBook={ledger.bookAppointment}
          onCancel={ledger.cancelAppointment}
          onOpenTooth={ledger.openTooth}
        />
      ) : (
        <ChartPage data={data} onOpenTooth={ledger.openTooth} />
      )}
    </main>
  );
}
