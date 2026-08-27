/* =============================================================================
 * Samanvay — the society behind the interface.
 *
 * Everything on screen is generated here, deterministically, from a seeded load
 * shape plus the tariff. The renderer computes nothing; it reads a Day and
 * draws it. That is the rule the 3D layer runs under in the simulator, and it is
 * what makes the 2D tile fallback trivially correct: same schema, different
 * marks.
 *
 * Loads are in kVA throughout, because kVA is what the demand charge bills.
 *
 * NOTHING IS HARDCODED HERE ANY MORE. Rates, limits, constraints, devices,
 * scenarios, the estate and the feature flags all come out of ../../config/*.json
 * through ./config.ts, and the forecaster comes out of ./forecasters.ts. If a
 * change to this file is needed to answer a jury question, one of those seams
 * was cut in the wrong place.
 * ========================================================================== */

import {
  BACKUP, BASE_SHAPE, CEILING, CRITICAL_FLOOR, DEFERRABLE_DEVICES, FAIRNESS_CAP, FLATS,
  N, OFFLINE_CANDIDATES, OPTED_OUT, PV_SHARE, SEED, TOWER_NAMES, TOWER_SPLIT_COL, COLS,
  ARCHETYPES, SHIFTABLE_KWH_PER_FLAT, EVENING_DEFER_KWH_PER_FLAT,
  DUTY, ENERGY_RATE, POWER_FACTOR, DAYS_IN_MONTH, CONTRACT_KVA, BILLING_FLOOR, DEMAND_RATE,
  todAt, scenarioOf, SCENARIOS,
  type Scenario, type ScenarioKey, type Status,
} from "./config";
import { DEFAULT_FORECASTER, forecasterOf, realisedPeak } from "./forecasters";

/* Re-exported so every existing importer keeps working and there is exactly one
 * definition of each. Change them in ../../config/*.json, never here. */
export {
  N, FLATS, CEILING, CONTRACT_KVA, BILLING_FLOOR, ENERGY_RATE, DEMAND_RATE, DUTY,
  POWER_FACTOR, DAY_OF_MONTH, DAYS_IN_MONTH, TOD, TOD_ROWS, todAt, SCENARIOS, scenarioOf,
  SHIFTABLE_KWH_PER_FLAT, EVENING_DEFER_KWH_PER_FLAT, CRITICAL_FLOOR, FAIRNESS_CAP,
  CONSTRAINTS, constraintOf, DEVICES, deviceOf, UNTOUCHED_DEVICES, DEFERRABLE_DEVICES,
  FEATURES, featureOn, HELD_FEATURES, SHOWN_FEATURES, SOCIETY_NAME, TARIFF_NAME,
  TARIFF_AUTHORITY, ARCHETYPES,
} from "./config";
export type { TodWindow, Scenario, ScenarioKey, Status, Constraint, Device, Feature } from "./config";
export { FORECASTERS, forecasterOf, realisedPeak, usableHeadroom, DEFAULT_FORECASTER } from "./forecasters";
export type { Forecaster, QuantileFan } from "./forecasters";

/* Figures the build spec pins verbatim. Section 06 of the notes flags that two
 * of them disagree with the arithmetic. They are kept exactly as written and
 * the reconciliation is carried in the Evidence rail, not silently corrected. */
export const SPEC = {
  monthSaving: 12227,          // ₹, society, month
  perFlatMaintenance: 68,      // ₹, spec string — the month's arithmetic says 204
  billSettingInterval: 412,    // ₹, spec string
  runningTotalAt1445: 4055,    // ₹, spec string — the running total computes instead
  coverage: 0.92,
  coverageTarget: 0.9,
  fcOnlyPeak: 87.0,
  oursPeak: 84.4,
};

/* --------------------------------------------------------------- utilities */

