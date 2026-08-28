/* =============================================================================
 * SAMANVAY — requests, and the arithmetic the operator decides on.
 *
 * A request is a resident asking for something the controller would otherwise
 * not give them. The operator's job is not to judge the request, it is to see
 * what granting it costs everybody else. So every card shows the number and
 * never an opinion.
 *
 * Two rules shape everything here:
 *
 *   1. Requests that fit inside the forecast headroom are approved before the
 *      operator sees them. A queue that is always full stops being read.
 *   2. Two pending requests that overlap the same window on the same date are
 *      one decision, not two. Each card costing itself in isolation produces
 *      two numbers that both go wrong the moment either is approved.
 * ========================================================================== */

import { CEILING } from "./model";

export type RequestType = "extra_power" | "deadline" | "pause" | "problem";

export type RequestStatus =
  | "auto_approved" | "needs_decision" | "approved" | "countered"
  | "declined" | "auto_declined" | "expired" | "withdrawn" | "acknowledged";

export type Source = "whatsapp" | "app" | "operator";

export interface Impact {
  /** Forecast evening peak without this request granted. */
  withoutKva: number;
  /** And with it. */
  withKva: number;
  /** What crossing the ceiling costs the society this month. */
  societyCost: number;
  fits: boolean;
}

export interface Request {
  id: string;
  flat: string;
  /** Tower · size · residents. Never a name — see the dignity rules. */
  household: string;
  type: RequestType;
  date: string;
  day: string;
  start: string;
  end: string;
  magnitude: "little" | "normal" | "lot";
  /** The kW figure exists on the operator card only, never on the resident's. */
  aboveNormalKw: number;
  reason: string;
  source: Source;
  status: RequestStatus;
  impact: Impact;
  counter?: { start: string; end: string; societyCost: number };
  boost: { used: number; total: number };
  /** Hours since the resident asked. Drives the ageing tint. */
  ageHours: number;
  /** Hours until the window opens. Inside 48 this is stated on the card. */
  untilHours: number;
  /** The last comparable decision, and what it cost. */
  precedent?: string;
  /** Their usage on a boost day, for scale. */
  boostDayUse?: string;
  /** Clause 4, ratified 14 June 2026: a medical flag is acknowledged, never
   * declined and never countered. */
  medical?: boolean;
  /** An opted-out flat still gets its request processed. */
  optedOut?: boolean;
}

export const ASK_LABEL: Record<RequestType, string> = {
  extra_power: "More power for an evening",
  deadline: "Something ready by a time",
  pause: "Pause participation",
  problem: "A problem to look at",
};

export const SOURCE_LABEL: Record<Source, string> = {
  whatsapp: "WhatsApp", app: "App", operator: "Operator",
};

const MAG_WORD: Record<Request["magnitude"], string> = {
  little: "a little", normal: "a normal amount of", lot: "a lot of",
};

export const magnitudeLine = (r: Request) =>
  `Asked for ${MAG_WORD[r.magnitude]} extra power. About ${r.aboveNormalKw} kW above their normal evening.`;

/* -------------------------------------------------------------- the queue */

/* Two of these — A2 1204 and B3 0501 — want the same Saturday evening. They are
 * clustered below rather than decided one at a time. */
export const QUEUE: Request[] = [
  {
    id: "req_2026_0841",
    flat: "A2 1204",
    household: "Tower A · 3BHK · 4 residents",
    type: "extra_power",
    date: "2026-08-29", day: "Saturday 29 Aug", start: "7:00 pm", end: "11:00 pm",
    magnitude: "lot", aboveNormalKw: 6,
    reason: "Housewarming, about 40 guests",
    source: "whatsapp",
    status: "needs_decision",
    impact: { withoutKva: 84.4, withKva: 88.2, societyCost: 0, fits: true },
    boost: { used: 2, total: 6 },
    ageHours: 51, untilHours: 32,
    precedent: "A similar Saturday evening was approved on 12 Jul at no cost.",
    boostDayUse: "On their last boost day this flat drew 7.1 kVA at peak.",
  },
  {
    id: "req_2026_0844",
    flat: "B3 0501",
    household: "Tower B · 2BHK · 3 residents",
    type: "extra_power",
    date: "2026-08-29", day: "Saturday 29 Aug", start: "7:30 pm", end: "10:30 pm",
    magnitude: "normal", aboveNormalKw: 4,
    reason: "Birthday dinner, family only",
    source: "app",
    status: "needs_decision",
    impact: { withoutKva: 84.4, withKva: 87.6, societyCost: 0, fits: true },
    counter: { start: "8:00 pm", end: "11:30 pm", societyCost: 0 },
    boost: { used: 5, total: 6 },
    ageHours: 9, untilHours: 31,
    precedent: "The last request from this flat was staggered on 3 Aug and accepted.",
  },
  {
    id: "req_2026_0847",
    flat: "C1 0902",
    household: "Tower C · 3BHK · 5 residents",
    type: "deadline",
    date: "2026-08-28", day: "Tonight", start: "10:00 pm", end: "6:00 am",
    magnitude: "normal", aboveNormalKw: 3,
    reason: "Dialysis machine, needs uninterrupted supply overnight",
    source: "operator",
    status: "needs_decision",
    impact: { withoutKva: 84.4, withKva: 85.9, societyCost: 0, fits: true },
    boost: { used: 0, total: 6 },
    ageHours: 2, untilHours: 6,
    medical: true,
    precedent: "Clause 4, ratified 14 June 2026.",
  },
];

