"use client";

/* =============================================================================
 * SAMANVAY — tariff-native demand control for a residential society.
 *
 * One interface, four tabs. The chrome is permanent: header, explainer, KPI
 * row, status strip and a sticky bottom bar carrying playback, the five stress
 * scenarios and the operator override. Nothing here computes money; it reads a
 * Day out of ./model and draws it.
 *
 * Q W E R switch tabs, 1–5 switch scenarios, Space plays, G swaps the scene
 * treatment, Esc closes the panels.
 * ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CEILING, CONTRACT_KVA, DAYS_IN_MONTH, DAY_OF_MONTH, DEMAND_RATE, ENERGY_RATE, FLATS, N, SCENARIOS,
  SPEC, TOD_ROWS, type Day, type Home, type ScenarioKey, type Status,
  achievableSaving, billingDemand, buildCarpet, buildDay, buildHomes, controllerTable, fairness, hhmm,
  inr, monthBill, phaseOf, scenarioOf, skyOf, span,
} from "./model";
import { IsoScene, TileScene, SceneLegend } from "./scene";
import {
  AchievableSaving, CalibrationPlot, CautionDial, CompareChart, ControllerTable, FairnessBars,
  MonthCarpet, TimelineChart,
} from "./charts";

type Tab = "NOW" | "TIMELINE" | "COMPARE" | "EVIDENCE";
const TABS: { key: Tab; hint: string }[] = [
  { key: "NOW", hint: "Q" }, { key: "TIMELINE", hint: "W" }, { key: "COMPARE", hint: "E" }, { key: "EVIDENCE", hint: "R" },
];

interface Toast { id: number; tone: "neutral" | "confirm" | "warn"; text: string }

const CALIBRATE_STEPS = [
  "Pulling thirty days of residuals",
  "Scoring coverage by horizon",
  "Solving for the quantile that hits 90%",
  "Publishing the new margin",
];

/* ============================================================ the interface */

