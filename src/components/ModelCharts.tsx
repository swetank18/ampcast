"use client";

/**
 * Charts for the evidence page.
 *
 * Same idiom as MethodCharts: hand-drawn SVG against the exported numbers, no
 * chart library, nothing computed on the client beyond a scale. Each one exists
 * to answer a specific question a judge asked in round 1, and the caption on the
 * page says which.
 */

import type { AblationRow, ModelEvidence } from "@/lib/types";
import { inr } from "@/lib/format";
import { FORECASTER_SHORT as SHORT, rowColour } from "@/lib/palette";

const W = 380, H = 250, P = { l: 46, r: 14, t: 14, b: 32 };

function Frame({ children, xLabel, yLabel, h = H }: {
  children: React.ReactNode; xLabel: string; yLabel: string; h?: number;
}) {
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" role="img" aria-label={`${yLabel} against ${xLabel}`}>
      {children}
      <text x={W / 2} y={h - 4} textAnchor="middle" fill="var(--faint)" fontSize="9" fontFamily="var(--mono)" letterSpacing="0.08em">{xLabel}</text>
      <text x={11} y={h / 2} textAnchor="middle" fill="var(--faint)" fontSize="9" fontFamily="var(--mono)" letterSpacing="0.08em" transform={`rotate(-90 11 ${h / 2})`}>{yLabel}</text>
    </svg>
  );
}

/**
 * The frontier: forecast quality on the horizontal axis, what it cost downstream
 * on the vertical. Persistence is dropped from the view — at 27 pinball it is
 * ten times the next worst and would flatten everything else into the axis —
 * but it stays in the table, and its exclusion is stated in the caption.
 */
export function ExchangeRate({ rows, metric }: { rows: AblationRow[]; metric: "ceiling_breaches" | "bill_inr" }) {
  const d = rows.filter((r) => r.key !== "persistence" && r.key !== "static_margin");
  const xMax = Math.max(...d.map((r) => r.pinball_mean)) * 1.12;
  const yMax = Math.max(...d.map((r) => r[metric])) * 1.1 || 1;
  const yMin = metric === "bill_inr" ? Math.min(...d.map((r) => r.bill_inr)) * 0.999 : 0;
  const x = (v: number) => P.l + (v / xMax) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - ((v - yMin) / (yMax - yMin)) * (H - P.t - P.b);
  const ticks = [0, 0.5, 1].map((f) => yMin + f * (yMax - yMin));

  return (
    <Frame
      xLabel="PINBALL LOSS ON THE MONTH  →  WORSE"
      yLabel={metric === "bill_inr" ? "MONTHLY BILL (₹)" : "CEILING BREACHES"}
    >
      {ticks.map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeWidth="1" />
          <text x={P.l - 6} y={y(v) + 3} textAnchor="end" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)">
            {metric === "bill_inr" ? `${(v / 1e5).toFixed(2)}L` : Math.round(v)}
          </text>
        </g>
      ))}
      {[0, xMax / 2, xMax].map((v) => (
        <text key={v} x={x(v)} y={H - P.b + 12} textAnchor="middle" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)">
          {v.toFixed(1)}
        </text>
      ))}
      <path
        d={[...d].sort((a, b) => a.pinball_mean - b.pinball_mean)
          .map((r, i) => `${i ? "L" : "M"}${x(r.pinball_mean)},${y(r[metric])}`).join("")}
        fill="none" stroke="var(--rule-2)" strokeWidth="1.2" strokeDasharray="4 3"
      />
      {d.map((r) => (
        <g key={r.key}>
          <circle cx={x(r.pinball_mean)} cy={y(r[metric])} r={r.key === "lightgbm_quantile" ? 5 : 3.5}
                  fill={rowColour(r.key)} stroke="var(--chassis)" strokeWidth="1.2" />
          <text x={x(r.pinball_mean)} y={y(r[metric]) - 9} textAnchor="middle"
                fill={r.key === "lightgbm_quantile" ? "var(--ours)" : "var(--dim)"}
                fontSize="8.5" fontFamily="var(--mono)">
            {SHORT[r.key] ?? r.key}
          </text>
        </g>
      ))}
    </Frame>
  );
}

