"use client";

/**
 * The ablation, as an instrument rather than a table.
 *
 * Section 8 of the plan asks for three things in the interface: the forecast fan
 * ahead of the load, a live calibration readout, and a switch that swaps the
 * forecaster and re-runs the day. They are one control here, because they are
 * one argument: swap the model out on stage and watch the ceiling go.
 *
 * Nothing is simulated in the browser. Each option is a month that
 * `eval/ablation.py` already ran with the optimiser, the tariff, the physics and
 * the seed held fixed, so what you see when you flip the switch is the
 * experiment, not an animation of one.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AblationIndexEntry, AblationRun } from "@/lib/types";
import { inr, stamp } from "@/lib/format";

const OURS = "lightgbm_quantile";
const PAD = { l: 46, r: 12, t: 10 };
const H_LOAD = 210;
const H_BAND = 150;
const AXIS_H = 20;

/** Ours is the only cool highlight; anything that breaches owns the hot end. */
function colourFor(key: string, breaches: number): string {
  if (key === OURS) return "var(--ours)";
  if (key === "perfect_foresight") return "var(--oracle)";
  return breaches > 0 ? "var(--breach)" : "var(--mpc-mean)";
}

function ticks(lo: number, hi: number, n = 4): number[] {
  const raw = (hi - lo) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v);
  return out;
}