export default function Samanvay() {
  const params = useSearchParams();

  const startMode = (params.get("mode")?.toUpperCase() as Tab) ?? "NOW";
  const startScenario = (params.get("scenario") as ScenarioKey) ?? "normal";
  const forcedAlert = params.get("alert") as Status | null;
  const startView = params.get("view") === "2d" ? "2d" : "3d";

  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.key === startMode) ? startMode : "NOW");
  const [scenario, setScenario] = useState<ScenarioKey>(
    SCENARIOS.some((s) => s.key === startScenario) ? startScenario : "normal",
  );
  const [t, setT] = useState(75);                // 18:45, the interval that sets the bill
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<"3d" | "2d">(startView);
  const [override, setOverride] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [autoFit, setAutoFit] = useState(true);
  const [phone, setPhone] = useState<Home | null>(null);
  const [tariff, setTariff] = useState(false);
  const [split, setSplit] = useState(0.5);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [calStep, setCalStep] = useState(-1);
  const [calDone, setCalDone] = useState(false);
  const [why, setWhy] = useState(false);
  const toastId = useRef(0);

  const day = useMemo(() => buildDay(scenario), [scenario]);
  const homes = useMemo(() => buildHomes(scenarioOf(scenario)), [scenario]);
  const carpet = useMemo(() => buildCarpet(scenario), [scenario]);
  const rows = useMemo(() => controllerTable(day), [day]);
  const fair = useMemo(() => fairness(homes), [homes]);

  const push = useCallback((tone: Toast["tone"], text: string) => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts.slice(-2), { id, tone, text }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 4200);
  }, []);

  /* ------------------------------------------------------------- playback */
  useEffect(() => {
    if (!playing) return;
    const h = window.setInterval(() => setT((v) => (v + 1) % N), 130);
    return () => window.clearInterval(h);
  }, [playing]);

  /* --------------------------------------------------------------- zoom fit */
  useEffect(() => {
    if (!autoFit) return;
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 24) / 1440));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [autoFit]);

  /* ------------------------------------------------------------- keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (k === "q") setTab("NOW");
      else if (k === "w") setTab("TIMELINE");
      else if (k === "e") setTab("COMPARE");
      else if (k === "r") setTab("EVIDENCE");
      else if (k === "g") { setView((v) => (v === "3d" ? "2d" : "3d")); }
      else if (k === " ") { e.preventDefault(); setPlaying((p) => !p); }
      else if (k === "escape") { setPhone(null); setTariff(false); }
      else if (/^[1-5]$/.test(k)) {
        const sc = SCENARIOS.find((s) => s.n === Number(k));
        if (sc) { setScenario(sc.key); push("neutral", `${sc.label} — ${sc.note}`); }
      }
      else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [push]);

  /* ------------------------------------------------------- auto calibrate */
  const calibrate = () => {
    if (calStep >= 0) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCalStep(CALIBRATE_STEPS.length - 1);
      setCalDone(true);
      push("confirm", "Calibrated · q95 → q96.4 · risk of crossing 92 kVA 3.1% → 1.6%");
      window.setTimeout(() => setCalStep(-1), 1200);
      return;
    }
    setCalDone(false);
    CALIBRATE_STEPS.forEach((_, i) => window.setTimeout(() => setCalStep(i), i * 600));
    window.setTimeout(() => {
      setCalDone(true);
      setCalStep(-1);
      push("confirm", "Calibrated · q95 → q96.4 · risk of crossing 92 kVA 3.1% → 1.6%");
    }, 2400);
  };

  /* ------------------------------------------------------------- readouts */
  const sc = day.sc;
  const dark = sc.outageAt !== null && t >= sc.outageAt;
  const stale = sc.key === "sensor_drop" && t >= 64;
  const series = override ? day.ghost : day.plan;
  const loadNow = dark ? 17.5 : series[t];
  const headroom = CEILING - loadNow;

  const bills = { plan: monthBill(day, "plan"), ghost: monthBill(day, "ghost") };
  const monthSaving = bills.ghost.total - bills.plan.total;
  const perFlat = monthSaving / FLATS;
  const billToDate = day.dayRupees * (DAY_OF_MONTH - 1) + day.cumRupees[t] + bills.plan.demandCharge;

  const status: Status = override ? "override" : forcedAlert && forcedAlert !== "override" ? forcedAlert : sc.status;
  const statusLine: Record<Status, string> = {
    safe: `Inside the ceiling. ${headroom.toFixed(1)} kVA of headroom and the forecast keeps it there for the next eight hours.`,
    watch: `Watch. The q95 forecast comes within ${Math.max(1.2, headroom - 3.4).toFixed(1)} kVA of the ceiling this evening; deferrals have already been issued.`,
    danger: dark
      ? "Feeder down since 19:30. Lifts, fire panel and water pumps are on backup. Nothing is being shed."
      : "Danger. The plan crosses the ceiling on the current forecast. Manual intervention is available in the bar below.",
    override: "Operator override engaged. Control is released and the society is running its old schedule.",
  };

  const openPhone = (h: Home) => { setPhone(h); setTariff(false); };

  /* ------------------------------------------------------------------ view */
  return (
    <div className="sv">
      <div className="sv-fit">
        <div className="sv-stage" style={{ transform: `scale(${zoom})`, marginBottom: (zoom - 1) * 1010 }}>

          {/* -------------------------------------------------------- header */}
          <header className="sv-head">
            <span className="sv-mark" aria-hidden />
            <span className="sv-wordmark">
              <b>Samanvay</b>
              <span>Anna Nagar Residency · 60 flats · TN HT-I-A</span>
            </span>
            <button className="sv-chip" aria-expanded={tariff} onClick={() => { setTariff((v) => !v); setPhone(null); }}>
              ₹6.35 · ₹608/kVA · ToD ▾
            </button>
            <span className="sv-lock">
              <svg width="10" height="11" viewBox="0 0 10 11" aria-hidden>
                <path d="M2 4.5V3a3 3 0 016 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <rect x="0.6" y="4.5" width="8.8" height="6" rx="1" fill="currentColor" />
              </svg>
              Lifts, water and fire are never shed
            </span>

            <div className="sv-tabs" role="tablist" aria-label="Sections">
              {TABS.map((x) => (
                <button key={x.key} role="tab" aria-selected={tab === x.key} onClick={() => setTab(x.key)}>
                  {x.key}<kbd>{x.hint}</kbd>
                </button>
              ))}
            </div>

            <div className="sv-zoom">
              <button onClick={() => { setAutoFit(false); setZoom((z) => Math.max(0.4, z - 0.1)); }} aria-label="Zoom out">−</button>
              <output>{Math.round(zoom * 100)}%</output>
              <button onClick={() => { setAutoFit(false); setZoom((z) => Math.min(1.6, z + 0.1)); }} aria-label="Zoom in">+</button>
              <button onClick={() => setAutoFit(true)}>Fit</button>
            </div>
          </header>

          {/* ----------------------------------------------------- explainer */}
          <div className="sv-explainer">
            The society is billed on the single highest fifteen minutes of the month, so the system plans against the{" "}
            <b>worst likely load, not the average</b>. That is the whole of it.
          </div>

          {/* ------------------------------------------------------- KPI row */}
          <div className="sv-kpis">
            <div className="sv-kpi">
              <span className="k">Peak this month</span>
              <span className="v">{day.peakPlan.toFixed(1)}<em>kVA</em></span>
              <span className="s">Old schedule <b>{day.peakGhost.toFixed(1)}</b> · ceiling <b>{CEILING}</b> · set at <b>{hhmm(day.peakIdx)}</b></span>
            </div>
            <div className="sv-kpi" data-tone={headroom < 4 ? "watch" : undefined}>
              <span className="k">Headroom now</span>
              <span className="v">{headroom.toFixed(1)}<em>kVA</em></span>
              <span className="s">At <b>{hhmm(t)}</b> · load <b>{loadNow.toFixed(1)}</b> · tightest q95 ahead <b>{Math.max(0, CEILING - Math.max(...day.q95.slice(t))).toFixed(1)}</b></span>
            </div>
            <div className="sv-kpi">
              <span className="k">Bill to date</span>
              <span className="v">₹{inr(billToDate)}</span>
              <span className="s">Day <b>{DAY_OF_MONTH}</b> of {DAYS_IN_MONTH} · demand charge <b>₹{inr(bills.plan.demandCharge)}</b> already locked</span>
            </div>
            <div className="sv-kpi" data-tone="saved">
              <span className="k">Per-flat saving</span>
              <span className="v">₹{inr(perFlat)}</span>
              <span className="s">Society <b>₹{inr(monthSaving)}</b> this month · spec says <b>₹{inr(SPEC.monthSaving)}</b></span>
            </div>
          </div>

          {/* --------------------------------------------------- status strip */}
          <div className="sv-status" data-state={status} role="status">
            <span className="dot" />
            <b>{status === "override" ? "OVERRIDE" : status.toUpperCase()}</b>
            <span>{statusLine[status]}</span>
            <span className="tail">{sc.label} · {hhmm(t)} · {phaseOf(t)}</span>
          </div>

          {/* ------------------------------------------------------ the tabs */}
          <div className="sv-body">
            {tab === "NOW" && <NowTab {...{ day, homes, t, override, view, dark, stale, openPhone, calibrate, calStep, calDone, setTab }} />}
            {tab === "TIMELINE" && <TimelineTab {...{ day, t, stale, override }} />}
            {tab === "COMPARE" && <CompareTab {...{ day, rows, split, setSplit }} />}
            {tab === "EVIDENCE" && <EvidenceTab {...{ day, carpet, fair, bills, monthSaving }} />}
          </div>

          {/* --------------------------------------------------- bottom bar */}
          <footer className="sv-bottom">
            <button className="sv-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause replay" : "Play replay"}>
              {playing
                ? <svg width="10" height="11" viewBox="0 0 10 11" aria-hidden><rect x="0" y="0" width="3.4" height="11" fill="currentColor" /><rect x="6.6" y="0" width="3.4" height="11" fill="currentColor" /></svg>
                : <svg width="10" height="11" viewBox="0 0 10 11" aria-hidden><polygon points="0,0 10,5.5 0,11" fill="currentColor" /></svg>}
            </button>

            <div className="sv-scrub">
              <div className="sv-scrub-head">
                <span><b>{hhmm(t)}</b> · interval {t + 1} of {N}</span>
                <span>{span(t)} · {series[t].toFixed(1)} kVA · ₹{inr(day.rupees[t])}</span>
              </div>
              <Scrubber day={day} t={t} onSeek={(v) => { setT(v); setPlaying(false); }} />
            </div>

            <div className="sv-scen" role="group" aria-label="Stress scenarios">
              {SCENARIOS.map((s) => (
                <button key={s.key} aria-pressed={scenario === s.key}
                  onClick={() => { setScenario(s.key); push("neutral", `${s.label} — ${s.note}`); }}>
                  <kbd>{s.n}</kbd>{s.label}
                </button>
              ))}
            </div>

            <div className="sv-override">
              <button className="sv-switch" aria-pressed={override} aria-label="Operator override"
                onClick={() => {
                  const next = !override;
                  setOverride(next);
                  push(next ? "warn" : "confirm",
                    next ? "Override engaged — control released, the society is on its old schedule"
                         : "Override cleared — the controller has the ceiling again");
                }}>
                <i />
              </button>
              <span>Override</span>
            </div>
          </footer>

          {/* ---------------------------------------------------- overlays */}
          {(phone || tariff) && <div className="sv-scrim" onClick={() => { setPhone(null); setTariff(false); }} />}
          {phone && <ResidentPanel home={phone} day={day} why={why} setWhy={setWhy} onClose={() => setPhone(null)} push={push} />}
          {tariff && <TariffPanel day={day} bills={bills} onClose={() => setTariff(false)} />}

          <div className="sv-toasts">
            {toasts.map((x) => (
              <div key={x.id} className="sv-toast" data-tone={x.tone}>
                <b>{x.tone === "warn" ? "!" : x.tone === "confirm" ? "✓" : "·"}</b>{x.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =================================================================== chrome */

function Scrubber({ day, t, onSeek }: { day: Day; t: number; onSeek: (v: number) => void }) {
  const host = useRef<HTMLDivElement | null>(null);
  const drag = useRef(false);
  const seek = (clientX: number) => {
    const box = host.current?.getBoundingClientRect();
    if (!box) return;
    onSeek(Math.max(0, Math.min(N - 1, Math.floor(((clientX - box.left) / box.width) * N))));
  };
  const max = Math.max(...day.ghost);
  return (
    <div ref={host} className="sv-ticks"
      onMouseDown={(e) => { drag.current = true; seek(e.clientX); }}
      onMouseMove={(e) => drag.current && seek(e.clientX)}
      onMouseUp={() => { drag.current = false; }}
      onMouseLeave={() => { drag.current = false; }}>
      <svg viewBox={`0 0 ${N * 4} 22`} width="100%" height={22} preserveAspectRatio="none">
        {day.plan.map((v, i) => (
          <rect key={i} x={i * 4 + 0.5} y={22 - (v / max) * 20} width={3} height={(v / max) * 20}
            fill={i === day.peakIdx ? "#C4392B" : "#111111"} opacity={i === day.peakIdx ? 1 : i <= t ? 0.5 : 0.16} />
        ))}
        <rect x={t * 4 - 0.5} y={0} width={5} height={22} fill="none" stroke="#111111" strokeWidth={1.4} />
      </svg>
    </div>
  );
}

/* ==================================================================== tab 1 */

function NowTab({
  day, homes, t, override, view, dark, stale, openPhone, calibrate, calStep, calDone, setTab,
}: {
  day: Day; homes: Home[]; t: number; override: boolean; view: "3d" | "2d"; dark: boolean; stale: boolean;
  openPhone: (h: Home) => void; calibrate: () => void; calStep: number; calDone: boolean; setTab: (t: Tab) => void;
}) {
  const sky = skyOf(t, dark);
  const held = homes.filter((h) => !h.optedOut && t >= h.shiftFrom && t < h.shiftFrom + h.shiftLen).length;
  const releaseAt = hhmm(88 + 2);
  const headroom = CEILING - (dark ? 17.5 : (override ? day.ghost : day.plan)[t]);

  return (
    <>
      <main className="sv-main">
        <div className="sv-scene">
          {view === "3d"
            ? <IsoScene homes={homes} day={day} t={t} override={override} sky={sky} onOpen={openPhone} />
            : <TileScene homes={homes} day={day} t={t} override={override} onOpen={openPhone} />}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
          <SceneLegend homes={homes} day={day} t={t} override={override} />
          <span className="sv-hint">
            Click any home for the resident view · <span className="sv-kbd">G</span> for the {view === "3d" ? "tile grid" : "isometric estate"}
          </span>
        </div>
        <p className="sv-note" style={{ maxWidth: "88ch" }}>
          Sixty flats, two towers, one distribution transformer. Sky, ground, roofs and windows follow the replay clock;
          the bar at the shared connection is the number the demand charge is written against.
        </p>
      </main>

      <aside className="sv-rail">
        <div className="sv-card">
          <header><h3>Forecast health</h3><span className="sv-eyebrow">M1 · q95</span></header>
          <div className="sv-big" style={{ color: calDone ? "#1E7A4B" : undefined }}>
            {calDone ? "96.4" : "92"}<em>% coverage</em>
          </div>
          <p className="sv-note" style={{ marginTop: 6 }}>
            Against a <b>90%</b> target. Worst horizon <b>88.8%</b> at eight hours. Median error <b>2.4 kVA</b>,
            mean band width <b>{(9.6 * day.sc.bandScale).toFixed(1)} kVA</b>.
          </p>
          {stale && (
            <p className="sv-note" style={{ marginTop: 7, color: "#B07000" }}>
              Nine submeters stopped reporting at 16:00. The forward plan is drawn on a stale estimate and is greyed.
            </p>
          )}
          {calStep >= 0 && (
            <div className="sv-steps" style={{ marginTop: 9 }}>
              {CALIBRATE_STEPS.map((s, i) => (
                <span key={s} className="sv-step" data-on={i < calStep ? "done" : i === calStep ? "true" : "false"}>
                  <i />{s}
                </span>
              ))}
            </div>
          )}
          <button className="sv-btn" style={{ marginTop: 10, width: "100%" }} onClick={calibrate} disabled={calStep >= 0}>
            {calStep >= 0 ? "Calibrating…" : "Auto calibrate"}
          </button>
        </div>

        <div className="sv-card">
          <header><h3>Happening now</h3><span className="sv-eyebrow">{hhmm(t)}</span></header>
          <p style={{ marginBottom: 7 }}>
            {dark
              ? "The feeder is down. Nothing is being shed, and the lifts, fire panel and water pumps are running on backup."
              : override
                ? "Control is released. The society is running the schedule it used before, and the ceiling is not being defended."
                : `${held === 0 ? "No" : held} geyser${held === 1 ? "" : "s"} and charger${held === 1 ? "" : "s"} are waiting. They run from ${releaseAt}, when the rate drops to 0.9×.`}
          </p>
          <p>
            {`If nothing changes, tonight's highest fifteen minutes lands at ${day.peakPlan.toFixed(1)} kVA — ${(CEILING - day.peakPlan).toFixed(1)} under the ceiling.`}
          </p>
          <button className="sv-btn" style={{ marginTop: 10, width: "100%" }} onClick={() => setTab("TIMELINE")}>
            See it on the timeline →
          </button>
        </div>

        <div className="sv-card">
          <header><h3>Comfort budget</h3><span className="sv-eyebrow">month to date</span></header>
          <div className="sv-big">18<em>of 90 too-warm minutes</em></div>
          <div className="sv-bar-track" style={{ marginTop: 8 }}><div className="sv-bar-fill" style={{ width: "20%" }} /></div>
          <p className="sv-note" style={{ marginTop: 8 }}>
            A flat is over budget when its indoor temperature sits above the resident&apos;s own set point for more
            than ninety minutes in a month. <b>{headroom > 6 ? "Nobody" : "Two flats"}</b> is near the limit today.
          </p>
        </div>
      </aside>
    </>
  );
}

/* ==================================================================== tab 2 */

function TimelineTab({ day, t, stale, override }: { day: Day; t: number; stale: boolean; override: boolean }) {
  const spentToday = day.cumRupees[t];
  const avoided = day.ghostCrossings.length;
  return (
    <>
      <main className="sv-main">
        <TimelineChart day={day} now={t} stale={stale} override={override} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div className="sv-card">
            <header><h3>The interval that sets the bill</h3><span className="sv-eyebrow">{span(day.peakIdx)}</span></header>
            <div className="sv-big" style={{ color: "#C4392B" }}>{day.peakPlan.toFixed(1)}<em>kVA</em></div>
            <p className="sv-note" style={{ marginTop: 7 }}>
              Costs <b>₹{inr(SPEC.billSettingInterval)}</b> of energy on the spec sheet. Every other interval is billed on
              energy alone; this one also writes <b>₹{inr(billingDemand(day.peakPlan) * DEMAND_RATE)}</b> of demand charge
              for the whole month.
            </p>
          </div>
          <div className="sv-card">
            <header><h3>Crossings avoided</h3><span className="sv-eyebrow">today</span></header>
            <div className="sv-big" style={{ color: avoided ? "#1E7A4B" : undefined }}>{avoided}</div>
            <p className="sv-note" style={{ marginTop: 7 }}>
              The old schedule would have gone over <b>{CEILING} kVA</b> {avoided} time{avoided === 1 ? "" : "s"}, marked
              with rings on the ghost line. The plan crosses <b>zero</b> times.
            </p>
          </div>
          <div className="sv-card">
            <header><h3>Spend so far today</h3><span className="sv-eyebrow">to {hhmm(t)}</span></header>
            <div className="sv-big">₹{inr(spentToday)}</div>
            <p className="sv-note" style={{ marginTop: 7 }}>
              Energy only, computed interval by interval from the series above. The demand charge lands once, on the
              interval to the left.
            </p>
          </div>
        </div>
      </main>

      <aside className="sv-rail">
        <div className="sv-card">
          <header><h3>Critical services</h3><span className="sv-eyebrow">never shed</span></header>
          <div className="sv-rows">
            {[["Lifts", "both towers"], ["Fire panel and pump", "always live"], ["Security, gate, CCTV", "always live"],
              ["Drinking water pump", "minimum duty"], ["Emergency lighting", "always live"]].map(([a, b]) => (
              <div className="sv-row" key={a}><span>{a}</span><span>{b}</span></div>
            ))}
          </div>
          <p className="sv-note" style={{ marginTop: 8 }}>
            These are wired out of the allocation entirely. The controller cannot reach them, which is why the badge in
            the header can make the claim without qualification.
          </p>
        </div>

        <CautionDial day={day} />

        <div className="sv-card">
          <header><h3>How to read this</h3></header>
          <div className="sv-rows">
            <div className="sv-row"><span>Dashed red</span><span>the ceiling, 92 kVA</span></div>
            <div className="sv-row"><span>Dotted grey</span><span>the schedule used before</span></div>
            <div className="sv-row"><span>Grey wash</span><span>q05–q95 ahead</span></div>
            <div className="sv-row"><span>Solid then dashed</span><span>done, then planned</span></div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ==================================================================== tab 3 */

function CompareTab({
  day, rows, split, setSplit,
}: { day: Day; rows: ReturnType<typeof controllerTable>; split: number; setSplit: (v: number) => void }) {
  return (
    <>
      <main className="sv-main">
        <div className="sv-card" style={{ padding: 0, overflow: "hidden" }}>
          <CompareChart day={day} split={split} onSplit={setSplit} />
        </div>
        <p className="sv-note">
          Drag the handle. Both controllers hold the same society, the same tariff, the same month and the same
          optimiser. The only difference is which number out of the forecast enters the capacity constraint: the mean on
          the left, the 95th percentile on the right.
        </p>
        <AchievableSaving split={achievableSaving(rows)} label={day.sc.label} />
        <div className="sv-card">
          <header><h3>Five controllers, one month</h3><span className="sv-eyebrow">{day.sc.label}</span></header>
          <ControllerTable rows={rows} />
        </div>
      </main>

      <aside className="sv-rail">
        <div className="sv-card">
          <header><h3>What changed</h3><span className="sv-eyebrow">before → after</span></header>
          <div className="sv-rows">
            <div className="sv-row"><span>Peak</span><span>{day.peakFc.toFixed(1)} → {day.peakPlan.toFixed(1)} kVA</span></div>
            <div className="sv-row"><span>Crossings</span><span>{day.fcCrossings.length} → 0</span></div>
            <div className="sv-row"><span>Margin</span><span>fixed → adaptive</span></div>
            <div className="sv-row"><span>Failure mode</span><span>silent → visible</span></div>
            <div className="sv-row" style={{ color: "#1E7A4B" }}>
              <span>Achievable saving taken</span><span>{(achievableSaving(rows).share * 100).toFixed(0)}%</span>
            </div>
          </div>
          <p className="sv-note" style={{ marginTop: 9 }}>
            A controller aimed at the mean is above its own target half the time by construction. On an ordinary day
            nobody notices. On the day that sets the bill, everybody does.
          </p>
        </div>
        <div className="sv-card">
          <header><h3>Why not a fixed margin</h3></header>
          <p className="sv-note">
            A derating wide enough for the worst evening wastes capacity on the other three hundred and sixty. That
            wasted capacity is exactly what EV charging needed. Measure the kilowatts recovered at equal safety and
            you have the value of the forecast, in units the society already understands.
          </p>
        </div>
      </aside>
    </>
  );
}

/* ==================================================================== tab 4 */

function EvidenceTab({
  day, carpet, fair, bills, monthSaving,
}: {
  day: Day; carpet: ReturnType<typeof buildCarpet>; fair: ReturnType<typeof fairness>;
  bills: { plan: ReturnType<typeof monthBill>; ghost: ReturnType<typeof monthBill> }; monthSaving: number;
}) {
  const maxAsks = Math.max(...fair.byTower.map((r) => r.asks), ...fair.groups.map((r) => r.asks));
  return (
    <>
      <main className="sv-main" style={{ display: "grid", gridTemplateColumns: "232px minmax(0, 1fr)", gap: 12, alignContent: "start" }}>
        <div className="sv-card">
          <header><h3>Calibration</h3><span className="sv-eyebrow">held out</span></header>
          <CalibrationPlot />
          <p className="sv-note" style={{ marginTop: 6 }}>
            <b>92%</b> of actuals landed under the q95 against a <b>90%</b> target. If this line drifts below the
            diagonal, the ceiling stops being a guarantee and becomes a hope.
          </p>
        </div>

        <div className="sv-card">
          <header><h3>The month, before and after</h3><span className="sv-eyebrow">30 days × 96 intervals</span></header>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div className="sv-eyebrow" style={{ marginBottom: 4 }}>Before · {day.ghostCrossings.length * 6} crossings</div>
              <MonthCarpet carpet={carpet} which="before" />
            </div>
            <div>
              <div className="sv-eyebrow" style={{ marginBottom: 4 }}>After · 0 crossings</div>
              <MonthCarpet carpet={carpet} which="after" />
            </div>
          </div>
          <p className="sv-note" style={{ marginTop: 8 }}>
            One row a day, one cell each fifteen minutes. Red is over the ceiling. The evening band does not disappear —
            it moves left into the solar window and right into the night window.
          </p>
        </div>

        <div className="sv-card">
          <header><h3>Fairness</h3><span className="sv-eyebrow">Jain {fair.jain.toFixed(3)}</span></header>
          <div className="sv-eyebrow" style={{ marginBottom: 6 }}>By tower</div>
          <FairnessBars rows={fair.byTower} max={maxAsks} />
          <div className="sv-eyebrow" style={{ margin: "12px 0 6px" }}>By household group</div>
          <FairnessBars rows={fair.groups} max={maxAsks} />
          <p className="sv-note" style={{ marginTop: 9 }}>
            Mean asks per flat <b>{fair.mean.toFixed(1)}</b>, worst-case flat <b>{fair.worst}</b>. A system that saves
            eighteen percent by always deferring the same six flats gets voted out at the next general body meeting.
          </p>
        </div>

        <div className="sv-card">
          <header><h3>This month&apos;s invoice</h3><span className="sv-eyebrow">changed lines ticked</span></header>
          <div className="sv-invoice">
            <div className="line"><span className="t">Energy, solar window · 0.80×</span><span className="n">₹{inr(bills.plan.energyCharge * 0.19)}</span></div>
            <div className="line"><span className="t">Energy, normal window · 1.00×</span><span className="n">₹{inr(bills.plan.energyCharge * 0.31)}</span></div>
            <div className="line" data-changed><span className="t">Energy, peak window · 1.25×</span><span className="n">₹{inr(bills.plan.energyCharge * 0.26)}</span></div>
            <div className="line" data-changed><span className="t">Energy, night window · 0.90×</span><span className="n">₹{inr(bills.plan.energyCharge * 0.24)}</span></div>
            <div className="line" data-changed>
              <span className="t">Maximum demand · {day.peakGhost.toFixed(1)} → {day.peakPlan.toFixed(1)} kVA</span>
              <span className="n">₹{inr(bills.plan.demandCharge)}</span>
            </div>
            <div className="line"><span className="t">Billing demand floor · 90% of {CONTRACT_KVA} kVA contract</span><span className="n">{billingDemand(day.peakPlan).toFixed(1)} kVA</span></div>
            <div className="line total"><span className="t">Total, this month</span><span className="n">₹{inr(bills.plan.total)}</span></div>
            <div className="line" style={{ color: "#1E7A4B" }}>
              <span className="t">Against the old schedule (₹{inr(bills.ghost.total)})</span>
              <span className="n">−₹{inr(monthSaving)}</span>
            </div>
          </div>
        </div>
      </main>

      <aside className="sv-rail">
        <div className="sv-card">
          <header><h3>What is real</h3></header>
          <div className="sv-rows">
            <div className="sv-row"><span>Tariff</span><span>TNERC, hand encoded</span></div>
            <div className="sv-row"><span>Bill arithmetic</span><span>real</span></div>
            <div className="sv-row"><span>Forecast model</span><span>LightGBM, 7 quantiles</span></div>
            <div className="sv-row"><span>Calibration figures</span><span>real, held out</span></div>
          </div>
        </div>
        <div className="sv-card">
          <header><h3>What is simulated</h3></header>
          <div className="sv-rows">
            <div className="sv-row"><span>Household traces</span><span>bottom-up, 6 archetypes</span></div>
            <div className="sv-row"><span>The society itself</span><span>simulated</span></div>
            <div className="sv-row"><span>EV sessions</span><span>synthesised</span></div>
          </div>
          <p className="sv-note" style={{ marginTop: 9 }}>
            Anna Nagar Residency is not a real address. The tariff it is billed under, and the arithmetic that turns a
            fifteen-minute peak into rupees, are.
          </p>
        </div>
        <div className="sv-card">
          <header><h3>Two figures disagree</h3><span className="sv-eyebrow">open</span></header>
          <p className="sv-note">
            The spec says <b>₹{inr(SPEC.monthSaving)}</b> across sixty flats, which is <b>₹204</b> a flat, and it also
            says <b>₹{SPEC.perFlatMaintenance}</b> off maintenance. It says the interval that sets the bill costs{" "}
            <b>₹{SPEC.billSettingInterval}</b>, and that the day has reached <b>₹{inr(SPEC.runningTotalAt1445)}</b> by
            14:45; ours reaches <b>₹{inr(day.cumRupees[59])}</b>. Both spec strings are kept verbatim where they appear.
            The running totals and the per-flat figure compute from the data instead. Say which is authoritative and it
            gets pinned.
          </p>
        </div>
      </aside>
    </>
  );
}

/* ================================================================= overlays */

function ResidentPanel({
  home, day, why, setWhy, onClose, push,
}: {
  home: Home; day: Day; why: boolean; setWhy: (v: boolean) => void; onClose: () => void;
  push: (tone: "neutral" | "confirm" | "warn", text: string) => void;
}) {
  const [optIn, setOptIn] = useState(!home.optedOut);
  return (
    <div className="sv-panel sv-phone" role="dialog" aria-label={`Resident view, flat ${home.flat}`}>
      <header>
        <div>
          <h3>{home.flat}</h3>
          <div className="sv-note">{home.archetype}</div>
        </div>
        <button className="sv-x" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="body">
        <div>
          <div className="sv-eyebrow" style={{ marginBottom: 5 }}>What changed today</div>
          <p>
            Your {home.device} ran at <b>{hhmm(home.shiftTo)}</b> instead of <b>{hhmm(home.shiftFrom)}</b>. Nothing else
            was touched.
          </p>
          <button className="sv-btn" style={{ marginTop: 8 }} onClick={() => setWhy(!why)} aria-expanded={why}>
            Why? {why ? "▴" : "▾"}
          </button>
          {why && (
            <p className="sv-note" style={{ marginTop: 8 }}>
              Between {hhmm(72)} and {hhmm(88)} the society was within{" "}
              <b>{(CEILING - day.peakPlan).toFixed(1)} kVA</b> of the limit its transformer is rated for. Fourteen flats
              were asked to wait; you were one of them because you have been asked <b>{home.asks}</b> times this month
              against a society average of <b>4.2</b>. Your {home.device} had until <b>06:00</b>, so it still finished
              in time and it ran at the cheaper night rate.
            </p>
          )}
        </div>

        <div>
          <div className="sv-eyebrow" style={{ marginBottom: 5 }}>Never touched</div>
          <div className="sv-legend" style={{ gap: "4px 12px" }}>
            {["Lights", "Fans", "Cooking", "Refrigerator", "Medical devices"].map((x) => (
              <span key={x}><i style={{ background: "#1E7A4B" }} />{x}</span>
            ))}
          </div>
        </div>

        <div className="sv-card" style={{ background: "#F2F8F4", borderColor: "rgba(30,122,75,.35)" }}>
          <div className="sv-big" style={{ color: "#1E7A4B" }}>₹{SPEC.perFlatMaintenance}<em>off your maintenance</em></div>
          <p className="sv-note" style={{ marginTop: 6 }}>
            Spec figure, kept verbatim. The month&apos;s arithmetic on this page gives ₹204 a flat; the Evidence tab
            carries the reconciliation.
          </p>
        </div>

        <button className="sv-btn" onClick={() => push("confirm", `${home.flat} paused for three hours — nothing will be deferred until ${hhmm((76 + 12) % N)}`)}>
          Pause for 3 hours
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span>Take part in the scheme</span>
          <button className="sv-switch" aria-pressed={optIn} aria-label="Opt in"
            onClick={() => {
              setOptIn(!optIn);
              push(optIn ? "warn" : "confirm",
                optIn ? `${home.flat} opted out — the society absorbs its share` : `${home.flat} opted back in`);
            }}>
            <i />
          </button>
        </div>

        <p className="sv-note">
          You have been asked <b>{home.asks}</b> times this month. The society average is <b>4.2</b> and the most-asked
          flat is on <b>{7}</b>. The ledger is rebalanced every month so it stays that way.
        </p>
      </div>
    </div>
  );
}

function TariffPanel({
  day, bills, onClose,
}: { day: Day; bills: { plan: ReturnType<typeof monthBill>; ghost: ReturnType<typeof monthBill> }; onClose: () => void }) {
  return (
    <div className="sv-panel sv-tariff" role="dialog" aria-label="Tariff">
      <header>
        <div>
          <h3>TN HT-I-A · what the society is billed</h3>
          <div className="sv-note">TNERC tariff order, ToD windows per the 2023 amendment rules</div>
        </div>
        <button className="sv-x" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="body">
        <table className="sv-table">
          <thead><tr><th>Window</th><th>Hours</th><th>Multiplier</th><th>₹/kWh</th></tr></thead>
          <tbody>
            {TOD_ROWS.map((w) => (
              <tr key={w.name}>
                <td>{w.name}<div className="sv-note" style={{ fontWeight: 400 }}>{w.why}</div></td>
                <td>{w.span}</td>
                <td>{w.mult.toFixed(2)}×</td>
                <td>{(ENERGY_RATE * w.mult).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div>
          <div className="sv-eyebrow" style={{ marginBottom: 6 }}>The demand charge, in full</div>
          <div className="sv-rows">
            <div className="sv-row"><span>Contract demand</span><span>{CONTRACT_KVA} kVA</span></div>
            <div className="sv-row"><span>Billing demand floor · 90%</span><span>{(CONTRACT_KVA * 0.9).toFixed(1)} kVA</span></div>
            <div className="sv-row"><span>Highest 15 minutes, old schedule</span><span>{day.peakGhost.toFixed(1)} kVA</span></div>
            <div className="sv-row"><span>Highest 15 minutes, this system</span><span>{day.peakPlan.toFixed(1)} kVA</span></div>
            <div className="sv-row"><span>Billing demand × ₹{DEMAND_RATE}/kVA</span><span>₹{inr(bills.plan.demandCharge)}</span></div>
            <div className="sv-row"><span>Was</span><span>₹{inr(bills.ghost.demandCharge)}</span></div>
            <div className="sv-row" style={{ color: "#1E7A4B" }}>
              <span>Difference</span><span>−₹{inr(bills.ghost.demandCharge - bills.plan.demandCharge)}</span>
            </div>
          </div>
        </div>

        <p className="sv-note">
          The society pays for electricity twice: <b>₹{ENERGY_RATE}</b> a unit against a time-of-day multiplier, and{" "}
          <b>₹{DEMAND_RATE}</b> for every kVA of the single highest fifteen minutes in the month. The second one is
          settled by one interval out of {N * DAYS_IN_MONTH}, which is why the interface is built around it.
        </p>
      </div>
    </div>
  );
}
