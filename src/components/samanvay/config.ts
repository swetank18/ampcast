/* =============================================================================
 * The seams.
 *
 * Everything the jury might change lives in ../../config/*.json. This file is
 * the only thing that reads those files: it types them, derives what the model
 * needs, and hands over plain constants. No number below is written twice.
 *
 *   tariff.json      rates, multipliers, the transformer limit          Seam 1
 *   constraints.json every hard rule, one row each                      Seam 2
 *   devices.json     every load and what may be done with it            Seam 3
 *   scenarios.json   weather, stress, the base load shape               Seam 4
 *   society.json     the estate: flats, towers, archetypes, consent
 *   features.json    held-back modules, behind flags
 *
 * The forecaster interface is Seam 5 and lives in ./forecasters.ts.
 *
 * If a change lands anywhere other than those six files plus the forecaster
 * registry, the seam was in the wrong place and that is worth knowing.
 * ========================================================================== */

import tariffJson from "@/config/tariff.json";
import constraintsJson from "@/config/constraints.json";
import devicesJson from "@/config/devices.json";
import scenariosJson from "@/config/scenarios.json";
import societyJson from "@/config/society.json";
import featuresJson from "@/config/features.json";

/** 15-minute intervals in a day. The one resolution constant. */
export const N = 96;
export const INTERVAL_HOURS = 24 / N;

/* ============================================================ Seam 1 tariff */

export interface TodWindow {
  name: string;
  from: number;                // inclusive interval index
  to: number;                  // exclusive
  mult: number;
  why: string;
}

/** "18:00" -> 72. "24:00" -> 96. */
function toInterval(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return Math.round((h * 60 + m) / (24 * 60 / N));
}

export const TARIFF_NAME = tariffJson.name;
export const TARIFF_AUTHORITY = tariffJson.authority;
export const ENERGY_RATE = tariffJson.energy_rate;
export const DEMAND_RATE = tariffJson.demand_charge_per_kva;
export const CONTRACT_KVA = tariffJson.contract_kva;
export const BILLING_FLOOR = tariffJson.billing_demand_floor;
export const DUTY = tariffJson.electricity_duty;
export const POWER_FACTOR = tariffJson.power_factor;
export const DAY_OF_MONTH = tariffJson.billing.day_of_month;
export const DAYS_IN_MONTH = tariffJson.billing.days_in_month;

/** Every interval belongs to exactly one window; midnight is split in the file. */
export const TOD: TodWindow[] = tariffJson.tod_windows.map((w) => ({
  name: w.name,
  from: toInterval(w.start),
  to: toInterval(w.end),
  mult: w.multiplier,
  why: w.why,
}));

export function todAt(t: number): TodWindow {
  for (const w of TOD) if (t >= w.from && t < w.to) return w;
  return TOD[0];
}

/** The windows as the tariff panel lists them, night unwrapped to one row. */
export const TOD_ROWS = (() => {
  const seen = new Map<string, TodWindow[]>();
  for (const w of TOD) {
    const list = seen.get(w.name) ?? [];
    list.push(w);
    seen.set(w.name, list);
  }
  const hhmmOf = (t: number) => `${String(Math.floor((t * 24) / N)).padStart(2, "0")}:${String(Math.round((t * 24 * 60) / N) % 60).padStart(2, "0")}`;
  return [...seen.entries()]
    .map(([name, ws]) => {
      // a window split across midnight reads as the wrapped span, latest start first
      const main = ws.length > 1 ? ws[ws.length - 1] : ws[0];
      const tail = ws.length > 1 ? ws[0] : null;
      return {
        name,
        span: `${hhmmOf(main.from)} – ${hhmmOf(tail ? tail.to : main.to)}`,
        mult: main.mult,
        why: main.why,
        from: main.from,
      };
    })
    .sort((a, b) => (a.name === "Solar" ? -1 : b.name === "Solar" ? 1 : a.from - b.from));
})();

/* ======================================================= Seam 2 constraints */

export interface Constraint {
  name: string;
  type: "upper" | "lower" | "exclude" | "deadline" | string;
  value: number | null;
  unit?: string;
  applies_to: string;
  tags?: string[];
  active: boolean;
  effect: string;
  why: string;
}

export const CONSTRAINTS: Constraint[] = constraintsJson.constraints as Constraint[];

export function constraintOf(name: string): Constraint | undefined {
  return CONSTRAINTS.find((c) => c.name === name);
}
function active(name: string): Constraint | undefined {
  const c = constraintOf(name);
  return c && c.active ? c : undefined;
}

/** The transformer rating. Everything about safety is measured against it. */
export const CEILING: number =
  (active("transformer_limit")?.value as number | undefined) ?? tariffJson.transformer_limit_kva;

/** A minimum society draw that must be met whatever the ceiling says. */
export const CRITICAL_FLOOR: number = (active("critical_load_floor")?.value as number | undefined) ?? 0;

/** No flat may be asked to wait more than this many times in a month. */
export const FAIRNESS_CAP: number =
  (active("deferral_cap_per_flat")?.value as number | undefined) ?? Number.POSITIVE_INFINITY;

export const NEVER_CURTAIL_TAGS: string[] = active("never_curtail")?.tags ?? [];
export const RESPECT_OPT_OUT = Boolean(active("opt_out_respected"));
export const HONOUR_DEADLINES = Boolean(active("deadline_honoured"));

/* =========================================================== Seam 3 devices */