/* The cluster. Approving either of these alone is cheap; approving both is not,
 * and neither card can see that on its own. */
export const CLUSTER = {
  ids: ["req_2026_0841", "req_2026_0844"],
  day: "Saturday 29 Aug",
  window: "7:00 pm to 11:00 pm",
  /** What each costs if it is the only one granted. */
  alone: [
    { flat: "A2 1204", cost: 0, peak: 88.2 },
    { flat: "B3 0501", cost: 1276, peak: 91.4 },
  ],
  /** And what they cost together, which is the number that is actually true. */
  together: { cost: 3890, peak: 94.1 },
  /** Staggered into two groups, the evening lands here. */
  staggered: { cost: 0, peak: 90.8 },
  stagger: [
    { flat: "A2 1204", from: "7:00 pm", to: "11:00 pm" },
    { flat: "B3 0501", from: "9:00 pm", to: "12:00 am" },
  ],
};

/* ---------------------------------------------------- approved without us */

export interface AutoRow {
  id: string;
  flat: string;
  ask: string;
  reason: string;
  peakDelta: number;
  cost: number;
  decided: string;
  /** Declined before the operator saw it, with a counter offer attached. */
  declined?: boolean;
  counter?: string;
}

export const AUTO: AutoRow[] = [
  { id: "a1", flat: "B1 0703", ask: "Car charged by 8am, Thursday", reason: "Early start for work", peakDelta: 0.4, cost: 0, decided: "2 min ago" },
  { id: "a2", flat: "A1 0104", ask: "Hot water by 6:30am, weekdays", reason: "Children's school run", peakDelta: 0.2, cost: 0, decided: "18 min ago" },
  { id: "a3", flat: "C2 1101", ask: "More power Tuesday evening", reason: "Guests for dinner", peakDelta: 0.9, cost: 0, decided: "1 hr ago" },
  { id: "a4", flat: "A3 0607", ask: "Pause participation, 3 days", reason: "Someone unwell at home", peakDelta: 0, cost: 0, decided: "2 hr ago" },
  { id: "a5", flat: "B2 0308", ask: "Car charged by 7am, Friday", reason: "Airport run", peakDelta: 0.5, cost: 0, decided: "3 hr ago" },
  { id: "a6", flat: "C3 0405", ask: "More power Wednesday evening", reason: "Puja at home", peakDelta: 1.1, cost: 0, decided: "5 hr ago" },
  { id: "a7", flat: "A2 0202", ask: "Hot water by 7am, weekdays", reason: "", peakDelta: 0.2, cost: 0, decided: "6 hr ago" },
  { id: "a8", flat: "B1 0910", ask: "Pause participation, this evening", reason: "Guests", peakDelta: 0, cost: 0, decided: "8 hr ago" },
];

/* Shown behind a toggle rather than hidden. Automation the operator cannot see
 * is automation they cannot answer for. */
export const AUTO_DECLINED: AutoRow[] = [
  {
    id: "d1", flat: "C1 0703", ask: "More power Saturday 29 Aug, 7pm", reason: "Family function",
    peakDelta: 3.2, cost: 2140, decided: "4 hr ago", declined: true,
    counter: "Offered 9:00 pm to 1:00 am at no cost.",
  },
  {
    id: "d2", flat: "A3 1201", ask: "More power Saturday 29 Aug, 8pm", reason: "",
    peakDelta: 2.8, cost: 1870, decided: "7 hr ago", declined: true,
    counter: "Offered Sunday evening at no cost.",
  },
];

export const RECEIVED_THIS_MONTH = 34;

/* ----------------------------------------------------------- the week ahead */

export interface DayAhead {
  key: string;
  label: string;
  /** The forecast peak before any granted request is laid on top. */
  base: number;
  /** What granted requests add to it. */
  granted: number;
  count: number;
  requests: string[];
}

export const WEEK: DayAhead[] = [
  { key: "thu", label: "Thu 27", base: 79.2, granted: 0.9, count: 2, requests: ["B1 0703 · car by 8am", "A1 0104 · hot water by 6:30am"] },
  { key: "fri", label: "Fri 28", base: 82.1, granted: 1.4, count: 3, requests: ["C1 0902 · overnight, medical", "B2 0308 · car by 7am", "B1 0910 · paused"] },
  { key: "sat", label: "Sat 29", base: 84.4, granted: 9.7, count: 5, requests: ["A2 1204 · housewarming", "B3 0501 · birthday dinner", "C3 0405 · puja", "+2 more"] },
  { key: "sun", label: "Sun 30", base: 80.6, granted: 1.2, count: 1, requests: ["A3 0607 · paused"] },
  { key: "mon", label: "Mon 31", base: 78.4, granted: 0.4, count: 1, requests: ["A2 0202 · hot water by 7am"] },
  { key: "tue", label: "Tue 1", base: 81.0, granted: 0.8, count: 2, requests: ["C2 1101 · guests", "B1 0703 · car by 8am"] },
  { key: "wed", label: "Wed 2", base: 79.8, granted: 1.1, count: 1, requests: ["C3 0405 · puja"] },
];

