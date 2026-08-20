/**
 * Seed Neon from the exported bundle.
 *
 * Idempotent: every insert upserts, so re-running after a fresh simulation
 * export replaces the numbers without leaving orphans behind. The series table
 * is cleared per run rather than per row, because a re-export can change the
 * block grid and half-updated series are worse than none.
 *
 *   npx tsx scripts/seed.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import type { Bundle, Series } from "../src/lib/types";

const root = join(import.meta.dirname, "..");

function loadEnv() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of [".env.local", ".env"]) {
    try {
      const line = readFileSync(join(root, f), "utf8")
        .split("\n")
        .find((l) => l.startsWith("DATABASE_URL="));
      if (line) return line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
    } catch { /* next */ }
  }
  throw new Error("DATABASE_URL not set and not found in .env.local");
}

const sql = neon(loadEnv());
const bundle: Bundle = JSON.parse(readFileSync(join(root, "src/lib/bundle.json"), "utf8"));

const CONTROLLER_META: Record<string, { colour: string; order: number }> = {
  no_control: { colour: "#5a6b85", order: 0 },
  rule_based: { colour: "#be95ff", order: 1 },
  mpc_mean: { colour: "#4589ff", order: 2 },
  ours: { colour: "#3ddbd9", order: 3 },
  mpc_oracle_rolling: { colour: "#6fdc8c", order: 4 },
  oracle: { colour: "#42be65", order: 5 },
};

