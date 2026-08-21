"use client";

/* =============================================================================
 * The society view.
 *
 * Two treatments over one schema: an isometric estate and a 2D tile grid. The
 * renderer computes nothing — it is handed a Day, a clock and sixty homes, and
 * draws them. Swap with G; both read the same homeState().
 * ========================================================================== */

import { CEILING, Home, HomeState, Sky, tally, homeState, type Day } from "./model";

/* ------------------------------------------------------------ iso geometry */

const HW = 48;          // half width of a plot diamond
const HH = 27;          // half height
const OX = 636;
const OY = 92;
const ROAD = 1.05;      // plots of gap between the two towers

type Pt = [number, number];

function plot(col: number, row: number): Pt {
  const cc = col + (col >= 3 ? ROAD : 0);
  return [OX + (cc - row) * HW, OY + (cc + row) * HH];
}

/** A point in plot space, so the plate and the road use the same projection. */
function iso(cc: number, row: number): Pt {
  return [OX + (cc - row) * HW, OY + (cc + row) * HH];
}

const poly = (pts: Pt[]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

/* Mix two hex colours. Used to tint roofs and ground by time of day rather
 * than stacking translucent overlays, which muddies the ink palette. */
function mix(a: string, b: string, w: number): string {
  const hx = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const [r1, g1, b1] = hx(a);
  const [r2, g2, b2] = hx(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * w).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

const ROOF_BASE = { terracotta: "#B4593C", slate: "#5A646E" } as const;

const STATE_COLOUR: Record<HomeState, string> = {
  normal: "#8E9683",
  shifting: "#2E6BA8",
  drawing: "#C4392B",
  opted: "#C9C4B8",
  offline: "#7C7A74",
};

/* -------------------------------------------------------------- one house */

function House({
  home, state, sky, dark, onOpen,
}: {
  home: Home; state: HomeState; sky: Sky; dark: boolean; onOpen: (h: Home) => void;
}) {
  const [px, py] = plot(home.col, home.row);
  const hw = 19, hh = 10.5, H = 23, rise = 14;

  const T: Pt = [px, py - hh], R: Pt = [px + hw, py], B: Pt = [px, py + hh], L: Pt = [px - hw, py];
  const Tu: Pt = [T[0], T[1] - H], Ru: Pt = [R[0], R[1] - H], Bu: Pt = [B[0], B[1] - H], Lu: Pt = [L[0], L[1] - H];
  const M1: Pt = [px - hw / 2, py - hh / 2 - H - rise];
  const M2: Pt = [px + hw / 2, py + hh / 2 - H - rise];

  const faded = state === "opted" || state === "offline";
  const roofBase = ROOF_BASE[home.roof];
  const lit = sky.sun;
  const roofA = mix(mix(roofBase, "#2A2E33", 1 - lit), sky.bottom, 0.12);
  const roofB = mix(roofA, "#000000", 0.22);
  const gable = mix(roofA, "#FFFFFF", 0.06 * lit);
  const wallR = mix(mix("#E6DFD2", "#2C3038", 1 - lit), sky.bottom, 0.08);
  const wallL = mix(wallR, "#000000", 0.2);

  // window panes on the two visible walls
  const onRight = (u: number, v: number): Pt => [B[0] + u * (R[0] - B[0]), B[1] + u * (R[1] - B[1]) - v * H];
  const onLeft = (u: number, v: number): Pt => [L[0] + u * (B[0] - L[0]), L[1] + u * (B[1] - L[1]) - v * H];
  const winR = poly([onRight(0.3, 0.3), onRight(0.7, 0.3), onRight(0.7, 0.74), onRight(0.3, 0.74)]);
  const winL = poly([onLeft(0.3, 0.3), onLeft(0.7, 0.3), onLeft(0.7, 0.74), onLeft(0.3, 0.74)]);

  const glow = state === "offline" ? 0 : sky.warmth;
  const paneOn = mix("#3B4048", "#FFCE7A", glow);
  const paneOff = mix("#3B4048", "#BFD2DE", lit * 0.85);
  const pane = glow > 0.15 ? paneOn : paneOff;

  // rooftop panel on the sunlit slope
  const onRoof = (s: number, w: number): Pt => [
    M1[0] + s * (M2[0] - M1[0]) + w * (Tu[0] - M1[0]),
    M1[1] + s * (M2[1] - M1[1]) + w * (Tu[1] - M1[1]),
  ];
  const panel = poly([onRoof(0.16, 0.26), onRoof(0.84, 0.26), onRoof(0.84, 0.82), onRoof(0.16, 0.82)]);

  return (
    <g className="sv-home" opacity={faded ? 0.52 : 1} onClick={() => onOpen(home)}>
      <title>{`${home.flat} — ${home.archetype}`}</title>
      {/* footprint shadow */}
      <polygon points={poly([[T[0], T[1] + 3], [R[0], R[1] + 3], [B[0], B[1] + 3], [L[0], L[1] + 3]])}
        fill="#000" opacity={0.06 + 0.1 * lit} />
      {/* walls */}
      <polygon points={poly([L, B, Bu, Lu])} fill={wallL} />
      <polygon points={poly([B, R, Ru, Bu])} fill={wallR} />
      {/* windows */}
      <polygon points={winL} fill={mix(pane, "#000000", 0.18)} />
      <polygon points={winR} fill={pane} />
      {/* roof */}
      <polygon points={poly([Tu, Ru, M2, M1])} fill={roofA} />
      <polygon points={poly([Ru, Bu, M2])} fill={gable} />
      <polygon points={poly([Lu, Bu, M2, M1])} fill={roofB} />
      {home.pv && <polygon points={panel} fill={mix("#20262F", sky.panel, 0.35 + 0.65 * lit)} opacity={0.95} />}
      {/* state marks */}
      {state === "shifting" && (
        <ellipse cx={px} cy={py + hh * 0.55} rx={hw + 9} ry={hh + 5} fill="none"
          stroke={STATE_COLOUR.shifting} strokeWidth={2} opacity={0.95} />
      )}
      {state === "drawing" && (
        <>
          <ellipse cx={px} cy={py + hh * 0.55} rx={hw + 9} ry={hh + 5} fill="none"
            stroke={STATE_COLOUR.drawing} strokeWidth={2} opacity={0.9} />
          <polygon points={poly([[px, M1[1] - 12], [px - 4, M1[1] - 5], [px + 4, M1[1] - 5]])}
            fill={STATE_COLOUR.drawing} />
        </>
      )}
      {state === "offline" && (
        <g stroke="#F6F5F3" strokeWidth={1.6} opacity={0.75}>
          <line x1={px - 5} y1={py - H - 4} x2={px + 5} y2={py - H + 6} />
          <line x1={px + 5} y1={py - H - 4} x2={px - 5} y2={py - H + 6} />
        </g>
      )}
      <polygon className="sv-hit" points={poly([T, R, B, L])} fill="transparent" stroke="none" />
    </g>
  );
}

/* ------------------------------------------------ the shared connection node */

function ConnectionNode({ load, dark }: { load: number; dark: boolean }) {
  const x = 58, y = 300, w = 26, h = 168;
  const frac = Math.min(1, load / (CEILING * 1.12));
  const tick = 1 - CEILING / (CEILING * 1.12);
  const over = load > CEILING;
  const ink = dark ? "#E7E4DE" : "#111111";

  return (
    <g>
      <text x={x} y={y - 12} fontSize={10.5} letterSpacing="1.4" fill={ink} opacity={0.75}>
        SHARED CONNECTION
      </text>
      <rect x={x} y={y} width={w} height={h} fill={dark ? "#20242B" : "#EFEDE9"} stroke={ink} strokeWidth={1} opacity={0.9} />
      <rect x={x + 1} y={y + h - (h - 2) * frac} width={w - 2} height={(h - 2) * frac}
        fill={over ? "#C4392B" : dark ? "#8E9683" : "#111111"} />
      <line x1={x - 7} y1={y + h * tick} x2={x + w + 7} y2={y + h * tick}
        stroke="#C4392B" strokeWidth={1.5} />
      <text x={x + w + 11} y={y + h * tick + 3.5} fontSize={10.5} fill="#C4392B" fontWeight={600}>
        92 kVA
      </text>
      <text x={x} y={y + h + 15} fontSize={15} fontWeight={600} fill={over ? "#C4392B" : ink}>
        {load.toFixed(1)}
      </text>
      <text x={x + 34} y={y + h + 15} fontSize={10.5} fill={ink} opacity={0.6}>kVA now</text>
      {/* the transformer itself */}
      <g transform={`translate(${x + 74}, ${y + h - 26})`}>
        <polygon points="0,-14 24,0 0,14 -24,0" fill={dark ? "#2A2F37" : "#C9C4B8"} stroke={ink} strokeWidth={0.8} />
        <polygon points="-24,0 0,14 0,-4 -24,-18" fill={dark ? "#20242B" : "#B0AA9C"} />
        <polygon points="24,0 0,14 0,-4 24,-18" fill={dark ? "#262B33" : "#BDB7A9"} />
        <polygon points="0,-4 -24,-18 0,-32 24,-18" fill={dark ? "#333943" : "#D6D0C2"} />
      </g>
    </g>
  );
}

/* -------------------------------------------------------------- streetlight */

function Streetlight({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <g>
      {on && <ellipse cx={x} cy={y + 2} rx={34} ry={19} fill="#FFCE7A" opacity={0.13} />}
      <line x1={x} y1={y} x2={x} y2={y - 34} stroke="#4A4E55" strokeWidth={2} />
      <circle cx={x} cy={y - 36} r={3.4} fill={on ? "#FFCE7A" : "#4A4E55"} />
    </g>
  );
}

/* ------------------------------------------------------------ the iso scene */

export function IsoScene({
  homes, day, t, override, sky, onOpen, width = 1100, height = 536,
}: {
  homes: Home[]; day: Day; t: number; override: boolean; sky: Sky;
  onOpen: (h: Home) => void; width?: number; height?: number;
}) {
  const dark = day.sc.outageAt !== null && t >= day.sc.outageAt;
  const lightsOn = !dark && sky.warmth > 0.4;

  const plate = poly([iso(-1.35, -1.35), iso(7.4, -1.35), iso(7.4, 10.35), iso(-1.35, 10.35)]);
  const road = poly([iso(2.55, -1.35), iso(3.5, -1.35), iso(3.5, 10.35), iso(2.55, 10.35)]);

  const sorted = [...homes].sort((a, b) => {
    const da = a.col + (a.col >= 3 ? ROAD : 0) + a.row;
    const db = b.col + (b.col >= 3 ? ROAD : 0) + b.row;
    return da - db;
  });

  const load = day.plan[t];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img"
      aria-label={`Anna Nagar Residency at ${Math.floor(t / 4)} hours, sixty flats`}>
      <defs>
        <linearGradient id="sv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky.top} />
          <stop offset="100%" stopColor={sky.bottom} />
        </linearGradient>
      </defs>

      <rect width={width} height={height} fill="url(#sv-sky)" />
      {sky.sun > 0.3 && !dark && (
        <circle cx={width - 150} cy={72 + (1 - sky.sun) * 90} r={20 + 10 * sky.sun}
          fill={sky.sun > 0.75 ? "#FFF3D8" : "#F3C57E"} opacity={0.85} />
      )}
      {dark && (
        <g fill="#F6F5F3" opacity={0.55}>
          {[[180, 48], [320, 92], [470, 40], [640, 78], [820, 52], [960, 96], [1040, 44]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={1.1} />
          ))}
        </g>
      )}

      {/* the plate the estate sits on */}
      <polygon points={plate} fill={sky.plate} />
      <polygon points={plate} fill="none" stroke="#00000022" strokeWidth={1} />
      {/* planting bands along the outer edge */}
      <polygon points={poly([iso(-1.35, -1.35), iso(7.4, -1.35), iso(7.4, -0.85), iso(-1.35, -0.85)])} fill={sky.grass} opacity={0.85} />
      <polygon points={poly([iso(-1.35, 9.85), iso(7.4, 9.85), iso(7.4, 10.35), iso(-1.35, 10.35)])} fill={sky.grass} opacity={0.85} />
      {/* the road */}
      <polygon points={road} fill={sky.road} />
      {[0.3, 2.4, 4.5, 6.6, 8.7].map((r) => {
        const a = iso(2.72, r), b = iso(3.33, r);
        return <line key={r} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#F6F5F3" strokeWidth={1.4} opacity={0.42} />;
      })}

      {/* streetlights down the road */}
      {[0.2, 3.1, 6.0, 8.9].map((r) => {
        const p = iso(2.45, r);
        return <Streetlight key={r} x={p[0]} y={p[1]} on={lightsOn} />;
      })}

      {sorted.map((h) => (
        <House key={h.i} home={h} state={homeState(h, t, day, override)} sky={sky} dark={dark} onOpen={onOpen} />
      ))}

      <ConnectionNode load={dark ? 17.5 : load} dark={dark} />

      {dark && (
        <text x={width - 24} y={height - 20} textAnchor="end" fontSize={12.5} fill="#F6F5F3" opacity={0.85}>
          Feeder trip 19:30 · lifts, fire panel and water pumps on backup
        </text>
      )}
    </svg>
  );
}

