"use client";

/* =============================================================================
 * SAMANVAY — the REQUESTS tab.
 *
 * Three stacked sections. What needs the operator, what did not need anybody,
 * and what the week ahead looks like once the granted requests are laid over
 * the forecast. The middle section should feel boring; boring is the point.
 *
 * There is no confirmation dialogue anywhere in this tab. Every decision
 * commits at once and its toast carries a ten second undo, after which the
 * action is final.
 * ========================================================================== */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CEILING, FLATS } from "./model";
import { EVENT_TONE, ago, useShared } from "@/lib/bridge";
import {
  ASK_LABEL, AUTO, AUTO_DECLINED, BROADCASTS, BUDGET_SPREAD, CLUSTER, CONSENT, MONTH_STATS,
  QUEUE, RECEIVED_THIS_MONTH, SOURCE_LABEL, WEEK,
  type Request, type RequestStatus,
  ageLabel, ageTone, costLine, fromResident, magnitudeLine, rupees,
} from "./requests";

type Push = (tone: "neutral" | "confirm" | "warn", text: string) => void;

interface Undo { id: number; text: string; revert: () => void }

/** What the seven day strip should draw instead of the committed figure, while
 * the operator is hovering a button but has not pressed it. */
export interface Preview { day: string; granted: number; note: string }

