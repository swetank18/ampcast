"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Series } from "@/lib/types";
import { dayLabel } from "@/lib/format";

export interface Trace {
  id: string;
  label: string;
  color: string;
  series: Series;
}

interface Props {
  traces: Trace[];
  ceilingKw: number;
  floorKva: number;
  cursor: number;
  onCursor: (i: number) => void;
  upTo: number;
  heroId: string;
}

const PAD = { l: 52, r: 14, t: 10, b: 0 };
const AXIS_H = 22;
const H_GRID = 300;
const H_BILL = 104;
const H_TEMP = 116;

function niceTicks(lo: number, hi: number, n = 4): number[] {
  const span = hi - lo;
  if (span <= 0) return [lo];
  const raw = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v);
  return out;
}

/** Billed demand as the month has seen it so far: a running maximum in kVA,
 *  floored at the tariff's minimum billing demand. It is a staircase that only
 *  ever climbs, which is exactly why one bad afternoon prices all thirty days. */
function ratchet(gridKw: number[], floorKva: number): number[] {
  const out = new Array(gridKw.length);
  let peak = 0;
  for (let i = 0; i < gridKw.length; i++) {
    const kva = gridKw[i] / 0.95;
    if (kva > peak) peak = kva;
    out[i] = Math.max(peak, floorKva);
  }
  return out;
}

