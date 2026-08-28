/* =============================================================================
 * SAMANVAY — Resident app, the data layer.
 *
 * One state object is the single source of truth. Suggestions, notices, tiers,
 * request kinds, breakdown slices and the accepted / declined lists are all
 * arrays. Every total, badge, count and chart in the interface derives from
 * them, so no figure can fall out of step with another.
 *
 * Adding a suggestion type is one object here and no markup anywhere.
 * ========================================================================== */

export const FLAT = "A2 0202";
export const SOCIETY = "Anna Nagar Residency";
export const TOWER = "Tower A";
export const DWELLING = "3BHK";
export const RESIDENTS = 4;
export const FLATS = 60;
export const MONTH = "August 2026";

/* The society average, shown in place of this flat's own figure whenever the
 * resident withdraws tier 2. Withholding readings costs them the precision,
 * never the programme. */
export const SOCIETY_AVERAGE = 198;

/* ------------------------------------------------------------------ money */

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/* ------------------------------------------------------------ suggestions */

export type SuggestionId = "heater" | "standby" | "holiday" | "precool" | "washing";

export interface Suggestion {
  id: SuggestionId;
  /** One phrase, for the accepted and declined tables. */
  label: string;
  headline: string;
  /** Rupees a month. */
  rupees: number;
  /** An "up to" figure is an estimate and is kept out of the headline totals. */
  estimate?: boolean;
  why: string;
  /** The comfort cost, always stated before the saving. */
  cost: string;
  /** Only the heater carries the timeline strip. */
  timeline?: { nowFrom: number; nowTo: number; suggestFrom: number; suggestTo: number };
}

export const SUGGESTIONS: Suggestion[] = [
  {
    id: "heater",
    label: "Water heater moved to solar hours",
    headline: "Move the water heater to morning solar hours",
    rupees: 38,
    why: "The society roof is generating hard between 7 and 9 in the morning, and that power costs a fifth of what the grid charges at the same hour. Your heater currently runs before any of it arrives.",
    cost: "Hot water would be ready by 9 am instead of 7 am.",
    timeline: { nowFrom: 6, nowTo: 7, suggestFrom: 7, suggestTo: 9 },
  },
  {
    id: "holiday",
    label: "Away dates shared",
    headline: "Tell us your away dates and we save the maximum",
    rupees: 400,
    estimate: true,
    why: "An empty flat is the one time we can move everything without anybody noticing. Water heating and cooling stop entirely, and the fridge is left alone.",
    cost: "Nothing changes while you are home.",
  },
  {
    id: "precool",
    label: "Flat cooled slightly before 6 pm",
    headline: "Cool the flat slightly before 6 pm",
    rupees: 118,
    why: "Between 6 pm and 10 pm electricity costs 26 percent more. Cooling the rooms by a degree beforehand carries you through the expensive window without the air conditioner working through it.",
    cost: "The flat runs about one degree cooler from 5 pm, and about one degree warmer by 9 pm.",
  },
  {
    id: "washing",
    label: "Washing machine moved past 10 pm",
    headline: "Run the washing machine after 10 pm",
    rupees: 54,
    why: "The evening peak is over by ten, and the society is nowhere near its limit after that.",
    cost: "A cycle started at 10 pm finishes around midnight.",
  },
];

/* The one already running. Its label is the phrase the accepted table shows. */
export interface Accepted {
  id: string;
  label: string;
  since: string;
  rupees: number;
  savedSoFar: number;
  running: boolean;
}

export const ACCEPTED_SEED: Accepted[] = [
  {
    id: "standby",
    label: "Overnight standby draw traced",
    since: "July 2026",
    rupees: 68,
    savedSoFar: 136,
    running: true,
  },
];

export interface Declined {
  id: string;
  label: string;
  on: string;
  forgone: number;
  reason?: string;
}

/* --------------------------------------------------------------- notices */

export interface Notice {
  id: string;
  on: string;
  from: string;
  body: string;
  /** null until the resident answers. */
  pledge: "will_try" | "cannot" | null;
  live: boolean;
}

export const NOTICES: Notice[] = [
  {
    id: "heat",
    on: "28 August",
    from: "Management",
    body: "A heat wave is forecast from Friday. If you can, please run washing machines after 10 pm for the next four days. It keeps the society under its limit without anybody's comfort being touched.",
    pledge: null,
    live: true,
  },
  {
    id: "lift",
    on: "21 August",
    from: "Management",
    body: "Tower A lift maintenance on Sunday morning, 8 am to 11 am.",
    pledge: null,
    live: false,
  },
  {
    id: "water",
    on: "14 August",
    from: "Management",
    body: "The borewell pump was serviced. Water pressure on upper floors should be back to normal.",
    pledge: null,
    live: false,
  },
];

