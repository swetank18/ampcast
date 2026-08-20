import Worldsim from "@/components/Worldsim";
import { loadBundleFromDb } from "@/lib/data";

export const revalidate = 300;

export default async function WorldsimPage() {
  const bundle = await loadBundleFromDb();
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
          <a href="/worldsim" aria-current="page">World sim</a>
          <a href="/method">Method</a>
        </nav>
      </header>
      <Worldsim bundle={bundle} />
      <p className="note" style={{ textAlign: "center", padding: "0 0 18px" }}>
        Figures served from {bundle.source === "neon" ? "Neon Postgres" : "the bundled export"} ·
        simulation generated {new Date(bundle.generated_at).toISOString().slice(0, 10)}
      </p>
    </>
  );
}
