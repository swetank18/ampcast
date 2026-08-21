"use client";

/* =============================================================================
 * Every mark on every chart, drawn by hand in SVG.
 *
 * The 15-minute chart is the argument: a ceiling, the schedule the society used
 * before, the fan the forecaster is looking at, and the plan that keeps the
 * highest interval of the month under the line. Nothing here recomputes money;
 * it reads the Day it was handed.
 * ========================================================================== */

import { useMemo, useRef, useState } from "react";
import {
  CEILING, DAYS_IN_MONTH, DEMAND_RATE, N, RELIABILITY, TOD, type Carpet, type ControllerRow,
  type Day, type SavingSplit, billingDemand, hhmm, inr, span, todAt,
} from "./model";

const INK = "#111111";
const INK3 = "#6B6B66";
const INK4 = "#9A9A94";
const RULE = "#D9D6D0";
const RULE2 = "#E7E4DE";
const CEIL = "#C4392B";
const SAVED = "#1E7A4B";

/** Ink weight for a ToD window: the dearer the hour, the darker the band. */
function todInk(mult: number): string {
  if (mult <= 0.8) return "#EFEDE9";
  if (mult <= 0.9) return "#DEDAD3";
  if (mult <= 1.0) return "#BFBAB1";
  return "#6B6B66";
}

/* ============================================================ the timeline */

const W = 1100, PAD_L = 54, PAD_R = 18, PAD_T = 16;
const PLOT_H = 286, AXIS_H = 18, STRIP_H = 20, BARS_H = 56, GAP = 7;
const CHART_H = PAD_T + PLOT_H + AXIS_H + GAP + STRIP_H + GAP + BARS_H + 4;

const BW = (W - PAD_L - PAD_R) / N;
const xAt = (t: number) => PAD_L + (t + 0.5) * BW;