async function main() {
  console.log("applying schema…");
  const schema = readFileSync(join(root, "scripts/schema.sql"), "utf8");
  for (const stmt of schema.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    await sql.query(stmt);
  }

  const b = bundle.building;
  await sql`
    insert into buildings (id, label, site, sqm, contract_demand_kva, hvac_capacity_kw,
                           ua_w_per_m2k, time_constant_h, c_kwh_per_k, hvac_share_of_meter, why_chosen)
    values (${b.id}, ${b.label}, ${b.site}, ${b.sqm}, ${b.contract_demand_kva}, ${b.hvac_capacity_kw},
            ${b.ua_w_per_m2k}, ${b.time_constant_h}, ${b.c_kwh_per_k}, ${b.hvac_share_of_meter}, ${b.why_chosen})
    on conflict (id) do update set
      label = excluded.label, sqm = excluded.sqm,
      contract_demand_kva = excluded.contract_demand_kva,
      hvac_capacity_kw = excluded.hvac_capacity_kw, ua_w_per_m2k = excluded.ua_w_per_m2k,
      time_constant_h = excluded.time_constant_h, c_kwh_per_k = excluded.c_kwh_per_k,
      hvac_share_of_meter = excluded.hvac_share_of_meter, why_chosen = excluded.why_chosen`;

  const t = bundle.tariff;
  await sql`
    insert into tariffs (id, state, category, order_ref, energy_rate, demand_charge_per_kva,
                         billing_interval_minutes, contract_demand_kva, billing_demand_floor_pct,
                         electricity_duty_pct, tod_windows)
    values ('tnerc_2026', ${t.state}, ${t.category}, ${t.order_ref}, ${t.energy_rate},
            ${t.demand_charge_per_kva}, ${t.billing_interval_minutes}, ${t.contract_demand_kva},
            ${t.billing_demand_floor_pct}, ${t.electricity_duty_pct}, ${JSON.stringify(t.tod_windows)})
    on conflict (id) do update set
      energy_rate = excluded.energy_rate, demand_charge_per_kva = excluded.demand_charge_per_kva,
      tod_windows = excluded.tod_windows, contract_demand_kva = excluded.contract_demand_kva`;

  for (const [i, s] of bundle.scenarios.entries()) {
    await sql`insert into scenarios (key, label, description, sort_order)
              values (${s.key}, ${s.label}, ${s.description}, ${i})
              on conflict (key) do update set label = excluded.label,
                description = excluded.description, sort_order = excluded.sort_order`;
  }

  const seen = new Set<string>();
  for (const r of bundle.runs) {
    if (seen.has(r.controller)) continue;
    seen.add(r.controller);
    const m = CONTROLLER_META[r.controller];
    await sql`insert into controllers (key, label, colour, blurb, sort_order)
              values (${r.controller}, ${r.controller_label}, ${m.colour}, ${r.blurb}, ${m.order})
              on conflict (key) do update set label = excluded.label,
                colour = excluded.colour, blurb = excluded.blurb, sort_order = excluded.sort_order`;
  }
  console.log(`  ${seen.size} controllers, ${bundle.scenarios.length} scenarios`);

  for (const r of bundle.runs) {
    await sql`
      insert into runs (id, building_id, scenario_key, controller_key, demand_target_kw, bill_inr,
        energy_charge, demand_charge, energy_kwh, peak_kw, peak_kva, peak_at, ceiling_breaches,
        worst_breach_kw, first_breach_at, comfort_violation_pct, comfort_kelvin_hours,
        pct_of_oracle_savings, solve_ms_mean, energy_by_window)
      values (${r.id}, ${b.id}, ${r.scenario}, ${r.controller}, ${r.demand_target_kw}, ${r.bill_inr},
        ${r.energy_charge}, ${r.demand_charge}, ${r.energy_kwh}, ${r.peak_kw}, ${r.peak_kva},
        ${r.peak_at}, ${r.ceiling_breaches}, ${r.worst_breach_kw}, ${r.first_breach_at},
        ${r.comfort_violation_pct}, ${r.comfort_kelvin_hours}, ${r.pct_of_oracle_savings},
        ${r.solve_ms_mean}, ${JSON.stringify(r.energy_by_window)})
      on conflict (id) do update set
        bill_inr = excluded.bill_inr, energy_charge = excluded.energy_charge,
        demand_charge = excluded.demand_charge, peak_kw = excluded.peak_kw,
        peak_kva = excluded.peak_kva, ceiling_breaches = excluded.ceiling_breaches,
        worst_breach_kw = excluded.worst_breach_kw, first_breach_at = excluded.first_breach_at,
        comfort_violation_pct = excluded.comfort_violation_pct,
        pct_of_oracle_savings = excluded.pct_of_oracle_savings,
        energy_by_window = excluded.energy_by_window`;
  }
  console.log(`  ${bundle.runs.length} runs`);

  // ---- series ------------------------------------------------------------
  const dir = join(root, "public/data/series");
  let points = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const id = file.replace(/\.json$/, "");
    const s: Series = JSON.parse(readFileSync(join(dir, file), "utf8"));
    await sql`delete from series_points where run_id = ${id}`;
    const CHUNK = 500;
    for (let i = 0; i < s.t.length; i += CHUNK) {
      const rows: unknown[][] = [];
      for (let j = i; j < Math.min(i + CHUNK, s.t.length); j++) {
        rows.push([id, new Date(s.t[j] * 1000).toISOString(), s.grid_kw[j], s.t_indoor[j],
                   s.t_lo[j], s.t_hi[j], s.t_out[j], s.base_kw[j], s.hvac_kw[j], s.pv_kw[j],
                   s.viol_k[j], s.bill_cum[j]]);
      }
      const values = rows
        .map((_, k) => `($${k * 12 + 1},$${k * 12 + 2},$${k * 12 + 3},$${k * 12 + 4},$${k * 12 + 5},$${k * 12 + 6},$${k * 12 + 7},$${k * 12 + 8},$${k * 12 + 9},$${k * 12 + 10},$${k * 12 + 11},$${k * 12 + 12})`)
        .join(",");
      await sql.query(
        `insert into series_points (run_id,t,grid_kw,t_indoor,t_lo,t_hi,t_out,base_kw,hvac_kw,pv_kw,viol_k,bill_cum)
         values ${values} on conflict (run_id,t) do nothing`,
        rows.flat(),
      );
      points += rows.length;
    }
  }
  console.log(`  ${points.toLocaleString()} series points`);

  const cal = bundle.calibration[b.id];
  await sql`
    insert into calibration (building_id, coverage_90, acceptance_pass, worst_horizon_coverage,
      mae_median_kw, mean_interval_width_kw, reliability, coverage_by_horizon)
    values (${b.id}, ${cal.coverage_90}, ${cal.acceptance_pass}, ${cal.worst_horizon_coverage},
      ${cal.mae_median_kw}, ${cal.mean_interval_width_kw}, ${JSON.stringify(cal.reliability)},
      ${JSON.stringify(cal.coverage_by_horizon)})
    on conflict (building_id) do update set
      coverage_90 = excluded.coverage_90, acceptance_pass = excluded.acceptance_pass,
      worst_horizon_coverage = excluded.worst_horizon_coverage,
      mae_median_kw = excluded.mae_median_kw, reliability = excluded.reliability,
      coverage_by_horizon = excluded.coverage_by_horizon`;

  for (const f of bundle.frontier) {
    await sql`insert into frontier (building_id, comfort_ceiling_c, band_width_k, target_kw,
                shave_pct, bill_inr, saving_inr, comfort_violation_pct)
              values (${b.id}, ${f.comfort_ceiling_c}, ${f.band_width_k}, ${f.target_kw},
                ${f.shave_pct}, ${f.bill_inr}, ${f.saving_inr}, ${f.comfort_violation_pct})
              on conflict (building_id, comfort_ceiling_c) do update set
                target_kw = excluded.target_kw, saving_inr = excluded.saving_inr,
                comfort_violation_pct = excluded.comfort_violation_pct`;
  }

  for (const m of bundle.mv_baseline_length) {
    await sql`insert into mv_baseline (building_id, baseline, start_date, reported, ci_low, ci_high,
                naive, true_saving, inside_band, pct_of_truth, extrapolation)
              values (${b.id}, ${m.baseline}, ${m.start}, ${m.reported}, ${m.ci[0]}, ${m.ci[1]},
                ${m.naive}, ${m.true}, ${m.inside}, ${m.pct_of_truth}, ${m.extrapolation})
              on conflict (building_id, baseline) do update set
                reported = excluded.reported, ci_low = excluded.ci_low, ci_high = excluded.ci_high,
                inside_band = excluded.inside_band, pct_of_truth = excluded.pct_of_truth`;
  }

  const chosen = bundle.demand_target_search.target_kw;
  for (const s of bundle.demand_target_search.trace ?? []) {
    await sql`insert into target_search (building_id, target_kw, ceiling_breaches,
                comfort_violation_pct, bill_inr, chosen)
              values (${b.id}, ${s.target_kw}, ${s.ceiling_breaches}, ${s.comfort_violation_pct},
                ${s.bill_inr}, ${Math.abs(s.target_kw - (chosen ?? -1)) < 1e-6})
              on conflict (building_id, target_kw) do update set
                ceiling_breaches = excluded.ceiling_breaches, chosen = excluded.chosen`;
  }

  const ts = bundle.demand_target_search;
  await sql`
    insert into bundle_meta (id, generated_at, building_id, demand_target_kw, uncontrolled_peak_kw,
      shave_pct, comfort_budget_pct, window_start, window_end, seeded_at)
    values (1, ${bundle.generated_at}, ${b.id}, ${bundle.demand_target_kw},
      ${ts.uncontrolled_peak_kw ?? null}, ${ts.shave_pct ?? null}, ${ts.comfort_budget_pct ?? null},
      ${bundle.window.start}, ${bundle.window.end}, now())
    on conflict (id) do update set
      generated_at = excluded.generated_at, demand_target_kw = excluded.demand_target_kw,
      uncontrolled_peak_kw = excluded.uncontrolled_peak_kw, shave_pct = excluded.shave_pct,
      seeded_at = now()`;

  const [{ count }] = (await sql`select count(*)::int as count from series_points`) as { count: number }[];
  console.log(`\nseeded. series_points now holds ${count.toLocaleString()} rows.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
