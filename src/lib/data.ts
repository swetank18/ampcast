/**
 * Data access.
 *
 * Everything the dashboard shows was computed by the Python simulation and its
 * bill engine, then exported. Nothing here recomputes money — the dashboard is
 * a viewer, so a number on screen and a number in the paper cannot drift apart.
 *
 * Reads the exported bundle today. When DATABASE_URL is set, `loadBundle` will
 * prefer Neon (see scripts/seed-db.ts for the schema) and fall back to the
 * bundle if the query fails, so a database outage degrades to stale data rather
 * than a blank page.
 */
import bundleJson from "./bundle.json";
import { tryQuery } from "./db";
import type { Bundle, Run, ScenarioKey, Series } from "./types";

const bundle = bundleJson as unknown as Bundle;

/** Synchronous bundle, used as the fallback and by anything that cannot await. */
export function loadBundle(): Bundle {
  return bundle;
}

/**
 * Bundle assembled from Neon, falling back field-by-field to the exported one.
 *
 * Field-by-field rather than all-or-nothing: if the runs table is seeded but the
 * frontier study has not been re-run yet, the page should show fresh runs and
 * the older frontier, not refuse to render.
 */
export async function loadBundleFromDb(): Promise<Bundle & { source: "neon" | "bundle" }> {
  type Row = Record<string, unknown>;
  const rows = await tryQuery(async (sql) => {
    const [runs, scenarios, controllers, cal, frontier, mv, search, meta] = (await Promise.all([
      sql`select * from runs order by scenario_key, controller_key`,
      sql`select * from scenarios order by sort_order`,
      sql`select * from controllers order by sort_order`,
      sql`select * from calibration`,
      sql`select * from frontier order by comfort_ceiling_c`,
      sql`select * from mv_baseline`,
      sql`select * from target_search order by target_kw`,
      sql`select * from bundle_meta where id = 1`,
    ])) as unknown as Row[][];
    return { runs, scenarios, controllers, cal, frontier, mv, search, meta };
  });

  if (!rows || !rows.runs.length) return { ...bundle, source: "bundle" };

  const ctrl = Object.fromEntries(
    rows.controllers.map((c) => [c.key as string, c]),
  );

  const runs: Run[] = rows.runs.map((r) => ({
    id: r.id as string,
    scenario: r.scenario_key as ScenarioKey,
    controller: r.controller_key as string,
    controller_label: (ctrl[r.controller_key as string]?.label as string) ?? (r.controller_key as string),
    color: (ctrl[r.controller_key as string]?.colour as string) ?? "#888",
    blurb: (ctrl[r.controller_key as string]?.blurb as string) ?? "",
    order: (ctrl[r.controller_key as string]?.sort_order as number) ?? 0,
    demand_target_kw: Number(r.demand_target_kw),
    bill_inr: Number(r.bill_inr),
    energy_charge: Number(r.energy_charge),
    demand_charge: Number(r.demand_charge),
    energy_kwh: Number(r.energy_kwh),
    peak_kw: Number(r.peak_kw),
    peak_kva: Number(r.peak_kva),
    peak_at: r.peak_at as string,
    ceiling_breaches: Number(r.ceiling_breaches),
    worst_breach_kw: Number(r.worst_breach_kw),
    first_breach_at: (r.first_breach_at as string) ?? null,
    comfort_violation_pct: Number(r.comfort_violation_pct),
    comfort_kelvin_hours: Number(r.comfort_kelvin_hours),
    pct_of_oracle_savings: r.pct_of_oracle_savings === null ? null : Number(r.pct_of_oracle_savings),
    solve_ms_mean: r.solve_ms_mean === null ? null : Number(r.solve_ms_mean),
    energy_by_window: r.energy_by_window as Run["energy_by_window"],
  }));

  const m = rows.meta[0];
  const calRow = rows.cal[0];

  return {
    ...bundle,
    source: "neon",
    generated_at: m ? new Date(m.generated_at as string).toISOString() : bundle.generated_at,
    demand_target_kw: m ? Number(m.demand_target_kw) : bundle.demand_target_kw,
    runs,
    scenarios: rows.scenarios.map((s) => ({
      key: s.key as ScenarioKey, label: s.label as string, description: s.description as string,
    })),
    demand_target_search: {
      uncontrolled_peak_kw: m?.uncontrolled_peak_kw ? Number(m.uncontrolled_peak_kw) : bundle.demand_target_search.uncontrolled_peak_kw,
      target_kw: m ? Number(m.demand_target_kw) : bundle.demand_target_search.target_kw,
      shave_pct: m?.shave_pct ? Number(m.shave_pct) : bundle.demand_target_search.shave_pct,
      comfort_budget_pct: m?.comfort_budget_pct ? Number(m.comfort_budget_pct) : bundle.demand_target_search.comfort_budget_pct,
      trace: rows.search.map((t) => ({
        target_kw: Number(t.target_kw),
        ceiling_breaches: Number(t.ceiling_breaches),
        comfort_violation_pct: Number(t.comfort_violation_pct),
        bill_inr: Number(t.bill_inr),
      })),
    },
    calibration: calRow
      ? {
          ...bundle.calibration,
          [calRow.building_id as string]: {
            building: calRow.building_id as string,
            coverage_90: Number(calRow.coverage_90),
            acceptance_pass: Boolean(calRow.acceptance_pass),
            worst_horizon_coverage: Number(calRow.worst_horizon_coverage),
            mae_median_kw: Number(calRow.mae_median_kw),
            mean_interval_width_kw: Number(calRow.mean_interval_width_kw),
            reliability: calRow.reliability as { nominal: number; empirical: number; pinball: number }[],
            coverage_by_horizon: calRow.coverage_by_horizon as Record<string, number>,
          },
        }
      : bundle.calibration,
    frontier: rows.frontier.length
      ? rows.frontier.map((f) => ({
          comfort_ceiling_c: Number(f.comfort_ceiling_c),
          band_width_k: Number(f.band_width_k),
          uncontrolled_peak_kw: 0,
          uncontrolled_bill_inr: 0,
          target_kw: Number(f.target_kw),
          shave_pct: Number(f.shave_pct),
          bill_inr: Number(f.bill_inr),
          saving_inr: Number(f.saving_inr),
          comfort_violation_pct: Number(f.comfort_violation_pct),
        }))
      : bundle.frontier,
    mv_baseline_length: rows.mv.length
      ? rows.mv
          .map((r) => ({
            baseline: r.baseline as string,
            start: r.start_date as string,
            reported: Number(r.reported),
            ci: [Number(r.ci_low), Number(r.ci_high)] as [number, number],
            naive: Number(r.naive),
            true: Number(r.true_saving),
            inside: Boolean(r.inside_band),
            naive_inside: false,
            pct_of_truth: Number(r.pct_of_truth),
            extrapolation: r.extrapolation as string,
          }))
          .sort((a, b) => parseInt(a.baseline) - parseInt(b.baseline))
      : bundle.mv_baseline_length,
  };
}