/* ----------------------------------------------------------------- tiers */

export type TierId = 0 | 1 | 2 | 3;

export interface Tier {
  id: TierId;
  title: string;
  what: string;
  /** Tiers 0 and 1 are structural and can never be withdrawn. */
  always: boolean;
  unlocks: string[];
  private: string;
  /** Expiry or the basis on which the data is held. */
  footer: string;
}

export const TIERS: Tier[] = [
  {
    id: 0,
    title: "The society meter",
    what: "The total for the whole building, every 15 minutes.",
    always: true,
    unlocks: [
      "The society is billed correctly",
      "The peak that sets everyone's charge is visible",
    ],
    private:
      "Nothing about your flat is in this number on its own. It is the building's meter, the same one the utility reads.",
    footer: "Held for as long as the society has a connection. Not a consent decision.",
  },
  {
    id: 1,
    title: "Your flat counts in the total",
    what: "Inside the society number, never shown alone.",
    always: true,
    unlocks: [
      "Your share of the bill is worked out by flat size",
      "The programme works fully for you at this tier",
    ],
    private:
      "Your flat is never separated out, never ranked on usage, and never shown to another resident or to management as an individual line.",
    footer: "The basis on which the society bills every flat. Not a consent decision.",
  },
  {
    id: 2,
    title: "Your flat's meter readings",
    what: "The flat total every 15 minutes, not appliances.",
    always: false,
    unlocks: [
      "Your own savings figure instead of the society average",
      "Your contribution standing",
      "Suggestions timed to when you actually use power",
    ],
    private:
      "We see a total, not what produced it. No appliance, no room, no camera, no microphone, and nobody in management sees your figure next to anyone else's.",
    footer: "Granted 2 July 2026. Expires 2 July 2027 unless you renew it.",
  },
  {
    id: 3,
    title: "Appliance level readings",
    what: "Water heater, air conditioning and car charger only.",
    always: false,
    unlocks: [
      "Suggestions that fit your routine rather than an average one",
      "Scheduling against a deadline you set",
      "About ₹90 a month more, on the society's own figures",
    ],
    private:
      "Only those three appliances are ever metered. Lights, fans, television, cooking and the fridge are not read, not modelled and not moved — there is no mechanism in the system that could. Readings are never sold, never leave the society's own bill engine, and are deleted when the consent lapses.",
    footer: "Not granted. If you allow it, it expires after 12 months unless renewed.",
  },
];

/* ------------------------------------------------------------- breakdown */

export type SliceId = "solar" | "accepted" | "peak";

export interface Slice {
  id: SliceId;
  label: string;
  detail: string;
}

export const SLICES: Slice[] = [
  {
    id: "solar",
    label: "Your share of society solar",
    detail: "412 units on the society roof last month, apportioned by flat size.",
  },
  {
    id: "accepted",
    label: "Suggestions you accepted",
    detail: "Running since July, and counted only while they are still running.",
  },
  {
    id: "peak",
    label: "Society wide peak control",
    detail:
      "The society avoided a high peak, so everyone's charge is lower. You get this whether or not you take part.",
  },
];

/** The two slices the resident does not control by accepting suggestions. */
export const SOLAR_SHARE = 86;
export const PEAK_SHARE = 50;

/* ---------------------------------------------------------- contribution */

export type Band = "strong" | "occasional" | "low";

export const BANDS: { id: Band; label: string; flats: number; rank: number; chip: string }[] = [
  { id: "strong", label: "Strong", flats: 22, rank: 14, chip: "STRONG" },
  { id: "occasional", label: "Sometimes", flats: 24, rank: 31, chip: "SOMETIMES" },
  { id: "low", label: "Not yet", flats: 14, rank: 52, chip: "NOT YET" },
];

export const HOW_TO_MOVE_UP: { action: string; points: number; gain: string; to: string }[] = [
  { action: "Accept car charging after 10 pm", points: 8, gain: "₹165 a month", to: "SUGGESTIONS" },
  { action: "Share appliance readings", points: 4, gain: "Better suggestions", to: "REQUESTS" },
  { action: "Say I will try on the next heads-up", points: 3, gain: "Helps the whole society", to: "MY FLAT" },
];

/* -------------------------------------------------------- still on table */

export const UNCLAIMED: { what: string; rupees: number; to: string }[] = [
  { what: "Put solar panels on your own roof", rupees: 1240, to: "SOLAR" },
  { what: "Charge the car after 10 pm", rupees: 165, to: "SUGGESTIONS" },
  { what: "Give up one degree of warmth in the evening", rupees: 92, to: "SUGGESTIONS" },
];