/**
 * Section 4 as a picture. Sweep a forecast-free derating, plot what each setting
 * costs in breaches and leaves in headroom, and mark where we sit. The gap
 * between our dot and the safest static setting is the answer to "why is there
 * a model at all", in kilowatts.
 */
export function StaticMargin({ impact }: { impact: NonNullable<ModelEvidence["impact"]> }) {
  const sweep = impact.static_margin.sweep ?? [];
  const ours = impact.static_margin.ours;
  if (!sweep.length || !ours) return null;
  const hMax = Math.max(...sweep.map((s) => s.usable_headroom_kw), Number(ours.usable_headroom_kw)) * 1.1;
  const bMax = Math.max(...sweep.map((s) => s.breaches), 1) * 1.12;
  const x = (v: number) => P.l + (v / bMax) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / hMax) * (H - P.t - P.b);

  return (
    <Frame xLabel="CEILING BREACHES  →  LESS SAFE" yLabel="USABLE HEADROOM (kW)">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={P.l} x2={W - P.r} y1={y(hMax * f)} y2={y(hMax * f)} stroke="var(--rule)" strokeWidth="1" />
          <text x={P.l - 6} y={y(hMax * f) + 3} textAnchor="end" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)">
            {Math.round(hMax * f)}
          </text>
        </g>
      ))}
      {[0, Math.round(bMax / 2), Math.round(bMax)].map((v) => (
        <text key={v} x={x(v)} y={H - P.b + 12} textAnchor="middle" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)">{v}</text>
      ))}
      <path d={[...sweep].sort((a, b) => a.breaches - b.breaches)
        .map((s, i) => `${i ? "L" : "M"}${x(s.breaches)},${y(s.usable_headroom_kw)}`).join("")}
        fill="none" stroke="var(--ceiling)" strokeWidth="1.3" strokeOpacity="0.5" strokeDasharray="4 3" />
      {sweep.map((s) => (
        <g key={s.percentile}>
          <circle cx={x(s.breaches)} cy={y(s.usable_headroom_kw)} r="3.4" fill="var(--ceiling)" fillOpacity="0.85" />
          <text x={x(s.breaches) + 6} y={y(s.usable_headroom_kw) + 3} fill="var(--faint)" fontSize="8" fontFamily="var(--mono)">
            p{Math.round(s.percentile * 100)}
          </text>
        </g>
      ))}
      <circle cx={x(Number(ours.ceiling_breaches))} cy={y(Number(ours.usable_headroom_kw))} r="5.5"
              fill="var(--ours)" stroke="var(--chassis)" strokeWidth="1.2" />
      <text x={x(Number(ours.ceiling_breaches)) + 9} y={y(Number(ours.usable_headroom_kw)) + 3}
            fill="var(--ours)" fontSize="9" fontFamily="var(--mono)" fontWeight="600">OURS</text>
    </Frame>
  );
}

/** What the boosters actually lean on. Measured, not assumed — and if something
 *  silly were at the top, this is where we would have found it. */
