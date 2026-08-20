"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StripChart, { type Trace } from "./StripChart";
import { CONTROLLER_ORDER, TRACE, fetchSeries } from "@/lib/data";
import { inr, pct, stamp } from "@/lib/format";
import type { Bundle, Run, ScenarioKey, Series } from "@/lib/types";

const HERO = "ours";
const BASE = "no_control";
const MEAN = "mpc_mean";
const DEFAULT_ON = [BASE, MEAN, HERO];

export default function Worldsim({ bundle }: { bundle: Bundle }) {
  const [scenario, setScenario] = useState<ScenarioKey>("none");
  const [on, setOn] = useState<string[]>(DEFAULT_ON);
  const [cache, setCache] = useState<Record<string, Series>>({});
  const [cursor, setCursor] = useState(0);
  const [head, setHead] = useState(1e9);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);

  const runs = useMemo(
    () => bundle.runs.filter((r) => r.scenario === scenario).sort((a, b) => a.order - b.order),
    [bundle.runs, scenario],
  );
  const byController = useMemo(() => {
    const m: Record<string, Run> = {};
    for (const r of runs) m[r.controller] = r;
    return m;
  }, [runs]);

  // load only what is on screen; each series is ~110 KB
  useEffect(() => {
    let cancelled = false;
    const want = on.map((c) => `${scenario}__${c}`).filter((id) => !cache[id]);
    if (!want.length) return;
    Promise.all(want.map(async (id) => [id, await fetchSeries(id)] as const))
      .then((pairs) => { if (!cancelled) setCache((c) => ({ ...c, ...Object.fromEntries(pairs) })); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [scenario, on, cache]);

  const traces: Trace[] = useMemo(
    () =>
      on
        .map((c) => {
          const s = cache[`${scenario}__${c}`];
          if (!s) return null;
          return { id: c, label: TRACE[c].short, color: TRACE[c].color, series: s };
        })
        .filter(Boolean) as Trace[],
    [on, cache, scenario],
  );

  const n = traces[0]?.series.t.length ?? 0;

  useEffect(() => { setHead(1e9); setPlaying(false); setCursor(0); }, [scenario]);

  useEffect(() => {
    if (!playing || !n) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setHead((h) => {
        const next = (h > n ? 0 : h) + dt * 0.09; // ~11 s for a month
        if (next >= n - 1) { setPlaying(false); setCursor(n - 1); return 1e9; }
        setCursor(Math.floor(next));
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, n]);

  const upTo = Math.min(head, n - 1);
  const ours = byController[HERO];
  const base = byController[BASE];
  const mean = byController[MEAN];
  const scen = bundle.scenarios.find((s) => s.key === scenario)!;

  const breachList = useMemo(() => {
    const out: { i: number; t: number; c: string; color: string; over: number }[] = [];
    for (const tr of traces) {
      tr.series.grid_kw.forEach((v, i) => {
        if (v > bundle.demand_target_kw && i <= upTo)
          out.push({ i, t: tr.series.t[i], c: TRACE[tr.id].short, color: tr.color, over: v - bundle.demand_target_kw });
      });
    }
    return out.sort((a, b) => a.t - b.t).slice(0, 40);
  }, [traces, bundle.demand_target_kw, upTo]);

  const cursorRow = traces.map((tr) => ({
    label: TRACE[tr.id].short,
    color: tr.color,
    kw: tr.series.grid_kw[Math.min(cursor, n - 1)],
    bill: tr.series.bill_cum[Math.min(cursor, n - 1)],
    t: tr.series.t_indoor[Math.min(cursor, n - 1)],
  }));

  return (
    <div className="shell">
      {/* ------------------------------------------------------------ rail */}
      <aside className="rail">
        <fieldset className="ctl-group">
          <legend>Scenario</legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {bundle.scenarios.map((s) => (
              <button
                key={s.key}
                className="btn"
                aria-pressed={scenario === s.key}
                onClick={() => setScenario(s.key)}
                style={{ textAlign: "left", padding: "7px 9px" }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="note" style={{ marginTop: 9 }}>{scen.description}</p>
        </fieldset>

        <fieldset className="ctl-group">
          <legend>Controllers</legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {CONTROLLER_ORDER.map((c) => {
              const active = on.includes(c);
              const r = byController[c];
              return (
                <button
                  key={c}
                  className="btn btn-ghost"
                  aria-pressed={active}
                  onClick={() => setOn((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))}
                  style={{
                    textAlign: "left", display: "flex", alignItems: "center", gap: 7,
                    opacity: active ? 1 : 0.45, padding: "5px 8px",
                  }}
                >
                  <span className="swatch" style={{ background: TRACE[c].color, margin: 0 }} />
                  <span style={{ flex: 1 }}>{TRACE[c].short}</span>
                  {r && r.ceiling_breaches > 0 && (
                    <span className="num" style={{ color: "var(--ceiling)", fontSize: 10 }}>{r.ceiling_breaches}</span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="ctl-group">
          <legend>Where the ceiling came from</legend>
          <p className="note">
            <b>{Math.round(bundle.demand_target_kw)} kW</b> is not a target we picked. It is the tightest
            ceiling this building holds for a whole month inside the operator&rsquo;s{" "}
            <b>{bundle.demand_target_search.comfort_budget_pct ?? 2}%</b> comfort budget, found by bisection —
            a <b>{bundle.demand_target_search.shave_pct?.toFixed(1) ?? "6.0"}%</b> shave off an uncontrolled
            peak of <b>{Math.round(bundle.demand_target_search.uncontrolled_peak_kw ?? 497)} kW</b>.
          </p>
        </fieldset>

        <fieldset className="ctl-group">
          <legend>Building</legend>
          <p className="note">
            <b>{bundle.building.label}</b>, site {bundle.building.site} · {inr(bundle.building.sqm)} m²<br />
            Envelope <b>{bundle.building.ua_w_per_m2k} W/m²K</b> fitted from its own meter · time constant{" "}
            <b>{bundle.building.time_constant_h} h</b><br />
            Contract demand <b>{bundle.building.contract_demand_kva} kVA</b> · HVAC{" "}
            <b>{bundle.building.hvac_capacity_kw} kW</b>
          </p>
        </fieldset>
      </aside>

      {/* ----------------------------------------------------------- stage */}
      <section className="stage">
        <div className="stage-head">
          <p className="lede">
            An Indian commercial building pays for the single highest {bundle.tariff.billing_interval_minutes}-minute
            block of the month at{" "}
            <b style={{ color: "var(--ink-hi)" }}>₹{bundle.tariff.demand_charge_per_kva}/kVA</b>. One bad Tuesday
            afternoon sets that charge for all thirty days. This is the same optimiser under four conditions — the
            only difference between the blue trace and the cyan one is which quantile of the load forecast defends
            the ceiling.
          </p>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button className="btn btn-primary" onClick={() => { if (head >= n - 1) setHead(0); setPlaying((p) => !p); }}>
              {playing ? "Pause" : "Replay month"}
            </button>
            <button className="btn" onClick={() => { setPlaying(false); setHead(1e9); setCursor(n - 1); }}>
              Show all
            </button>
          </div>
        </div>

        {/* readouts */}
        <div className="readout">
          <div className="metric metric-lead">
            <span className="eyebrow">Bill · ours</span>
            <strong>₹{ours ? inr(ours.bill_inr) : "—"}</strong>
            <span className="sub">
              {ours && base ? <>{inr(ours.bill_inr - base.bill_inr)} vs no control</> : null}
            </span>
          </div>
          <div className="metric">
            <span className="eyebrow">Peak demand</span>
            <strong>{ours ? ours.peak_kva.toFixed(0) : "—"}</strong>
            <span className="sub">kVA · billed on one block{base ? <> · <b>{(ours!.peak_kva - base.peak_kva).toFixed(0)}</b> vs no control</> : null}</span>
          </div>
          <div className={`metric ${mean && mean.ceiling_breaches > 0 ? "metric-hot" : ""}`}>
            <span className="eyebrow">Ceiling breaches</span>
            <strong>
              {ours?.ceiling_breaches ?? "—"}
              <span style={{ fontSize: 15, color: "var(--faint)" }}> / {mean?.ceiling_breaches ?? "—"}</span>
            </strong>
            <span className="sub">ours · <b>mean forecast</b></span>
          </div>
          <div className="metric">
            <span className="eyebrow">Comfort spent</span>
            <strong>{ours ? ours.comfort_violation_pct.toFixed(2) : "—"}</strong>
            <span className="sub">% of intervals · budget <b>2.00%</b></span>
          </div>
        </div>

        {/* the instrument */}
        <div className="instrument">
          <div className="instrument-head">
            <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
              <span className="eyebrow">Grid import · running bill · indoor temperature</span>
              <span className="num" style={{ fontSize: 10.5, color: "var(--ink-hi)" }}>{n ? stamp(traces[0].series.t[Math.min(cursor, n - 1)]) : ""}</span>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {cursorRow.map((c) => (
                <span key={c.label} className="num" style={{ fontSize: 10.5, color: "var(--dim)" }}>
                  <span className="swatch" style={{ background: c.color }} />
                  {c.kw.toFixed(0)} kW · ₹{(c.bill / 1e5).toFixed(2)}L · {c.t.toFixed(1)}°C
                </span>
              ))}
            </div>
          </div>
          <div style={{ padding: "6px 10px 10px" }}>
            <StripChart
              traces={traces}
              ceilingKw={bundle.demand_target_kw}
              floorKva={(bundle.tariff.contract_demand_kva * bundle.tariff.billing_demand_floor_pct) / 100}
              cursor={cursor}
              onCursor={(i) => { setPlaying(false); setCursor(i); }}
              upTo={upTo}
              heroId={HERO}
            />
          </div>
        </div>

        {/* breach ledger — the emotional payload, itemised */}
        <div className="card">
          <div className="card-head">
            <h3>Breach ledger</h3>
            <span className="note">
              every block above the ceiling, and what the worst one did to the month
            </span>
          </div>
          {breachList.length === 0 ? (
            <p className="note">
              No block above {Math.round(bundle.demand_target_kw)} kW yet for the traces on screen.
            </p>
          ) : (
            <div className="table-scroll">
              <table className="grid-table">
                <thead>
                  <tr><th>When</th><th>Controller</th><th>Over ceiling</th><th>Cost if it stands</th></tr>
                </thead>
                <tbody>
                  {breachList.slice(0, 12).map((b, k) => (
                    <tr key={k}>
                      <td>{stamp(b.t)}</td>
                      <td><span className="swatch" style={{ background: b.color }} />{b.c}</td>
                      <td style={{ color: "var(--ceiling)" }}>+{b.over.toFixed(1)} kW</td>
                      <td style={{ color: "var(--ceiling)" }}>
                        ₹{inr((b.over / 0.95) * bundle.tariff.demand_charge_per_kva)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {breachList.length > 12 && (
                <p className="note" style={{ marginTop: 8 }}>
                  and {breachList.length - 12} more. A month is billed on the worst one, not the count — but every
                  extra breach is another chance to set a new worst.
                </p>
              )}
            </div>
          )}
        </div>

        {/* results */}
        <div className="card">
          <div className="card-head">
            <h3>Results · {scen.label}</h3>
            <span className="note">every figure from the bill engine, matched to the rupee against a hand-computed week</span>
          </div>
          <div className="table-scroll">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Controller</th><th>Bill ₹</th><th>Energy ₹</th><th>Demand ₹</th>
                  <th>Peak kVA</th><th>Breaches</th><th>Comfort %</th><th>% of oracle</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} data-hero={r.controller === HERO}>
                    <td><span className="swatch" style={{ background: TRACE[r.controller].color }} />{TRACE[r.controller].short}</td>
                    <td>{inr(r.bill_inr)}</td>
                    <td>{inr(r.energy_charge)}</td>
                    <td>{inr(r.demand_charge)}</td>
                    <td>{r.peak_kva.toFixed(1)}</td>
                    <td style={{ color: r.ceiling_breaches > 0 ? "var(--ceiling)" : "var(--dim)" }}>{r.ceiling_breaches}</td>
                    <td>{r.comfort_violation_pct.toFixed(2)}</td>
                    <td>{r.pct_of_oracle_savings === null ? "—" : r.pct_of_oracle_savings.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note" style={{ marginTop: 9 }}>
            The oracle row is one MILP over the whole billing month with perfect foresight, so &ldquo;% of oracle&rdquo;
            is the share of what was actually available — not a margin over a strawman.
          </p>
        </div>
      </section>
    </div>
  );
}