export function runsFor(scenario: ScenarioKey): Run[] {
  return bundle.runs
    .filter((r) => r.scenario === scenario)
    .sort((a, b) => a.order - b.order);
}

export function runById(id: string): Run | undefined {
  return bundle.runs.find((r) => r.id === id);
}

export const CONTROLLER_ORDER = [
  "no_control",
  "rule_based",
  "mpc_mean",
  "ours",
  "mpc_oracle_rolling",
  "oracle",
] as const;

/** Series colours are re-picked for the dark instrument panel; the export's
 *  colours were chosen for white matplotlib figures and go muddy on ink. */
/** Colour is functional and the rule is strict: nothing is warm unless it costs
 *  rupees. The ceiling and its breaches own the hot end of the palette, so every
 *  controller — ours included — sits in the cool range. */
export const TRACE: Record<string, { color: string; short: string }> = {
  no_control: { color: "#5a6b85", short: "No control" },
  rule_based: { color: "#be95ff", short: "Rule based" },
  mpc_mean: { color: "#4589ff", short: "MPC · mean forecast" },
  ours: { color: "#3ddbd9", short: "Ours · q95" },
  mpc_oracle_rolling: { color: "#6fdc8c", short: "MPC · perfect forecast" },
  oracle: { color: "#42be65", short: "Oracle · whole month" },
};

export function seriesUrl(id: string): string {
  return `/api/series/${id}`;
}

export async function fetchSeries(id: string): Promise<Series> {
  const res = await fetch(seriesUrl(id));
  if (!res.ok) throw new Error(`series ${id}: ${res.status}`);
  return res.json();
}