export interface Device {
  type: string;
  rated_kw: number;
  class: "storage" | "cycle" | "process" | "critical" | "base" | "thermal" | string;
  deferrable: boolean;
  curtailable: boolean;
  deadline_hours: number | null;
  scope: "flat" | "society" | string;
  count?: number;
  count_per_flat?: number;
  tags: string[];
  deferrable_kwh_per_flat: { day: number; evening: number };
  why: string;
}

const RAW_DEVICES = devicesJson.devices as Device[];

/** The never_curtail constraint is applied here rather than trusted to each
 *  entry: a tagged load cannot be shed no matter what its own flag says. */
export const DEVICES: Device[] = RAW_DEVICES.map((d) => ({
  ...d,
  curtailable: d.curtailable && !d.tags.some((tg) => NEVER_CURTAIL_TAGS.includes(tg)),
}));

export function deviceOf(type: string): Device | undefined {
  return DEVICES.find((d) => d.type === type);
}

const sumDeferrable = (window: "day" | "evening") =>
  DEVICES.filter((d) => d.deferrable).reduce((a, d) => a + (d.deferrable_kwh_per_flat?.[window] ?? 0), 0);

/** Deferrable energy per flat per day, summed from the registry rather than
 *  written down. Pumps, the sewage blower and daytime charging. */
export const SHIFTABLE_KWH_PER_FLAT = sumDeferrable("day");
/** Geysers and EV charging on the evening shoulders. */
export const EVENING_DEFER_KWH_PER_FLAT = sumDeferrable("evening");

/** What the resident view promises is never touched, read from the registry. */
export const UNTOUCHED_DEVICES = DEVICES.filter(
  (d) => !d.deferrable && !d.curtailable && (d.tags.includes("untouched") || d.class === "critical"),
);

/** Devices a resident may actually have deferred, for the resident view. */
export const DEFERRABLE_DEVICES = DEVICES.filter((d) => d.deferrable && d.scope === "flat");

/** The longest a deferred load may be held, in intervals. */
export function deadlineIntervals(type: string): number {
  const d = deviceOf(type);
  if (!HONOUR_DEADLINES || !d?.deadline_hours) return N;
  return Math.round(d.deadline_hours / INTERVAL_HOURS);
}

/* ========================================================= Seam 4 scenarios */

export type ScenarioKey = string;
export type Status = "safe" | "watch" | "danger" | "override";

export interface ShapeTerm { amp: number; hour: number; width: number; why?: string }

export interface Scenario {
  key: ScenarioKey;
  n: number;
  label: string;
  note: string;
  ghostPeak: number;
  planPeak: number;
  fcPeak: number;
  bandScale: number;
  status: Exclude<Status, "override">;
  outageAt: number | null;
  offlineMeters: number;
  shapeTerms: ShapeTerm[];
}

const REF_CEILING = scenariosJson.reference_ceiling_kva;
/** Same society under a new limit by default; see the note in scenarios.json. */
const PEAK_SCALE = scenariosJson.scale_with_ceiling ? CEILING / REF_CEILING : 1;

export const SCENARIOS: Scenario[] = scenariosJson.scenarios.map((s) => ({
  key: s.key,
  n: s.n,
  label: s.label,
  note: s.note,
  ghostPeak: s.ghost_peak_kva * PEAK_SCALE,
  planPeak: s.plan_peak_kva * PEAK_SCALE,
  fcPeak: s.fc_peak_kva * PEAK_SCALE,
  bandScale: s.band_scale,
  status: s.status as Exclude<Status, "override">,
  outageAt: s.outage_at,
  offlineMeters: s.offline_meters,
  shapeTerms: (s.shape_terms ?? []) as ShapeTerm[],
}));

export function scenarioOf(key: ScenarioKey): Scenario {
  return SCENARIOS.find((s) => s.key === key) ?? SCENARIOS[0];
}

export const BASE_SHAPE = {
  floor: scenariosJson.base_shape.floor,
  terms: scenariosJson.base_shape.terms as ShapeTerm[],
  pv: scenariosJson.base_shape.rooftop_pv,
};

export const BACKUP = scenariosJson.backup;

/* ============================================================ the society */

export const SOCIETY_NAME = societyJson.name;
export const FLATS = societyJson.flats;
export const COLS = societyJson.cols;
export const TOWER_SPLIT_COL = societyJson.tower_split_col;
export const TOWER_NAMES = societyJson.tower_names;
export const ARCHETYPES = societyJson.archetypes.map((a) => a.name);
export const ARCHETYPE_SPEC = societyJson.archetypes;
export const PV_SHARE = societyJson.pv_share;
export const SEED = societyJson.seed;

/** Opt-outs and offline meters, clamped to the flat count so scaling the
 *  society to 120 or 240 never indexes past the end of the estate. */
export const OPTED_OUT = societyJson.opted_out.filter((i) => i < FLATS);
export const OFFLINE_CANDIDATES = societyJson.offline_meter_candidates.filter((i) => i < FLATS);

/* ============================================================ feature flags */

export interface Feature {
  on: boolean;
  key: string;
  label: string;
  play_when: string;
  status: string;
  cost_minutes: number;
}

export const FEATURES = featuresJson.features as Record<string, Feature>;

export function featureOn(name: keyof typeof FEATURES | string): boolean {
  return Boolean(FEATURES[name]?.on);
}

/** The held-back modules, in the order the reserve table lists them. */
export const HELD_FEATURES = Object.entries(FEATURES)
  .filter(([, f]) => !f.on)
  .map(([name, f]) => ({ name, ...f }));

export const SHOWN_FEATURES = Object.entries(FEATURES)
  .filter(([, f]) => f.on)
  .map(([name, f]) => ({ name, ...f }));
