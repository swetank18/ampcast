"use client";

import type { Bundle } from "@/lib/types";
import { inr } from "@/lib/format";

const W = 380, H = 250, P = { l: 44, r: 14, t: 14, b: 32 };

function Frame({ children, xLabel, yLabel }: { children: React.ReactNode; xLabel: string; yLabel: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${yLabel} against ${xLabel}`}>
      {children}
      <text x={W / 2} y={H - 4} textAnchor="middle" fill="var(--faint)" fontSize="9" fontFamily="var(--mono)" letterSpacing="0.08em">{xLabel}</text>
      <text x={11} y={H / 2} textAnchor="middle" fill="var(--faint)" fontSize="9" fontFamily="var(--mono)" letterSpacing="0.08em" transform={`rotate(-90 11 ${H / 2})`}>{yLabel}</text>
    </svg>
  );
}

/** Reliability diagram. The 45° line is the claim; the dots are whether it holds.
 *  This is the plot the whole safety argument rests on. */
export function Reliability({ bundle }: { bundle: Bundle }) {
  const cal = bundle.calibration[bundle.building.id];
  const x = (v: number) => P.l + v * (W - P.l - P.r);
  const y = (v: number) => H - P.b - v * (H - P.t - P.b);
  return (
    <Frame xLabel="NOMINAL QUANTILE" yLabel="EMPIRICAL COVERAGE">
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeWidth="1" />
          <text x={P.l - 6} y={y(v) + 3} textAnchor="end" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)">{v.toFixed(2)}</text>
          <text x={x(v)} y={H - P.b + 12} textAnchor="middle" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)">{v.toFixed(2)}</text>
        </g>
      ))}
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--faint)" strokeWidth="1" strokeDasharray="3 3" />
      <path d={cal.reliability.map((r, i) => `${i ? "L" : "M"}${x(r.nominal)},${y(r.empirical)}`).join("")} fill="none" stroke="var(--ours)" strokeWidth="1.8" />
      {cal.reliability.map((r) => (
        <g key={r.nominal}>
          <circle cx={x(r.nominal)} cy={y(r.empirical)} r="4" fill="var(--ours)" stroke="var(--chassis)" strokeWidth="1.2" />
          <text x={x(r.nominal) + (r.nominal > 0.8 ? -7 : 7)} y={y(r.empirical) - 6} textAnchor={r.nominal > 0.8 ? "end" : "start"} fill="var(--dim)" fontSize="8.5" fontFamily="var(--mono)">{r.empirical.toFixed(3)}</text>
        </g>
      ))}
    </Frame>
  );
}

/** Comfort ceiling against what the operator gets for it. Two axes because the
 *  operator is buying two different things with the same degree. */
export function Frontier({ bundle }: { bundle: Bundle }) {
  const d = bundle.frontier;
  const xs = d.map((r) => r.comfort_ceiling_c);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const sMax = Math.max(...d.map((r) => r.saving_inr)) * 1.12;
  const tMin = Math.min(...d.map((r) => r.target_kw)) * 0.985;
  const tMax = Math.max(...d.map((r) => r.target_kw)) * 1.015;
  const x = (v: number) => P.l + ((v - xMin) / (xMax - xMin)) * (W - P.l - P.r);
  const ys = (v: number) => H - P.b - (v / sMax) * (H - P.t - P.b);
  const yt = (v: number) => H - P.b - ((v - tMin) / (tMax - tMin)) * (H - P.t - P.b);
  return (
    <Frame xLabel="OCCUPIED COMFORT CEILING (°C)" yLabel="MONTHLY SAVING (₹)">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={P.l} x2={W - P.r} y1={ys(sMax * f)} y2={ys(sMax * f)} stroke="var(--rule)" strokeWidth="1" />
          <text x={P.l - 6} y={ys(sMax * f) + 3} textAnchor="end" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)">
            {((sMax * f) / 1e5).toFixed(1)}L
          </text>
        </g>
      ))}
      {d.map((r) => (
        <text key={r.comfort_ceiling_c} x={x(r.comfort_ceiling_c)} y={H - P.b + 12} textAnchor="middle" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)">
          {r.comfort_ceiling_c}
        </text>
      ))}
      <path d={d.map((r, i) => `${i ? "L" : "M"}${x(r.comfort_ceiling_c)},${yt(r.target_kw)}`).join("")} fill="none" stroke="var(--mpc-mean)" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={d.map((r, i) => `${i ? "L" : "M"}${x(r.comfort_ceiling_c)},${ys(r.saving_inr)}`).join("")} fill="none" stroke="var(--ours)" strokeWidth="2" />
      {d.map((r) => <circle key={r.comfort_ceiling_c} cx={x(r.comfort_ceiling_c)} cy={ys(r.saving_inr)} r="3.5" fill="var(--ours)" stroke="var(--chassis)" strokeWidth="1" />)}
      {d.map((r) => <circle key={`t${r.comfort_ceiling_c}`} cx={x(r.comfort_ceiling_c)} cy={yt(r.target_kw)} r="2.5" fill="var(--mpc-mean)" />)}
    </Frame>
  );
}

/** Reported saving with its confidence band against the truth we happen to know,
 *  because this is a simulation. A real deployment never gets to draw this. */
export function MVChart({ bundle }: { bundle: Bundle }) {
  const d = bundle.mv_baseline_length;
  const truth = d[0].true;
  const hi = Math.max(truth, ...d.map((r) => r.ci[1])) * 1.1;
  const x = (i: number) => P.l + ((i + 0.5) / d.length) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / hi) * (H - P.t - P.b);
  return (
    <Frame xLabel="BASELINE PERIOD USED" yLabel="REPORTED SAVING (₹)">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={P.l} x2={W - P.r} y1={y(hi * f)} y2={y(hi * f)} stroke="var(--rule)" strokeWidth="1" />
          <text x={P.l - 6} y={y(hi * f) + 3} textAnchor="end" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)">{((hi * f) / 1e5).toFixed(1)}L</text>
        </g>
      ))}
      <line x1={P.l} x2={W - P.r} y1={y(truth)} y2={y(truth)} stroke="var(--ceiling)" strokeWidth="1.6" strokeDasharray="5 3" />
      <text x={W - P.r} y={y(truth) - 6} textAnchor="end" fill="var(--ceiling)" fontSize="8.5" fontFamily="var(--mono)" fontWeight="600">TRUE ₹{inr(truth)}</text>
      {d.map((r, i) => (
        <g key={r.baseline}>
          <line x1={x(i)} x2={x(i)} y1={y(r.ci[0])} y2={y(r.ci[1])} stroke={r.inside ? "var(--ours)" : "var(--dim)"} strokeWidth="1.4" />
          <line x1={x(i) - 4} x2={x(i) + 4} y1={y(r.ci[0])} y2={y(r.ci[0])} stroke={r.inside ? "var(--ours)" : "var(--dim)"} strokeWidth="1.4" />
          <line x1={x(i) - 4} x2={x(i) + 4} y1={y(r.ci[1])} y2={y(r.ci[1])} stroke={r.inside ? "var(--ours)" : "var(--dim)"} strokeWidth="1.4" />
          <circle cx={x(i)} cy={y(r.reported)} r="4" fill={r.inside ? "var(--ours)" : "var(--dim)"} stroke="var(--chassis)" strokeWidth="1.2" />
          <text x={x(i)} y={H - P.b + 12} textAnchor="middle" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)">{r.baseline.replace(" months", "m")}</text>
        </g>
      ))}
    </Frame>
  );
}

/** The bisection that produced the ceiling. Each probe is a whole simulated
 *  month; the lowest one with zero breaches is what the building can commit to. */
export function TargetSearch({ bundle }: { bundle: Bundle }) {
  const trace = (bundle.demand_target_search.trace ?? []).slice().sort((a, b) => a.target_kw - b.target_kw);
  if (!trace.length) return null;
  const xMin = Math.min(...trace.map((t) => t.target_kw)) * 0.99;
  const xMax = Math.max(...trace.map((t) => t.target_kw)) * 1.01;
  const bMax = Math.max(...trace.map((t) => t.ceiling_breaches), 1);
  const x = (v: number) => P.l + ((v - xMin) / (xMax - xMin)) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / bMax) * (H - P.t - P.b);
  const chosen = bundle.demand_target_search.target_kw ?? bundle.demand_target_kw;
  return (
    <Frame xLabel="DEMAND CEILING TESTED (kW)" yLabel="BREACHES OVER THE MONTH">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={P.l} x2={W - P.r} y1={y(bMax * f)} y2={y(bMax * f)} stroke="var(--rule)" strokeWidth="1" />
          <text x={P.l - 6} y={y(bMax * f) + 3} textAnchor="end" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)">{Math.round(bMax * f)}</text>
        </g>
      ))}
      <line x1={x(chosen)} x2={x(chosen)} y1={P.t} y2={H - P.b} stroke="var(--ours)" strokeWidth="1.4" strokeDasharray="4 3" />
      <text x={x(chosen) + 5} y={P.t + 10} fill="var(--ours)" fontSize="8.5" fontFamily="var(--mono)" fontWeight="600">{Math.round(chosen)} kW</text>
      <path d={trace.map((t, i) => `${i ? "L" : "M"}${x(t.target_kw)},${y(t.ceiling_breaches)}`).join("")} fill="none" stroke="var(--ceiling)" strokeWidth="1.6" />
      {trace.map((t) => (
        <circle key={t.target_kw} cx={x(t.target_kw)} cy={y(t.ceiling_breaches)} r="3.5"
                fill={t.ceiling_breaches === 0 ? "var(--ours)" : "var(--ceiling)"} stroke="var(--chassis)" strokeWidth="1" />
      ))}
    </Frame>
  );
}
