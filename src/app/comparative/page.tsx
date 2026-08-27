import {
  ControllableFraction, CoverageDots, SiteLadder, SkillBars, TempCorrelation, FLAG,
} from "@/components/ComparativeCharts";
import type { Comparative } from "@/lib/comparativeTypes";
import raw from "@/lib/comparative.json";

export const metadata = { title: "Benchmark — Aethergrid" };

const data = raw as unknown as Comparative;
const OURS = "lightgbm_quantile";

function Stat({ k, v, note, tone }: { k: string; v: string; note: string; tone?: string }) {
  return (
    <div style={{ background: "var(--panel)", padding: "10px 12px" }}>
      <div className="eyebrow">{k}</div>
      <div className="num" style={{ fontSize: 19, color: tone ?? "var(--ink-hi)", margin: "4px 0 5px" }}>{v}</div>
      <div className="note">{note}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1,
      background: "var(--rule)", border: "1px solid var(--rule)", borderRadius: 6, overflow: "hidden",
    }}>{children}</div>
  );
}

export default function ComparativePage() {
  const nat = data.arms.national ?? [];
  const buildings = [...(data.arms.climate ?? []), ...(data.arms.office ?? [])];
  const demo = data.arms.demographic ?? [];
  const india = nat.find((r) => r.country === "IN");
  const fox = buildings.find((r) => r.id === "Fox_office_Gaylord");

  const cddHvac = data.correlations?.cdd_vs_hvac;
  const hvacSkill = data.correlations?.hvac_vs_skill;

  const demoSpread = demo.filter((r) => r.hvacShare !== null);
  const demoLo = demoSpread.length ? Math.min(...demoSpread.map((r) => r.hvacShare!)) : null;
  const demoHi = demoSpread.length ? Math.max(...demoSpread.map((r) => r.hvacShare!)) : null;

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
          <a href="/samanvay">Society</a>
          <a href="/worldsim">World sim</a>
          <a href="/model">Model</a>
          <a href="/method">Method</a>
          <a href="/comparative" aria-current="page">Benchmark</a>
        </nav>
      </header>

      <main className="stage" style={{ maxWidth: 1180, margin: "0 auto", width: "100%" }}>

        {/* ------------------------------------------------------ the question */}
        <section className="card">
          <div className="card-head"><h2>Does it travel?</h2><span className="eyebrow">the standing objection</span></div>
          <p style={{ maxWidth: "74ch", marginBottom: 12 }}>
            Every number this project has published comes from four buildings at one site in Tempe, Arizona.
            Our own data file has always said so: <i>&ldquo;It is not India, and the load shapes are American.&rdquo;</i>{" "}
            That is an honest disclosure and it is also a standing objection — is the method general, or is it a
            careful fit to Phoenix?
          </p>
          <p style={{ maxWidth: "74ch", marginBottom: 12 }}>
            You do not answer that by asserting generality. You answer it by running the identical pipeline
            somewhere else and reporting what happens, <b>including where it stops working</b>. So we applied the
            same selection rule to all nineteen sites, held one factor fixed at a time, and went and got real
            Indian data — which this dataset does not contain.
          </p>
          <Grid>
            <Stat k="Buildings passing the rule" v={String(data.counts?.passing ?? "—")}
                  note={`across ${data.counts?.sitesWithPasses ?? "—"} sites and ${data.counts?.countries ?? "—"} countries, selected by rule and never by hand`} />
            <Stat k="Series benchmarked" v={String(buildings.length + demo.length + nat.length)}
                  note="four arms, one protocol, nothing tuned per site" />
            <Stat k="Countries with real data" v={String(new Set([...buildings, ...demo, ...nat].map((r) => r.country)).size)}
                  note="building-level where it exists, system-level where it does not" />
            <Stat k="Defects this found in us" v="2" tone="var(--ceiling)"
                  note="a hard-coded American holiday calendar, and a manifest that clobbered itself" />
          </Grid>
        </section>

        {/* --------------------------------------------------------- the ladder */}
        <section className="card">
          <div className="card-head"><h2>What the rule discovers about itself</h2><span className="eyebrow">before a single model is trained</span></div>
          <p style={{ maxWidth: "74ch", marginBottom: 12 }}>
            Our selection rule ends with &ldquo;positive load-versus-temperature correlation&rdquo;. At Fox that is a
            sanity check, because every candidate is cooling-dominated. Applied to Minneapolis or Dublin it
            removes most of the site — those buildings burn electricity when it is <i>cold</i>. The rule was
            carrying a Phoenix assumption and did not know it.
          </p>
          <SiteLadder sites={data.sites ?? []} />
          <p className="note" style={{ marginTop: 12, maxWidth: "74ch" }}>
            The two hottest sites in the dataset — Orlando, the closest climates here to an Indian metro — yield
            <b> nothing</b>, because no building there has adequate coverage in the split window. The sites most
            like the target market are the ones the data will not support.
          </p>
        </section>

        {/* -------------------------------------------- controllable fraction */}
        <section className="card">
          <div className="card-head"><h2>There has to be something to control</h2><span className="eyebrow">climate arm · demographic held fixed</span></div>
          <p style={{ maxWidth: "74ch", marginBottom: 12 }}>
            Before asking whether the forecaster is accurate, ask whether the controller has any load to move.
            The fitted HVAC share of the meter is that fraction, and it collapses as you walk down the climate ladder.
          </p>
          <ControllableFraction rows={[...buildings, ...demo]} />
          {cddHvac && (
            <p className="note" style={{ marginTop: 12, maxWidth: "74ch" }}>
              Correlation between cooling-degree-day share and controllable fraction:{" "}
              <b style={{ color: "var(--ink-hi)" }}>{cddHvac.r >= 0 ? "+" : ""}{cddHvac.r.toFixed(3)}</b> over {cddHvac.n} buildings.
              {demoLo !== null && demoHi !== null && (
                <> But inside a single city the demographic alone swings it from{" "}
                <b style={{ color: "var(--ink-hi)" }}>{(demoLo * 100).toFixed(1)}%</b> to{" "}
                <b style={{ color: "var(--ink-hi)" }}>{(demoHi * 100).toFixed(1)}%</b> — so <i>what</i> the building is
                matters as much as <i>where</i> it is.</>
              )}
            </p>
          )}
        </section>

        {/* ------------------------------------------------------- the mirror */}
        {nat.some((r) => r.corrTemp !== null) && (
          <section className="card">
            <div className="card-head"><h2>India and Europe are mirror images</h2><span className="eyebrow">national arm · real system demand</span></div>
            <p style={{ maxWidth: "74ch", marginBottom: 12 }}>
              This dataset contains no Indian buildings, so rather than relabel an American one we went to real
              Indian demand: <b>Delhi SLDC, 15-minute native resolution</b> — the only series in this project that
              does not have to be upsampled from hourly — against ENTSO-E national demand for Europe.
            </p>
            <TempCorrelation rows={nat} />
            <p className="note" style={{ marginTop: 12, maxWidth: "74ch" }}>
              Correlation of demand with outdoor temperature. Delhi and France sit at opposite ends: Indian demand
              rises with heat, French demand rises with cold. <b>This is the whole thesis in one chart.</b> A
              demand-charge controller that buys down a cooling peak is worth something in the first regime and
              close to nothing in the second — and India is at the favourable end.
            </p>
          </section>
        )}

        {/* --------------------------------------------------------- the skill */}
        {(buildings.length > 0 || nat.length > 0) && (
          <section className="card">
            <div className="card-head"><h2>Skill over what a site can do with no model</h2><span className="eyebrow">all arms</span></div>
            <p style={{ maxWidth: "74ch", marginBottom: 12 }}>
              Absolute pinball loss is not comparable across a 3,000 MW city and a 60 kW building, and Delhi&rsquo;s
              window does not overlap Europe&rsquo;s. So the headline is skill against each series&rsquo; <i>own</i>{" "}
              seasonal-naive baseline — a ratio computed inside one series&rsquo; own data and own period.
            </p>
            <SkillBars rows={[...buildings, ...demo, ...nat]} highlight={india?.id} />
          </section>
        )}

        {/* -------------------------------------------------- where it breaks */}
        {india?.models?.[OURS] && (
          <section className="card">
            <div className="card-head"><h2>Where it breaks, reported rather than buried</h2><span className="eyebrow">the finding that matters</span></div>
            <Grid>
              <Stat k="Fox office · skill" v={fox?.models?.[OURS]?.skill != null ? `+${fox.models[OURS].skill!.toFixed(3)}` : "—"}
                    note="what the model is worth on the building the project was built on" tone="var(--ours)" />
              <Stat k="Delhi · skill" v={india.models[OURS].skill != null ? `+${india.models[OURS].skill!.toFixed(3)}` : "—"}
                    note="what it is worth on real Indian demand, same protocol" tone="var(--breach)" />
              <Stat k="Delhi · 90% coverage" v={india.models[OURS].cov90?.toFixed(3) ?? "—"}
                    note="against a nominal 0.90. The interval is too narrow." tone="var(--ceiling)" />
            </Grid>
            <p style={{ maxWidth: "74ch", margin: "14px 0 0" }}>
              On real Indian data the model&rsquo;s advantage over a seasonal naive baseline largely collapses, and its
              nominal 90% interval covers materially less than 90%. We are reporting this because it is the most
              important row in the study and because <b>the q95 that holds the demand ceiling is the same object as
              that interval</b> — if it is not really a 95th percentile, the safety guarantee is theatre.
            </p>
            <p className="note" style={{ marginTop: 10, maxWidth: "74ch" }}>
              The mechanism is one our own conformal audit already identified: split conformal assumes the
              calibration window and the test window are exchangeable, and a Delhi May is not exchangeable with a
              Delhi June — the monsoon arrives in between. It is the same failure the audit found month-to-month at
              Fox, showing up larger on a series with a sharper regime change. The adaptive layer is the fix, and
              quantifying how much of the gap it closes on Indian data is the next piece of work, not a claim we
              are making today.
            </p>
          </section>
        )}

        {/* ------------------------------------------------------- calibration */}
        {[...buildings, ...demo, ...nat].some((r) => r.models?.[OURS]?.cov90 != null) && (
          <section className="card">
            <div className="card-head"><h2>Calibration, everywhere</h2><span className="eyebrow">the safety-critical quantity</span></div>
            <CoverageDots rows={[...buildings, ...demo, ...nat]} />
          </section>
        )}

        {/* ------------------------------------------------------------ limits */}
        <section className="card">
          <div className="card-head"><h2>What this does not show</h2><span className="eyebrow">written before the results</span></div>
          <ul style={{ margin: 0, paddingLeft: 18, font: "400 12.5px/1.85 var(--sans)", color: "var(--ink)", maxWidth: "78ch" }}>
            <li>The national arm is a <b>forecasting</b> benchmark, not a control benchmark. There is no thermal mass
                to shift at system level. It tests the model, which is what was asked; it makes no savings claim.</li>
            <li>Delhi is 2011–12 and Europe is 2016–17. There is no overlapping year. Skill is reported precisely
                because it is a within-series ratio, but this is mitigation, not elimination.</li>
            <li>Capital-city temperature stands in for national load-weighted temperature. Fine for Great Britain
                and Ireland, rough for Germany, France and Spain. Delhi is a city, so the problem does not arise there.</li>
            <li>Nothing here claims that <i>weights</i> transfer across countries. Our own cold-start study already
                shows the model losing to seasonal naive on an unseen building at the same site. The claim under
                test is that the architecture and the protocol travel.</li>
            <li>The demographic arm is one city, so it cannot separate demographic from local building stock.</li>
            <li>Delhi is one Indian city. It is real Indian data, which this project did not have before. It is not
                a claim about India.</li>
          </ul>
        </section>

        <footer className="note" style={{ padding: "18px 0 40px", color: "var(--faint)" }}>
          Generated from <code>results/comparative.json</code> by <code>eval/comparative_web.py</code>.
          Sources: Building Data Genome Project 2; Delhi SLDC; ENTSO-E via Open Power System Data; ERA5 via Open-Meteo.
          Full method and limitations in <code>docs/comparative_study.md</code>.
        </footer>
      </main>
    </>
  );
}
