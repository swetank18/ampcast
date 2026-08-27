/**
 * Charts for the comparative benchmark.
 *
 * Same rule as the rest of the site: colour is functional, never decorative.
 * Here the functional axis is climate — the hot end of the ladder owns the warm
 * colours because that is where the controllable load lives, and the cold end is
 * neutral ink because that is where there is nothing to shift. `--ours` stays
 * reserved for our own model, as everywhere else.
 *
 * Everything is a server component rendering inline SVG. No chart library, no
 * client bundle, and the numbers arrive as data from eval/comparative_web.py.
 */
import type { Row, SiteRow } from "@/lib/comparativeTypes";

const OURS = "lightgbm_quantile";

/** Warm for cooling-dominated, neutral for heating-dominated. */
export function climateColour(cddShare: number | null): string {
  if (cddShare === null) return "var(--nocontrol)";
  if (cddShare >= 0.7) return "var(--breach)";
  if (cddShare >= 0.25) return "var(--warn)";
  if (cddShare >= 0.05) return "var(--nocontrol)";
  return "var(--faint)";
}

export const FLAG: Record<string, string> = {
  US: "USA", GB: "UK", IE: "Ireland", IN: "India", CA: "Canada",
  DE: "Germany", FR: "France", ES: "Spain",
};

function Axis({ label }: { label: string }) {
  return <div className="note" style={{ marginTop: 6, color: "var(--dim)" }}>{label}</div>;
}

/* ------------------------------------------------------- the site ladder */