export function TimelineChart({
  day, now, stale, override,
}: { day: Day; now: number; stale: boolean; override: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement | null>(null);

  const yMax = Math.max(112, Math.ceil((day.peakGhost * 1.06) / 10) * 10);
  const yAt = (v: number) => PAD_T + PLOT_H * (1 - v / yMax);

  const series = override ? day.ghost : day.plan;
  const path = (arr: number[], from: number, to: number) =>
    arr.slice(from, to).map((v, i) => `${i ? "L" : "M"}${xAt(from + i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");

  const band = useMemo(() => {
    const from = Math.max(0, now);
    const up = day.q95.slice(from).map((v, i) => `${i ? "L" : "M"}${xAt(from + i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
    const down = day.q05.slice(from).reverse().map((v, i) => `L${xAt(N - 1 - i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
    return `${up} ${down} Z`;
  }, [day, now, yMax]); // eslint-disable-line react-hooks/exhaustive-deps

  const stripY = PAD_T + PLOT_H + AXIS_H + GAP;
  const barsY = stripY + STRIP_H + GAP;
  const maxRupee = Math.max(...day.rupees, ...day.ghostRupees);

  const move = (e: React.MouseEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - box.left) / box.width) * (W - PAD_L - PAD_R);
    setHover(Math.max(0, Math.min(N - 1, Math.floor(rel / BW))));
  };

  const h = hover;
  const tip = h === null ? null : {
    t: h,
    load: series[h],
    win: todAt(h),
    cost: day.rupees[h],
    doing:
      day.sc.outageAt !== null && h >= day.sc.outageAt ? "Feeder down. Critical services on backup."
      : override ? "Control released to the operator. Nothing is being shifted."
      : h > now ? "Planned. The fan above is what the forecaster still allows for."
      : day.actions.find((a) => Math.abs(a.t - h) <= 1)?.detail
        ?? (series[h] >= day.peakPlan - 0.3 ? "Holding at the target. Every deferrable load is already waiting."
          : "Nothing to do. Load is well inside the ceiling."),
  };

  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${CHART_H}`} width="100%" height={CHART_H} role="img"
        aria-label="Fifteen-minute load against the demand ceiling">
        {/* grid */}
        {Array.from({ length: Math.floor(yMax / 20) + 1 }, (_, i) => i * 20).map((v) => (
          <g key={v}>
            <line x1={PAD_L} y1={yAt(v)} x2={W - PAD_R} y2={yAt(v)} stroke={v === 0 ? INK4 : RULE2} strokeWidth={1} />
            <text x={PAD_L - 8} y={yAt(v) + 3.5} textAnchor="end" fontSize={10.5} fill={INK3}>{v}</text>
          </g>
        ))}
        <text x={PAD_L - 8} y={PAD_T - 4} textAnchor="end" fontSize={10.5} fill={INK3} letterSpacing="1.2">kVA</text>

        {/* the fan the forecaster is looking at */}
        <path d={band} fill={stale ? "#0000001A" : "#00000014"} stroke={stale ? INK4 : "none"}
          strokeDasharray="3 3" strokeWidth={stale ? 0.8 : 0} />

        {/* the schedule the society used before */}
        <path d={path(day.ghost, 0, N)} fill="none" stroke={INK4} strokeWidth={1} strokeDasharray="1 3" />
        {day.ghostCrossings.map((t) => (
          <circle key={t} cx={xAt(t)} cy={yAt(day.ghost[t])} r={5} fill="none" stroke={CEIL} strokeWidth={1.2} opacity={0.75} />
        ))}

        {/* the ceiling */}
        <line x1={PAD_L} y1={yAt(CEILING)} x2={W - PAD_R} y2={yAt(CEILING)} stroke={CEIL} strokeWidth={1.4} strokeDasharray="6 4" />
        <text x={PAD_L + 8} y={yAt(CEILING) - 6} fontSize={10.5} fill={CEIL} fontWeight={600} letterSpacing="0.8">
          DEMAND CEILING · 92 kVA
        </text>

        {/* the plan: solid behind the clock, dashed ahead of it */}
        <path d={path(series, 0, now + 1)} fill="none" stroke={INK} strokeWidth={1.8} />
        <path d={path(series, now, N)} fill="none"
          stroke={stale ? INK4 : INK} strokeWidth={1.4} strokeDasharray="5 4" opacity={stale ? 0.55 : 1} />

        {/* planned actions, on leader lines so the plot stays readable */}
        {!override && day.actions.map((a, i) => {
          const lx = xAt(a.t), ly = yAt(series[a.t]);
          const ty = PAD_T + PLOT_H - 10 - (i % 2) * 16;
          const flip = lx > W * 0.62;
          return (
            <g key={a.t}>
              <line x1={lx} y1={ly + 5} x2={lx} y2={ty - 8} stroke={INK4} strokeWidth={0.8} />
              <circle cx={lx} cy={ly} r={2.4} fill={INK} />
              <text x={lx + (flip ? -5 : 5)} y={ty} textAnchor={flip ? "end" : "start"} fontSize={10.5} fill={INK3}>
                {a.label}
              </text>
            </g>
          );
        })}

        {/* the interval that sets the bill */}
        {(() => {
          const px = xAt(day.peakIdx), py = yAt(day.peakPlan);
          const top = py - 44;
          return (
            <g>
              <line x1={px} y1={py} x2={px} y2={top + 26} stroke={CEIL} strokeWidth={1} />
              <path d={`M${px - 21},${top + 26} L${px - 21},${top + 9} Q${px - 21},${top - 3} ${px},${top - 3} Q${px + 21},${top - 3} ${px + 21},${top + 9} L${px + 21},${top + 26} Z`}
                fill={CEIL} />
              <text x={px} y={top + 14} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="#FFFFFF">
                {day.peakPlan.toFixed(1)}
              </text>
              <circle cx={px} cy={py} r={3.2} fill={CEIL} />
            </g>
          );
        })()}

        {/* the replay clock */}
        <line x1={xAt(now)} y1={PAD_T} x2={xAt(now)} y2={PAD_T + PLOT_H} stroke={INK} strokeWidth={1} />
        <rect x={xAt(now) - 22} y={PAD_T} width={44} height={15} fill={INK} />
        <text x={xAt(now)} y={PAD_T + 11} textAnchor="middle" fontSize={10.5} fill="#F6F5F3">{hhmm(now)}</text>

        {/* x axis */}
        {Array.from({ length: 13 }, (_, i) => i * 8).filter((t) => t < N).map((t) => (
          <text key={t} x={xAt(t)} y={PAD_T + PLOT_H + 13} textAnchor="middle" fontSize={10.5} fill={INK3}>{hhmm(t)}</text>
        ))}

        {/* tariff windows */}
        {TOD.map((w, i) => (
          <g key={i}>
            <rect x={xAt(w.from) - BW / 2} y={stripY} width={(w.to - w.from) * BW} height={STRIP_H} fill={todInk(w.mult)} />
            {(w.to - w.from) * BW > 90 && (
              <text x={xAt(w.from) + ((w.to - w.from) * BW) / 2 - BW / 2} y={stripY + 13.5} textAnchor="middle"
                fontSize={10.5} letterSpacing="1" fill={w.mult > 1 ? "#F6F5F3" : INK3}>
                {w.name.toUpperCase()} {w.mult.toFixed(2)}×
              </text>
            )}
          </g>
        ))}

        {/* rupees per interval */}
        <text x={PAD_L - 8} y={barsY + 10} textAnchor="end" fontSize={10.5} fill={INK3}>₹</text>
        {day.rupees.map((v, t) => {
          const bh = (v / maxRupee) * BARS_H;
          return <rect key={t} x={xAt(t) - BW / 2 + 0.4} y={barsY + BARS_H - bh} width={BW - 0.8} height={bh}
            fill={t === day.peakIdx ? CEIL : INK} opacity={t === day.peakIdx ? 1 : t <= now ? 0.42 : 0.18} />;
        })}
        <line x1={PAD_L} y1={barsY + BARS_H} x2={W - PAD_R} y2={barsY + BARS_H} stroke={INK4} strokeWidth={1} />

        {/* hover */}
        {h !== null && (
          <g pointerEvents="none">
            <line x1={xAt(h)} y1={PAD_T} x2={xAt(h)} y2={barsY + BARS_H} stroke={INK} strokeWidth={0.8} strokeDasharray="2 2" />
            <circle cx={xAt(h)} cy={yAt(series[h])} r={3.4} fill={INK} />
          </g>
        )}
        <rect x={PAD_L} y={PAD_T} width={W - PAD_L - PAD_R} height={PLOT_H + AXIS_H + GAP + STRIP_H + GAP + BARS_H}
          fill="transparent" onMouseMove={move} onMouseLeave={() => setHover(null)} />
      </svg>

      {tip && (
        <div style={{
          position: "absolute", pointerEvents: "none",
          left: `calc(${((xAt(tip.t) + (tip.t > N * 0.6 ? -12 : 12)) / W) * 100}% ${tip.t > N * 0.6 ? "- 250px" : ""})`,
          top: 22, width: 238, background: "#FFFFFF", border: `1px solid ${INK}`, borderRadius: 2,
          padding: "9px 11px", fontSize: 10.5, lineHeight: 1.55, boxShadow: "0 8px 22px rgba(17,17,17,.14)",
        }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{span(tip.t)}</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: INK3 }}>Load</span><b>{tip.load.toFixed(1)} kVA</b></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: INK3 }}>Ceiling</span><b>{CEILING.toFixed(1)} kVA</b></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: INK3 }}>Window</span><b>{tip.win.name} · {tip.win.mult.toFixed(2)}×</b></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: INK3 }}>Cost</span><b>₹{inr(tip.cost)}</b></div>
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${RULE2}`, color: INK3 }}>{tip.doing}</div>
        </div>
      )}
    </div>
  );
}

/* ============================================================== the compare */

const CW = 1100, CPAD_L = 54, CPAD_R = 18, CPLOT_H = 300, CPAD_T = 16;
const CBW = (CW - CPAD_L - CPAD_R) / N;
const cxAt = (t: number) => CPAD_L + (t + 0.5) * CBW;

export function CompareChart({ day, split, onSplit }: { day: Day; split: number; onSplit: (v: number) => void }) {
  const host = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const yMax = Math.max(112, Math.ceil((day.peakGhost * 1.06) / 10) * 10);
  const yAt = (v: number) => CPAD_T + CPLOT_H * (1 - v / yMax);
  const path = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${cxAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");

  const set = (clientX: number) => {
    const box = host.current?.getBoundingClientRect();
    if (!box) return;
    onSplit(Math.max(0.06, Math.min(0.94, (clientX - box.left) / box.width)));
  };

  const H = CPAD_T + CPLOT_H + 22;

  return (
    <div ref={host} style={{ position: "relative", cursor: dragging ? "ew-resize" : "default" }}
      onMouseMove={(e) => dragging && set(e.clientX)}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}>
      <svg viewBox={`0 0 ${CW} ${H}`} width="100%" height={H} role="img" aria-label="Forecast-only controller against this system">
        <defs>
          <clipPath id="sv-left"><rect x={0} y={0} width={CW * split} height={H} /></clipPath>
          <clipPath id="sv-right"><rect x={CW * split} y={0} width={CW * (1 - split)} height={H} /></clipPath>
        </defs>

        <rect x={CPAD_L} y={CPAD_T} width={CW * split - CPAD_L} height={CPLOT_H} fill="#EFEDE9" />
        {Array.from({ length: Math.floor(yMax / 20) + 1 }, (_, i) => i * 20).map((v) => (
          <g key={v}>
            <line x1={CPAD_L} y1={yAt(v)} x2={CW - CPAD_R} y2={yAt(v)} stroke={v === 0 ? INK4 : RULE2} />
            <text x={CPAD_L - 8} y={yAt(v) + 3.5} textAnchor="end" fontSize={10.5} fill={INK3}>{v}</text>
          </g>
        ))}

        <line x1={CPAD_L} y1={yAt(CEILING)} x2={CW - CPAD_R} y2={yAt(CEILING)} stroke={CEIL} strokeWidth={1.4} strokeDasharray="6 4" />
        <text x={CPAD_L + 8} y={yAt(CEILING) - 6} fontSize={10.5} fill={CEIL} fontWeight={600} letterSpacing="0.8">DEMAND CEILING · 92 kVA</text>

        <g clipPath="url(#sv-left)">
          <path d={path(day.fcOnly)} fill="none" stroke={INK} strokeWidth={1.8} />
          {day.fcCrossings.map((t) => (
            <g key={t}>
              <circle cx={cxAt(t)} cy={yAt(day.fcOnly[t])} r={5.4} fill="none" stroke={CEIL} strokeWidth={1.6} />
              <line x1={cxAt(t)} y1={yAt(day.fcOnly[t])} x2={cxAt(t)} y2={yAt(CEILING)} stroke={CEIL} strokeWidth={1} />
            </g>
          ))}
          <text x={CPAD_L + 10} y={CPAD_T + 104} fontSize={10.5} letterSpacing="1.4" fill={INK3} stroke="#FFFFFF" strokeWidth={3.5} paintOrder="stroke">FORECAST-ONLY CONTROLLER</text>
          <text x={CPAD_L + 10} y={CPAD_T + 132} fontSize={26} fontWeight={300} fill={INK} stroke="#FFFFFF" strokeWidth={3.5} paintOrder="stroke">{day.peakFc.toFixed(1)}</text>
          <text x={CPAD_L + 10} y={CPAD_T + 148} fontSize={10.5} fill={INK3} stroke="#FFFFFF" strokeWidth={3.5} paintOrder="stroke">
            peak kVA · {day.fcCrossings.length} crossing{day.fcCrossings.length === 1 ? "" : "s"}
          </text>
        </g>

        <g clipPath="url(#sv-right)">
          <path d={path(day.plan)} fill="none" stroke={INK} strokeWidth={1.8} />
          <circle cx={cxAt(day.peakIdx)} cy={yAt(day.peakPlan)} r={3.4} fill={INK} />
          <text x={CW - CPAD_R - 10} y={CPAD_T + 104} textAnchor="end" fontSize={10.5} letterSpacing="1.4" fill={INK3} stroke="#FFFFFF" strokeWidth={3.5} paintOrder="stroke">THIS SYSTEM</text>
          <text x={CW - CPAD_R - 10} y={CPAD_T + 132} textAnchor="end" fontSize={26} fontWeight={300} fill={INK} stroke="#FFFFFF" strokeWidth={3.5} paintOrder="stroke">{day.peakPlan.toFixed(1)}</text>
          <text x={CW - CPAD_R - 10} y={CPAD_T + 148} textAnchor="end" fontSize={10.5} fill={SAVED} stroke="#FFFFFF" strokeWidth={3.5} paintOrder="stroke">peak kVA · no crossings</text>
        </g>

        {Array.from({ length: 13 }, (_, i) => i * 8).filter((t) => t < N).map((t) => (
          <text key={t} x={cxAt(t)} y={CPAD_T + CPLOT_H + 15} textAnchor="middle" fontSize={10.5} fill={INK3}>{hhmm(t)}</text>
        ))}
      </svg>

      <div className="sv-split-handle" style={{ left: `${split * 100}%` }}
        onMouseDown={(e) => { setDragging(true); set(e.clientX); e.preventDefault(); }}
        role="separator" aria-label="Drag to wipe between the two controllers">
        <span className="sv-split-grip">
          <svg width="9" height="8" viewBox="0 0 9 8" aria-hidden>
            <path d="M3.4 1 0.6 4l2.8 3M5.6 1 8.4 4l-2.8 3" fill="none" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </span>
      </div>
    </div>
  );
}

/* ============================================================ the evidence */

export function CalibrationPlot() {
  const S = 232, P = 30;
  const at = (v: number) => P + (S - 2 * P) * v;
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} role="img" aria-label="Reliability: nominal against empirical coverage">
      <rect x={P} y={P} width={S - 2 * P} height={S - 2 * P} fill="#FFFFFF" stroke={RULE} />
      <line x1={at(0)} y1={S - at(0)} x2={at(1)} y2={S - at(1)} stroke={INK4} strokeDasharray="3 3" />
      <path d={RELIABILITY.map((r, i) => `${i ? "L" : "M"}${at((r.nominal - 0.45) / 0.55)},${S - at((r.empirical - 0.45) / 0.55)}`).join(" ")}
        fill="none" stroke={INK} strokeWidth={1.8} />
      {RELIABILITY.map((r) => (
        <circle key={r.nominal} cx={at((r.nominal - 0.45) / 0.55)} cy={S - at((r.empirical - 0.45) / 0.55)} r={3}
          fill={r.nominal === 0.9 ? SAVED : INK} />
      ))}
      <line x1={at((0.9 - 0.45) / 0.55)} y1={S - at((0.92 - 0.45) / 0.55)} x2={S - 14} y2={S - at((0.92 - 0.45) / 0.55)}
        stroke={SAVED} strokeWidth={0.8} strokeDasharray="2 2" />
      <text x={S - 14} y={S - at((0.92 - 0.45) / 0.55) - 5} textAnchor="end" fontSize={10.5} fill={SAVED} fontWeight={600}>92%</text>
      <text x={S / 2} y={S - 8} textAnchor="middle" fontSize={10.5} fill={INK3} letterSpacing="1">NOMINAL</text>
      <text x={10} y={S / 2} textAnchor="middle" fontSize={10.5} fill={INK3} letterSpacing="1"
        transform={`rotate(-90 10 ${S / 2})`}>EMPIRICAL</text>
    </svg>
  );
}

export function MonthCarpet({ carpet, which }: { carpet: Carpet; which: "before" | "after" }) {
  const rows = which === "before" ? carpet.before : carpet.after;
  const cw = 3.05, ch = 5.6;
  const w = N * cw, h = DAYS_IN_MONTH * ch;
  return (
    <svg viewBox={`0 0 ${w} ${h + 16}`} width="100%" height={h + 16} role="img"
      aria-label={`Month carpet, ${which} the change`}>
      {rows.map((dayRow, d) =>
        dayRow.map((v, t) => {
          const over = v > CEILING;
          const k = Math.min(1, v / carpet.max);
          return <rect key={`${d}-${t}`} x={t * cw} y={d * ch} width={cw} height={ch}
            fill={over ? CEIL : `rgb(${Math.round(246 - 200 * k)},${Math.round(245 - 202 * k)},${Math.round(243 - 202 * k)})`} />;
        }),
      )}
      {[0, 24, 48, 72, 95].map((t) => (
        <text key={t} x={Math.min(w - 14, t * cw)} y={h + 12} fontSize={10.5} fill={INK3}
          textAnchor={t === 0 ? "start" : t === 95 ? "end" : "middle"}>{hhmm(t)}</text>
      ))}
    </svg>
  );
}

export function ControllerTable({ rows }: { rows: ControllerRow[] }) {
  return (
    <table className="sv-table">
      <thead>
        <tr>
          <th>Controller</th><th>Peak kVA</th><th>Crossings</th><th>Bill ₹/month</th>
          <th>Saving ₹/month</th><th>Share of the saving</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} data-hero={r.key === "ours" ? "" : undefined}>
            <td>
              {r.name}
              <div className="sv-note" style={{ fontWeight: 400 }}>{r.note}</div>
            </td>
            <td>{r.peak.toFixed(1)}</td>
            <td style={{ color: r.breaches > 0 ? CEIL : INK }}>{r.breaches}</td>
            <td>{inr(r.bill)}</td>
            <td style={{ color: r.saving > 0 ? SAVED : INK3 }}>{r.saving > 0 ? inr(r.saving) : "—"}</td>
            <td>{r.share === null ? "—" : `${(r.share * 100).toFixed(0)}%`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FairnessBars({ rows, max }: { rows: { label: string; asks: number; n: number }[]; max: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 3 }}>
            <span style={{ color: INK3 }}>{r.label} <span style={{ color: INK4 }}>· {r.n}</span></span>
            <b>{r.asks.toFixed(1)}</b>
          </div>
          <div className="sv-bar-track"><div className="sv-bar-fill" style={{ width: `${(r.asks / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------- the caution dial */

export function CautionDial({ day }: { day: Day }) {
  const [q, setQ] = useState(0.95);
  const z = (q - 0.5) / 0.49;
  const peak = day.peakFc - (day.peakFc - day.peakPlan) * z;
  const breaches = Math.round(10 * Math.pow(1 - z, 2.4));
  const bill = billingDemand(peak) * DEMAND_RATE + day.dayRupees * DAYS_IN_MONTH * (1 + 0.004 * z);
  const tooWarm = 0.2 + 2.4 * Math.pow(z, 1.8);

  return (
    <div className="sv-card">
      <header><h3>Caution</h3><span className="sv-eyebrow">q{(q * 100).toFixed(0)}</span></header>
      <p className="sv-note" style={{ marginBottom: 9 }}>
        Which quantile of the forecast enters the capacity constraint. Move it and the whole month moves with it.
      </p>
      <input type="range" min={50} max={99} step={1} value={Math.round(q * 100)}
        onChange={(e) => setQ(Number(e.target.value) / 100)}
        aria-label="Forecast quantile used in the constraint"
        style={{ width: "100%", accentColor: INK }} />
      <div className="sv-rows" style={{ marginTop: 8 }}>
        <div className="sv-row"><span>Bill</span><span>₹{inr(bill)}</span></div>
        <div className="sv-row"><span>Crossings</span><span style={{ color: breaches ? CEIL : SAVED }}>{breaches}</span></div>
        <div className="sv-row"><span>Too warm</span><span style={{ color: tooWarm > 2 ? "#B07000" : INK }}>{tooWarm.toFixed(1)}%</span></div>
      </div>
      <p className="sv-note" style={{ marginTop: 8 }}>
        {q < 0.85
          ? "Below q85 the margin stops covering the forecast error and the ceiling is no longer a guarantee."
          : q > 0.97
            ? "Above q97 the margin is buying safety nobody needed, and the comfort budget pays for it."
            : "The operating band. Safety is a property of the quantile, not of the reporting."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------- the achievable saving */

/**
 * How much of the prize is actually on the table, and how much of it this
 * controller takes. The denominator is perfect foresight rather than the
 * current bill, because that is the only number no controller can beat.
 */
export function AchievableSaving({ split, label }: { split: SavingSplit; label: string }) {
  const pct = Math.round(split.share * 100);
  return (
    <div className="sv-card">
      <header>
        <h3>Achievable saving</h3>
        <span className="sv-eyebrow">{label} · no control → perfect foresight</span>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 12 }}>
        <div>
          <div className="sv-eyebrow" style={{ marginBottom: 3 }}>On the table</div>
          <div className="sv-big">₹{inr(split.available)}<em>a month</em></div>
          <div className="sv-note" style={{ marginTop: 3 }}>₹{inr(split.perFlatAvailable)} a flat, if the forecast were perfect</div>
        </div>
        <div>
          <div className="sv-eyebrow" style={{ marginBottom: 3 }}>Taken by this system</div>
          <div className="sv-big" style={{ color: SAVED }}>₹{inr(split.captured)}<em>{pct}%</em></div>
          <div className="sv-note" style={{ marginTop: 3 }}>₹{inr(split.perFlat)} a flat, on a forecast that exists</div>
        </div>
        <div>
          <div className="sv-eyebrow" style={{ marginBottom: 3 }}>Left behind</div>
          <div className="sv-big" style={{ color: INK3 }}>₹{inr(split.missed)}<em>{100 - pct}%</em></div>
          <div className="sv-note" style={{ marginTop: 3 }}>Only reachable by knowing the month in advance</div>
        </div>
      </div>

      <div style={{ height: 16, display: "flex", border: `1px solid ${INK}`, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: SAVED }} />
        <div style={{ flex: 1, background: "#EFEDE9", borderLeft: `1px solid ${INK}` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span className="sv-note">No control · ₹0</span>
        <span className="sv-note" style={{ color: SAVED, fontWeight: 600 }}>{pct}% captured</span>
        <span className="sv-note">Perfect foresight · ₹{inr(split.available)}</span>
      </div>

      <p className="sv-note" style={{ marginTop: 10 }}>
        The gap between the two controllers on the chart above is worth{" "}
        <b>₹{inr(split.captured)}</b> a month to sixty flats. The gap between this system and the oracle is worth{" "}
        <b>₹{inr(split.missed)}</b>, and closing it would take a forecast with no error at all — which is why the
        remaining work is calibration rather than accuracy.
      </p>
    </div>
  );
}
