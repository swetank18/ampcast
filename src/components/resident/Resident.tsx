"use client";

/* =============================================================================
 * SAMANVAY — the resident app.
 *
 * What a flat owner sees, as distinct from the operator console. Five tabbed
 * screens and a settings modal, all live: accepting a suggestion genuinely
 * moves it between arrays, and every total, badge, count and chart recomputes
 * from those arrays in the same frame.
 *
 * Q W E R T switch tabs, Esc closes the settings modal. Key handling is
 * suppressed while typing in a field.
 * ========================================================================== */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useShared } from "@/lib/bridge";
import {
  ACCEPTED_SEED, BANDS, BOOST_DAYS, DWELLING, FLAT, FLATS, HOW_TO_MOVE_UP, MAGNITUDES,
  MAX_SHIFT_MINUTES, MONTH, MONTHS, NEVER_TOUCHED, NOTICES, ONLY_MOVED, PEAK_SHARE,
  REQUESTS_SEED, REQUEST_KINDS, RESIDENTS, SLICES, SOCIETY, SOCIETY_AVERAGE, SOLAR,
  SOLAR_SHARE, SUGGESTIONS, TIERS, TOWER, UNCLAIMED, UNCLAIMED_COMBINED,
  type Accepted, type Band, type Declined, type Magnitude, type RequestKind,
  type ResidentRequest, type SliceId, type Suggestion, type SuggestionId, type TierId,
  dayProfile, inr,
} from "./data";

type Tab = "MY FLAT" | "SUGGESTIONS" | "SAVINGS" | "SOLAR" | "REQUESTS";

const TABS: { key: Tab; hint: string }[] = [
  { key: "MY FLAT", hint: "Q" }, { key: "SUGGESTIONS", hint: "W" }, { key: "SAVINGS", hint: "E" },
  { key: "SOLAR", hint: "R" }, { key: "REQUESTS", hint: "T" },
];

const DECLINE_REASONS = [
  "I need hot water earlier than that",
  "I am not usually home then",
  "I would rather this appliance was not touched",
];

/* ============================================================= the app */