export default function RequestsTab({
  push, onPending,
}: { push: Push; onPending: (n: number) => void }) {
  const [decided, setDecided] = useState<Record<string, RequestStatus>>({});
  const [clustered, setClustered] = useState(true);
  const [staggered, setStaggered] = useState(false);
  const [showAuto, setShowAuto] = useState(false);
  const [showDeclined, setShowDeclined] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const [compose, setCompose] = useState<string | null>(null);

  /* The resident app writes into the same store. Anything a flat sends arrives
   * here without a refresh, in this tab and in any other tab that has the
   * console open. */
  const { state: shared } = useShared();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(tick);
  }, []);

  /* A decision commits immediately and offers ten seconds to take it back. */
  const commit = useCallback((text: string, apply: () => void, revert: () => void) => {
    apply();
    const id = Date.now();
    setUndo({ id, text, revert });
    window.setTimeout(() => setUndo((u) => (u && u.id === id ? null : u)), 10_000);
  }, []);

  const decide = useCallback((r: Request, status: RequestStatus, label: string) => {
    commit(
      `${r.flat} — ${label}`,
      () => setDecided((d) => ({ ...d, [r.id]: status })),
      () => setDecided((d) => { const n = { ...d }; delete n[r.id]; return n; }),
    );
  }, [commit]);

  const stagger = useCallback(() => {
    commit(
      `Saturday staggered into two groups — ${CLUSTER.staggered.peak} kVA, ${rupees(CLUSTER.staggered.cost)}`,
      () => { setStaggered(true); setDecided((d) => ({ ...d, ...Object.fromEntries(CLUSTER.ids.map((i) => [i, "approved" as RequestStatus])) })); },
      () => { setStaggered(false); setDecided((d) => { const n = { ...d }; CLUSTER.ids.forEach((i) => delete n[i]); return n; }); },
    );
  }, [commit]);

  /* Requests sent from the resident app sit at the top of the queue, newest
   * first, because a resident watching their own screen is waiting on this. */
  const live = useMemo(() => shared.requests.map(fromResident), [shared.requests]);
  const all = useMemo(() => [...live, ...QUEUE], [live]);

  const open = all.filter((r) => !decided[r.id]);
  const clusterOpen = clustered && !staggered && CLUSTER.ids.every((i) => !decided[i]);
  const cards = clusterOpen ? open.filter((r) => !CLUSTER.ids.includes(r.id)) : open;
  const pending = open.length;

  useEffect(() => { onPending(pending); }, [pending, onPending]);

  /* Consent coverage moves with the resident's own tier switches. */
  const sharing = CONSENT.sharing - (shared.tier2 ? 0 : 1);
  const appliance = CONSENT.tiers[3].flats + (shared.tier3 ? 1 : 0);

  return (
    <>
      <main className="sv-main" style={{ alignContent: "start" }}>
        {/* --------------------------------------------- A · needs you */}
        <section className="sv-req-sec">
          <header className="sv-req-head">
            <h3>Needs your decision</h3>
            <span className="sv-eyebrow">{pending === 0 ? "nothing open" : `${pending} open`}</span>
          </header>

          {shared.medical && (
            <div className="sv-req-flag">
              <b>A2 0202 has raised a medical flag.</b>
              <span>
                That flat is protected, is no longer ranked, and takes no part in load balancing
                until the flag is removed. Nothing here needs your approval.
              </span>
            </div>
          )}

          {pending === 0 ? (
            <p className="sv-req-empty">
              Nothing needs you right now. Every request this week fitted inside the headroom and
              was approved automatically.
            </p>
          ) : (
            <>
              {clusterOpen && (
                <ClusterCard
                  onStagger={stagger}
                  onPreview={setPreview}
                  onSplit={() => setClustered(false)}
                />
              )}
              {cards.map((r) => (
                <RequestCard
                  key={r.id}
                  r={r}
                  onDecide={decide}
                  onPreview={setPreview}
                  push={push}
                />
              ))}
            </>
          )}
        </section>

        {/* -------------------------------------- B · approved without us */}
        <section className="sv-req-sec">
          <header className="sv-req-head">
            <h3>Approved automatically</h3>
            <span className="sv-eyebrow">
              These fitted inside the forecast headroom, so nobody had to decide.
            </span>
          </header>

          <table className="sv-req-table">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Flat</th>
                <th>Ask</th>
                <th style={{ width: 200 }}>Reason</th>
                <th style={{ width: 100 }} className="num">Peak impact</th>
                <th style={{ width: 90 }} className="num">Cost</th>
                <th style={{ width: 100 }}>Decided</th>
              </tr>
            </thead>
            <tbody>
              {(showAuto ? AUTO : AUTO.slice(0, 8)).map((a) => (
                <tr key={a.id}>
                  <td>{a.flat}</td>
                  <td className="ask">{a.ask}</td>
                  <td className="dim" title={a.reason}>{a.reason || "—"}</td>
                  <td className="num dim">{a.peakDelta > 0 ? `+${a.peakDelta.toFixed(1)} kVA` : "—"}</td>
                  <td className="num saved">{rupees(a.cost)}</td>
                  <td className="dim">{a.decided}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="sv-req-more">
            {!showAuto && (
              <button className="sv-link" onClick={() => setShowAuto(true)}>
                Show all {RECEIVED_THIS_MONTH} this month
              </button>
            )}
            <button className="sv-link" onClick={() => setShowDeclined((v) => !v)}>
              {showDeclined ? "Hide" : "Show"} {AUTO_DECLINED.length} auto declined
            </button>
          </div>

          {showDeclined && (
            <div className="sv-req-declined">
              <p className="sv-note">
                Requests for a day already at the ceiling are declined before they reach you, and
                a counter offer goes out with the decline. They are listed here rather than
                hidden, because automation you cannot see is automation you cannot answer for.
              </p>
              {AUTO_DECLINED.map((d) => (
                <div key={d.id} className="sv-req-drow">
                  <b>{d.flat}</b>
                  <span>{d.ask}</span>
                  <span className="ceil">{rupees(d.cost)} · +{d.peakDelta.toFixed(1)} kVA</span>
                  <span className="dim">{d.counter}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ------------------------------------------------ C · coming up */}
        <section className="sv-req-sec">
          <header className="sv-req-head">
            <h3>Coming up</h3>
            <span className="sv-eyebrow">
              Granted requests laid over the forecast peak for each day.
            </span>
          </header>
          <WeekStrip preview={staggered ? { day: "Sat 29", granted: CLUSTER.staggered.peak - 84.4, note: "staggered" } : preview} />
        </section>
      </main>

      {/* ------------------------------------------------------------ rail */}
      <aside className="sv-rail">
        <div className="sv-card">
          <header>
            <h3>From residents</h3>
            <Link className="sv-link" href="/samanvay/resident" prefetch={false}>
              Open resident app
            </Link>
          </header>
          {shared.events.length === 0 ? (
            <p className="sv-note">
              Nothing yet. Open the resident app in another tab and accept a suggestion — it
              lands here as it happens.
            </p>
          ) : (
            <div className="sv-req-feed">
              {shared.events.slice(0, 8).map((e) => (
                <div className={`sv-req-ev ${EVENT_TONE[e.kind]}`} key={e.id}>
                  <b>{e.flat}</b>
                  <span className="what">{e.text}</span>
                  <span className="when">{ago(e.at, now)}</span>
                  {typeof e.rupees === "number" && (
                    <span className="rup">{rupees(e.rupees)}/mo</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="sv-note" style={{ marginTop: 9 }}>
            Consent, pauses and medical flags are decisions residents make for themselves. They
            appear here so the operator is never surprised, never so they can be overridden.
          </p>
        </div>

        <div className="sv-card">
          <header><h3>This month</h3></header>
          <div className="sv-rows">
            {MONTH_STATS.map((s) => (
              <div className="sv-row" key={s.k}><span>{s.k}</span><span>{s.v}</span></div>
            ))}
          </div>
          <p className="sv-note" style={{ marginTop: 9 }}>31 of 34 needed nobody.</p>
        </div>

        <div className="sv-card">
          <header><h3>Send a broadcast</h3></header>
          <div className="sv-req-templates">
            {BROADCASTS.map((b) => (
              <button key={b.id} className="sv-btn" onClick={() => setCompose(b.id)}>{b.label}</button>
            ))}
          </div>
        </div>

        <div className="sv-card">
          <header><h3>Flexibility budget</h3></header>
          <p className="sv-note">
            Every flat gets 6 boost days a year, free. Beyond that, the cost of granting appears
            on their maintenance bill.
          </p>
          <div className="sv-req-spread">
            {BUDGET_SPREAD.map((b) => (
              <div key={b.band}>
                <i style={{ width: `${(b.flats / FLATS) * 100}%` }} />
                <span>{b.band}</span>
                <b>{b.flats}</b>
              </div>
            ))}
          </div>
          <p className="sv-note" style={{ marginTop: 9 }}>
            4 flats have used their full allowance. Which four is not shown, here or anywhere else.
          </p>
        </div>

        <div className="sv-card">
          <header><h3>Consent coverage</h3></header>
          <div className="sv-big"><b>{sharing}</b> <em>of {CONSENT.total}</em></div>
          <p className="sv-note">
            flats share per flat readings. The rest count in the society total only.
          </p>
          <div className="sv-req-tiers">
            {CONSENT.tiers.map((t) => {
              const flats = t.id === 3 ? appliance : t.flats;
              return (
                <i
                  key={t.id}
                  className={`t${t.id}`}
                  style={{ width: `${(flats / CONSENT.total) * 100}%` }}
                  title={`Tier ${t.id} · ${t.label} · ${flats} flats`}
                />
              );
            })}
          </div>
          <button
            className="sv-btn"
            style={{ width: "100%", marginTop: 10 }}
            onClick={() => push("neutral", "Consent asked of 13 flats · next ask allowed 12 Oct")}
          >
            Ask for consent
          </button>
          <p className="sv-note" style={{ marginTop: 8 }}>
            You can ask each flat once per quarter. Last asked {CONSENT.lastAsked}.
          </p>
        </div>
      </aside>

      {undo && <UndoBar key={undo.id} undo={undo} onUndo={() => { undo.revert(); setUndo(null); }} />}
      {compose && <Composer id={compose} onClose={() => setCompose(null)} push={push} />}
    </>
  );
}

/* ============================================================= the cluster */

/* Two requests, one decision. Each flat's cost if approved alone, then the
 * figure that is actually true, then the sentence saying why the first two
 * mislead. */
function ClusterCard({
  onStagger, onPreview, onSplit,
}: { onStagger: () => void; onPreview: (p: Preview | null) => void; onSplit: () => void }) {
  return (
    <article className="sv-req-card cluster">
      <div className="sv-req-banner">
        Two requests want the same evening
        <span>{CLUSTER.day} · {CLUSTER.window}</span>
      </div>

      <div className="sv-req-cluster-body">
        <div className="sv-req-alone">
          <span className="sv-eyebrow">If you approve only one</span>
          {CLUSTER.alone.map((a) => (
            <div className="sv-row" key={a.flat}>
              <span>{a.flat}</span>
              <span className={a.cost === 0 ? "saved" : "ceil"}>
                {rupees(a.cost)} · {a.peak.toFixed(1)} kVA
              </span>
            </div>
          ))}
        </div>

        <div className="sv-req-figures">
          <div>
            <span className="sv-eyebrow">Together</span>
            <b className="ceil">{rupees(CLUSTER.together.cost)}</b>
            <span className="s">{CLUSTER.together.peak.toFixed(1)} kVA, past the {CEILING} ceiling</span>
          </div>
          <div>
            <span className="sv-eyebrow">Staggered</span>
            <b className="saved">{rupees(CLUSTER.staggered.cost)}</b>
            <span className="s">{CLUSTER.staggered.peak.toFixed(1)} kVA, nobody refused</span>
          </div>
        </div>
      </div>

      <p className="sv-note">
        Each request costs the society nothing on its own, so deciding them one at a time produces
        two numbers that both go wrong the moment either is approved. Together they cross the
        ceiling and cost {rupees(CLUSTER.together.cost)}, which is{" "}
        {rupees(Math.round(CLUSTER.together.cost / FLATS))} on every flat&rsquo;s bill this month.
      </p>

      <div className="sv-req-stagger">
        <span className="sv-eyebrow">The stagger</span>
        {CLUSTER.stagger.map((s) => (
          <div className="sv-req-slot" key={s.flat}>
            <b>{s.flat}</b>
            <span>{s.from} — {s.to}</span>
          </div>
        ))}
      </div>

      <div className="sv-req-actions">
        <button
          className="sv-btn primary"
          onClick={onStagger}
          onMouseEnter={() => onPreview({ day: "Sat 29", granted: CLUSTER.staggered.peak - 84.4, note: "staggered" })}
          onMouseLeave={() => onPreview(null)}
        >
          Stagger both · {CLUSTER.staggered.peak} kVA · {rupees(CLUSTER.staggered.cost)}
        </button>
        <button className="sv-btn" onClick={onSplit}>Decide separately</button>
      </div>
      <p className="sv-note">
        Nobody is refused. Both flats get their evening, one starting two hours later than it
        asked for.
      </p>
    </article>
  );
}

/* ================================================================ one card */

function RequestCard({
  r, onDecide, onPreview, push,
}: {
  r: Request;
  onDecide: (r: Request, s: RequestStatus, label: string) => void;
  onPreview: (p: Preview | null) => void;
  push: Push;
}) {
  const [counter, setCounter] = useState(false);
  const [message, setMessage] = useState(
    "We cannot do 7pm without a cost to everyone, but 8pm to midnight is completely free. Would that work?",
  );
  const perFlat = Math.round(r.impact.societyCost / FLATS);
  const tone = ageTone(r.ageHours);

  return (
    <article className="sv-req-card">
      <div className="sv-req-grid">
        {/* who and when */}
        <div className="sv-req-who">
          <b>{r.flat}</b>
          <span className="dim">{r.household}</span>
          <div className="sv-req-rule" />
          <span className="sv-eyebrow">Requested for</span>
          <span>{r.day}</span>
          <span>{r.start} to {r.end}</span>
          <div className="sv-req-tags">
            <span className="sv-req-tag">{SOURCE_LABEL[r.source]}</span>
            <span className={`sv-req-tag ${tone}`}>{ageLabel(r.ageHours)}</span>
            {r.untilHours <= 48 && <span className="sv-req-tag watch">in {r.untilHours} hr</span>}
          </div>
        </div>

        {/* the ask */}
        <div className="sv-req-ask">
          <b>{ASK_LABEL[r.type]}</b>
          {r.reason && <p className="quote">&ldquo;{r.reason}&rdquo;</p>}
          {r.type === "extra_power" && <p className="dim">{magnitudeLine(r)}</p>}
          {r.medical && (
            <p className="sv-req-medical">
              Medically flagged. This request is acknowledged, never declined and never countered.
              Clause 4, ratified 14 June 2026.
            </p>
          )}
          {r.optedOut && (
            <p className="dim">
              This flat has opted out of load balancing. Its request is processed exactly the same way.
            </p>
          )}
          <Sparkline without={r.impact.withoutKva} with={r.impact.withKva} />
          {r.precedent && <p className="dim small">{r.precedent}</p>}
          {r.boostDayUse && <p className="dim small">{r.boostDayUse}</p>}
        </div>

        {/* the arithmetic */}
        <div className="sv-req-math">
          <b className={r.impact.fits ? "saved" : "ceil"}>{rupees(r.impact.societyCost)}</b>
          <p>{costLine(r, perFlat)}</p>

          {!counter ? (
            <div className="sv-req-btns">
              {r.medical ? (
                <button
                  className="sv-btn primary"
                  onClick={() => onDecide(r, "acknowledged", "acknowledged, supply protected")}
                >
                  Acknowledge
                </button>
              ) : (
                <>
                  <button
                    className={r.impact.fits ? "sv-btn primary" : "sv-btn danger"}
                    onClick={() => onDecide(r, "approved", r.impact.fits ? "approved" : "approved anyway")}
                    onMouseEnter={() => onPreview({ day: "Sat 29", granted: r.impact.withKva - r.impact.withoutKva, note: "approved" })}
                    onMouseLeave={() => onPreview(null)}
                  >
                    {r.impact.fits ? "Approve" : "Approve anyway"}
                  </button>
                  <button className="sv-btn" onClick={() => setCounter(true)}>Counter offer</button>
                  <button
                    className="sv-btn quiet"
                    onClick={() => {
                      onDecide(r, "declined", "declined");
                      push("warn", "8pm to midnight is free that evening — a counter offer costs nothing");
                    }}
                  >
                    Decline
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="sv-req-counter">
              <b>The nearest free window is {r.counter?.start ?? "8:00 pm"} to {r.counter?.end ?? "midnight"}.</b>
              <p className="dim">Same length, one hour later, and it costs the society nothing.</p>
              <div className="sv-req-windows">
                <div><span className="sv-eyebrow">Asked</span><i className="asked" /></div>
                <div><span className="sv-eyebrow">Offered</span><i className="offered" /></div>
              </div>
              <textarea
                className="sv-input"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="sv-req-btns">
                <button
                  className="sv-btn primary"
                  onClick={() => { onDecide(r, "countered", "counter offer sent"); setCounter(false); }}
                >
                  Send offer
                </button>
                <button className="sv-btn" onClick={() => setCounter(false)}>Back</button>
              </div>
            </div>
          )}

          <p className="sv-note">
            This flat has used {r.boost.used} of {r.boost.total} boost days this year.
          </p>
        </div>
      </div>
    </article>
  );
}

/* A glance, not a chart. No axes, no labels. */
function Sparkline({ without, with: w }: { without: number; with: number }) {
  const top = CEILING + 4;
  const y = (v: number) => 44 - (v / top) * 44;
  return (
    <svg className="sv-req-spark" viewBox="0 0 180 44" width="180" height="44" aria-hidden>
      <line x1="0" y1={y(CEILING)} x2="180" y2={y(CEILING)} stroke="var(--ceiling)" strokeWidth="1.5" />
      <polyline
        points={`0,${y(without * 0.86)} 60,${y(without * 0.94)} 110,${y(without)} 180,${y(without * 0.9)}`}
        fill="none" stroke="var(--ink-4)" strokeWidth="1.5" strokeDasharray="3 3"
      />
      <polyline
        points={`0,${y(without * 0.86)} 60,${y(w * 0.94)} 110,${y(w)} 180,${y(w * 0.9)}`}
        fill="none" stroke="var(--ink)" strokeWidth="1.8"
      />
    </svg>
  );
}

/* ============================================================ the week ahead */

function WeekStrip({ preview }: { preview: Preview | null }) {
  const [hover, setHover] = useState<string | null>(null);
  const top = CEILING + 6;

  return (
    <div className="sv-req-week">
      {WEEK.map((d) => {
        const previewing = preview && preview.day === d.label;
        const granted = previewing ? preview.granted : d.granted;
        const total = d.base + granted;
        const over = Math.max(0, total - CEILING);
        const under = Math.min(total, CEILING);
        const basePct = (Math.min(d.base, CEILING) / top) * 100;
        const grantPct = (Math.max(0, under - d.base) / top) * 100;
        const overPct = (over / top) * 100;

        return (
          <div
            className="sv-req-day"
            key={d.key}
            onMouseEnter={() => setHover(d.key)}
            onMouseLeave={() => setHover(null)}
          >
            {over > 0 && <i className="sv-req-dot" />}
            <div className="sv-req-col">
              <div className="sv-req-ceil" style={{ bottom: `${(CEILING / top) * 100}%` }} />
              <div className="sv-req-bar" style={{ height: `${basePct + grantPct + overPct}%` }}>
                {overPct > 0 && <i className="over" style={{ height: `${(overPct / (basePct + grantPct + overPct)) * 100}%` }} />}
                <i className="granted" style={{ height: `${(grantPct / (basePct + grantPct + overPct)) * 100}%` }} />
                <i className="base" style={{ height: `${(basePct / (basePct + grantPct + overPct)) * 100}%` }} />
              </div>
            </div>
            <span className="sv-req-daylabel">{d.label}</span>
            <span className="sv-req-daycount">
              {previewing ? preview.note : `${d.count} granted`}
            </span>
            <span className="sv-req-daypeak">{total.toFixed(1)}</span>

            {hover === d.key && (
              <div className="sv-req-tip">
                {d.requests.map((x) => <div key={x}>{x}</div>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================ the undo */

function UndoBar({ undo, onUndo }: { undo: Undo; onUndo: () => void }) {
  /* Keyed on the decision, so each one mounts a fresh bar rather than
   * resetting this one. */
  const [left, setLeft] = useState(100);
  useEffect(() => {
    const started = Date.now();
    const tick = window.setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - started) / 10_000) * 100);
      setLeft(pct);
      if (pct <= 0) window.clearInterval(tick);
    }, 100);
    return () => window.clearInterval(tick);
  }, [undo.id]);

  return (
    <div className="sv-req-undo" role="status">
      <b>{undo.text}</b>
      <button className="sv-link" onClick={onUndo}>Undo</button>
      <i style={{ width: `${left}%` }} />
    </div>
  );
}

/* ========================================================= the broadcast */

function Composer({ id, onClose, push }: { id: string; onClose: () => void; push: Push }) {
  const template = useMemo(() => BROADCASTS.find((b) => b.id === id)!, [id]);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sv-scrim" onClick={onClose} role="presentation">
      <div
        className="sv-panel sv-req-compose"
        role="dialog"
        aria-label="Send a broadcast"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h3>Send a broadcast</h3>
          <button className="sv-x" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="body">
          <label className="sv-eyebrow">Subject</label>
          <input className="sv-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <label className="sv-eyebrow" style={{ marginTop: 10, display: "block" }}>Message</label>
          <textarea className="sv-input" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="sv-note">
            Goes to all {FLATS} flats. A broadcast asks; it never instructs, and a flat that
            cannot take part is never counted against.
          </p>
          <div className="sv-req-btns" style={{ marginTop: 12 }}>
            <button
              className="sv-btn primary"
              onClick={() => { push("confirm", `Broadcast sent to ${FLATS} flats`); onClose(); }}
            >
              Send to {FLATS} flats
            </button>
            <button className="sv-btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