export default function StripChart({ traces, ceilingKw, floorKva, cursor, onCursor, upTo, heroId }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(900);
  const dragging = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const n = traces[0]?.series.t.length ?? 0;
  const innerW = Math.max(120, w - PAD.l - PAD.r);
  const x = useCallback((i: number) => PAD.l + (i / Math.max(1, n - 1)) * innerW, [innerW, n]);

  const ratchets = useMemo(
    () => Object.fromEntries(traces.map((tr) => [tr.id, ratchet(tr.series.grid_kw, floorKva)])),
    [traces, floorKva],
  );

  const scales = useMemo(() => {
    if (!traces.length) return null;
    let gMax = ceilingKw * 1.06;
    let bMax = 0;
    let tLo = 99, tHi = -99;
    let rMin = 1e9;
    for (const tr of traces) {
      for (const v of tr.series.grid_kw) if (v > gMax) gMax = v;
      const r = ratchets[tr.id];
      const last = r[r.length - 1];
      if (last > bMax) bMax = last;
      if (r[0] < rMin) rMin = r[0];
      for (const v of tr.series.t_indoor) { if (v < tLo) tLo = v; if (v > tHi) tHi = v; }
    }
    const rLo = Math.min(rMin, floorKva) * 0.97;
    const rHi = bMax * 1.03;
    for (const v of traces[0].series.t_lo) if (v < tLo) tLo = v;
    for (const v of traces[0].series.t_hi) if (v > tHi) tHi = v;
    gMax *= 1.04;
    const pad = 0.6;
    return {
      gy: (v: number) => PAD.t + (1 - v / gMax) * (H_GRID - PAD.t - 6),
      gMax,
      by: (v: number) => PAD.t + (1 - (v - rLo) / Math.max(1e-6, rHi - rLo)) * (H_BILL - PAD.t - 6),
      rLo, rHi,
      ty: (v: number) => PAD.t + (1 - (v - (tLo - pad)) / ((tHi + pad) - (tLo - pad))) * (H_TEMP - PAD.t - 6),
      tLo: tLo - pad,
      tHi: tHi + pad,
    };
  }, [traces, ratchets, ceilingKw, floorKva]);

  /**
   * Every path is built once, for the whole month, and the replay is a clip
   * rectangle sliding across it. The previous version rebuilt a dozen
   * thousand-point paths on every animation frame, which on a laptop reads as
   * the page reloading rather than as a month playing.
   */
  const paths = useMemo(() => {
    if (!scales) return null;
    const poly = (vals: number[], y: (v: number) => number) =>
      vals.length ? vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("") : "";
    return traces.map((tr) => ({
      id: tr.id,
      color: tr.color,
      hero: tr.id === heroId,
      grid: poly(tr.series.grid_kw, scales.gy),
      bill: poly(ratchets[tr.id], scales.by),
      temp: poly(tr.series.t_indoor, scales.ty),
      breaches: tr.series.grid_kw.reduce<{ i: number; y: number }[]>((acc, v, i) => {
        if (v > ceilingKw) acc.push({ i, y: scales.gy(v) });
        return acc;
      }, []),
    }));
  }, [traces, ratchets, scales, x, heroId, ceilingKw]);

  const comfortBand = useMemo(() => {
    if (!scales || !traces.length) return "";
    const hero = traces.find((t) => t.id === heroId) ?? traces[0];
    return (
      hero.series.t_hi.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${scales.ty(v).toFixed(1)}`).join("") +
      hero.series.t_lo.map((_, k, a) => {
        const j = a.length - 1 - k;
        return `L${x(j).toFixed(1)},${scales.ty(a[j]).toFixed(1)}`;
      }).join("") + "Z"
    );
  }, [traces, scales, x, heroId]);

  const dayTicks = useMemo(() => {
    if (!traces.length) return [];
    const ts = traces[0].series.t;
    const out: { i: number; label: string }[] = [];
    let last = "";
    for (let i = 0; i < ts.length; i++) {
      const d = new Date(ts[i] * 1000);
      if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
        const lbl = dayLabel(ts[i]);
        if (lbl !== last && d.getUTCDate() % 3 === 1) { out.push({ i, label: lbl }); last = lbl; }
      }
    }
    return out;
  }, [traces]);

  const pick = useCallback(
    (clientX: number) => {
      const el = wrapRef.current;
      if (!el || n === 0) return;
      const r = el.getBoundingClientRect();
      const frac = (clientX - r.left - PAD.l) / innerW;
      onCursor(Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1)))));
    },
    [innerW, n, onCursor],
  );

  useEffect(() => {
    const move = (e: PointerEvent) => dragging.current && pick(e.clientX);
    const up = () => (dragging.current = false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [pick]);

  if (!scales || !paths || !traces.length) {
    return <div ref={wrapRef} style={{ height: 420 }} />;
  }

  const head = Math.min(upTo, n - 1);
  const revealW = Math.max(0, x(head) - PAD.l);
  const cx = x(Math.min(cursor, n - 1));
  const totalH = H_GRID + H_BILL + H_TEMP + AXIS_H;

  const axisLabel = (yy: number, text: string) => (
    <text x={PAD.l - 8} y={yy + 3} textAnchor="end" fill="var(--faint)" fontSize="9" fontFamily="var(--mono)">
      {text}
    </text>
  );

  return (
    <div
      ref={wrapRef}
      className="no-select"
      style={{ position: "relative", cursor: "crosshair", touchAction: "none" }}
      onPointerDown={(e) => { dragging.current = true; pick(e.clientX); }}
    >
      <svg width={w} height={totalH} role="img" aria-label="Grid import, running bill and indoor temperature over the billing month">
        <defs>
          {/* the forbidden region above the ceiling — instrument vernacular for a limit */}
          <pattern id="forbidden" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="transparent" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="var(--ceiling)" strokeWidth="1" opacity="0.22" />
          </pattern>
          <clipPath id="plot">
            <rect x={PAD.l} y={0} width={innerW} height={H_GRID} />
          </clipPath>
          {/* the replay head: everything drawn so far lives inside this rect */}
          <clipPath id="reveal">
            <rect x={PAD.l} y={0} width={revealW} height={totalH} />
          </clipPath>
        </defs>

        {/* ---------------------------------------------------- panel 1: kW */}
        <g>
          {niceTicks(0, scales.gMax, 4).map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={w - PAD.r} y1={scales.gy(v)} y2={scales.gy(v)} stroke="var(--rule)" strokeWidth="1" />
              {axisLabel(scales.gy(v), String(Math.round(v)))}
            </g>
          ))}

          <g clipPath="url(#plot)">
            <rect x={PAD.l} y={0} width={innerW} height={scales.gy(ceilingKw)} fill="url(#forbidden)" />
          </g>

          <g clipPath="url(#reveal)">
            {paths.map((p) => (
              <path
                key={p.id}
                d={p.grid}
                fill="none"
                stroke={p.color}
                strokeWidth={p.hero ? 1.7 : 1.1}
                strokeOpacity={p.hero ? 1 : 0.82}
                strokeLinejoin="round"
              />
            ))}
            {paths.map((p) =>
              p.breaches.map((b) => (
                <path
                  key={`${p.id}-${b.i}`}
                  d={`M${x(b.i) - 4},${b.y - 9} L${x(b.i) + 4},${b.y - 9} L${x(b.i)},${b.y - 2} Z`}
                  fill={p.color}
                  stroke="var(--void)"
                  strokeWidth="0.6"
                />
              )),
            )}
          </g>

          <line
            x1={PAD.l} x2={w - PAD.r}
            y1={scales.gy(ceilingKw)} y2={scales.gy(ceilingKw)}
            stroke="var(--ceiling)" strokeWidth="1.6" strokeDasharray="7 4"
          />
          <text x={PAD.l + 6} y={scales.gy(ceilingKw) - 6} fill="var(--ceiling)" fontSize="9.5" fontFamily="var(--mono)" fontWeight="600" letterSpacing="0.1em">
            DEMAND CEILING {Math.round(ceilingKw)} kW
          </text>
          <text x={PAD.l - 8} y={12} textAnchor="end" fill="var(--dim)" fontSize="9" fontFamily="var(--mono)" fontWeight="600">kW</text>
        </g>

        {/* ------------------------------------- panel 2: the ratchet, kVA */}
        <g transform={`translate(0, ${H_GRID})`}>
          <line x1={PAD.l} x2={w - PAD.r} y1={0} y2={0} stroke="var(--rule-2)" strokeWidth="1" />
          <line x1={PAD.l} x2={w - PAD.r} y1={scales.by(floorKva)} y2={scales.by(floorKva)} stroke="var(--rule-2)" strokeWidth="1" strokeDasharray="2 3" />
          <g clipPath="url(#reveal)">
            {paths.map((p) => (
              <path key={p.id} d={p.bill} fill="none" stroke={p.color} strokeWidth={p.hero ? 1.9 : 1.2} strokeOpacity={p.hero ? 1 : 0.8} />
            ))}
          </g>
          {axisLabel(scales.by(scales.rHi), `${Math.round(scales.rHi)}`)}
          {axisLabel(scales.by(floorKva), `${Math.round(floorKva)}`)}
          <text x={PAD.l - 8} y={12} textAnchor="end" fill="var(--dim)" fontSize="9" fontFamily="var(--mono)" fontWeight="600">kVA</text>
          <text x={w - PAD.r - 4} y={13} textAnchor="end" fill="var(--faint)" fontSize="8.5" fontFamily="var(--mono)" letterSpacing="0.09em">
            BILLED DEMAND SO FAR — CLIMBS ONLY
          </text>
        </g>

        {/* ------------------------------------------ panel 3: indoor °C */}
        <g transform={`translate(0, ${H_GRID + H_BILL})`}>
          <line x1={PAD.l} x2={w - PAD.r} y1={0} y2={0} stroke="var(--rule-2)" strokeWidth="1" />
          <path d={comfortBand} fill="var(--ours)" fillOpacity="0.07" stroke="var(--rule-2)" strokeWidth="0.7" />
          <g clipPath="url(#reveal)">
            {paths.map((p) => (
              <path key={p.id} d={p.temp} fill="none" stroke={p.color} strokeWidth={p.hero ? 1.5 : 1} strokeOpacity={p.hero ? 1 : 0.75} />
            ))}
          </g>
          {axisLabel(scales.ty(scales.tHi - 0.6), `${Math.round(scales.tHi - 0.6)}`)}
          {axisLabel(scales.ty(scales.tLo + 0.6), `${Math.round(scales.tLo + 0.6)}`)}
          <text x={PAD.l - 8} y={12} textAnchor="end" fill="var(--dim)" fontSize="9" fontFamily="var(--mono)" fontWeight="600">°C</text>
        </g>

        {/* ------------------------------------------------------- x axis */}
        <g transform={`translate(0, ${H_GRID + H_BILL + H_TEMP})`}>
          <line x1={PAD.l} x2={w - PAD.r} y1={0} y2={0} stroke="var(--rule-2)" strokeWidth="1" />
          {dayTicks.map((t) => (
            <g key={t.i}>
              <line x1={x(t.i)} x2={x(t.i)} y1={0} y2={4} stroke="var(--rule-2)" strokeWidth="1" />
              <text x={x(t.i)} y={15} textAnchor="middle" fill="var(--faint)" fontSize="9" fontFamily="var(--mono)">{t.label}</text>
            </g>
          ))}
        </g>

        {/* -------------------------------------------------- time cursor */}
        <line x1={cx} x2={cx} y1={0} y2={H_GRID + H_BILL + H_TEMP} stroke="var(--ink-hi)" strokeWidth="1" strokeOpacity="0.45" />
        {traces.map((tr) => {
          const v = tr.series.grid_kw[Math.min(cursor, n - 1)];
          if (!Number.isFinite(v)) return null;
          return (
            <circle key={tr.id} cx={cx} cy={scales.gy(v)} r={tr.id === heroId ? 3 : 2} fill={tr.color} stroke="var(--void)" strokeWidth="1" />
          );
        })}
      </svg>
    </div>
  );
}
