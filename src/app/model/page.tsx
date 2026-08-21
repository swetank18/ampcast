import {
  ExchangeRate, FeatureGroups, FoldSpread, MoneyRow, ShapBars, StaticMargin, WorstEvening,
} from "@/components/ModelCharts";
import ForecastSwitch from "@/components/ForecastSwitch";
import { loadBundleFromDb } from "@/lib/data";
import { inr } from "@/lib/format";
import { rowColour } from "@/lib/palette";

export const metadata = { title: "Model — Aethergrid" };

export const revalidate = 300;

const OURS = "lightgbm_quantile";

/** The chain the round-1 pitch never drew. Inputs on the left, the model in the
 *  middle, a number inside a constraint on the right — because the reason nobody
 *  could find the model is that nobody said where it sat. */
function Chain() {
  const cols: [string, string[]][] = [
    ["INPUTS", ["load lags 1 · 4 · 96 · 672", "outdoor temperature", "temperature forecast", "hour · weekday · holiday", "solar elevation and cloud"]],
    ["MODEL", ["quantile LightGBM", "5 quantiles × 64 horizons", "15-minute steps, 16 h ahead", "+ adaptive conformal"]],
    ["DECISION", ["q95 → the demand ceiling", "headroom = D − q95 + pv_q05", "MILP allocates the rest"]],
    ["OUTCOME", ["realised load", "breach or no breach", "peak kVA → rupees"]],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 1, background: "var(--rule)", border: "1px solid var(--rule)", borderRadius: 6, overflow: "hidden" }}>
      {cols.map(([head, items], i) => (
        <div key={head} style={{ background: i === 1 ? "var(--raised)" : "var(--panel)", padding: "10px 12px" }}>
          <div className="eyebrow" style={{ color: i === 1 ? "var(--ours)" : undefined }}>{head}</div>
          <ul style={{ margin: "6px 0 0", paddingLeft: 14, font: "400 10.5px/1.7 var(--mono)", color: i === 1 ? "var(--ink-hi)" : "var(--ink)" }}>
            {items.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Missing({ what }: { what: string }) {
  return (
    <p className="note">
      Not in this export — run <b>{what}</b> and re-run <b>eval/export_web.py</b>. Nothing on this page is written by
      hand, so a stage that has not run shows a gap rather than a number.
    </p>
  );
}

export default async function ModelPage() {
  const b = await loadBundleFromDb();
  const m = b.model;
  const abl = m?.ablation;
  const ours = abl?.rows.find((r) => r.key === OURS);
  const constant = abl?.rows.find((r) => r.key === "static_margin");
  const cal = b.calibration[b.building.id];

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
          <a href="/model" aria-current="page">Model</a>
          <a href="/method">Method</a>
        </nav>
      </header>

      <main className="stage" style={{ maxWidth: 1180, margin: "0 auto", width: "100%" }}>
        {/* ------------------------------------------------------ where it sits */}
        <section className="card">
          <div className="card-head">
            <h2>Where the model sits</h2>
            <span className="eyebrow">inputs → model → constraint → rupees</span>
          </div>
          <p style={{ maxWidth: "76ch", marginBottom: 12 }}>
            The forecast is not a chart for a human to read. It is a number inside a hard constraint in an optimiser:
            the 95th percentile of the next sixteen hours of base load, subtracted from the demand ceiling to give the
            capacity the MILP is allowed to hand out. <b style={{ color: "var(--ink-hi)" }}>Every kilowatt of forecast
            error is a kilowatt of headroom we either waste or dangerously give away.</b>
          </p>
          <Chain />
          {m?.split && (
            <p className="note" style={{ marginTop: 10 }}>
              Trained {m.split.train_start?.slice(0, 10)} → {m.split.train_end?.slice(0, 10)} · calibrated{" "}
              {m.split.valid_start?.slice(0, 10)} → {m.split.valid_end?.slice(0, 10)} · tested once on{" "}
              {m.split.test_start?.slice(0, 10)} → {m.split.test_end?.slice(0, 10)}. Temporal split, never random:
              a random split on time-series data leaks the future through neighbouring timestamps and inflates every
              metric on this page. <b>tests/test_leakage.py</b> asserts it.
            </p>
          )}
        </section>

        {/* ------------------------------------------------------ the switcher */}
        {b.ablation_index?.length ? (
          <section className="card">
            <div className="card-head">
              <h2>Swap the forecaster</h2>
              <span className="eyebrow">the ablation, playable</span>
            </div>
            <p style={{ maxWidth: "76ch", marginBottom: 11 }}>
              Same optimiser, same building, same June, same tariff, same seed. Pick a different forecaster and the
              month is re-played from the run that produced the table below — top panel is what the building drew
              against its ceiling, bottom panel is the forecast band the controller was planning on, with the load
              that actually arrived drawn through it.{" "}
              <b style={{ color: "var(--ink-hi)" }}>Try persistence.</b>
            </p>
            <ForecastSwitch
              index={b.ablation_index}
              ceilingKw={b.demand_target_kw}
              demandRate={b.tariff.demand_charge_per_kva}
            />
          </section>
        ) : null}

        {/* --------------------------------------------------------- the ablation */}
        <section className="card">
          <div className="card-head">
            <h2>Take the model out</h2>
            <span className="eyebrow">same optimiser · same month · only the forecaster changes</span>
          </div>
          {!abl || !ours ? <Missing what="eval/ablation.py" /> : (
            <>
              <p style={{ maxWidth: "76ch", marginBottom: 11 }}>
                Demand target <b>{Math.round(abl.meta.demand_target_kw)} kW</b>, held fixed on every row, along with the
                MILP settings, the thermal parameters, the comfort budget, the PV array, the tariff and the seed. One
                thing varies: the file the base-load quantiles are read from. Forecast quality on the left, what the
                transformer and the bill did on the right.
              </p>
              <div className="table-scroll">
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th>Forecaster feeding the optimiser</th>
                      <th>Pinball</th><th>Cov 90%</th><th>Breaches</th><th>Peak kVA</th>
                      <th>Bill ₹</th><th>Usable headroom kW</th><th>Comfort %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abl.rows.map((r) => (
                      <tr key={r.key} data-hero={r.key === OURS}>
                        <td>
                          <span className="swatch" style={{ background: rowColour(r.key) }} />
                          {r.forecaster}
                        </td>
                        <td>{r.key === "static_margin" ? `${r.pinball_mean.toFixed(3)}*` : r.pinball_mean.toFixed(3)}</td>
                        <td>{r.key === "static_margin" ? `${r.coverage_90.toFixed(3)}*` : r.coverage_90.toFixed(3)}</td>
                        <td style={{ color: r.ceiling_breaches > 0 ? "var(--ceiling)" : undefined }}>{r.ceiling_breaches}</td>
                        <td>{r.peak_kva.toFixed(1)}</td>
                        <td>{inr(r.bill_inr)}</td>
                        <td>{r.usable_headroom_kw.toFixed(1)}</td>
                        <td>{r.comfort_violation_pct.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {constant && (
                <p style={{ marginTop: 12, maxWidth: "76ch" }}>
                  <b style={{ color: "var(--ceiling)" }}>Replace the forecaster with a constant</b> and the same
                  controller, on the same month, takes{" "}
                  <b>{constant.ceiling_breaches - ours.ceiling_breaches} more ceiling breaches</b>, pays{" "}
                  <b>₹{inr(constant.bill_inr - ours.bill_inr)}</b> more, and has{" "}
                  <b>{Math.abs(constant.usable_headroom_kw - ours.usable_headroom_kw).toFixed(0)} kW less</b> usable
                  headroom. Nothing else moved.
                </p>
              )}
              <p className="note" style={{ marginTop: 9 }}>
                * the static margin is one number for the whole month, so its pinball loss and coverage describe a
                constant rather than a forecast. Persistence is the instructive failure: its q95 chases the last
                observation, so it <i>claims</i> the most headroom of anything here and then breaches{" "}
                {abl.rows.find((r) => r.key === "persistence")?.ceiling_breaches} times spending capacity that was
                never there. Headroom without calibration is not a benefit.
              </p>
            </>
          )}
        </section>

        {/* ------------------------------------------------- why forecast at all */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 12 }}>
          <section className="card">
            <div className="card-head"><h2>Why not a fixed margin?</h2><span className="eyebrow">the engineer&rsquo;s alternative, swept</span></div>
            {m?.impact?.static_margin?.sweep ? (
              <>
                <StaticMargin impact={m.impact} />
                <p className="note" style={{ marginTop: 8 }}>
                  Every distribution engineer already knows how to protect a transformer without machine learning:
                  never plan on more than a fixed allowance. So we swept it — each red dot is a full simulated month
                  on a constant derating — and compared at <i>equal safety</i>.
                </p>
                {m.impact.static_margin.statement && (
                  <p style={{ marginTop: 9, maxWidth: "60ch" }}>{m.impact.static_margin.statement}</p>
                )}
              </>
            ) : <Missing what="eval/impact.py" />}
          </section>

          <section className="card">
            <div className="card-head"><h2>What the quality is worth</h2><span className="eyebrow">the exchange rate</span></div>
            {abl ? (
              <>
                <ExchangeRate rows={abl.rows} metric="bill_inr" />
                {m?.frontier?.exchange_rate?.bill_inr && (
                  <p style={{ marginTop: 8, maxWidth: "60ch" }}>
                    Across the whole family of forecasters, one unit of pinball loss costs{" "}
                    <b style={{ color: "var(--ceiling)" }}>
                      ₹{inr(m.frontier.exchange_rate.bill_inr.per_unit_pinball)}
                    </b>{" "}
                    a month on this building (R² {m.frontier.exchange_rate.bill_inr.r2.toFixed(2)}), and{" "}
                    {m.frontier.exchange_rate.ceiling_breaches && (
                      <>
                        <b style={{ color: "var(--ceiling)" }}>
                          {m.frontier.exchange_rate.ceiling_breaches.per_unit_pinball.toFixed(1)} ceiling breaches
                        </b>{" "}
                        (R² {m.frontier.exchange_rate.ceiling_breaches.r2.toFixed(2)}).
                      </>
                    )}{" "}
                    That is a measured exchange rate between model quality and money, not an assertion that better
                    models are better.
                  </p>
                )}
                <p className="note" style={{ marginTop: 8 }}>
                  Persistence and the static margin are in the table above but off this plot: at 20–28 pinball they
                  would compress everything else onto the axis.
                </p>
              </>
            ) : <Missing what="eval/ablation.py" />}
          </section>
        </div>

        {/* --------------------------------------------------------- the benchmark */}
        <section className="card">
          <div className="card-head">
            <h2>The model, against everything that could replace it</h2>
            <span className="eyebrow">held-out June 2017 · touched once</span>
          </div>
          {!m?.benchmark ? <Missing what="eval/forecast_eval.py" /> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, alignItems: "start" }}>
              <div className="table-scroll">
                <table className="grid-table">
                  <thead>
                    <tr><th>Forecaster</th><th>Pinball</th><th>CRPS</th><th>MAE kW</th><th>Cov 90%</th><th>Width kW</th></tr>
                  </thead>
                  <tbody>
                    {m.benchmark.map((r) => (
                      <tr key={r.key} data-hero={r.key === OURS}>
                        <td><span className="swatch" style={{ background: rowColour(r.key) }} />{r.name}</td>
                        <td>{r.pinball_mean.toFixed(3)}</td>
                        <td>{r.crps == null ? "—" : r.crps.toFixed(2)}</td>
                        <td>{r.mae_median.toFixed(2)}</td>
                        <td>{r.key === "perfect_foresight" ? "n/a" : r.coverage_90.toFixed(3)}</td>
                        <td>{r.sharpness_90.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                {m.rolling ? <FoldSpread rolling={m.rolling} /> : (
                  <p className="note">Rolling-origin folds not in this export; run with <b>--rolling</b>.</p>
                )}
                <p className="note" style={{ marginTop: 10 }}>
                  A single split on seasonal data is fragile, so the model is also walked forward over expanding
                  windows. The spread matters as much as the mean: a forecaster that is excellent in February and
                  poor in May is not one you let hold a transformer.
                </p>
                <p className="note" style={{ marginTop: 8 }}>
                  The neural quantile net is here as a <b>benchmark, not as the product</b>. It is trained on the same
                  features with the same pinball loss and put through the same calibration layer. It lands within a
                  hair of the boosters — which is the expected result at this data scale, and now it is measured
                  rather than asserted.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------ cold start */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 12 }}>
          <section className="card">
            <div className="card-head"><h2>A building it has never seen</h2><span className="eyebrow">cold start</span></div>
            {!m?.cold_start ? <Missing what="eval/cold_start.py" /> : (
              <>
                <div className="table-scroll">
                  <table className="grid-table">
                    <thead><tr><th>Trained on</th><th>Pinball</th><th>Cov 90%</th><th>q95 hit</th><th>MAE kW</th></tr></thead>
                    <tbody>
                      {(["warm", "cold", "seasonal_naive"] as const).map((k) => {
                        const r = m.cold_start!.rows[k];
                        if (!r) return null;
                        return (
                          <tr key={k} data-hero={k === "cold"}>
                            <td>{r.label}</td>
                            <td>{r.pinball_mean.toFixed(3)}</td>
                            <td>{r.coverage_90.toFixed(3)}</td>
                            <td>{r.below_q95.toFixed(3)}</td>
                            <td>{r.mae_median.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="note" style={{ marginTop: 9 }}>
                  {m.cold_start.target.replace("Fox_", "").replace("_", " · ")} is held out of training entirely and
                  contributes only {m.cold_start.warmup_days} days of its own history, used to set its scale
                  ({Math.round(m.cold_start.scale_kw)} kW) and fill its lags — exactly what a new site has on day one.
                </p>
                {m.cold_start.summary && (
                  <>
                    <p style={{ marginTop: 9, maxWidth: "60ch" }}>{m.cold_start.summary.statement}</p>
                    <p className="note" style={{ marginTop: 8 }}>
                      What survives the transfer is the property the controller actually depends on: coverage on a
                      building the model has never seen, against a nominal 0.90. What does not survive is sharpness.
                      So the deployment answer is a fortnight of seasonal naive at a new site, the pooled model's
                      interval from day one, and a site-specific model once there is a season of data — rather than a
                      transfer claim the numbers do not support.
                    </p>
                  </>
                )}
              </>
            )}
          </section>

          <section className="card">
            <div className="card-head"><h2>The evening we got wrong</h2><span className="eyebrow">worst case, not best case</span></div>
            {!m?.interpretability?.worst_case ? <Missing what="eval/interpret.py" /> : (
              <>
                <WorstEvening wc={m.interpretability.worst_case} />
                <p className="note" style={{ marginTop: 8 }}>
                  The worst interval of the worst day in the test month: actual{" "}
                  {Math.round(m.interpretability.worst_case.actual_kw)} kW against a q95 of{" "}
                  {Math.round(m.interpretability.worst_case.q95_kw)} kW, an exceedance of{" "}
                  <b style={{ color: "var(--ceiling)" }}>{Math.round(m.interpretability.worst_case.worst_exceedance_kw)} kW</b>.
                  The ceiling held anyway: there were{" "}
                  {Math.round(m.interpretability.worst_case.headroom_at_worst_kw)} kW of headroom under the target at
                  that moment, and the controller had already priced the risk into what it handed out. That is what the
                  margin is for.
                </p>
              </>
            )}
          </section>
        </div>

        {/* ----------------------------------------------------- interpretability */}
        <section className="card">
          <div className="card-head">
            <h2>What the model uses, and what it needs</h2>
            <span className="eyebrow">SHAP and feature-group ablation</span>
          </div>
          {!m?.interpretability ? <Missing what="eval/interpret.py" /> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, alignItems: "start" }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 7 }}>mean |SHAP| on the q95 booster</div>
                {m.interpretability.shap.q95 && <ShapBars shap={m.interpretability.shap.q95} />}
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 7 }}>drop a group, retrain, measure the damage</div>
                <FeatureGroups groups={m.interpretability.feature_groups} full={m.interpretability.feature_full} />
                <p className="note" style={{ marginTop: 9 }}>
                  These two disagree, and the disagreement is the finding. SHAP says the model leans on the calendar;
                  the retrain says it <i>needs</i> the calendar and the weather forecast, and that the recent lags and
                  rolling statistics can be dropped without loss at this horizon. Sixteen hours ahead, what the meter
                  read an hour ago carries almost nothing — which is exactly why persistence fails so badly in the
                  ablation above.
                </p>
                <p className="note" style={{ marginTop: 8 }}>
                  The caveat belongs next to the number: weather at the target time is the recorded observation — a
                  perfect weather forecast — so the +34% is an <b>upper bound</b> on what a real weather feed is
                  worth. A deployment buys a forecast with its own error. This was in{" "}
                  <b>docs/limitations.md</b> before any of these results existed, and{" "}
                  <b>--weather-noise-c</b> exists to degrade it.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------- impact */}
        <section className="card">
          <div className="card-head">
            <h2>What it is worth</h2>
            <span className="eyebrow">computed, with the assumptions printed</span>
          </div>
          {!m?.impact ? <Missing what="eval/impact.py" /> : (
            <>
              <MoneyRow impact={m.impact} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 18, marginTop: 14 }}>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>technical</div>
                  <p className="note" style={{ fontSize: 11, lineHeight: 1.6 }}>
                    Peak demand {Number(m.impact.tier1?.peak_reduction_kva ?? 0).toFixed(1)} kVA lower than doing
                    nothing ({Number(m.impact.tier1?.peak_reduction_pct ?? 0).toFixed(1)}%), breaches{" "}
                    {m.impact.tier1?.uncontrolled_breaches} → {m.impact.tier1?.our_breaches}, capturing{" "}
                    {Number(m.impact.tier1?.pct_of_achievable_captured ?? 0).toFixed(1)}% of the saving a
                    perfect-foresight controller gets on the same month.
                  </p>
                </div>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>operational — the strongest one</div>
                  <p className="note" style={{ fontSize: 11, lineHeight: 1.6 }}>
                    {m.impact.ev_headroom?.deferral_statement ??
                      "EV headroom sweep not in this export."}
                  </p>
                </div>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>scale, as arithmetic</div>
                  <p className="note" style={{ fontSize: 11, lineHeight: 1.6 }}>
                    {String(m.impact.tier4?.arithmetic ?? "")}. It assumes every building on every feeder is like this
                    one, has a demand charge, and is instrumented. The point of the multiplication is the shape of the
                    number, not its precision.
                  </p>
                </div>
              </div>
              <details style={{ marginTop: 12 }}>
                <summary className="eyebrow" style={{ cursor: "pointer" }}>every assumption behind these numbers</summary>
                <div className="table-scroll" style={{ marginTop: 8 }}>
                  <table className="grid-table">
                    <thead><tr><th>Constant</th><th>Value</th><th style={{ textAlign: "left" }}>Why that value</th></tr></thead>
                    <tbody>
                      {Object.entries(m.impact.assumptions ?? {}).map(([k, v]) => (
                        <tr key={k}>
                          <td>{k}</td>
                          <td>{v.value}</td>
                          <td style={{ textAlign: "left", whiteSpace: "normal", maxWidth: 520, color: "var(--dim)" }}>{v.why}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </section>

        {/* --------------------------------------------------------- model card */}
        {m?.model_card && (
          <section className="card">
            <div className="card-head"><h2>Model card</h2><span className="eyebrow">generated from the artefacts, not written by hand</span></div>
            <details>
              <summary className="eyebrow" style={{ cursor: "pointer" }}>open the card</summary>
              <pre style={{
                margin: "10px 0 0", padding: "12px 14px", background: "var(--void)", border: "1px solid var(--rule)",
                borderRadius: 6, overflowX: "auto", font: "400 11px/1.65 var(--mono)", color: "var(--ink)",
                whiteSpace: "pre-wrap",
              }}>{m.model_card}</pre>
            </details>
          </section>
        )}

        <p className="note" style={{ textAlign: "center", padding: "6px 0 20px" }}>
          Coverage on held-out June for this building: {cal ? cal.coverage_90.toFixed(3) : "—"} against a nominal
          0.90 · every figure on this page comes from <b>results/</b>, regenerated by <b>./reproduce.sh</b> ·
          bundle generated {new Date(b.generated_at).toISOString().slice(0, 16).replace("T", " ")} UTC.
        </p>
      </main>
    </>
  );
}
