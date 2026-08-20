import Worldsim from "@/components/Worldsim";
import { loadBundle } from "@/lib/data";

export default function WorldsimPage() {
  const bundle = loadBundle();
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
    </>
  );
}
