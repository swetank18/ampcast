"use client";

/**
 * Client-side error boundary.
 *
 * A live demo should degrade, not disappear. Next's default is a bare "this page
 * couldn't load", which on stage is indistinguishable from the laptop dying, so
 * this keeps the masthead, says what happened, and offers the one action that
 * usually works.
 */

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="stage" style={{ maxWidth: 700, margin: "0 auto", width: "100%", paddingTop: 60 }}>
      <section className="card">
        <div className="card-head">
          <h2>The page hit an error</h2>
          <span className="eyebrow">client side</span>
        </div>
        <p style={{ marginBottom: 10 }}>
          The data behind this page is static and unaffected — this is the interface, not the study.
        </p>
        <pre style={{
          margin: "0 0 12px", padding: "10px 12px", background: "var(--void)", border: "1px solid var(--rule)",
          borderRadius: 6, overflowX: "auto", font: "400 11px/1.6 var(--mono)", color: "var(--ceiling)",
        }}>{error.message}{error.digest ? `\n\ndigest ${error.digest}` : ""}</pre>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="btn btn-primary" onClick={reset}>Try again</button>
          <a className="btn" href="/worldsim">World sim</a>
          <a className="btn" href="/model">Model</a>
        </div>
      </section>
    </main>
  );
}
