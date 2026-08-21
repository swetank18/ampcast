import { Frontier, MVChart, Reliability, TargetSearch } from "@/components/MethodCharts";
import { loadBundleFromDb } from "@/lib/data";
import { inr } from "@/lib/format";

export const metadata = { title: "Method — Aethergrid" };

export const revalidate = 300;

export default async function MethodPage() {
  const b = await loadBundleFromDb();
  const cals = Object.values(b.calibration).sort((x, y) => x.building.localeCompare(y.building));

  return (
    <>
      <header className="masthead">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="brand-text">
            <strong>Aethergrid</strong>
            <em>we forecast the bill, not the meter</em>
          </span>
        </div>
        <nav className="acts" aria-label="Sections">
          <a href="/worldsim">World sim</a>
          <a href="/model">Model</a>
          <a href="/method" aria-current="page">Method</a>
        </nav>
      </header>

      <main className="stage" style={{ maxWidth: 1180, margin: "0 auto", width: "100%" }}>
        {/* ---------------------------------------------------- the one idea */}
        <section className="card">
          <div className="card-head"><h2>One substitution</h2><span className="eyebrow">the whole argument</span></div>
          <p style={{ maxWidth: "72ch", marginBottom: 12 }}>
            In the constraint that holds grid import under the monthly demand ceiling, we use the{" "}
            <b style={{ color: "var(--ours)" }}>95th percentile</b> of the base-load forecast and the{" "}
            <b style={{ color: "var(--ours)" }}>5th percentile</b> of solar, instead of the means.
          </p>
          <pre style={{
            margin: 0, padding: "12px 14px", background: "var(--void)", border: "1px solid var(--rule)",
            borderRadius: 6, overflowX: "auto", font: "500 12px/1.7 var(--mono)", color: "var(--ink-hi)",
          }}>
{`base_q95[t]  +  controllable[t]  −  solar_q05[t]   ≤   D_ceiling`}
          </pre>
          <p className="note" style={{ marginTop: 10, maxWidth: "72ch" }}>
            That is a chance constraint implemented by quantile substitution. It is a few characters of code, and it
            is the only reason the controller does not blow the monthly demand charge. It also makes calibration
            load bearing rather than decorative: <b>if q95 is not really a 95th percentile, the guarantee is theatre.</b>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 1, background: "var(--rule)", border: "1px solid var(--rule)", borderRadius: 6, marginTop: 12, overflow: "hidden" }}>
            {[
              ["Demand ceiling", "q95", "breaching costs a full month of demand charge"],
              ["Energy cost", "q50", "costing energy at q95 would overstate the bill and distort the trade"],
              ["Thermal comfort", "q50 + slack", "soft by design; the operator sets the budget, violations are reported"],
            ].map(([k, v, why]) => (
              <div key={k} style={{ background: "var(--panel)", padding: "10px 12px" }}>
                <div className="eyebrow">{k}</div>
                <div className="num" style={{ fontSize: 17, color: "var(--ink-hi)", margin: "4px 0 5px" }}>{v}</div>
                <div className="note">{why}</div>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------- calibration */}
        <section className="card">
          <div className="card-head">
            <h2>Calibration is the safety property</h2>
            <span className="eyebrow">held-out June 2017</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, alignItems: "start" }}>
            <Reliability bundle={b} />
            <div>
              <div className="table-scroll">
                <table className="grid-table">
                  <thead><tr><th>Building</th><th>cov 90%</th><th>worst horizon</th><th>MAE kW</th><th></th></tr></thead>
                  <tbody>
                    {cals.map((c) => (
                      <tr key={c.building} data-hero={c.building === b.building.id}>
                        <td>{c.building.replace("Fox_", "").replace("_", " · ")}</td>
                        <td>{c.coverage_90.toFixed(3)}</td>
                        <td>{c.worst_horizon_coverage.toFixed(3)}</td>
                        <td>{c.mae_median_kw.toFixed(1)}</td>
                        <td><span className="pill" data-tone={c.acceptance_pass ? "good" : "bad"}>{c.acceptance_pass ? "pass" : "fail"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="note" style={{ marginTop: 11 }}>
                Acceptance was fixed in advance: the 90% interval must cover between 85% and 95% on weeks the model
                never saw. All four buildings pass, including at the worst horizon — which matters because the
                controller leans hardest on the far end of the forecast.
              </p>
              <p className="note" style={{ marginTop: 9 }}>
                The honest detail, and the strongest thing on this page: split conformal calibrated on April–May{" "}
                <b style={{ color: "var(--ceiling)" }}>under-covers June at 0.832</b> — below our own floor. June is
                hotter and the load is bigger, a textbook distribution shift. Adaptive conformal closes the loop
                online and restores <b style={{ color: "var(--ours)" }}>0.890</b>, paying 6.4 kW of extra interval
                width for it. Without that layer the forecaster fails its own test and every q95 the controller
                relies on is an overstatement.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ ceiling + comfort */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 12 }}>
          <section className="card">
            <div className="card-head"><h2>Where the ceiling came from</h2><span className="eyebrow">bisection</span></div>
            <TargetSearch bundle={b} />
            <p className="note" style={{ marginTop: 8 }}>
              Each dot is a fully simulated month. We bisect on the ceiling and keep the tightest one the controller
              holds with zero breaches inside the comfort budget:{" "}
              <b>{Math.round(b.demand_target_kw)} kW</b>, a {b.demand_target_search.shave_pct?.toFixed(1)}% shave.
              Below that the building runs out of thermal mass, not algorithm — the whole-month oracle only reaches
              483 kVA itself.
            </p>
          </section>

          <section className="card">
            <div className="card-head"><h2>Comfort is the lever</h2><span className="eyebrow">and it is the operator&rsquo;s</span></div>
            <Frontier bundle={b} />
            <p className="note" style={{ marginTop: 8 }}>
              <span style={{ color: "var(--ours)" }}>▬</span> saving ·{" "}
              <span style={{ color: "var(--mpc-mean)" }}>▬</span> ceiling the system will commit to. Widening the
              occupied ceiling from 24 °C to 28 °C nearly doubles the saving, from ₹{inr(b.frontier[0].saving_inr)} to
              ₹{inr(b.frontier[b.frontier.length - 1].saving_inr)}. Violations <i>fall</i> as the band widens: more
              room to manoeuvre means the controller is cornered less often.
            </p>
          </section>
        </div>

        {/* ------------------------------------------------------------ M&V */}
        <section className="card">
          <div className="card-head">
            <h2>Would you believe the saving?</h2>
            <span className="eyebrow">measurement &amp; verification</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, alignItems: "start" }}>
            <MVChart bundle={b} />
            <div>
              <p style={{ maxWidth: "60ch" }}>
                A vendor says &ldquo;we saved you 12%&rdquo;; the facility manager knows last July was milder. So we
                fit a weather-and-calendar baseline on a pre-period, predict the counterfactual bill, and report a
                bootstrap band rather than a point estimate.
              </p>
              <p className="note" style={{ marginTop: 10 }}>
                Because this is a simulation we can do what no real deployment can: check the answer. With less than
                twelve months of baseline the method{" "}
                <b style={{ color: "var(--ceiling)" }}>under-reports our own saving by up to 3×</b> and its 95% band
                excludes the truth entirely. Only at twelve months does the band cover it. We would rather say this
                than quote a number from three.
              </p>
              <div className="table-scroll" style={{ marginTop: 11 }}>
                <table className="grid-table">
                  <thead><tr><th>Baseline</th><th>Reported ₹</th><th>% of truth</th><th>Covers truth</th></tr></thead>
                  <tbody>
                    {b.mv_baseline_length.map((r) => (
                      <tr key={r.baseline}>
                        <td>{r.baseline}</td>
                        <td>{inr(r.reported)}</td>
                        <td>{r.pct_of_truth.toFixed(0)}</td>
                        <td><span className="pill" data-tone={r.inside ? "good" : "bad"}>{r.inside ? "yes" : "no"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- honesty */}
        <section className="card">
          <div className="card-head"><h2>What is real and what is not</h2><span className="eyebrow">written before the results</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 18 }}>
            <div>
              <h3 style={{ color: "var(--ours)", marginBottom: 7 }}>Real</h3>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, lineHeight: 1.65, color: "var(--ink)" }}>
                <li><b>The tariff.</b> Hand-encoded from a published TNERC order and cross-checked by a parser that reproduces the same JSON from the order text.</li>
                <li><b>The bill engine.</b> Matched to the rupee against a hand computation for a full week. Every figure on this site comes out of it.</li>
                <li><b>The meter data.</b> Building Data Genome Project 2 — four real buildings, two years, selected by a stated rule rather than by which looked good.</li>
                <li><b>The physics.</b> Checked against the analytic exponential decay and a steady-state energy balance. Envelope conductance fitted from each building&rsquo;s own meter.</li>
              </ul>
            </div>
            <div>
              <h3 style={{ color: "var(--ceiling)", marginBottom: 7 }}>Not real, and stated as such</h3>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, lineHeight: 1.65, color: "var(--ink)" }}>
                <li><b>The buildings are American.</b> Site Fox is Tempe, Arizona — the hottest site in the set and, at 33.4° N, close to northern India&rsquo;s solar geometry. The load <i>shapes</i> are not Indian: these buildings peak at 14:00, inside the normal window, so the time-of-day lever is weaker here than it would be in a real Indian office. And most of the rupees here are not the demand charge: the measured split is ₹1,38,613 a month of energy against ₹25,153 of demand charge, where the energy share comes from the controller using its full comfort band instead of holding a fixed setpoint. The demand-charge line is the smaller one — and the only one that needs a forecast.</li>
                <li><b>Hourly source data</b> upsampled to 15 minutes with a shape-preserving interpolation, which smooths real sub-hourly variability and understates peaks.</li>
                <li><b>The split of the meter</b> into base load and HVAC is a changepoint regression, not submetering.</li>
                <li><b>Rooftop PV is a design scenario</b> — there is no solar meter at this site. Its <i>uncertainty</i> is not invented: the forecast quantiles come from the site&rsquo;s own measured cloud record.</li>
              </ul>
            </div>
          </div>
          <p className="note" style={{ marginTop: 14, maxWidth: "78ch" }}>
            We do not claim a validated saving for any real building. We claim that on real meter data, under a real
            published tariff, with a calibrated forecast and a deterministic optimiser, substituting the 95th
            percentile into the demand-ceiling constraint holds a ceiling that the same controller on mean forecasts
            breaches. The demand-charge line of the bill is what that buys, and it is the line that moves when the
            forecaster is swapped out; the larger energy saving beside it comes from the comfort band and needs no
            model at all. Both are on the <a href="/model" style={{ color: "var(--ours)" }}>model page</a>, measured.
          </p>
        </section>

        <p className="note" style={{ textAlign: "center", padding: "6px 0 20px" }}>
          Simulation, tariff engine and controller: Python, HiGHS, LightGBM. Served from{" "}
          {b.source === "neon" ? "Neon Postgres" : "the bundled export"}. Bundle generated{" "}
          {new Date(b.generated_at).toISOString().slice(0, 16).replace("T", " ")} UTC.
        </p>
      </main>
    </>
  );
}