/** Taking all three overlaps, so the honest combined figure is not the sum. */
export const UNCLAIMED_COMBINED = 1380;

/* ------------------------------------------------------------ the months */

export const MONTHS: { m: string; rupees: number; pre?: boolean }[] = [
  { m: "Sep", rupees: 0, pre: true }, { m: "Oct", rupees: 0, pre: true },
  { m: "Nov", rupees: 0, pre: true }, { m: "Dec", rupees: 0, pre: true },
  { m: "Jan", rupees: 0, pre: true }, { m: "Feb", rupees: 0, pre: true },
  { m: "Mar", rupees: 121 }, { m: "Apr", rupees: 168 }, { m: "May", rupees: 233 },
  { m: "Jun", rupees: 259 }, { m: "Jul", rupees: 210 }, { m: "Aug", rupees: 204 },
];

/* ----------------------------------------------------------------- solar */

export const SOLAR = {
  units: 412,
  share: SOLAR_SHARE,
  covered: 9,
  own: { kw: 3, units: 340, saves: 1240, costs: 180000, paybackMonths: 49 },
  yearAfterPayback: 14880,
  lifeYears: 20,
};

/* Generation is sinusoidal around solar noon. Usage is a base load plus a
 * morning rise and a 6–10 pm peak, so the two charts show, without a word of
 * commentary, the problem the product exists to solve. */
export function dayProfile() {
  const gen: number[] = [];
  const use: number[] = [];
  for (let h = 0; h < 24; h++) {
    const sun = Math.sin(((h - 6) / 12) * Math.PI);
    gen.push(h >= 6 && h <= 18 ? Math.max(0, sun) : 0);

    let u = 0.28;
    u += 0.34 * Math.exp(-((h - 7) ** 2) / 3);
    u += 0.62 * Math.exp(-((h - 20) ** 2) / 4.5);
    use.push(Math.min(1, u));
  }
  return { gen, use };
}

/* ------------------------------------------------------------- requests */

export type RequestKind = "extra_power" | "deadline" | "pause" | "problem";

export const REQUEST_KINDS: { id: RequestKind; tile: string; title: string; hint: string }[] = [
  {
    id: "extra_power",
    tile: "More power for an evening",
    title: "Ask for more power for an evening",
    hint: "Guests, a function, anything that puts the whole flat to work at once.",
  },
  {
    id: "deadline",
    tile: "Something ready by a time",
    title: "Ask for something to be ready by a time",
    hint: "The car charged by 8 am, hot water by 7 am.",
  },
  {
    id: "pause",
    tile: "Pause my participation",
    title: "Pause your participation",
    hint: "Nothing in your home will be moved until you resume.",
  },
  {
    id: "problem",
    tile: "Report a problem",
    title: "Report a problem",
    hint: "Something was moved that should not have been, or something is not working.",
  },
];

export type Magnitude = "little" | "normal" | "lot";

export const MAGNITUDES: { id: Magnitude; label: string }[] = [
  { id: "little", label: "A little" },
  { id: "normal", label: "Normal" },
  { id: "lot", label: "A lot" },
];

export type RequestStatus = "approved" | "countered" | "waiting";

export interface ResidentRequest {
  id: string;
  what: string;
  on: string;
  status: RequestStatus;
  statusLabel: string;
  boostDay: boolean;
  withdrawable: boolean;
}

export const REQUESTS_SEED: ResidentRequest[] = [
  {
    id: "r1",
    what: "More power on Saturday evening",
    on: "29 Aug, 7 pm to 11 pm",
    status: "approved",
    statusLabel: "Approved",
    boostDay: false,
    withdrawable: true,
  },
  {
    id: "r2",
    what: "Car charged by 8 am",
    on: "30 Aug",
    status: "countered",
    statusLabel: "Offered 8 pm instead",
    boostDay: false,
    withdrawable: true,
  },
  {
    id: "r3",
    what: "Hot water by 6:30 am on weekdays",
    on: "From 1 Sep",
    status: "waiting",
    statusLabel: "Waiting",
    boostDay: false,
    withdrawable: true,
  },
];

export const BOOST_DAYS = { used: 2, total: 6 };

/* ---------------------------------------------------------- the boundary */

/** Repeated on MY FLAT and again inside tier 3. The list is the promise. */
export const NEVER_TOUCHED = ["Lights", "Fans", "TV", "Cooking", "Fridge"];
export const ONLY_MOVED = ["water heater", "air conditioning", "car charger"];
export const MAX_SHIFT_MINUTES = 40;