export default function Resident() {
  /* --------------------------------------------------------- state */

  /* Everything the operator can see lives in the shared store, not here, so
   * the two apps cannot drift. What stays local is only what nobody else has
   * any business knowing: which accordion row is open, which form is showing. */
  const { state: shared, ready, update, emit } = useShared();

  const [tab, setTab] = useState<Tab>("MY FLAT");
  const [settings, setSettings] = useState(false);

  const [open, setOpen] = useState<SuggestionId | null>(SUGGESTIONS[0]?.id ?? null);
  const [declining, setDeclining] = useState<SuggestionId | null>(null);
  const [showDeclined, setShowDeclined] = useState(false);

  const [notices, setNotices] = useState(NOTICES);
  const [showOldNotices, setShowOldNotices] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [undone, setUndone] = useState(false);

  const [consent, setConsent] = useState<"open" | "allowed" | "not_now" | "never">("open");
  const [kind, setKind] = useState<RequestKind | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const [hoverSlice, setHoverSlice] = useState<SliceId | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [band] = useState<Band>("strong");
  const [quiet, setQuiet] = useState(false);
  const [notify, setNotify] = useState<"matters" | "everything" | "nothing">("matters");
  const [optedOut, setOptedOut] = useState(false);
  const [panelAsk, setPanelAsk] = useState<"none" | "asked" | "declined">("none");

  /* A browser that has never opened this app gets the opening state written
   * once, so the operator's feed starts from the same facts the resident sees. */
  useEffect(() => {
    if (!ready || shared.seeded) return;
    update((s) => ({ ...s, seeded: true, accepted: ACCEPTED_SEED.map((a) => ({ ...a })) }));
  }, [ready, shared.seeded, update]);

  /* ------------------------------------------------------- derived */

  const accepted: Accepted[] = shared.accepted;
  const declined: Declined[] = shared.declined;
  const { tier2, tier3, medical, paused } = shared;

  /* The queue is whatever has not been decided yet, so a reconsidered
   * suggestion reappears without any separate bookkeeping. */
  const queue = useMemo(
    () => SUGGESTIONS.filter(
      (s) => !accepted.some((a) => a.id === s.id) && !declined.some((d) => d.id === s.id),
    ),
    [accepted, declined],
  );

  const requests: ResidentRequest[] = useMemo(() => [
    ...shared.requests.map((r) => ({
      id: r.id,
      what: r.ask,
      on: r.when,
      status: "waiting" as const,
      statusLabel: "Waiting",
      boostDay: false,
      withdrawable: true,
    })),
    ...REQUESTS_SEED,
  ], [shared.requests]);

  /* Accepted items are counted only while they are still running, so turning
   * one off moves the headline figure the moment it is turned off. */
  const acceptedTotal = useMemo(
    () => accepted.filter((a) => a.running).reduce((s, a) => s + a.rupees, 0),
    [accepted],
  );

  /* An "up to" figure is an estimate and stays out of the headline. */
  const pendingTotal = useMemo(
    () => queue.filter((s) => !s.estimate).reduce((s, x) => s + x.rupees, 0),
    [queue],
  );
  const pendingEstimate = useMemo(
    () => queue.filter((s) => s.estimate).reduce((s, x) => s + x.rupees, 0),
    [queue],
  );

  /* Withdrawing tier 2 means we no longer hold this flat's own readings, so we
   * cannot show it its own figure. The society average takes its place
   * everywhere at once, rather than in some places and not others. */
  const savings = tier2 ? SOLAR_SHARE + acceptedTotal + PEAK_SHARE : SOCIETY_AVERAGE;
  const exact = tier2;

  const bandRow = BANDS.find((b) => b.id === band)!;
  const ranked = tier2 && !medical;

  const consentPending = consent === "open" && !tier3 ? 1 : 0;
  const liveNotice = notices.find((n) => n.live)!;
  const oldNotices = notices.filter((n) => !n.live);

  const status: { tone: "ink" | "confirm" | "warn"; text: string } = paused
    ? { tone: "warn", text: "You have paused participation until 6:00 pm. Nothing will be changed." }
    : undone
      ? { tone: "confirm", text: "Your home is running normally. Nothing was changed today." }
      : { tone: "ink", text: "One thing was moved today. Your geyser started 20 minutes later." };

  /* ---------------------------------------------------- interaction */

  /* Land the resident on the next open card rather than a collapsed list. */
  const nextOpen = useCallback((from: SuggestionId) => {
    const rest = queue.filter((q) => q.id !== from);
    const i = queue.findIndex((s) => s.id === from);
    return rest[Math.min(i, rest.length - 1)]?.id ?? null;
  }, [queue]);

  const accept = useCallback((s: Suggestion) => {
    const next = nextOpen(s.id);
    emit(
      (st) => ({
        ...st,
        accepted: [
          ...st.accepted,
          { id: s.id, label: s.label, rupees: s.rupees, since: MONTH, savedSoFar: 0, running: true },
        ],
        declined: st.declined.filter((d) => d.id !== s.id),
      }),
      { flat: FLAT, kind: "accepted", text: s.label, rupees: s.rupees },
    );
    setOpen(next);
    setDeclining(null);
  }, [emit, nextOpen]);

  const decline = useCallback((s: Suggestion, reason?: string) => {
    const next = nextOpen(s.id);
    emit(
      (st) => ({
        ...st,
        declined: [...st.declined, { id: s.id, label: s.label, forgone: s.rupees, on: "28 Aug 2026", reason }],
      }),
      { flat: FLAT, kind: "declined", text: reason ? `${s.label} — "${reason}"` : s.label, rupees: s.rupees },
    );
    setOpen(next);
    setDeclining(null);
    /* Open the declined list so the decision stays visible and reversible. */
    setShowDeclined(true);
  }, [emit, nextOpen]);

  const reconsider = useCallback((id: string) => {
    const seed = SUGGESTIONS.find((s) => s.id === id);
    if (!seed) return;
    emit(
      (st) => ({ ...st, declined: st.declined.filter((x) => x.id !== id) }),
      { flat: FLAT, kind: "reconsidered", text: seed.label, rupees: seed.rupees },
    );
    setOpen(seed.id);
  }, [emit]);

  const turnOff = useCallback((id: string) => {
    const item = accepted.find((a) => a.id === id);
    emit(
      (st) => ({
        ...st,
        accepted: st.accepted.map((x) => (x.id === id ? { ...x, running: false } : x)),
      }),
      { flat: FLAT, kind: "turned_off", text: item?.label ?? id, rupees: item?.rupees },
    );
  }, [accepted, emit]);

  /* Tier 3 implies tier 2 and settles the ask; withdrawing tier 2 takes tier 3
   * with it, because appliance readings without a flat total are meaningless. */
  const setTier = useCallback((id: TierId, on: boolean) => {
    const tier = TIERS.find((t) => t.id === id);
    emit(
      (st) => {
        if (id === 2) return { ...st, tier2: on, tier3: on ? st.tier3 : false };
        if (id === 3) return on ? { ...st, tier3: true, tier2: true } : { ...st, tier3: false };
        return st;
      },
      {
        flat: FLAT,
        kind: on ? "tier_on" : "tier_off",
        text: `Tier ${id} — ${tier?.title ?? ""}`,
      },
    );
    if (id === 3 && on) setConsent("allowed");
  }, [emit]);

  const setMedical = useCallback((on: boolean) => {
    emit(
      (st) => ({ ...st, medical: on }),
      { flat: FLAT, kind: on ? "medical_on" : "medical_off", text: on ? "Medical emergency flag raised" : "Medical flag removed" },
    );
  }, [emit]);

  const setPaused = useCallback((on: boolean) => {
    emit(
      (st) => ({ ...st, paused: on }),
      { flat: FLAT, kind: on ? "paused" : "resumed", text: on ? "Paused participation for 3 hours" : "Resumed participation" },
    );
  }, [emit]);

  const pledge = useCallback((id: string, answer: "will_try" | "cannot") => {
    setNotices((n) => n.map((x) => (x.id === id ? { ...x, pledge: answer } : x)));
    emit(
      (st) => ({ ...st, pledge: answer }),
      {
        flat: FLAT,
        kind: "pledged",
        text: answer === "will_try" ? "Will try — washing after 10 pm" : "Cannot this time — washing after 10 pm",
      },
    );
  }, [emit]);

  const send = useCallback((k: RequestKind, form: { when: string; reason: string; magnitude: Magnitude }) => {
    const meta = REQUEST_KINDS.find((r) => r.id === k)!;
    const id = `res_${Date.now()}`;
    emit(
      (st) => ({
        ...st,
        paused: k === "pause" ? true : st.paused,
        requests: [
          {
            id, flat: FLAT, household: `${TOWER} · ${DWELLING} · ${RESIDENTS} residents`,
            kind: k, ask: meta.tile, when: form.when, reason: form.reason,
            magnitude: form.magnitude, at: Date.now(),
          },
          ...st.requests,
        ],
      }),
      { flat: FLAT, kind: "requested", text: `${meta.tile} — ${form.when}` },
    );
    setSent(
      k === "pause"
        ? "Paused. Nothing in your home will be changed until you resume."
        : "Approved. You have Saturday evening from 7 to 11 pm.",
    );
    setKind(null);
  }, [emit]);

  const withdraw = useCallback((id: string) => {
    const r = requests.find((x) => x.id === id);
    emit(
      (st) => ({ ...st, requests: st.requests.filter((x) => x.id !== id) }),
      { flat: FLAT, kind: "withdrew", text: r?.what ?? id },
    );
  }, [emit, requests]);

  /* Q W E R T, and Esc for the modal. Suppressed inside a field so typing a
   * reason does not navigate the app out from under the resident. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "Escape") { setSettings(false); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const hit = TABS.find((t) => t.hint.toLowerCase() === k);
      if (hit) { setTab(hit.key); setSettings(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ------------------------------------------------------- render */

  return (
    <div className="rs">
      <div className="rs-col">
        <Header
          tab={tab} setTab={setTab}
          suggestions={queue.length} consent={consentPending}
          onSettings={() => setSettings(true)}
        />

        <div className={`rs-status ${status.tone}`}>
          <b>{status.text}</b>
          <span className="tail">Updated 6 min ago</span>
        </div>

        <main className="rs-main">
          {tab === "MY FLAT" && (
            <MyFlat
              savings={savings} exact={exact} acceptedTotal={acceptedTotal}
              notice={liveNotice} oldNotices={oldNotices} showOld={showOldNotices}
              setShowOld={setShowOldNotices} pledge={pledge}
              bandRow={bandRow} ranked={ranked}
              whyOpen={whyOpen} setWhyOpen={setWhyOpen}
              undone={undone} setUndone={setUndone}
            />
          )}
          {tab === "SUGGESTIONS" && (
            <Suggestions
              queue={queue} accepted={accepted} declined={declined}
              open={open} setOpen={setOpen}
              declining={declining} setDeclining={setDeclining}
              accept={accept} decline={decline} reconsider={reconsider} turnOff={turnOff}
              acceptedTotal={acceptedTotal} pendingTotal={pendingTotal} pendingEstimate={pendingEstimate}
              showDeclined={showDeclined} setShowDeclined={setShowDeclined}
            />
          )}
          {tab === "SAVINGS" && (
            <Savings
              savings={savings} exact={exact} acceptedTotal={acceptedTotal}
              hoverSlice={hoverSlice} setHoverSlice={setHoverSlice}
              bandRow={bandRow} ranked={ranked} setTab={setTab}
              showHistory={showHistory} setShowHistory={setShowHistory}
            />
          )}
          {tab === "SOLAR" && (
            <SolarTab panelAsk={panelAsk} setPanelAsk={setPanelAsk} />
          )}
          {tab === "REQUESTS" && (
            <Requests
              medical={medical} setMedical={setMedical}
              consent={consent} setConsent={setConsent}
              tier2={tier2} tier3={tier3} setTier={setTier}
              requests={requests} withdraw={withdraw}
              kind={kind} setKind={setKind} send={send} sent={sent} setSent={setSent}
            />
          )}
        </main>

        <footer className="rs-foot">
          <div>
            <button
              className={paused ? "rs-btn ink" : "rs-btn"}
              onClick={() => setPaused(!paused)}
            >
              {paused ? "RESUME PARTICIPATION" : "PAUSE FOR 3 HOURS"}
            </button>
            <p className="rs-meta">
              Guests coming? Someone unwell? Nothing will be changed until 6:00 pm, and pausing
              never counts against you.
            </p>
          </div>
          <p className="rs-meta right">
            If this system goes offline, your home runs exactly as it always has.
            Nothing depends on it.
          </p>
        </footer>
      </div>

      {settings && (
        <SettingsModal
          close={() => setSettings(false)}
          tier2={tier2} tier3={tier3} setTier={setTier}
          quiet={quiet} setQuiet={setQuiet}
          notify={notify} setNotify={setNotify}
          optedOut={optedOut} setOptedOut={setOptedOut}
        />
      )}
    </div>
  );
}

