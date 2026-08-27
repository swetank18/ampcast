/**
 * The seam check.
 *
 * Round 2 hands us a jury-imposed change. This script is the contract that the
 * five seams hold: it regenerates every headline number from the config files,
 * asserts the defaults still reproduce what is on the slides, and then runs the
 * ablation across every forecaster so the "is the model load bearing" answer is
 * a table rather than a claim.
 *
 *   npx tsx scripts/seams.ts
 *
 * If a number here moves and you did not change a config file, something is
 * hardcoded that should not be.
 */
import {
  CEILING, CONSTRAINTS, CONTRACT_KVA, DEMAND_RATE, DEVICES, ENERGY_RATE, EVENING_DEFER_KWH_PER_FLAT,
  FLATS, HELD_FEATURES, SHIFTABLE_KWH_PER_FLAT, SHOWN_FEATURES, SOCIETY_NAME, TOD_ROWS,
} from "../src/components/samanvay/config";
import { FORECASTERS, realisedPeak, usableHeadroom } from "../src/components/samanvay/forecasters";
import { buildDay, buildHomes, controllerTable, fairness, monthBill, scenarioOf, SCENARIOS } from "../src/components/samanvay/model";
import { buildDecisionLog, summarise } from "../src/components/samanvay/decisionLog";