/* ------------------------------------------------------ the 2D tile fallback */

export function TileScene({
  homes, day, t, override, onOpen, width = 1100, height = 536,
}: {
  homes: Home[]; day: Day; t: number; override: boolean; onOpen: (h: Home) => void;
  width?: number; height?: number;
}) {
  const cw = 116, ch = 40, gap = 8, roadW = 34;
  const gridW = 6 * cw + 5 * gap + roadW;
  const gridH = 10 * ch + 9 * gap;
  const ox = (width - gridW) / 2 + 40;
  const oy = (height - gridH) / 2;
  const dark = day.sc.outageAt !== null && t >= day.sc.outageAt;
  const load = dark ? 17.5 : day.plan[t];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img"
      aria-label="Anna Nagar Residency, tile view">
      <rect width={width} height={height} fill="#EFEDE9" />
      <rect x={ox + 3 * cw + 3 * gap - 2} y={oy - 10} width={roadW} height={gridH + 20} fill="#DAD6CE" />
      {homes.map((h) => {
        const state = homeState(h, t, day, override);
        const x = ox + h.col * (cw + gap) + (h.col >= 3 ? roadW : 0);
        const y = oy + h.row * (ch + gap);
        const fill = state === "normal" ? "#FFFFFF" : STATE_COLOUR[state];
        const ink = state === "normal" || state === "opted" ? "#111111" : "#FFFFFF";
        return (
          <g key={h.i} className="sv-home" onClick={() => onOpen(h)} opacity={state === "opted" ? 0.6 : 1}>
            <title>{`${h.flat} — ${h.archetype}`}</title>
            <rect x={x} y={y} width={cw} height={ch} rx={2} fill={fill} stroke="#111111" strokeWidth={state === "normal" ? 0.7 : 0} />
            <text x={x + 9} y={y + 17} fontSize={12.5} fontWeight={600} fill={ink}>{h.flat}</text>
            <text x={x + 9} y={y + 31} fontSize={10.5} fill={ink} opacity={0.7}>
              {state === "normal" ? h.archetype.slice(0, 18) : state === "shifting" ? "shifting now" : state === "drawing" ? "drawing hard" : state === "opted" ? "opted out" : "offline"}
            </text>
          </g>
        );
      })}
      <ConnectionNode load={load} dark={false} />
    </svg>
  );
}

/* ------------------------------------------------------------ live legend */

export function SceneLegend({ homes, day, t, override }: { homes: Home[]; day: Day; t: number; override: boolean }) {
  const counts = tally(homes, t, day, override);
  const order: HomeState[] = ["normal", "shifting", "drawing", "opted", "offline"];
  const label: Record<HomeState, string> = {
    normal: "normal", shifting: "shifting now", drawing: "drawing hard", opted: "opted out", offline: "offline",
  };
  return (
    <div className="sv-legend">
      {order.map((k) => (
        <span key={k}>
          <i style={{ background: STATE_COLOUR[k], border: k === "normal" ? "1px solid #111" : "none" }} />
          <b>{counts[k]}</b> {label[k]}
        </span>
      ))}
    </div>
  );
}

export { STATE_COLOUR };