export function ShapBars({ shap }: { shap: { top: string[]; mean_abs_shap: Record<string, number> } }) {
  const items = Object.entries(shap.mean_abs_shap).slice(0, 10);
  const max = Math.max(...items.map(([, v]) => v));
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {items.map(([name, v]) => (
        <div key={name} style={{ display: "grid", gridTemplateColumns: "104px 1fr 52px", alignItems: "center", gap: 8 }}>
          <span className="note" style={{ color: "var(--ink)", fontSize: 10 }}>{name}</span>
          <span style={{ height: 9, background: "var(--void)", borderRadius: 2, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${(v / max) * 100}%`, background: "var(--ours)", opacity: 0.75 }} />
          </span>
          <span className="num note" style={{ textAlign: "right", color: "var(--dim)", fontSize: 10 }}>{v.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

/** Drop a group, retrain, measure the damage. SHAP says what the model used;
 *  this says what it needed, and the two disagree in a way worth showing. */
export function FeatureGroups({ groups, full }: {
  groups: NonNullable<ModelEvidence["interpretability"]>["feature_groups"]; full?: number;
}) {
  const max = Math.max(...groups.map((g) => Math.abs(g.degradation_pct)), 1);
  return (
    <div style={{ display: "grid", gap: 5 }}>
      {[...groups].sort((a, b) => b.degradation_pct - a.degradation_pct).map((g) => {
        const hurt = g.degradation_pct > 0;
        return (
          <div key={g.group} style={{ display: "grid", gridTemplateColumns: "128px 1fr 62px", alignItems: "center", gap: 8 }}>
            <span className="note" style={{ color: "var(--ink)", fontSize: 10 }}>drop {g.group}</span>
            <span style={{ position: "relative", height: 10, background: "var(--void)", borderRadius: 2 }}>
              <span style={{
                position: "absolute", left: "50%", top: 0, height: "100%",
                width: `${(Math.abs(g.degradation_pct) / max) * 50}%`,
                transform: hurt ? "none" : "translateX(-100%)",
                background: hurt ? "var(--ceiling)" : "var(--nocontrol)", opacity: 0.8,
              }} />
              <span style={{ position: "absolute", left: "50%", top: -1, bottom: -1, width: 1, background: "var(--rule-2)" }} />
            </span>
            <span className="num note" style={{ textAlign: "right", color: hurt ? "var(--ceiling)" : "var(--dim)", fontSize: 10 }}>
              {g.degradation_pct > 0 ? "+" : ""}{g.degradation_pct.toFixed(1)}%
            </span>
          </div>
        );
      })}
      {full != null && (
        <p className="note" style={{ marginTop: 4 }}>
          All features: pinball <b>{full.toFixed(3)}</b> on validation. Bars are the change when a group is removed
          and the model retrained; right and red is worse.
        </p>
      )}
    </div>
  );
}

/** The evening we got wrong, drawn rather than described. Showing the worst case
 *  buys more credibility than showing the best one. */
export function WorstEvening({ wc }: { wc: NonNullable<NonNullable<ModelEvidence["interpretability"]>["worst_case"]> }) {
  const s = wc.series;
  const h = 210;
  const pad = { l: 40, r: 12, t: 12, b: 26 };
  const lo = Math.min(...s.q05, ...s.actual) * 0.96;
  const hi = Math.max(...s.q95, ...s.actual) * 1.04;
  const x = (i: number) => pad.l + (i / Math.max(1, s.t.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => h - pad.b - ((v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  const worstIdx = s.t.findIndex((t) => t * 1000 === Date.parse(`${wc.worst_exceedance_at.replace(" ", "T")}Z`));

  const fan =
    s.q95.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("") +
    s.q05.map((_, i, a) => {
      const j = a.length - 1 - i;
      return `L${x(j).toFixed(1)},${y(s.q05[j]).toFixed(1)}`;
    }).join("") + "Z";

  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" role="img" aria-label={`Forecast band and realised load on ${wc.day}`}>
      {[lo, (lo + hi) / 2, hi].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeWidth="1" />
          <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)">{Math.round(v)}</text>
        </g>
      ))}
      <path d={fan} fill="var(--ours)" fillOpacity="0.13" stroke="var(--ours)" strokeOpacity="0.35" strokeWidth="0.8" />
      <path d={s.q50.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("")} fill="none" stroke="var(--ours)" strokeWidth="1.1" strokeDasharray="3 3" />
      <path d={s.actual.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("")} fill="none" stroke="var(--ink-hi)" strokeWidth="1.6" />
      {worstIdx >= 0 && (
        <g>
          <line x1={x(worstIdx)} x2={x(worstIdx)} y1={y(s.q95[worstIdx])} y2={y(s.actual[worstIdx])} stroke="var(--ceiling)" strokeWidth="1.4" />
          <circle cx={x(worstIdx)} cy={y(s.actual[worstIdx])} r="3.4" fill="var(--ceiling)" />
          <text x={x(worstIdx) + 6} y={y(s.actual[worstIdx]) - 4} fill="var(--ceiling)" fontSize="9" fontFamily="var(--mono)">
            +{Math.round(wc.worst_exceedance_kw)} kW over q95
          </text>
        </g>
      )}
      {[0, 24, 48, 72, 95].map((i) => (
        <text key={i} x={x(i)} y={h - 8} textAnchor="middle" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)">
          {new Date(s.t[i] * 1000).toISOString().slice(11, 16)}
        </text>
      ))}
      <text x={pad.l} y={10} fill="var(--dim)" fontSize="8.5" fontFamily="var(--mono)" letterSpacing="0.08em">
        kW · {wc.day} · band is q05–q95, white is what happened
      </text>
    </svg>
  );
}

/** Rolling-origin spread. The mean is the headline; the spread is whether you
 *  would let it hold a transformer in a month it has not seen. */
export function FoldSpread({ rolling }: { rolling: NonNullable<ModelEvidence["rolling"]> }) {
  const keys = Object.keys(rolling.summary).filter((k) => k !== "perfect_foresight");
  const max = Math.max(...keys.map((k) => rolling.summary[k].pinball_max)) * 1.05;
  return (
    <div style={{ display: "grid", gap: 5 }}>
      {keys.map((k) => {
        const s = rolling.summary[k];
        const ours = k === "lightgbm_quantile";
        return (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "120px 1fr 96px", alignItems: "center", gap: 8 }}>
            <span className="note" style={{ color: ours ? "var(--ours)" : "var(--ink)", fontSize: 10 }}>{SHORT[k] ?? k}</span>
            <span style={{ position: "relative", height: 10 }}>
              <span style={{
                position: "absolute", left: 0, top: 4, height: 2,
                width: `${(s.pinball_max / max) * 100}%`, background: "var(--rule-2)",
              }} />
              <span style={{
                position: "absolute", left: `${(Math.max(0, s.pinball_mean - s.pinball_std) / max) * 100}%`,
                top: 3, height: 4,
                width: `${((Math.min(max, s.pinball_mean + s.pinball_std) - Math.max(0, s.pinball_mean - s.pinball_std)) / max) * 100}%`,
                background: ours ? "var(--ours)" : "var(--nocontrol)", opacity: 0.55,
              }} />
              <span style={{
                position: "absolute", left: `${(s.pinball_mean / max) * 100}%`, top: 0, height: 10, width: 2,
                background: ours ? "var(--ours)" : "var(--ink)",
              }} />
            </span>
            <span className="num note" style={{ textAlign: "right", fontSize: 10, color: ours ? "var(--ours)" : "var(--dim)" }}>
              {s.pinball_mean.toFixed(2)} ±{s.pinball_std.toFixed(2)}
            </span>
          </div>
        );
      })}
      <p className="note" style={{ marginTop: 4 }}>
        Bar is ±1 SD across folds, tick is the mean, the thin line runs to the worst fold.
      </p>
    </div>
  );
}

/** Tier 3 in one row: what the month costs on each footing. */
export function MoneyRow({ impact }: { impact: NonNullable<ModelEvidence["impact"]> }) {
  const t3 = impact.tier3 ?? {};
  const cells: [string, string, string][] = [
    ["Demand charge saved", `₹${inr(Number(t3.demand_charge_saving_inr_per_month ?? 0))}`, "peak kVA reduction × the tariff's kVA rate"],
    ["Energy charge saved", `₹${inr(Number(t3.energy_charge_saving_inr_per_month ?? 0))}`, "shifting out of the priced windows"],
    ["Total, per month", `₹${inr(Number(t3.total_bill_saving_inr_per_month ?? 0))}`, `${Number(t3.total_bill_saving_pct ?? 0).toFixed(1)}% of the uncontrolled bill`],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1, background: "var(--rule)", border: "1px solid var(--rule)", borderRadius: 6, overflow: "hidden" }}>
      {cells.map(([k, v, why]) => (
        <div key={k} style={{ background: "var(--panel)", padding: "10px 12px" }}>
          <div className="eyebrow">{k}</div>
          <div className="num" style={{ fontSize: 19, color: "var(--ink-hi)", margin: "4px 0 5px" }}>{v}</div>
          <div className="note">{why}</div>
        </div>
      ))}
    </div>
  );
}