let failures = 0;
function check(label: string, got: unknown, want: unknown, tol = 0.05) {
  const ok = typeof got === "number" && typeof want === "number"
    ? Math.abs(got - want) <= tol
    : got === want;
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${label.padEnd(46)} ${String(got).padEnd(12)} ${ok ? "" : `expected ${want}`}`);
}

const rule = (s: string) => console.log(`\n${s}\n${"─".repeat(78)}`);

/* ------------------------------------------------- seam 1: tariff as JSON */
rule("Seam 1 — tariff.json");
console.log(`  ${SOCIETY_NAME} · ${FLATS} flats · ceiling ${CEILING} kVA · contract ${CONTRACT_KVA} kVA`);
console.log(`  ₹${ENERGY_RATE}/kWh · ₹${DEMAND_RATE}/kVA/month`);
for (const w of TOD_ROWS) console.log(`    ${w.name.padEnd(7)} ${w.span}   ${w.mult.toFixed(2)}x   ₹${(ENERGY_RATE * w.mult).toFixed(2)}`);
check("ToD windows cover the whole day", TOD_ROWS.length, 4);

/* -------------------------------------------- seam 2: constraint registry */
rule("Seam 2 — constraints.json");
for (const c of CONSTRAINTS) {
  console.log(`  ${c.active ? "on " : "off"}  ${c.name.padEnd(24)} ${c.type.padEnd(9)} ${String(c.value ?? "—").padEnd(6)} ${c.applies_to.padEnd(10)} → ${c.effect}`);
}
check("transformer_limit drives the ceiling", CEILING, 92);

/* ------------------------------------------------ seam 3: device registry */
rule("Seam 3 — devices.json");
const deferrable = DEVICES.filter((d) => d.deferrable);
const shed = DEVICES.filter((d) => d.curtailable);
console.log(`  ${DEVICES.length} devices · ${deferrable.length} deferrable · ${shed.length} curtailable after never_curtail`);
for (const d of DEVICES.filter((x) => x.tags.some((t) => ["lift", "water_pump", "fire_panel", "medical"].includes(t)))) {
  console.log(`    ${d.type.padEnd(16)} deferrable ${String(d.deferrable).padEnd(6)} curtailable ${d.curtailable}`);
}
check("never_curtail forces lift uncurtailable", DEVICES.find((d) => d.type === "lift")!.curtailable, false);
check("never_curtail forces pumps uncurtailable", DEVICES.find((d) => d.type === "booster_pump")!.curtailable, false);
check("day pool summed from the registry", SHIFTABLE_KWH_PER_FLAT, 0.9, 1e-9);
check("evening pool summed from the registry", EVENING_DEFER_KWH_PER_FLAT, 0.55, 1e-9);

/* --------------------------------------------- seam 4: scenarios as files */
rule("Seam 4 — scenarios.json");
for (const s of SCENARIOS) {
  const d = buildDay(s.key);
  console.log(`  ${String(s.n)}  ${s.label.padEnd(12)} ghost ${d.peakGhost.toFixed(1).padStart(6)}  plan ${d.peakPlan.toFixed(1).padStart(6)}  crossings ${String(d.planCrossings.length).padStart(2)}  ₹${Math.round(monthBill(d, "ghost").total - monthBill(d, "plan").total).toLocaleString("en-IN")}/mo`);
}
const normal = buildDay("normal");
check("normal plan peak unchanged", normal.peakPlan, 84.4, 0.15);
check("normal ghost peak unchanged", normal.peakGhost, 95.8, 0.15);
check("mean-forecast peak unchanged", normal.peakFc, 87.0, 0.15);
check("our plan never crosses the ceiling", normal.planCrossings.length, 0);

/* ------------------------------------------- seam 5: forecaster interface */
rule("Seam 5 — forecasters.ts · the ablation, everything else pinned");
console.log(`  ${"forecaster".padEnd(30)} ${"peak".padStart(7)} ${"headroom".padStart(9)} ${"breaches".padStart(9)}   study pinball`);
for (const f of FORECASTERS) {
  const d = buildDay("normal", f.key);
  const peak = realisedPeak(f, scenarioOf("normal"));
  const head = usableHeadroom(f, scenarioOf("normal"));
  const flag = d.planCrossings.length > 0 ? "  ← TRIPS" : "";
  console.log(`  ${f.name.padEnd(30)} ${peak.toFixed(1).padStart(7)} ${head.toFixed(1).padStart(9)} ${String(d.planCrossings.length).padStart(9)}   ${f.study ? f.study.pinball.toFixed(3) : "—"}${flag}`);
}
check("ours reproduces the slide peak", realisedPeak(FORECASTERS[0], scenarioOf("normal")), 84.4, 0.01);
check("mean reproduces the fc peak", realisedPeak(FORECASTERS[1], scenarioOf("normal")), 87.0, 0.01);
check("persistence trips the transformer", buildDay("normal", "persistence").planCrossings.length > 0, true);
check("static margin is safe and wasteful", usableHeadroom(FORECASTERS.find((f) => f.key === "static_margin")!, scenarioOf("normal")) > 15, true);

/* --------------------------------------------------------- decision log  */
rule("Decision log — every decision carries the constraint that caused it");
const homes = buildHomes(scenarioOf("normal"));
const log = buildDecisionLog(normal, homes);
const s = summarise(log);
console.log(`  ${log.length} rows · ${s.deferred} deferred · ${s.released} released · ${s.trickled} trickled · ${s.shifted} shifted · ${s.exempt} exempt`);
console.log(`  ${s.kvaWithheld.toFixed(1)} kVA withheld across the evening`);
const sample = log.find((d) => d.action === "defer")!;
console.log(`  e.g. ${sample.ts}  ${sample.flat}  ${sample.device}  [${sample.constraint}]  deadline ${sample.deadline}`);
check("every row names a constraint or an exemption", log.every((d) => d.constraint !== undefined), true);
check("no opted-out flat is ever deferred", log.every((d) => !(d.action === "defer" && homes[d.homeIndex]?.optedOut)), true);

/* ------------------------------------------------------------- the split */
rule("Show versus hold — features.json");
console.log("  shown:");
for (const f of SHOWN_FEATURES) console.log(`    ${f.label.padEnd(30)} ${f.status}`);
console.log("  held:");
for (const f of HELD_FEATURES) console.log(`    ${f.label.padEnd(30)} ${String(f.cost_minutes).padStart(3)} min   ← ${f.play_when}`);

/* ------------------------------------------------------------- the money */
rule("The month");
const rows = controllerTable(normal);
for (const r of rows) {
  console.log(`  ${r.name.padEnd(34)} peak ${r.peak.toFixed(1).padStart(6)}  breaches ${String(r.breaches).padStart(2)}  ₹${Math.round(r.bill).toLocaleString("en-IN").padStart(9)}  ${r.share === null ? "" : `${(r.share * 100).toFixed(0)}% of available`}`);
}
const fair = fairness(homes);
console.log(`  Jain ${fair.jain.toFixed(3)} · mean asks ${fair.mean.toFixed(1)} · worst flat ${fair.worst}`);

console.log(`\n${"═".repeat(78)}`);
console.log(failures === 0 ? "  All seam checks pass." : `  ${failures} SEAM CHECK(S) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