/* ========================================================= persistent chrome */

function Header({
  tab, setTab, suggestions, consent, onSettings,
}: {
  tab: Tab; setTab: (t: Tab) => void; suggestions: number; consent: number; onSettings: () => void;
}) {
  return (
    <header className="rs-head">
      <div className="rs-brand">
        <i className="rs-mark" aria-hidden />
        <b>SAMANVAY</b>
      </div>
      <span className="rs-div" aria-hidden />
      <div className="rs-who">
        <b>Flat {FLAT}</b>
        <span>{SOCIETY} · {TOWER}</span>
      </div>

      <nav className="rs-tabs">
        {TABS.map((t) => {
          const badge = t.key === "SUGGESTIONS" ? suggestions : t.key === "REQUESTS" ? consent : 0;
          return (
            <button
              key={t.key}
              className={t.key === tab ? "on" : undefined}
              onClick={() => setTab(t.key)}
              aria-current={t.key === tab ? "page" : undefined}
            >
              {t.key}
              <kbd>{t.hint}</kbd>
              {badge > 0 && <i className="rs-badge">{badge}</i>}
            </button>
          );
        })}
      </nav>

      <Link className="rs-cross" href="/samanvay?mode=REQUESTS" prefetch={false}>
        Operator console
      </Link>

      <button className="rs-gear" onClick={onSettings} aria-label="Settings">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <circle cx="8" cy="8" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M12.9 3.1l-1.4 1.4M4.5 11.5l-1.4 1.4"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="square"
          />
        </svg>
      </button>
    </header>
  );
}

/* ================================================================== MY FLAT */

