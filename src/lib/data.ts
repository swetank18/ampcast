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
import type { Bundle, Run, ScenarioKey, Series } from "./types";

const bundle = bundleJson as unknown as Bundle;

export function loadBundle(): Bundle {
  return bundle;
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
  return `/data/series/${id}.json`;
}

export async function fetchSeries(id: string): Promise<Series> {
  const res = await fetch(seriesUrl(id));
  if (!res.ok) throw new Error(`series ${id}: ${res.status}`);
  return res.json();
}