export function SiteLadder({ sites }: { sites: SiteRow[] }) {
  const max = Math.max(...sites.map((s) => s.metered), 1);
  return (
    <div style={{ display: "grid", gap: 3 }}>
      {sites.map((s) => {
        const passW = (s.passes / max) * 100;
        const heatW = (s.heating / max) * 100;
        return (
          <div key={s.site} style={{ display: "grid", gridTemplateColumns: "84px 46px 1fr 96px", gap: 8, alignItems: "center" }}>
            <span style={{ font: "500 11px/1 var(--mono)", color: "var(--ink-hi)" }}>{s.site}</span>
            <span style={{ font: "400 10px/1 var(--mono)", color: "var(--dim)" }}>{FLAG[s.country] ?? s.country}</span>
            <div style={{ position: "relative", height: 14, background: "var(--idle)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, width: `${passW}%`, background: climateColour(s.cddShare) }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${passW}%`, width: `${heatW}%`, background: "var(--rule-2)" }} />
            </div>
            <span style={{ font: "400 10px/1 var(--mono)", color: "var(--dim)", textAlign: "right" }}>
              {s.passes}<span style={{ color: "var(--faint)" }}>+{s.heating}</span> / {s.metered}
            </span>
          </div>
        );
      })}
      <Axis label="Solid = passes the Fox selection rule. Grey = passes everything except the positive load-temperature clause, i.e. heating-dominated. Sites ordered by cooling-degree-day share, hot to cold." />
    </div>
  );
}

/* ----------------------------------------- controllable fraction vs climate */

export function ControllableFraction({ rows }: { rows: Row[] }) {
  const d = rows.filter((r) => r.hvacShare !== null && r.cddShare !== null)
                .sort((a, b) => (b.cddShare! - a.cddShare!));
  if (!d.length) return null;
  const max = Math.max(...d.map((r) => r.hvacShare!));
  return (
    <div style={{ display: "grid", gap: 2 }}>
      {d.map((r) => (
        <div key={r.id} style={{ display: "grid", gridTemplateColumns: "150px 1fr 58px", gap: 8, alignItems: "center" }}>
          <span style={{ font: "400 10px/1.3 var(--mono)", color: "var(--ink)" }}>
            {r.site} <span style={{ color: "var(--faint)" }}>{r.usage?.replace("Entertainment/public assembly", "assembly").replace("Lodging/residential", "lodging")}</span>
          </span>
          <div style={{ height: 12, background: "var(--idle)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(r.hvacShare! / max) * 100}%`, background: climateColour(r.cddShare) }} />
          </div>
          <span className="num" style={{ font: "500 10.5px/1 var(--mono)", color: "var(--ink-hi)", textAlign: "right" }}>
            {(r.hvacShare! * 100).toFixed(1)}%
          </span>
        </div>
      ))}
      <Axis label="Fitted HVAC share of the electricity meter — the fraction of load the controller could actually move. Colour is the site's cooling-degree-day share." />
    </div>
  );
}

/* ------------------------------------------------------------ skill bars */

export function SkillBars({ rows, highlight }: { rows: Row[]; highlight?: string }) {
  const d = rows.filter((r) => r.models?.[OURS]?.skill != null)
                .sort((a, b) => (b.models[OURS].skill! - a.models[OURS].skill!));
  if (!d.length) return null;
  const vals = d.map((r) => r.models[OURS].skill!);
  const hi = Math.max(...vals, 0.05), lo = Math.min(...vals, 0);
  const span = hi - lo || 1;
  const zero = ((0 - lo) / span) * 100;
  return (
    <div style={{ display: "grid", gap: 2 }}>
      {d.map((r) => {
        const v = r.models[OURS].skill!;
        const isHi = highlight && r.id === highlight;
        const w = (Math.abs(v) / span) * 100;
        const left = v >= 0 ? zero : zero - w;
        return (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "150px 1fr 54px", gap: 8, alignItems: "center" }}>
            <span style={{ font: `${isHi ? 600 : 400} 10px/1.3 var(--mono)`, color: isHi ? "var(--ours)" : "var(--ink)" }}>
              {r.tier === 2 ? (FLAG[r.country] ?? r.country) : `${r.site} ${r.usage?.slice(0, 9)}`}
            </span>
            <div style={{ position: "relative", height: 12, background: "var(--idle)", borderRadius: 2 }}>
              <div style={{ position: "absolute", left: `${zero}%`, top: -1, bottom: -1, width: 1, background: "var(--rule-2)" }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${left}%`, width: `${w}%`,
                            background: isHi ? "var(--ours)" : v >= 0 ? "var(--forecast)" : "var(--ceiling)", borderRadius: 2 }} />
            </div>
            <span className="num" style={{ font: "500 10.5px/1 var(--mono)", color: isHi ? "var(--ours)" : "var(--ink-hi)", textAlign: "right" }}>
              {v >= 0 ? "+" : ""}{v.toFixed(3)}
            </span>
          </div>
        );
      })}
      <Axis label="Skill = 1 − pinball(ours) / pinball(seasonal naive), computed inside each series' own data and period. Zero means the model is worth nothing over what a site can do on day one with no model at all." />
    </div>
  );
}

/* ------------------------------------------ the mirror: load vs temperature */

export function TempCorrelation({ rows }: { rows: Row[] }) {
  const d = rows.filter((r) => r.corrTemp !== null).sort((a, b) => b.corrTemp! - a.corrTemp!);
  if (!d.length) return null;
  const span = 1.6;             // -0.8 .. +0.8
  const zero = 50;
  return (
    <div style={{ display: "grid", gap: 3 }}>
      {d.map((r) => {
        const v = r.corrTemp!;
        const w = (Math.abs(v) / span) * 100;
        const left = v >= 0 ? zero : zero - w;
        const cooling = v >= 0;
        return (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "78px 1fr 52px", gap: 8, alignItems: "center" }}>
            <span style={{ font: `${r.country === "IN" ? 600 : 400} 11px/1 var(--mono)`, color: r.country === "IN" ? "var(--ours)" : "var(--ink)" }}>
              {FLAG[r.country] ?? r.country}
            </span>
            <div style={{ position: "relative", height: 16, background: "var(--idle)", borderRadius: 2 }}>
              <div style={{ position: "absolute", left: `${zero}%`, top: -2, bottom: -2, width: 1, background: "var(--rule-2)" }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${left}%`, width: `${w}%`,
                            background: cooling ? "var(--breach)" : "var(--mpc-mean)", borderRadius: 2 }} />
            </div>
            <span className="num" style={{ font: "500 11px/1 var(--mono)", color: "var(--ink-hi)", textAlign: "right" }}>
              {v >= 0 ? "+" : ""}{v.toFixed(2)}
            </span>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
        <span className="note"><i style={{ display: "inline-block", width: 8, height: 8, background: "var(--breach)", marginRight: 5 }} />demand rises with heat — cooling-driven</span>
        <span className="note"><i style={{ display: "inline-block", width: 8, height: 8, background: "var(--mpc-mean)", marginRight: 5 }} />demand rises with cold — heating-driven</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- coverage dots */

export function CoverageDots({ rows }: { rows: Row[] }) {
  const d = rows.filter((r) => r.models?.[OURS]?.cov90 != null)
                .sort((a, b) => a.models[OURS].cov90! - b.models[OURS].cov90!);
  if (!d.length) return null;
  const lo = 0.6, hi = 1.0;
  const x = (v: number) => ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * 100;
  return (
    <div style={{ display: "grid", gap: 2 }}>
      {d.map((r) => {
        const v = r.models[OURS].cov90!;
        const bad = v < 0.85;
        return (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "150px 1fr 50px", gap: 8, alignItems: "center" }}>
            <span style={{ font: `${bad ? 600 : 400} 10px/1.3 var(--mono)`, color: bad ? "var(--ceiling)" : "var(--ink)" }}>
              {r.tier === 2 ? (FLAG[r.country] ?? r.country) : `${r.site} ${r.usage?.slice(0, 9)}`}
            </span>
            <div style={{ position: "relative", height: 14 }}>
              <div style={{ position: "absolute", inset: "6px 0", background: "var(--idle)", borderRadius: 2 }} />
              {/* nominal 0.90 */}
              <div style={{ position: "absolute", left: `${x(0.9)}%`, top: 0, bottom: 0, width: 1, background: "var(--forecast)" }} />
              <div style={{ position: "absolute", left: `calc(${x(v)}% - 4px)`, top: 3, width: 8, height: 8,
                            borderRadius: "50%", background: bad ? "var(--ceiling)" : "var(--ours)" }} />
            </div>
            <span className="num" style={{ font: "500 10.5px/1 var(--mono)", color: bad ? "var(--ceiling)" : "var(--ink-hi)", textAlign: "right" }}>
              {v.toFixed(3)}
            </span>
          </div>
        );
      })}
      <Axis label="Empirical coverage of the nominal 90% interval after conformal calibration. The green line is 0.90. Anything well left of it means the interval is too narrow — and the q95 that holds the demand ceiling is the same object." />
    </div>
  );
}