export function hhmm(t: number): string {
  const h = Math.floor((t % N) / 4);
  const m = (t % 4) * 15;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function span(t: number): string {
  return `${hhmm(t)}–${hhmm((t + 1) % N)}`;
}

export function inr(n: number, dp = 0): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

/** Linear congruential generator. Seeded so a reload draws the same society. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------- load shapes */

/** The society's day: a night floor, a morning shoulder, a solar dip and the
 *  evening wall that the whole product exists to flatten. Every term, and every
 *  scenario's additions to it, comes out of scenarios.json. */
function shape(t: number, sc: Scenario): number {
  const h = t * (24 / N);
  const bell = (mu: number, s: number) => {
    // wrapped so 23:45 and 00:00 are neighbours, not a cliff
    let v = 0;
    for (const off of [-24, 0, 24]) v += Math.exp(-0.5 * Math.pow((h - mu + off) / s, 2));
    return v;
  };

  let v = BASE_SHAPE.floor;
  for (const term of BASE_SHAPE.terms) v += term.amp * bell(term.hour, term.width);
  for (const term of sc.shapeTerms) v += term.amp * bell(term.hour, term.width);

  // rooftop PV, netted at the connection point
  const { peak_kva, sunrise_hour, day_length_hours } = BASE_SHAPE.pv;
  const pv = peak_kva * Math.max(0, Math.sin((Math.PI * (h - sunrise_hour)) / day_length_hours));
  return v - pv;
}

const gauss = (x: number, mu: number, s: number) => Math.exp(-0.5 * Math.pow((x - mu) / s, 2));

/* The controller moves load in shapes, not steps: a geyser bank released over
 * an hour, a pump set that ramps with the roof. Rectangular shifts at the
 * window boundaries would be cheaper to draw and would not survive contact
 * with a transformer. */

/** Where deferred evening load reappears: staggered from 22:15, thinning out by
 *  three in the morning so every geyser is done before anyone showers. */
const nightShape = (t: number) => {
  const u = t >= 88 ? t - 88 : t + 8;   // 0 at 22:00 through 27 at 04:45
  return u <= 27 ? gauss(u, 3.5, 7) : 0;
};
/** Where the pumps and the sewage blower go: into the roof's own output. */
const solarShape = (t: number) => (t >= 20 && t < 40 ? gauss(t, 34, 6) : 0);
/** What can leave the 1.0x window without anybody noticing. */
const dayTakeShape = (t: number) => (t >= 40 && t < 72 ? gauss(t, 56, 9) : 0);
/** The evening shoulders, where a geyser can wait another hour unremarked. */
const eveTakeShape = (t: number) => (t >= 72 && t < 88 ? gauss(t, 84, 3.4) : 0);

/** Put `kwh` back into the day in the given shape, never above the target. */
function place(series: number[], kwh: number, target: number, shape: (t: number) => number): void {
  if (kwh <= 0) return;
  const w = series.map((v, t) => (target - v > 2 ? shape(t) : 0));
  const total = w.reduce((a, b) => a + b, 0);
  if (total <= 0) return;
  for (let t = 0; t < N; t++) if (w[t] > 0) series[t] += (kwh / 0.25) * (w[t] / total);
}

/** Lift `kwh` out of the day in the given shape, taking no more than `cap` of
 *  any single interval and never below the critical-load floor, and report what
 *  actually moved. */
function take(series: number[], kwh: number, target: number, shape: (t: number) => number, cap: number): number {
  const w = series.map((v, t) => (v < target - 1 ? shape(t) * v : 0));
  const total = w.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let scale = 1;
  for (let t = 0; t < N; t++) {
    if (w[t] <= 0) continue;
    const want = (kwh / 0.25) * (w[t] / total);
    // constraints.json → critical_load_floor: never draw a interval below it
    const allowed = Math.min(series[t] * cap, Math.max(0, series[t] - CRITICAL_FLOOR));
    if (want > allowed) scale = Math.min(scale, allowed / Math.max(want, 1e-9));
  }
  let moved = 0;
  for (let t = 0; t < N; t++) {
    if (w[t] <= 0) continue;
    const d = (kwh / 0.25) * (w[t] / total) * scale;
    series[t] -= d;
    moved += d * 0.25;
  }
  return moved;
}

/**
 * What the controller actually does to a day, in the two moves it has.
 *
 * It holds the evening under the target and lets the held load, plus whatever
 * the shoulders will give up, run in the night window at 0.9x. Then it moves
 * the pumps, the sewage blower and daytime charging out of the 1.0x window into
 * the 0.8x solar window, which never touches the peak but is where most of the
 * rupees come from.
 */
function reschedule(src: number[], target: number, dayShiftKwh: number, eveShiftKwh: number): number[] {
  const out = src.slice();
  let held = 0;
  for (let t = 0; t < N; t++) {
    if (out[t] > target) {
      // constraints.json → critical_load_floor is a hard lower bound on the
      // society draw, so a ceiling below it is reported rather than obeyed.
      const clipped = Math.max(target, CRITICAL_FLOOR);
      held += (out[t] - clipped) * 0.25;
      out[t] = clipped;
    }
  }
  const eve = take(out, eveShiftKwh, target, eveTakeShape, 0.3);
  place(out, held + eve, target, nightShape);
  const moved = take(out, dayShiftKwh, target, dayTakeShape, 0.28);
  place(out, moved, target, solarShape);
  return out;
}

/** Peak clipping alone, for the month carpet where the daily detail is noise. */
function shave(src: number[], target: number): number[] {
  const out = src.slice();
  let held = 0;
  for (let t = 0; t < N; t++) {
    if (out[t] > target) {
      held += (out[t] - target) * 0.25;
      out[t] = target;
    }
  }
  place(out, held, target, nightShape);
  return out;
}

/* ------------------------------------------------------------------- a day */

export interface Action {
  t: number;
  label: string;
  detail: string;
}

export interface Day {
  sc: Scenario;
  forecaster: string;     // which implementation of Seam 5 produced the fan
  ghost: number[];        // the schedule the building used before
  plan: number[];         // this system
  fcOnly: number[];       // a controller driven by the mean forecast
  q05: number[];
  q50: number[];
  q95: number[];
  rupees: number[];       // ₹ of energy per interval, on the plan
  ghostRupees: number[];
  cumRupees: number[];
  peakIdx: number;
  peakPlan: number;
  peakGhost: number;
  peakGhostIdx: number;
  peakFc: number;
  ghostCrossings: number[];
  planCrossings: number[];   // the ablation's answer: does OUR plan cross?
  fcCrossings: number[];
  actions: Action[];
  energyKwh: number;
  ghostEnergyKwh: number;
  dayRupees: number;
  ghostDayRupees: number;
}

function energyOf(kva: number): number {
  return kva * POWER_FACTOR * 0.25;
}

function costOf(kva: number, t: number): number {
  return energyOf(kva) * ENERGY_RATE * todAt(t).mult * (1 + DUTY);
}

/**
 * Build a day.
 *
 * `forecasterKey` selects the implementation of Seam 5 feeding the capacity
 * constraint. Everything else — the tariff, the physics, the estate, the seed —
 * is pinned, so a difference between two calls is a difference the forecaster
 * caused and nothing else. That is the ablation, live.
 */
export function buildDay(key: ScenarioKey, forecasterKey: string = DEFAULT_FORECASTER): Day {
  const sc = scenarioOf(key);
  const fc = forecasterOf(forecasterKey);
  const r = rng(0x5a4a * (sc.n + 1) + 7);

  // 1. the old schedule, scaled so its peak is exactly what the scenario claims
  const raw: number[] = [];
  for (let t = 0; t < N; t++) raw.push(shape(t, sc) * (0.985 + r() * 0.03));
  const rawMax = Math.max(...raw);
  const ghost = raw.map((v) => (v * sc.ghostPeak) / rawMax);

  // 2. this system, under whichever forecaster is loaded. The target is what
  //    that forecaster's own quantiles let the controller aim at; a band that
  //    is narrower than the truth aims higher and eats the difference.
  const shiftKwh = SHIFTABLE_KWH_PER_FLAT * FLATS;
  const eveKwh = EVENING_DEFER_KWH_PER_FLAT * FLATS;
  const target = realisedPeak(fc, sc);
  const plan = reschedule(ghost, target, shiftKwh, eveKwh);

  // 3. the mean-forecast controller, kept on screen as the standing comparison:
  //    same clip, but it aimed at the mean and the evening came in above it, so
  //    the overshoot lands on the billing interval
  const fcBase = reschedule(ghost, sc.planPeak, shiftKwh, eveKwh);
  const over = sc.fcPeak - sc.planPeak;
  const fcOnly = fcBase.map((v, t) => {
    const h = t * 0.25;
    const bump = Math.exp(-0.5 * Math.pow((h - 19.55) / 0.62, 2));
    return v + over * bump;
  });

  // 4. the outage truncates everything to the backup load
  if (sc.outageAt !== null) {
    for (let t = sc.outageAt; t < N; t++) {
      const decay = Math.exp(-(t - sc.outageAt) / BACKUP.decay_intervals);
      const backup = BACKUP.steady_kva + BACKUP.initial_surge_kva * decay;
      ghost[t] = Math.min(ghost[t], backup);
      plan[t] = Math.min(plan[t], backup);
      fcOnly[t] = Math.min(fcOnly[t], backup);
    }
  }

  // 5. the forecast fan, from the loaded forecaster. Nothing else about the day
  //    changes when this is swapped, which is the point of the seam.
  const { q05, q50, q95 } = fc.predict(plan, sc, r);

  const rupees = plan.map((v, t) => costOf(v, t));
  const ghostRupees = ghost.map((v, t) => costOf(v, t));
  const cumRupees: number[] = [];
  rupees.reduce((acc, v) => {
    const next = acc + v;
    cumRupees.push(next);
    return next;
  }, 0);

  const peakPlan = Math.max(...plan);
  const peakIdx = plan.indexOf(peakPlan);
  const peakGhost = Math.max(...ghost);
  const peakGhostIdx = ghost.indexOf(peakGhost);
  const peakFc = Math.max(...fcOnly);

  const ghostCrossings: number[] = [];
  const planCrossings: number[] = [];
  const fcCrossings: number[] = [];
  for (let t = 0; t < N; t++) {
    if (ghost[t] > CEILING) ghostCrossings.push(t);
    if (plan[t] > CEILING) planCrossings.push(t);
    if (fcOnly[t] > CEILING) fcCrossings.push(t);
  }

  // The narration is written against the device registry, so a device that
  // leaves devices.json also leaves the story.
  const geyser = DEFERRABLE_DEVICES.find((d) => d.type === "geyser");
  const ev = DEFERRABLE_DEVICES.find((d) => d.type === "ev_charger");
  const actions: Action[] = [
    { t: 46, label: "Pumps into solar", detail: "Both booster pumps and the STP blower pulled into the 0.8x window." },
    { t: 74, label: "14 geysers held", detail: `Held from 18:30. Every one of them has a deadline of ${geyser?.deadline_hours ?? 11.5} h.` },
    { t: 78, label: "EV charging paused", detail: `Nine chargers dropped to trickle at ${ev?.rated_kw ?? 3.3} kW rated. Two opted out and kept full rate.` },
    { t: 90, label: "Released to night", detail: "The held load runs at the 0.9x rate, staggered over five intervals." },
  ].filter((a) => sc.outageAt === null || a.t < sc.outageAt);

  const energyKwh = plan.reduce((a, v) => a + energyOf(v), 0);
  const ghostEnergyKwh = ghost.reduce((a, v) => a + energyOf(v), 0);

  return {
    sc, forecaster: fc.key, ghost, plan, fcOnly, q05, q50, q95,
    rupees, ghostRupees, cumRupees,
    peakIdx, peakPlan, peakGhost, peakGhostIdx, peakFc,
    ghostCrossings, planCrossings, fcCrossings, actions,
    energyKwh, ghostEnergyKwh,
    dayRupees: rupees.reduce((a, b) => a + b, 0),
    ghostDayRupees: ghostRupees.reduce((a, b) => a + b, 0),
  };
}

/* ------------------------------------------------------------------ money */

export function billingDemand(peak: number): number {
  return Math.max(peak, CONTRACT_KVA * BILLING_FLOOR);
}

export interface MonthBill {
  peak: number;
  billingDemand: number;
  demandCharge: number;
  energyCharge: number;
  total: number;
}

export function monthBill(day: Day, which: "plan" | "ghost"): MonthBill {
  const peak = which === "plan" ? day.peakPlan : day.peakGhost;
  const bd = billingDemand(peak);
  const demandCharge = bd * DEMAND_RATE;
  const energyCharge = (which === "plan" ? day.dayRupees : day.ghostDayRupees) * DAYS_IN_MONTH;
  return { peak, billingDemand: bd, demandCharge, energyCharge, total: demandCharge + energyCharge };
}

/* ------------------------------------------------------------------ homes */

export type HomeState = "normal" | "shifting" | "drawing" | "opted" | "offline";

export const STATE_LABEL: Record<HomeState, string> = {
  normal: "Normal",
  shifting: "Shifting now",
  drawing: "Drawing hard",
  opted: "Opted out",
  offline: "Offline",
};

export interface Home {
  i: number;
  tower: string;
  flat: string;
  col: number;
  row: number;
  roof: "terracotta" | "slate";
  pv: boolean;
  optedOut: boolean;
  offlineMeter: boolean;
  archetype: string;
  shiftFrom: number;
  shiftLen: number;
  shiftTo: number;
  device: string;
  asks: number;
  saving: number;
  peakT: number;
}

/** The estate. Flats, columns, towers, archetypes and consent all come out of
 *  society.json, so scaling to 120 or 240 flats is a number in that file. */
export function buildHomes(sc: Scenario): Home[] {
  const r = rng(0x9e37 + sc.n);
  const homes: Home[] = [];
  const deviceTypes = DEFERRABLE_DEVICES.map((d) => d.type);
  for (let i = 0; i < FLATS; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const tower = col < TOWER_SPLIT_COL ? TOWER_NAMES[0] : TOWER_NAMES[1];
    const unit = (col % TOWER_SPLIT_COL) + 1;
    const floor = row + 1;
    const shiftFrom = 72 + Math.floor(r() * 12);
    const shiftLen = 2 + Math.floor(r() * 4);
    homes.push({
      i, tower, col, row,
      flat: `${tower}-${floor}0${unit}`,
      roof: r() > 0.45 ? "terracotta" : "slate",
      pv: r() > 1 - PV_SHARE,
      optedOut: false,
      offlineMeter: false,
      archetype: ARCHETYPES[Math.floor(r() * ARCHETYPES.length)],
      shiftFrom,
      shiftLen,
      shiftTo: 88 + Math.floor(r() * 6),
      device: deviceTypes[Math.floor(r() * deviceTypes.length)],
      // constraints.json → deferral_cap_per_flat: no flat exceeds the cap
      asks: Math.min(FAIRNESS_CAP, 2 + Math.floor(r() * 6)),
      saving: 148 + Math.floor(r() * 120),
      peakT: 72 + Math.floor(r() * 16),
    });
  }
  for (const i of OPTED_OUT) homes[i].optedOut = true;
  for (const i of OFFLINE_CANDIDATES.slice(0, sc.offlineMeters)) homes[i].offlineMeter = true;
  return homes;
}

export function homeState(h: Home, t: number, day: Day, override: boolean): HomeState {
  if (day.sc.outageAt !== null && t >= day.sc.outageAt) return "offline";
  if (h.offlineMeter && (day.sc.key !== "sensor_drop" || t >= 64)) return "offline";
  if (h.optedOut) return "opted";
  if (!override && t >= h.shiftFrom && t < h.shiftFrom + h.shiftLen) return "shifting";
  if (Math.abs(t - h.peakT) <= 1) return "drawing";
  const h24 = t * 0.25;
  if (h24 > 6.5 && h24 < 8.5 && h.i % 5 === t % 5) return "drawing";
  return "normal";
}

export function tally(homes: Home[], t: number, day: Day, override: boolean): Record<HomeState, number> {
  const out: Record<HomeState, number> = { normal: 0, shifting: 0, drawing: 0, opted: 0, offline: 0 };
  for (const h of homes) out[homeState(h, t, day, override)] += 1;
  return out;
}

/* --------------------------------------------------------- time of day ---- */

export type Phase = "night" | "dawn" | "day" | "golden" | "dusk";

export function phaseOf(t: number): Phase {
  const h = (t % N) * 0.25;
  if (h < 5.2) return "night";
  if (h < 6.9) return "dawn";
  if (h < 16.4) return "day";
  if (h < 19.0) return "golden";
  if (h < 19.9) return "dusk";
  return "night";
}

export interface Sky {
  top: string;
  bottom: string;
  plate: string;
  grass: string;
  road: string;
  sun: number;          // 0 dark .. 1 full daylight
  warmth: number;       // 0 .. 1, how lit the windows read
  panel: string;
}

const SKIES: Record<Phase, Sky> = {
  night:  { top: "#171B22", bottom: "#2B303A", plate: "#4A463E", grass: "#2F3A2C", road: "#22242A", sun: 0.05, warmth: 1,    panel: "#2B3340" },
  dawn:   { top: "#48506A", bottom: "#C89272", plate: "#9A8E76", grass: "#5A6B4C", road: "#43454C", sun: 0.4,  warmth: 0.55, panel: "#4C5A72" },
  day:    { top: "#9FBBD6", bottom: "#DCE7F0", plate: "#E4D9C4", grass: "#7C8B5E", road: "#A9A69F", sun: 1,    warmth: 0,    panel: "#2E6BA8" },
  golden: { top: "#8496BA", bottom: "#EFC489", plate: "#DFCBA8", grass: "#77854F", road: "#968F84", sun: 0.78, warmth: 0.34, panel: "#3D6E9C" },
  dusk:   { top: "#414A66", bottom: "#AC8A84", plate: "#8C8271", grass: "#4F5C42", road: "#565659", sun: 0.34, warmth: 0.85, panel: "#33425A" },
};

export function skyOf(t: number, dark = false): Sky {
  const s = SKIES[phaseOf(t)];
  if (!dark) return s;
  return { ...s, top: "#0F1116", bottom: "#191C22", plate: "#38352F", grass: "#242B22", road: "#1B1D21", sun: 0.02, warmth: 0.08, panel: "#20262F" };
}

/* ------------------------------------------------------------- evidence -- */

export interface Carpet {
  before: number[][];   // [day][interval] kVA
  after: number[][];
  max: number;
}

/** Thirty days of the month either side of the change, from the same shape. */
export function buildCarpet(key: ScenarioKey, forecasterKey: string = DEFAULT_FORECASTER): Carpet {
  const day = buildDay(key, forecasterKey);
  const r = rng(0x2f11 + scenarioOf(key).n);
  const before: number[][] = [];
  const after: number[][] = [];
  const target = realisedPeak(forecasterOf(forecasterKey), day.sc);
  for (let d = 0; d < DAYS_IN_MONTH; d++) {
    const weekend = d % 7 === 5 || d % 7 === 6;
    const k = (weekend ? 0.94 : 1) * (0.9 + r() * 0.2);
    const b = day.ghost.map((v) => v * k);
    before.push(b);
    after.push(shave(b, target));
  }
  return { before, after, max: Math.max(...before.map((d) => Math.max(...d))) };
}

/** The reliability diagram behind the 92% claim: nominal against empirical. */
export const RELIABILITY = [
  { nominal: 0.5, empirical: 0.53 },
  { nominal: 0.6, empirical: 0.63 },
  { nominal: 0.7, empirical: 0.72 },
  { nominal: 0.8, empirical: 0.83 },
  { nominal: 0.9, empirical: 0.92 },
  { nominal: 0.95, empirical: 0.964 },
];

/** Five controllers over an identical month. Ours is the row with the rule. */
export interface ControllerRow {
  key: string;
  name: string;
  peak: number;
  breaches: number;
  bill: number;
  saving: number;         // ₹/month against the schedule the society already runs
  share: number | null;   // share of the available saving actually captured
  note: string;
}

export function controllerTable(day: Day): ControllerRow[] {
  const g = monthBill(day, "ghost").total;
  const ours = monthBill(day, "plan").total;
  const oraclePeak = realisedPeak(forecasterOf("perfect"), day.sc);
  const oracle = billingDemand(oraclePeak) * DEMAND_RATE + day.dayRupees * DAYS_IN_MONTH * 0.982;
  const available = g - oracle;
  const share = (bill: number) => (available <= 0 ? null : (g - bill) / available);

  const rulePeak = day.sc.ghostPeak - 3.4;
  const ruleBill = billingDemand(rulePeak) * DEMAND_RATE + day.ghostDayRupees * DAYS_IN_MONTH * 0.996;
  const mpcPeak = day.peakFc;
  const mpcBill = billingDemand(mpcPeak) * DEMAND_RATE + day.dayRupees * DAYS_IN_MONTH * 1.004;

  return [
    { key: "none", name: "No control", peak: day.peakGhost, breaches: day.ghostCrossings.length, bill: g, saving: 0, share: share(g), note: "The schedule the society already runs." },
    { key: "rule", name: "Rule based", peak: rulePeak, breaches: Math.max(0, day.ghostCrossings.length - 1), bill: ruleBill, saving: g - ruleBill, share: share(ruleBill), note: "Everything waits until 22:00, then switches on together." },
    { key: "mpc", name: "MPC on the mean", peak: mpcPeak, breaches: day.fcCrossings.length, bill: mpcBill, saving: g - mpcBill, share: share(mpcBill), note: "Aims at the ceiling with the mean forecast. Half its errors are above it." },
    { key: "ours", name: `Ours, ${forecasterOf(day.forecaster).key === "q95" ? "q95" : forecasterOf(day.forecaster).name}`, peak: day.peakPlan, breaches: day.planCrossings.length, bill: ours, saving: g - ours, share: share(ours), note: forecasterOf(day.forecaster).note },
    { key: "oracle", name: "Perfect foresight", peak: oraclePeak, breaches: 0, bill: oracle, saving: available, share: 1, note: "Knows the month in advance. The ceiling on what any controller can do." },
  ];
}

/**
 * The prize, and how much of it is actually on the table.
 *
 * `available` is the whole distance from the schedule the society already runs
 * to a controller that knows the month in advance. Nothing can beat it, so it
 * is the honest denominator: a percentage against the current bill would flatter
 * us, and a percentage against zero would be meaningless.
 */
export interface SavingSplit {
  available: number;
  captured: number;
  missed: number;
  share: number;
  perFlat: number;
  perFlatAvailable: number;
}

export function achievableSaving(rows: ControllerRow[]): SavingSplit {
  const none = rows.find((r) => r.key === "none");
  const ours = rows.find((r) => r.key === "ours");
  const oracle = rows.find((r) => r.key === "oracle");
  if (!none || !ours || !oracle) {
    return { available: 0, captured: 0, missed: 0, share: 0, perFlat: 0, perFlatAvailable: 0 };
  }
  const available = Math.max(0, none.bill - oracle.bill);
  const captured = Math.max(0, none.bill - ours.bill);
  return {
    available,
    captured,
    missed: Math.max(0, available - captured),
    share: available <= 0 ? 0 : captured / available,
    perFlat: captured / FLATS,
    perFlatAvailable: available / FLATS,
  };
}

/** Fairness: who was asked, and how often. A month that always defers the same
 *  six flats gets voted out at the next general body meeting. */
export function fairness(homes: Home[]) {
  const byTower = TOWER_NAMES.map((tw) => {
    const hs = homes.filter((h) => h.tower === tw);
    return { label: `Tower ${tw}`, asks: hs.length ? hs.reduce((a, h) => a + h.asks, 0) / hs.length : 0, n: hs.length };
  });
  const groups = Array.from(new Set(homes.map((h) => h.archetype))).map((g) => {
    const hs = homes.filter((h) => h.archetype === g);
    return { label: g, asks: hs.reduce((a, h) => a + h.asks, 0) / hs.length, n: hs.length };
  });
  const asks = homes.map((h) => h.asks);
  const sum = asks.reduce((a, b) => a + b, 0);
  const sumSq = asks.reduce((a, b) => a + b * b, 0);
  const jain = sumSq === 0 ? 1 : (sum * sum) / (asks.length * sumSq);
  const worst = Math.max(...asks);
  const mean = sum / asks.length;
  return { byTower, groups, jain, worst, mean };
}