function MyFlat({
  savings, exact, acceptedTotal, notice, oldNotices, showOld, setShowOld, pledge,
  bandRow, ranked, whyOpen, setWhyOpen, undone, setUndone,
}: {
  savings: number; exact: boolean; acceptedTotal: number;
  notice: typeof NOTICES[number]; oldNotices: typeof NOTICES; showOld: boolean;
  setShowOld: (b: boolean) => void; pledge: (id: string, a: "will_try" | "cannot") => void;
  bandRow: typeof BANDS[number]; ranked: boolean;
  whyOpen: boolean; setWhyOpen: (b: boolean) => void;
  undone: boolean; setUndone: (b: boolean) => void;
}) {
  return (
    <>
      <section className="rs-notice">
        <div className="rs-kicker">From management · {notice.on}</div>
        <p>{notice.body}</p>
        {notice.pledge === null ? (
          <div className="rs-actions">
            <button className="rs-btn ink" onClick={() => pledge(notice.id, "will_try")}>I WILL TRY</button>
            <button className="rs-btn" onClick={() => pledge(notice.id, "cannot")}>CANNOT THIS TIME</button>
          </div>
        ) : (
          <p className="rs-ack">
            {notice.pledge === "will_try"
              ? "Thanks. 34 flats have said the same."
              : "Noted, and nothing counts against you for saying no."}
          </p>
        )}
        <button className="rs-link" onClick={() => setShowOld(!showOld)}>
          {showOld ? "Hide earlier notices" : `${oldNotices.length} earlier notices`}
        </button>
        {showOld && (
          <ul className="rs-old">
            {oldNotices.map((n) => (
              <li key={n.id}><b>{n.on}</b> {n.body}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rs-kpis">
        <div className="rs-kpi">
          <span className="k">KEPT OFF YOUR CHARGE</span>
          <b className="v green">{inr(savings)} <em>this month</em></b>
          <span className="s">
            {exact
              ? "Checked against the society's actual bill."
              : "The society average, because you have not shared your flat's readings."}
          </span>
        </div>
        <div className="rs-kpi">
          <span className="k">SHARE OF SOCIETY SOLAR</span>
          <b className="v">{inr(SOLAR_SHARE)} <em>of that total</em></b>
          <div className="rs-bar"><i style={{ width: "42%" }} /></div>
          <span className="s">{SOLAR.units} units on the society roof.</span>
        </div>
        <div className="rs-kpi">
          <span className="k">MOVED IN YOUR HOME</span>
          <b className="v">{undone ? "Nothing" : "1 thing"} <em>today</em></b>
          <span className="s">By 20 minutes. Never more than {MAX_SHIFT_MINUTES}.</span>
        </div>
        <div className="rs-kpi">
          <span className="k">YOUR CONTRIBUTION</span>
          <b className="v">
            {ranked ? <>{bandRow.rank}th <em>of {FLATS} flats</em></> : <>Not ranked</>}
          </b>
          {ranked && <span className="rs-chip">{bandRow.chip}</span>}
          <span className="s">
            Based on how often you take part, not on how much electricity you use.
          </span>
        </div>
      </section>

      <section className="rs-flat">
        <div className="rs-iso">
          <IsoFlat />
          <p className="rs-cap">{TOWER} · {DWELLING} · {RESIDENTS} residents</p>
        </div>
        <div className="rs-flat-say">
          <h2>This is the only home this app can see.</h2>
          <p>
            No neighbour&rsquo;s flat, name or usage appears anywhere in here, and nothing about
            your home is shown to anyone else in the society.
          </p>
          <ul className="rs-legend">
            <li><i style={{ background: "#15703f" }} /><b>Running normally</b> nothing is being held back right now</li>
            <li><i style={{ background: "#5d6b7a" }} /><b>Society solar covers 9%</b> the roof panel is the society&rsquo;s, not yours</li>
            <li><i style={{ background: "#c25a33" }} /><b>Your own roof is empty</b> panels there would be worth {inr(SOLAR.own.saves)} a month</li>
          </ul>
        </div>
      </section>

      <section className="rs-today">
        <h3 className="rs-kicker">Today</h3>
        {undone ? (
          <p className="rs-none">Nothing was changed today.</p>
        ) : (
          <>
            <p className="rs-line">
              <b>11:20 pm</b> Your geyser started 20 minutes later than usual. Hot water was
              ready before 7 am. Saved you about {inr(4)}.
            </p>
            <div className="rs-sub">
              <button className="rs-link" onClick={() => setWhyOpen(!whyOpen)}>Why?</button>
              <button className="rs-link" onClick={() => setUndone(true)}>UNDO</button>
            </div>
            {whyOpen && (
              <p className="rs-why">
                Because between 6 pm and 10 pm electricity costs 26 percent more, and the society
                was close to its limit.
              </p>
            )}
          </>
        )}
      </section>

      <section className="rs-never">
        <h3 className="rs-kicker">We never touch these</h3>
        <ul>
          {NEVER_TOUCHED.map((d) => (
            <li key={d}><Lock />{d}</li>
          ))}
        </ul>
        <p className="rs-meta">
          Only your {ONLY_MOVED[0]}, {ONLY_MOVED[1]} and {ONLY_MOVED[2]} are ever moved, and never
          by more than {MAX_SHIFT_MINUTES} minutes. <button className="rs-link">House rules</button>
        </p>
        <p className="rs-meta">
          Everything you have accepted is worth {inr(acceptedTotal)} a month.
        </p>
      </section>
    </>
  );
}

function Lock() {
  return (
    <svg viewBox="0 0 12 14" width="10" height="12" aria-hidden className="rs-lockicon">
      <rect x="1" y="6" width="10" height="7" fill="currentColor" />
      <path d="M3.2 6V4a2.8 2.8 0 0 1 5.6 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/* An inline vector sketch, not a rendered image, so it restyles with the app.
 * One home only — theirs. */
function IsoFlat() {
  return (
    <svg viewBox="0 0 320 240" width="100%" height="200" role="img" aria-label={`An isometric drawing of flat ${FLAT}`}>
      {/* plot */}
      <polygon points="160,30 300,105 160,180 20,105" fill="#efe3d4" />
      <polygon points="160,180 300,105 300,120 160,195" fill="#dcc6ab" />
      <polygon points="20,105 160,180 160,195 20,120" fill="#e5d2ba" />
      {/* walls */}
      <polygon points="160,70 240,113 240,163 160,120" fill="#ded5c8" />
      <polygon points="160,70 80,113 80,163 160,120" fill="#eae5dd" />
      <polygon points="160,120 240,163 240,168 160,125" fill="#c9c1b4" />
      {/* roof */}
      <polygon points="160,42 244,88 160,134 76,88" fill="#c25a33" />
      {/* the society's panel on the roof */}
      <polygon points="160,62 202,85 172,102 130,79" fill="#5d6b7a" />
      <polygon points="160,62 202,85 202,88 160,65" fill="#7b8794" />
      {/* lit and shaded windows */}
      <rect x="103" y="122" width="15" height="15" fill="#f0b95c" transform="skewY(28)" />
      <rect x="128" y="122" width="15" height="15" fill="#dad3c8" transform="skewY(28)" />
      <rect x="182" y="96" width="15" height="15" fill="#f0b95c" transform="skewY(-28)" />
      <rect x="207" y="96" width="15" height="15" fill="#dad3c8" transform="skewY(-28)" />
      {/* trees */}
      <ellipse cx="58" cy="126" rx="13" ry="9" fill="#8a9c7a" />
      <ellipse cx="58" cy="120" rx="10" ry="8" fill="#7d9070" />
      <ellipse cx="266" cy="130" rx="12" ry="8" fill="#8a9c7a" />
      <ellipse cx="266" cy="124" rx="9" ry="7" fill="#7d9070" />
    </svg>
  );
}

/* ============================================================== SUGGESTIONS */

function Suggestions({
  queue, accepted, declined, open, setOpen, declining, setDeclining,
  accept, decline, reconsider, turnOff,
  acceptedTotal, pendingTotal, pendingEstimate, showDeclined, setShowDeclined,
}: {
  queue: Suggestion[]; accepted: Accepted[]; declined: Declined[];
  open: SuggestionId | null; setOpen: (s: SuggestionId | null) => void;
  declining: SuggestionId | null; setDeclining: (s: SuggestionId | null) => void;
  accept: (s: Suggestion) => void; decline: (s: Suggestion, reason?: string) => void;
  reconsider: (id: string) => void; turnOff: (id: string) => void;
  acceptedTotal: number; pendingTotal: number; pendingEstimate: number;
  showDeclined: boolean; setShowDeclined: (b: boolean) => void;
}) {
  const running = accepted.filter((a) => a.running);

  return (
    <>
      <section className="rs-sugg-head">
        <div className="rs-kicker">WAITING FOR YOU · {queue.length} suggestion{queue.length === 1 ? "" : "s"}</div>
        <p className="rs-meta">
          Worth {inr(pendingTotal)} a month if you take all of them
          {pendingEstimate > 0 && <>, and up to {inr(pendingEstimate)} more if you share away dates</>}.
        </p>
        <div className="rs-figures">
          <div>
            <span className="k">SAVING NOW, EACH MONTH</span>
            <b className="v green">{inr(acceptedTotal)}</b>
            <span className="s">from {running.length} accepted</span>
          </div>
          <div>
            <span className="k">IF YOU ACCEPT EVERYTHING BELOW</span>
            <b className="v">{inr(pendingTotal)}</b>
            <span className="s">a month</span>
          </div>
        </div>
      </section>

      <section className="rs-accordion">
        {queue.length === 0 && (
          <p className="rs-none">
            Nothing is waiting for you. We will let you know when something worth doing turns up.
          </p>
        )}
        {queue.map((s) => {
          const isOpen = s.id === open;
          return (
            <article key={s.id} className={isOpen ? "rs-sugg on" : "rs-sugg"}>
              <button className="rs-sugg-row" onClick={() => { setOpen(isOpen ? null : s.id); setDeclining(null); }}>
                <i className="rs-marker" aria-hidden />
                <span className="h">{s.headline}</span>
                <span className="rup green">{s.estimate ? `up to ${inr(s.rupees)}` : `${inr(s.rupees)} a month`}</span>
                <span className="pm" aria-hidden>{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="rs-sugg-body">
                  <div className="rs-sugg-left">
                    <p>{s.why}</p>
                    <p className="rs-cost">{s.cost}</p>
                    {s.timeline && <TimelineStrip t={s.timeline} />}
                    <p className="rs-meta">
                      You can change your mind at any time. Declining costs you nothing, and your
                      bill stays exactly as it is.
                    </p>
                    {declining === s.id && (
                      <DeclineForm onSend={(reason) => decline(s, reason)} onBack={() => setDeclining(null)} />
                    )}
                  </div>
                  <div className="rs-sugg-rail">
                    <b className="rs-rup32 green">{inr(s.rupees)}</b>
                    <span className="rs-meta">{s.estimate ? "up to, a month" : "a month"}</span>
                    <button className="rs-btn ink wide" onClick={() => accept(s)}>ACCEPT</button>
                    <button className="rs-btn wide" onClick={() => decline(s)}>NO THANKS</button>
                    <button className="rs-link" onClick={() => setDeclining(declining === s.id ? null : s.id)}>
                      This does not work for me
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section>
        <h3 className="rs-kicker">Accepted and running</h3>
        <table className="rs-table">
          <thead>
            <tr><th>WHAT</th><th>SINCE</th><th className="n">SAVED SO FAR</th><th>STILL RUNNING</th></tr>
          </thead>
          <tbody>
            {accepted.length === 0 && (
              <tr><td colSpan={4} className="rs-empty">Nothing accepted yet.</td></tr>
            )}
            {accepted.map((a) => (
              <tr key={a.id}>
                <td>{a.label}</td>
                <td>{a.since}</td>
                <td className="n">{inr(a.savedSoFar)}</td>
                <td>
                  {a.running ? (
                    <>
                      <span className="rs-tag">ACTIVE</span>
                      <button className="rs-link" onClick={() => turnOff(a.id)}>Turn this off</button>
                    </>
                  ) : (
                    <span className="rs-meta">Turned off</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="rs-meta">
          Everything you have accepted is worth {inr(acceptedTotal)} a month. That is{" "}
          {inr(acceptedTotal * 12)} a year.
        </p>
      </section>

      {declined.length > 0 && (
        <section>
          <button className="rs-link" onClick={() => setShowDeclined(!showDeclined)}>
            {showDeclined ? "Hide" : "Show"} {declined.length} declined
          </button>
          {showDeclined && (
            <ul className="rs-declined">
              {declined.map((d) => (
                <li key={d.id}>
                  <b>{d.label}</b>
                  <span className="rs-meta">{d.on} · {inr(d.forgone)} a month forgone</span>
                  {d.reason && <span className="rs-meta">&ldquo;{d.reason}&rdquo;</span>}
                  <button className="rs-link" onClick={() => reconsider(d.id)}>Reconsider</button>
                </li>
              ))}
            </ul>
          )}
          <p className="rs-meta">A suggestion you declined is not sent again for 90 days.</p>
        </section>
      )}
    </>
  );
}

function TimelineStrip({ t }: { t: NonNullable<Suggestion["timeline"]> }) {
  const pct = (h: number) => (h / 24) * 100;
  return (
    <div className="rs-tl">
      <div className="rs-tl-track">
        <i className="solar" style={{ left: `${pct(7)}%`, width: `${pct(11) - pct(7)}%` }}>SOLAR HOURS −20%</i>
        <i className="now" style={{ left: `${pct(t.nowFrom)}%`, width: `${pct(t.nowTo) - pct(t.nowFrom)}%` }} />
        <i className="sug" style={{ left: `${pct(t.suggestFrom)}%`, width: `${pct(t.suggestTo) - pct(t.suggestFrom)}%` }} />
      </div>
      <div className="rs-tl-key">
        <span><i className="now" />Now {t.nowFrom}:00–{t.nowTo}:00 am</span>
        <span><i className="sug" />Suggested {t.suggestFrom}:00–{t.suggestTo}:00 am</span>
      </div>
    </div>
  );
}

function DeclineForm({ onSend, onBack }: { onSend: (reason: string) => void; onBack: () => void }) {
  const [pick, setPick] = useState(DECLINE_REASONS[0]);
  const [note, setNote] = useState("");
  return (
    <div className="rs-decline">
      <div className="rs-kicker">WHY DOES THIS NOT WORK?</div>
      {DECLINE_REASONS.map((r) => (
        <label key={r} className="rs-radio">
          <input type="radio" name="why" checked={pick === r} onChange={() => setPick(r)} />
          <span>{r}</span>
        </label>
      ))}
      <textarea
        className="rs-input"
        rows={2}
        placeholder="Anything else we should know?"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="rs-actions">
        <button className="rs-btn ink" onClick={() => onSend(note.trim() || pick)}>SEND AND DECLINE</button>
        <button className="rs-btn" onClick={onBack}>BACK</button>
      </div>
    </div>
  );
}

/* ================================================================== SAVINGS */

function Savings({
  savings, exact, acceptedTotal, hoverSlice, setHoverSlice, bandRow, ranked, setTab,
  showHistory, setShowHistory,
}: {
  savings: number; exact: boolean; acceptedTotal: number;
  hoverSlice: SliceId | null; setHoverSlice: (s: SliceId | null) => void;
  bandRow: typeof BANDS[number]; ranked: boolean; setTab: (t: Tab) => void;
  showHistory: boolean; setShowHistory: (b: boolean) => void;
}) {
  const values: Record<SliceId, number> = {
    solar: SOLAR_SHARE, accepted: acceptedTotal, peak: PEAK_SHARE,
  };
  const total = SOLAR_SHARE + acceptedTotal + PEAK_SHARE;
  const dim = (id: SliceId) => (hoverSlice && hoverSlice !== id ? "dim" : "");
  const max = Math.max(...MONTHS.map((m) => m.rupees), 1);
  const totalBand = BANDS.reduce((s, b) => s + b.flats, 0);

  return (
    <>
      <section className="rs-hero">
        <b className="rs-72 green">{inr(savings)}</b>
        <p className="rs-meta">
          off your share of the maintenance charge, {MONTH}
          {!exact && " — the society average, because your flat's readings are not shared"}
        </p>
      </section>

      <section>
        <h3 className="rs-kicker">Where it came from</h3>
        <div className="rs-stack">
          {SLICES.map((s) => (
            <i
              key={s.id}
              className={`${s.id} ${dim(s.id)} ${hoverSlice === s.id ? "lit" : ""}`}
              style={{ width: `${(values[s.id] / total) * 100}%` }}
              onMouseEnter={() => setHoverSlice(s.id)}
              onMouseLeave={() => setHoverSlice(null)}
            />
          ))}
        </div>
        <div className="rs-slices">
          {SLICES.map((s) => (
            <div
              key={s.id}
              className={`rs-slice ${dim(s.id)} ${hoverSlice === s.id ? "lit" : ""}`}
              onMouseEnter={() => setHoverSlice(s.id)}
              onMouseLeave={() => setHoverSlice(null)}
            >
              <i className={`sw ${s.id}`} aria-hidden />
              <b>{s.label}</b>
              <span className="rup">{inr(values[s.id])}</span>
              <span className="rs-meta">{s.detail}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rs-contrib">
        <div>
          <h3 className="rs-kicker">Your contribution</h3>
          {ranked ? (
            <>
              <div className="rs-band">
                {BANDS.map((b) => (
                  <i key={b.id} className={b.id} style={{ width: `${(b.flats / totalBand) * 100}%` }}>
                    <em>{b.label} {b.flats}</em>
                  </i>
                ))}
                <span className="rs-band-mark" style={{ left: `${(bandRow.rank / totalBand) * 100}%` }} />
              </div>
              <p className="rs-line">
                You are {bandRow.rank}th of {totalBand} this month, in the {bandRow.label.toLowerCase()} group.
              </p>
            </>
          ) : (
            <p className="rs-line">
              Your flat is not ranked. Ranking needs your own meter readings, and medically
              flagged flats are never ranked at all.
            </p>
          )}
          <p className="rs-meta">
            No other flat is named or shown. This strip is the shape of the society, and one
            marker for you.
          </p>
        </div>
        <div>
          <h3 className="rs-kicker">How to move up</h3>
          <ul className="rs-rows">
            {HOW_TO_MOVE_UP.map((h) => (
              <li key={h.action}>
                <b>{h.action}</b>
                <span className="pts">+{h.points} points</span>
                <span className="rs-meta">{h.gain}</span>
                <button className="rs-link" onClick={() => setTab(h.to as Tab)}>Go</button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="rs-meta">
        The score counts participation, not savings. It is adjusted for flat size, so a small
        home that says yes to everything can outrank a larger one. Medically flagged flats are
        not ranked.
      </p>

      <section>
        <h3 className="rs-kicker">Still on the table</h3>
        <ul className="rs-rows">
          {UNCLAIMED.map((u) => (
            <li key={u.what}>
              <b>{u.what}</b>
              <span className="rup green">{inr(u.rupees)} a month</span>
              <button className="rs-link" onClick={() => setTab(u.to as Tab)}>{u.to}</button>
            </li>
          ))}
        </ul>
        <p className="rs-meta">
          {inr(UNCLAIMED.reduce((s, u) => s + u.rupees, 0))} a month unclaimed. These overlap in
          places — taking all three is worth about {inr(UNCLAIMED_COMBINED)}, not the exact sum.
        </p>
      </section>

      {showHistory && (
        <section>
          <h3 className="rs-kicker">Twelve months</h3>
          <div className="rs-months">
            {MONTHS.map((m, i) => (
              <div key={m.m} className={`rs-month ${m.pre ? "pre" : ""} ${i === MONTHS.length - 1 ? "now" : ""}`}>
                <i style={{ height: `${(m.rupees / max) * 100}%` }} />
                <span>{m.m}</span>
              </div>
            ))}
          </div>
          <p className="rs-meta">
            You have saved {inr(MONTHS.reduce((s, m) => s + m.rupees, 0))} since March.{" "}
            <button className="rs-link" onClick={() => setShowHistory(false)}>Hide</button>
          </p>
        </section>
      )}

      <p className="rs-meta">
        These figures come from the society&rsquo;s bill engine and are checked monthly against
        the utility bill. Last month they agreed within 1 percent.
      </p>
    </>
  );
}

/* ==================================================================== SOLAR */

function SolarTab({
  panelAsk, setPanelAsk,
}: { panelAsk: "none" | "asked" | "declined"; setPanelAsk: (s: "none" | "asked" | "declined") => void }) {
  const { gen, use } = useMemo(() => dayProfile(), []);
  const years = Math.floor(SOLAR.own.paybackMonths / 12);
  const months = SOLAR.own.paybackMonths % 12;

  return (
    <>
      <section>
        <h3 className="rs-kicker">Society solar</h3>
        <div className="rs-three">
          <div><b className="v">{SOLAR.units}</b><span className="s">units generated</span></div>
          <div><b className="v green">{inr(SOLAR.share)}</b><span className="s">your share</span></div>
          <div><b className="v">{SOLAR.covered}%</b><span className="s">of your usage covered</span></div>
        </div>
        <DayProfile gen={gen} use={use} />
        <p className="rs-meta">
          Society panels only cover common areas and a share of your usage. They do not power
          your flat directly.
        </p>
      </section>

      <section className="rs-own">
        <h3 className="rs-kicker">Your own panels</h3>
        <p className="rs-line">
          You have no panels. Your roof could take about {SOLAR.own.kw} kW.
        </p>
        <div className="rs-payback">
          <div><span className="k">WOULD GENERATE</span><b>{SOLAR.own.units} units a month</b></div>
          <div><span className="k">WOULD SAVE</span><b className="green">{inr(SOLAR.own.saves)} a month</b></div>
          <div><span className="k">COSTS TO INSTALL</span><b>{inr(SOLAR.own.costs)}</b></div>
          <div><span className="k">PAYS BACK IN</span><b>{years} years {months} month{months === 1 ? "" : "s"}</b></div>
        </div>
        <DayProfile gen={gen} use={use} personal />
        <p className="rs-meta">
          After it pays for itself, that is about {inr(SOLAR.yearAfterPayback)} a year for the
          rest of a {SOLAR.lifeYears} year life. State subsidy may reduce the installation cost;
          the figures above do not assume it. All of this needs a roof survey to confirm.
        </p>
        {panelAsk === "none" ? (
          <div className="rs-actions">
            <button className="rs-btn ink" onClick={() => setPanelAsk("asked")}>ASK MANAGEMENT ABOUT THIS</button>
            <button className="rs-btn" onClick={() => setPanelAsk("declined")}>NOT INTERESTED</button>
          </div>
        ) : (
          <p className="rs-ack">
            {panelAsk === "asked"
              ? "Management has been asked to arrange a roof survey. They usually reply within a week."
              : "Noted. We will not raise this again for a year."}
          </p>
        )}
      </section>

      <section>
        <h3 className="rs-kicker">Society and your own, together</h3>
        <div className="rs-split">
          <i className="soc" style={{ width: `${(SOLAR.share / (SOLAR.share + SOLAR.own.saves)) * 100}%` }} />
          <i className="own" />
        </div>
        <p className="rs-meta">
          Today you save {inr(SOLAR.share)} a month from society solar. With your own panels that
          becomes {inr(SOLAR.share + SOLAR.own.saves)} a month.
        </p>
      </section>
    </>
  );
}

/* 24 flex bars for generation, with usage drawn over them as one continuous
 * polyline. On the personal variant the same day is redrawn with a translucent
 * green layer for what their own panels would cover — persuasive precisely
 * because it is the chart they have just read. */
function DayProfile({ gen, use, personal }: { gen: number[]; use: number[]; personal?: boolean }) {
  const line = use.map((u, i) => `${(i / (use.length - 1)) * 100},${100 - u * 100}`).join(" ");
  const own = gen.map((g) => Math.min(1, g * 1.9));
  return (
    <div className="rs-profile">
      <div className="rs-profile-plot">
        <div className="rs-profile-bars">
          {gen.map((g, i) => (
            <i key={i} style={{ height: `${g * 100}%` }}>
              {personal && <em style={{ height: `${own[i] ? (own[i] / Math.max(g, 0.001)) * 100 : 0}%` }} />}
            </i>
          ))}
        </div>
        <svg className="rs-profile-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <polyline
            points={line}
            fill="none"
            stroke="#201e1d"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="rs-axis"><span>12 am</span><span>6 am</span><span>12 pm</span><span>6 pm</span><span>12 am</span></div>
      <div className="rs-tl-key">
        <span><i className="gen" />Society generation</span>
        <span><i className="use" />Your typical use</span>
        {personal && <span><i className="ownkey" />What your own panels would cover</span>}
      </div>
    </div>
  );
}

/* ================================================================= REQUESTS */

function Requests({
  medical, setMedical, consent, setConsent, tier2, tier3, setTier,
  requests, withdraw, kind, setKind, send, sent, setSent,
}: {
  medical: boolean; setMedical: (b: boolean) => void;
  consent: "open" | "allowed" | "not_now" | "never";
  setConsent: (c: "open" | "allowed" | "not_now" | "never") => void;
  tier2: boolean; tier3: boolean; setTier: (id: TierId, on: boolean) => void;
  requests: ResidentRequest[]; withdraw: (id: string) => void;
  kind: RequestKind | null; setKind: (k: RequestKind | null) => void;
  send: (k: RequestKind, form: { when: string; reason: string; magnitude: Magnitude }) => void;
  sent: string | null; setSent: (s: string | null) => void;
}) {
  return (
    <>
      <section>
        {medical ? (
          <div className="rs-medical-on">
            <b>Your flat is protected. Nothing will be moved.</b>
            <p>
              Management has been told. While this flag is on your flat is not ranked and takes
              no part in load balancing. If you need help now, call the society office on
              044 4000 1200.
            </p>
            <button className="rs-link" onClick={() => setMedical(false)}>
              This was a mistake, remove the flag
            </button>
          </div>
        ) : (
          <>
            <button className="rs-medical" onClick={() => setMedical(true)}>
              MEDICAL EMERGENCY — UNINTERRUPTED POWER
            </button>
            <p className="rs-meta">
              Your flat is protected immediately and management is told. No approval is needed.
            </p>
          </>
        )}
      </section>

      {consent === "open" && !tier3 && (
        <section className="rs-ask">
          <div className="rs-kicker">A request from management</div>
          <p className="rs-line">
            May we read your water heater, air conditioning and car charger separately?
          </p>
          <div className="rs-ask-cols">
            <div>
              <span className="k">WHY</span>
              <p>So suggestions fit your actual routine instead of an average one.</p>
            </div>
            <div>
              <span className="k">WHAT YOU GET</span>
              <p>About {inr(90)} a month more, and scheduling against a deadline you set.</p>
            </div>
            <div>
              <span className="k">FOR HOW LONG</span>
              <p>12 months. It expires unless you renew it.</p>
            </div>
          </div>
          <div className="rs-actions">
            <button className="rs-btn ink" onClick={() => setTier(3, true)}>ALLOW</button>
            <button className="rs-btn" onClick={() => setConsent("not_now")}>NOT NOW</button>
            <button className="rs-link" onClick={() => setConsent("never")}>Never ask again</button>
          </div>
          <p className="rs-meta">
            You can withdraw this at any time, in the same place you granted it. We ask at most
            once a quarter.
          </p>
        </section>
      )}
      {consent === "not_now" && (
        <p className="rs-ack">Noted. We will ask again next quarter, not before.</p>
      )}
      {consent === "never" && (
        <p className="rs-ack">We will not ask again. You can still turn tier 3 on yourself below.</p>
      )}

      <section>
        <h3 className="rs-kicker">What we can see about your flat</h3>
        <div className="rs-tiers">
          {TIERS.map((t) => {
            const on = t.always || (t.id === 2 ? tier2 : t.id === 3 ? tier3 : false);
            return (
              <article key={t.id} className={on ? "rs-tier on" : "rs-tier"}>
                <header>
                  <i className="num">{t.id}</i>
                  <div>
                    <span className="rs-kicker">TIER {t.id}</span>
                    <h4>{t.title}</h4>
                  </div>
                  {t.always ? (
                    <span className="rs-always">ALWAYS ON</span>
                  ) : (
                    <button
                      className={on ? "rs-toggle on" : "rs-toggle"}
                      onClick={() => setTier(t.id, !on)}
                      aria-pressed={on}
                    >
                      <i className="track" aria-hidden><em /></i>
                      {on ? "ON" : "TURN ON"}
                    </button>
                  )}
                </header>
                <p className="rs-what">{t.what}</p>
                <span className="rs-kicker">WHAT THIS UNLOCKS</span>
                <ul className="rs-ticks">
                  {t.unlocks.map((u) => <li key={u}>{u}</li>)}
                </ul>
                <div className={t.id === 3 ? "rs-private heavy" : "rs-private"}>
                  <span className="rs-kicker">WHAT STAYS PRIVATE</span>
                  <p>{t.private}</p>
                </div>
                <p className="rs-foot-line">{t.footer}</p>
              </article>
            );
          })}
        </div>
        <p className="rs-meta">
          The system works fully at Tier 1 for everyone. Higher tiers buy better results, never
          basic function. Nothing stops working if you say no.
        </p>
      </section>

      <section>
        <h2 className="rs-h20">Make a request</h2>
        <p className="rs-meta">
          Ask for something you need. Most requests are answered the same day.
        </p>
        <div className="rs-tiles">
          {REQUEST_KINDS.map((r) => (
            <button
              key={r.id}
              className={kind === r.id ? "rs-tile on" : "rs-tile"}
              onClick={() => { setKind(kind === r.id ? null : r.id); setSent(null); }}
            >
              {r.tile.toUpperCase()}
            </button>
          ))}
        </div>
        {kind && <RequestForm kind={kind} onSend={(form) => send(kind, form)} onCancel={() => setKind(null)} />}
        {sent && (
          <div className="rs-approved">
            <b>{sent}</b>
            <p>
              This did not use one of your boost days because it fitted inside the society&rsquo;s
              spare capacity. You have used {BOOST_DAYS.used} of {BOOST_DAYS.total} this year.
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="rs-h20">Your requests</h2>
        <p className="rs-meta">
          {requests.length} open. You can withdraw anything that has not started.
        </p>
        <table className="rs-table">
          <thead>
            <tr><th>WHAT</th><th>WHEN</th><th>STATUS</th><th>BOOST DAY USED</th><th /></tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr><td colSpan={5} className="rs-empty">Nothing open.</td></tr>
            )}
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.what}</td>
                <td>{r.on}</td>
                <td><span className={`rs-tag ${r.status}`}>{r.statusLabel}</span></td>
                <td>{r.boostDay ? "Yes" : "No"}</td>
                <td>
                  {r.withdrawable && (
                    <button className="rs-link" onClick={() => withdraw(r.id)}>Withdraw</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function RequestForm({
  kind, onSend, onCancel,
}: {
  kind: RequestKind;
  onSend: (form: { when: string; reason: string; magnitude: Magnitude }) => void;
  onCancel: () => void;
}) {
  const meta = REQUEST_KINDS.find((r) => r.id === kind)!;
  const [magnitude, setMagnitude] = useState<Magnitude>("normal");
  const [date, setDate] = useState("2026-08-29");
  const [window, setWindow] = useState("7 pm to 11 pm");
  const [why, setWhy] = useState("");

  return (
    <div className="rs-form">
      <h4>{meta.title}</h4>
      <p className="rs-meta">{meta.hint}</p>
      <div className="rs-fields">
        <label>
          <span className="k">DATE</span>
          <input className="rs-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span className="k">WHEN, ROUGHLY</span>
          <input
            className="rs-input" type="text" value={window}
            onChange={(e) => setWindow(e.target.value)} placeholder="7 pm to 11 pm"
          />
        </label>
      </div>
      {kind === "extra_power" && (
        <div className="rs-seg">
          <span className="k">HOW MUCH</span>
          <div>
            {MAGNITUDES.map((m) => (
              <button
                key={m.id}
                className={magnitude === m.id ? "on" : undefined}
                onClick={() => setMagnitude(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <label>
        <span className="k">WHY, IF YOU WANT TO SAY</span>
        <textarea
          className="rs-input" rows={2} value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="Housewarming, about 40 guests"
        />
      </label>
      <div className="rs-actions">
        <button
          className="rs-btn ink"
          onClick={() => onSend({ when: `${date} · ${window}`, reason: why, magnitude })}
        >
          SEND REQUEST
        </button>
        <button className="rs-btn" onClick={onCancel}>CANCEL</button>
      </div>
    </div>
  );
}

/* =========================================================== settings modal */

function SettingsModal({
  close, tier2, tier3, setTier, quiet, setQuiet, notify, setNotify, optedOut, setOptedOut,
}: {
  close: () => void;
  tier2: boolean; tier3: boolean; setTier: (id: TierId, on: boolean) => void;
  quiet: boolean; setQuiet: (b: boolean) => void;
  notify: "matters" | "everything" | "nothing";
  setNotify: (n: "matters" | "everything" | "nothing") => void;
  optedOut: boolean; setOptedOut: (b: boolean) => void;
}) {
  return (
    <div className="rs-scrim" onClick={close} role="presentation">
      <div
        className="rs-modal"
        role="dialog"
        aria-modal="true"
        aria-label="What we can see about your flat"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <h3>What we can see about your flat</h3>
            <p className="rs-meta">
              You control this. Everything essential works no matter what you choose.
            </p>
          </div>
          <button className="rs-x" onClick={close} aria-label="Close">×</button>
        </header>

        <div className="rs-modal-body">
          {/* The same four tiers as the cards, from the same definition, so the
            * two views can never drift apart. */}
          {TIERS.map((t) => {
            const on = t.always || (t.id === 2 ? tier2 : t.id === 3 ? tier3 : false);
            return (
              <div key={t.id} className="rs-trow">
                <i className={on ? "num on" : "num"}>{t.id}</i>
                <div>
                  <b>{t.title}</b>
                  <span className="rs-meta">{t.what}</span>
                </div>
                {t.always ? (
                  <span className="rs-always">ALWAYS ON</span>
                ) : (
                  <button
                    className={on ? "rs-toggle on" : "rs-toggle"}
                    onClick={() => setTier(t.id, !on)}
                    aria-pressed={on}
                  >
                    <i className="track" aria-hidden><em /></i>
                    {on ? "ON" : "TURN ON"}
                  </button>
                )}
              </div>
            );
          })}
          {!tier2 && (
            <p className="rs-ack">
              Your savings now show as the society average, and your flat is no longer ranked.
              Nothing else changes.
            </p>
          )}

          <div className="rs-used">
            <span className="rs-kicker">HOW YOUR DATA WAS USED</span>
            <p className="rs-line">Used 4 times this month, all to schedule your water heater.</p>
            <button className="rs-link">See every use</button>
          </div>

          <div className="rs-prefs">
            <div className="rs-pref">
              <div>
                <b>Quiet mode</b>
                <span className="rs-meta">Your score freezes, it does not fall.</span>
              </div>
              <button
                className={quiet ? "rs-toggle on" : "rs-toggle"}
                onClick={() => setQuiet(!quiet)}
                aria-pressed={quiet}
              >
                <i className="track" aria-hidden><em /></i>
                {quiet ? "ON" : "TURN ON"}
              </button>
            </div>

            <div className="rs-pref col">
              <b>Notifications</b>
              <div className="rs-seg">
                <div>
                  {([
                    ["matters", "Only when something matters"],
                    ["everything", "Everything"],
                    ["nothing", "Nothing"],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      className={notify === id ? "on" : undefined}
                      onClick={() => setNotify(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button className="rs-link">House rules</button>

            <div className="rs-pref">
              <div>
                <b>Stop taking part in load balancing</b>
                <span className="rs-meta">
                  Your bill goes back to normal. You can come back any time.
                </span>
              </div>
              <button className="rs-btn" onClick={() => setOptedOut(!optedOut)}>
                {optedOut ? "REJOIN" : "STOP"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