export const weekCeiling = CEILING;

/* ----------------------------------------------------------------- rail */

export const MONTH_STATS = [
  { k: "Requests received", v: "34" },
  { k: "Approved automatically", v: "31" },
  { k: "Decided by you", v: "3" },
  { k: "Median response", v: "4 min" },
];

export const BROADCASTS: { id: string; label: string; subject: string; body: string }[] = [
  {
    id: "heads_up",
    label: "Heads up about tomorrow",
    subject: "A heads up about tomorrow evening",
    body:
      "A heat wave is forecast from tomorrow. If you can, please run washing machines after 10 pm for the next four days. It keeps the society under its limit without anybody's comfort being touched. Saying no costs you nothing.",
  },
  {
    id: "thanks",
    label: "Thank the society",
    subject: "Thank you — the bill came in under",
    body:
      "Because 47 flats moved something this month, the society's demand charge came in ₹12,227 under last August. That is ₹204 off every flat's maintenance, whether or not you took part.",
  },
  {
    id: "maintenance",
    label: "Maintenance notice",
    subject: "Scheduled maintenance",
    body:
      "The main panel will be serviced on Sunday between 8 am and 11 am. Lifts, water and the fire system are unaffected throughout.",
  },
];

/* Never a list of which flats. The distribution is the operator's business;
 * which of their neighbours has spent their allowance is not. */
export const BUDGET_SPREAD = [
  { band: "0 days", flats: 31 },
  { band: "1 to 3", flats: 19 },
  { band: "4 to 5", flats: 6 },
  { band: "all 6", flats: 4 },
];

export const CONSENT = {
  sharing: 47,
  total: 60,
  lastAsked: "12 Jul",
  tiers: [
    { id: 0, label: "Society meter only", flats: 0 },
    { id: 1, label: "Counted in the total", flats: 13 },
    { id: 2, label: "Per flat readings", flats: 33 },
    { id: 3, label: "Appliance readings", flats: 14 },
  ],
};

/* --------------------------------------------------------------- helpers */

export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Amber past a day, red past five. Age is the one pressure the operator
 * cannot see from the numbers alone. */
export function ageTone(hours: number): "none" | "watch" | "late" {
  if (hours >= 120) return "late";
  if (hours >= 24) return "watch";
  return "none";
}

export function ageLabel(hours: number): string {
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)} hr ago`;
  const d = Math.round(hours / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** The arithmetic sentence under the figure. Never an opinion, only the number
 * and what produced it. */
export function costLine(r: Request, perFlat: number): string {
  return r.impact.fits
    ? `Fits inside the headroom. Peak would reach ${r.impact.withKva.toFixed(1)} kVA against a ${CEILING} ceiling.`
    : `Would push the peak to ${r.impact.withKva.toFixed(1)} kVA, past the ${CEILING} ceiling. That is ${rupees(perFlat)} per flat this month.`;
}

/* ------------------------------------------------- from the resident app */

/**
 * A request the resident just sent, turned into the same object the operator
 * decides on everywhere else. It arrives with no decision attached, so the
 * operator sees it exactly as they see the seeded queue.
 */
export function fromResident(w: {
  id: string; flat: string; household: string; kind: string;
  ask: string; when: string; reason: string; magnitude: string; at: number;
}): Request {
  const mag = (["little", "normal", "lot"].includes(w.magnitude)
    ? w.magnitude : "normal") as Request["magnitude"];
  const above = mag === "lot" ? 6 : mag === "little" ? 2 : 4;
  const withKva = 84.4 + above * 0.63;

  return {
    id: w.id,
    flat: w.flat,
    household: w.household,
    type: (["extra_power", "deadline", "pause", "problem"].includes(w.kind)
      ? w.kind : "extra_power") as RequestType,
    date: w.when,
    day: w.when,
    start: "—",
    end: "—",
    magnitude: mag,
    aboveNormalKw: above,
    reason: w.reason,
    source: "app",
    status: "needs_decision",
    impact: {
      withoutKva: 84.4,
      withKva,
      societyCost: withKva > CEILING ? Math.round((withKva - CEILING) * 640) : 0,
      fits: withKva <= CEILING,
    },
    boost: { used: 2, total: 6 },
    ageHours: Math.max(0, (Date.now() - w.at) / 3_600_000),
    untilHours: 30,
    precedent: "Sent from the resident app just now.",
  };
}