export default function ForecastSwitch({
  index, ceilingKw, demandRate,
}: {
  index: AblationIndexEntry[];
  ceilingKw: number;
  demandRate: number;
}) {
  const [key, setKey] = useState(OURS);
  const [runs, setRuns] = useState<Record<string, AblationRun>>({});
  const [failed, setFailed] = useState<string[]>([]);
  // refs so the background prefetch can see what has already arrived without
  // restarting itself every time one does
  const runsRef = useRef(runs);
  const failedRef = useRef(failed);
  runsRef.current = runs;
  failedRef.current = failed;
  const [cursor, setCursor] = useState(0);
  const [head, setHead] = useState(1e9);
  const [playing, setPlaying] = useState(false);
  const [w, setW] = useState(900);
  const wrap = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  const dragging = useRef(false);

  // `#f=persistence` opens straight into one forecaster, and clicking writes the
  // hash back. On stage that is a bookmark that survives a click going astray;
  // in review it is a link to the exact view being argued about.
  useEffect(() => {
    const want = new URLSearchParams(window.location.hash.slice(1)).get("f");
    if (want && index.some((e) => e.key === want)) setKey(want);
  }, [index]);

  const choose = useCallback((k: string) => {
    setKey(k);
    history.replaceState(null, "", `#f=${k}`);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // load on demand, and always keep ours behind as the reference trace. One
  // failed file must not take the other down with it -- a missing export should
  // cost you that one row, and say so, rather than leave the panel spinning.
  useEffect(() => {
    let cancelled = false;
    const want = [key, OURS].filter((k, i, a) => a.indexOf(k) === i && !runs[k]);
    if (!want.length) return;
    want.forEach(async (k) => {
      try {
        const res = await fetch(`/data/ablation/${k}.json`);
        if (!res.ok) throw new Error(String(res.status));
        const run = (await res.json()) as AblationRun;
        if (!cancelled) setRuns((r) => (r[k] ? r : { ...r, [k]: run }));
      } catch {
        if (!cancelled) setFailed((f) => (f.includes(k) ? f : [...f, k]));
      }
    });
    return () => { cancelled = true; };
  }, [key, runs]);

  // Then quietly pull the other six in the background, one at a time. Eight
  // months come to about 1.4 MB in total, and having them resident means the
  // switch is instant on stage rather than a blank panel over a conference
  // network — which is the difference between a demo and an apology.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const e of index) {
        if (cancelled) return;
        if (runsRef.current[e.key] || failedRef.current.includes(e.key)) continue;
        try {
          const res = await fetch(`/data/ablation/${e.key}.json`);
          if (!res.ok) throw new Error(String(res.status));
          const run = (await res.json()) as AblationRun;
          if (!cancelled) setRuns((r) => (r[e.key] ? r : { ...r, [e.key]: run }));
        } catch {
          if (!cancelled) setFailed((f) => (f.includes(e.key) ? f : [...f, e.key]));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [index]);

  const run = runs[key];
  const ref = runs[OURS];
  const n = run?.series.t.length ?? 0;

  // land on the end of the month when a run arrives, so the rolling calibration
  // readouts show a number at rest rather than the dash they would show at t=0,
  // where a 24-hour window has nothing in it yet
  useEffect(() => { setHead(1e9); setPlaying(false); }, [key]);
  useEffect(() => { if (n) setCursor(n - 1); }, [key, n]);

  useEffect(() => {
    if (!playing || !n) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setHead((h) => {
        const next = (h > n ? 0 : h) + dt * 0.09;
        if (next >= n - 1) { setPlaying(false); setCursor(n - 1); return 1e9; }
        setCursor(Math.floor(next));
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, n]);

  const innerW = Math.max(120, w - PAD.l - PAD.r);
  const x = useCallback((i: number) => PAD.l + (i / Math.max(1, n - 1)) * innerW, [innerW, n]);

  const pick = useCallback((clientX: number) => {
    const el = wrap.current;
    if (!el || !n) return;
    const r = el.getBoundingClientRect();
    onScrub(Math.max(0, Math.min(n - 1, Math.round(((clientX - r.left - PAD.l) / innerW) * (n - 1)))));
    function onScrub(i: number) { setPlaying(false); setCursor(i); }
  }, [innerW, n]);

  useEffect(() => {
    const move = (e: PointerEvent) => dragging.current && pick(e.clientX);
    const up = () => (dragging.current = false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [pick]);

  const scales = useMemo(() => {
    if (!run) return null;
    let gMax = ceilingKw * 1.08;
    for (const v of run.series.grid_kw) if (v > gMax) gMax = v;
    if (ref) for (const v of ref.series.grid_kw) if (v > gMax) gMax = v;
    gMax *= 1.03;
    const band = run.band;
    let bLo = Infinity, bHi = -Infinity;
    if (band) {
      for (const v of band.q05) if (v < bLo) bLo = v;
      for (const v of band.actual) if (v < bLo) bLo = v;
      for (const v of band.q95) if (v > bHi) bHi = v;
      for (const v of band.actual) if (v > bHi) bHi = v;
    }
    const pad = (bHi - bLo) * 0.08 || 1;
    return {
      gMax,
      gy: (v: number) => PAD.t + (1 - v / gMax) * (H_LOAD - PAD.t - 6),
      bLo: bLo - pad, bHi: bHi + pad,
      by: (v: number) => PAD.t + (1 - (v - (bLo - pad)) / ((bHi + pad) - (bLo - pad))) * (H_BAND - PAD.t - 6),
    };
  }, [run, ref, ceilingKw]);

  const upTo = Math.min(head, n - 1);
  const i = Math.min(cursor, Math.max(0, n - 1));

  const line = (vals: number[], y: (v: number) => number, limit = upTo) => {
    let d = "";
    const stop = Math.min(limit + 1, vals.length);
    for (let k = 0; k < stop; k++) d += `${k ? "L" : "M"}${x(k).toFixed(1)},${y(vals[k]).toFixed(1)}`;
    return d;
  };

  const breachesSoFar = useMemo(() => {
    if (!run) return 0;
    let c = 0;
    for (let k = 0; k <= upTo && k < run.series.grid_kw.length; k++) if (run.series.grid_kw[k] > ceilingKw) c++;
    return c;
  }, [run, upTo, ceilingKw]);

  const entry = index.find((e) => e.key === key);
  const ours = index.find((e) => e.key === OURS);
  const colour = colourFor(key, entry?.breaches ?? 0);
  const hit = run?.band?.q95_hit_24h?.[i];
  const cov = run?.band?.coverage_24h?.[i];

  return (
    <div>
      {/* ------------------------------------------------------------ switch */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
        {index.map((e) => (
          <button
            key={e.key}
            className="btn btn-ghost"
            aria-pressed={key === e.key}
            onClick={() => choose(e.key)}
            style={{ display: "flex", alignItems: "center", gap: 6, opacity: key === e.key ? 1 : 0.6 }}
          >
            <span className="swatch" style={{ background: colourFor(e.key, e.breaches), margin: 0 }} />
            <span>{e.label.replace(" (ours)", "")}</span>
            <span className="num" style={{ fontSize: 10, color: e.breaches > 0 ? "var(--ceiling)" : "var(--dim)" }}>
              {e.breaches}
            </span>
          </button>
        ))}
      </div>

      <div className="instrument">
        <div className="instrument-head">
          <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
            <span className="eyebrow">Optimiser fed by</span>
            <span className="num" style={{ fontSize: 12, color: colour }}>
              {run?.label ?? (failed.includes(key) ? "unavailable" : "loading…")}
            </span>
            <span className="num" style={{ fontSize: 10.5, color: "var(--dim)" }}>{n ? stamp(run!.series.t[i]) : ""}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-primary" onClick={() => { if (head >= n - 1) setHead(0); setPlaying((p) => !p); }}>
              {playing ? "Pause" : "Replay month"}
            </button>
            <button className="btn" onClick={() => { setPlaying(false); setHead(1e9); setCursor(n - 1); }}>Show all</button>
          </div>
        </div>

        <div
          ref={wrap}
          className="no-select"
          style={{ padding: "6px 10px 8px", cursor: "crosshair", touchAction: "none" }}
          onPointerDown={(e) => { dragging.current = true; pick(e.clientX); }}
        >
          {!run || !scales ? (
            <div style={{ height: H_LOAD + H_BAND + AXIS_H, display: "grid", placeItems: "center" }}>
              {failed.includes(key) && (
                <p className="note">
                  <b>/data/ablation/{key}.json</b> did not load. It is written by{" "}
                  <b>eval/export_web.py</b> from the run that produced the table below — the numbers in that
                  table are unaffected.
                </p>
              )}
            </div>
          ) : (
            <svg width={w} height={H_LOAD + H_BAND + AXIS_H} role="img"
                 aria-label="Grid import against the demand ceiling, and the base-load forecast band it was planned on">
              <defs>
                <pattern id="fs-forbidden" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="7" height="7" fill="transparent" />
                  <line x1="0" y1="0" x2="0" y2="7" stroke="var(--ceiling)" strokeWidth="1" opacity="0.22" />
                </pattern>
                <clipPath id="fs-plot"><rect x={PAD.l} y={0} width={innerW} height={H_LOAD} /></clipPath>
              </defs>

              {/* ------------------------------------------- panel 1: outcome */}
              {ticks(0, scales.gMax, 4).map((v) => (
                <g key={v}>
                  <line x1={PAD.l} x2={w - PAD.r} y1={scales.gy(v)} y2={scales.gy(v)} stroke="var(--rule)" strokeWidth="1" />
                  <text x={PAD.l - 8} y={scales.gy(v) + 3} textAnchor="end" fill="var(--faint)" fontSize="9" fontFamily="var(--mono)">{Math.round(v)}</text>
                </g>
              ))}
              <g clipPath="url(#fs-plot)">
                <rect x={PAD.l} y={0} width={innerW} height={scales.gy(ceilingKw)} fill="url(#fs-forbidden)" />
              </g>
              {ref && key !== OURS && (
                <path d={line(ref.series.grid_kw, scales.gy)} fill="none" stroke="var(--ours)" strokeWidth="1" strokeOpacity="0.4" />
              )}
              <path d={line(run.series.grid_kw, scales.gy)} fill="none" stroke={colour} strokeWidth="1.7" strokeLinejoin="round" />
              <line x1={PAD.l} x2={w - PAD.r} y1={scales.gy(ceilingKw)} y2={scales.gy(ceilingKw)}
                    stroke="var(--ceiling)" strokeWidth="1.6" strokeDasharray="7 4" />
              <text x={PAD.l + 6} y={scales.gy(ceilingKw) - 6} fill="var(--ceiling)" fontSize="9.5"
                    fontFamily="var(--mono)" fontWeight="600" letterSpacing="0.1em">
                DEMAND CEILING {Math.round(ceilingKw)} kW
              </text>
              {run.series.grid_kw.map((v, k) =>
                v > ceilingKw && k <= upTo ? (
                  <path key={k}
                        d={`M${x(k) - 4},${scales.gy(v) - 9} L${x(k) + 4},${scales.gy(v) - 9} L${x(k)},${scales.gy(v) - 2} Z`}
                        fill="var(--ceiling)" stroke="var(--void)" strokeWidth="0.6" />
                ) : null,
              )}
              <text x={PAD.l - 8} y={12} textAnchor="end" fill="var(--dim)" fontSize="9" fontFamily="var(--mono)" fontWeight="600">kW</text>

              {/* --------------------------------------------- panel 2: the fan */}
              <g transform={`translate(0, ${H_LOAD})`}>
                <line x1={PAD.l} x2={w - PAD.r} y1={0} y2={0} stroke="var(--rule-2)" strokeWidth="1" />
                {run.band ? (
                  <>
                    <path
                      d={
                        run.band.q95.slice(0, Math.floor(upTo) + 1).map((v, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${scales.by(v).toFixed(1)}`).join("") +
                        run.band.q05.slice(0, Math.floor(upTo) + 1).map((_, k, a) => {
                          const j = a.length - 1 - k;
                          return `L${x(j).toFixed(1)},${scales.by(run.band!.q05[j]).toFixed(1)}`;
                        }).join("") + "Z"
                      }
                      fill={colour} fillOpacity="0.15" stroke={colour} strokeOpacity="0.4" strokeWidth="0.7"
                    />
                    <path d={line(run.band.actual, scales.by)} fill="none" stroke="var(--ink-hi)" strokeWidth="1.2" />
                    <text x={PAD.l + 6} y={13} fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)" letterSpacing="0.08em">
                      BASE LOAD ONE HOUR AHEAD · BAND IS q05–q95 · WHITE IS WHAT HAPPENED
                    </text>
                  </>
                ) : (
                  <text x={PAD.l + 6} y={20} fill="var(--faint)" fontSize="9" fontFamily="var(--mono)">
                    no forecast band exported for this row
                  </text>
                )}
                <text x={PAD.l - 8} y={12} textAnchor="end" fill="var(--dim)" fontSize="9" fontFamily="var(--mono)" fontWeight="600">kW</text>
              </g>

              {/* --------------------------------------------------- the cursor */}
              <line x1={x(i)} x2={x(i)} y1={0} y2={H_LOAD + H_BAND} stroke="var(--ink-hi)" strokeWidth="1" strokeOpacity="0.45" />
              <circle cx={x(i)} cy={scales.gy(run.series.grid_kw[i])} r="3" fill={colour} stroke="var(--void)" strokeWidth="1" />
            </svg>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- readouts */}
      <div className="readout" style={{ marginTop: 10 }}>
        <div className={`metric ${breachesSoFar > 0 ? "metric-hot" : "metric-lead"}`}>
          <span className="eyebrow">Breaches so far</span>
          <strong>{breachesSoFar}</strong>
          <span className="sub">of <b>{entry?.breaches ?? 0}</b> on the month</span>
        </div>
        <div className="metric">
          <span className="eyebrow">Rolling q95 hit rate</span>
          <strong>{hit == null ? "—" : hit.toFixed(3)}</strong>
          <span className="sub">last 24 h · nominal <b>0.950</b></span>
        </div>
        <div className="metric">
          <span className="eyebrow">Rolling 90% coverage</span>
          <strong>{cov == null ? "—" : cov.toFixed(3)}</strong>
          <span className="sub">last 24 h · nominal <b>0.900</b></span>
        </div>
        <div className="metric">
          <span className="eyebrow">Month on this forecaster</span>
          <strong>₹{entry ? inr(entry.bill_inr) : "—"}</strong>
          <span className="sub">
            {key !== OURS && entry && ours
              ? <>{inr(entry.bill_inr - ours.bill_inr)} vs ours</>
              : <>the row this page&rsquo;s table calls ours</>}
          </span>
        </div>
      </div>

      <p className="note" style={{ marginTop: 9 }}>
        The cyan ghost behind the trace is our run, kept on screen so the divergence is visible rather than
        remembered. Every breach marker is a {Math.round(demandRate)}₹/kVA block: one of them, standing at the end of
        the month, prices all thirty days.
      </p>
    </div>
  );
}
