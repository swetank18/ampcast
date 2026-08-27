/* =============================================================================
 * Seam 5 — the forecaster behind an interface.
 *
 *   interface Forecaster { predict(plan, sc, rand): { q05, q50, q95 } }
 *
 * Swap the implementation and nothing downstream changes: the optimiser, the
 * simulator, the tariff, the physics and the seed are all pinned. Only the file
 * the quantiles come from moves. That is the ablation, and it is why this is a
 * seam rather than a switch statement.
 *
 * HOW A FORECASTER CHANGES THE PEAK, which is the whole argument:
 *
 *   reserve  R = ceiling − plan peak      what a calibrated q95 asks the
 *                                         controller to hold back
 *   gap      G = fc peak − plan peak      what a mean forecast gives away
 *
 *   realised peak = ceiling − reserveFrac·R + overshoot·G
 *
 * A forecaster that claims a narrow band (low reserveFrac) lets the controller
 * aim higher, which is a benefit only if the band is honest. If it is not, the
 * error it failed to anticipate (overshoot) lands on top and the transformer
 * takes it. Persistence claims the second-most headroom in the study table and
 * breaches 87 times: headroom without calibration is an overdraft, not a gain.
 * ========================================================================== */

import { CEILING, N, type Scenario } from "./config";

export interface QuantileFan {
  q05: number[];
  q50: number[];
  q95: number[];
}

export interface Forecaster {
  key: string;
  name: string;
  note: string;

  /** Share of the calibrated reserve this forecaster's own band claims. 1.0 is
   *  a q95 that is really a 95th percentile. Below 1 is over-confidence. */
  reserveFrac: number;
  /** Error it failed to anticipate, in multiples of the mean-forecast gap. */
  overshoot: number;
  /** Multiplier on the width of the fan it draws. */
  bandWidth: number;
  /** Multiplier on its own bias — how far its median sits off the truth. */
  biasScale: number;

  /** Stated coverage of its own q95, against a 90% target. */
  coverage: number;

  /** Where the claim comes from. The study figures are measured on the
   *  commercial building in ../demand-control, not on this society. */
  study: { pinball: number; breaches: number; note: string } | null;

  /** Quantiles of society load, in kVA, for every interval of the day. */
  predict(plan: number[], sc: Scenario, rand: () => number): QuantileFan;
}

/** The one fan generator. Every forecaster is this shape with different
 *  constants, so a difference on screen is a difference in the model and never
 *  a difference in the drawing code. */
function fanFrom(f: Pick<Forecaster, "bandWidth" | "biasScale">) {
  return (plan: number[], sc: Scenario, rand: () => number): QuantileFan => {
    const q05: number[] = [], q50: number[] = [], q95: number[] = [];
    for (let t = 0; t < N; t++) {
      const halfWidth = (1.9 + 0.055 * t) * sc.bandScale * (0.9 + 0.2 * rand()) * f.bandWidth;
      const drift = (rand() - 0.5) * 0.8 * f.biasScale;
      q50.push(plan[t] + drift);
      q95.push(plan[t] + drift + halfWidth);
      q05.push(Math.max(4, plan[t] + drift - halfWidth * 0.72));
    }
    return { q05, q50, q95 };
  };
}

function make(f: Omit<Forecaster, "predict">): Forecaster {
  return { ...f, predict: fanFrom(f) };
}

/* --------------------------------------------------------------- the eight */

export const FORECASTERS: Forecaster[] = [
  make({
    key: "q95",
    name: "LightGBM quantile, calibrated",
    note: "Ours. Seven quantiles at 15 minutes, conformal layer on top, and the 95th percentile substituted into the capacity constraint.",
    reserveFrac: 1, overshoot: 0, bandWidth: 1, biasScale: 1, coverage: 0.92,
    study: { pinball: 2.397, breaches: 0, note: "Fox_office_Gaylord, held out, walk-forward" },
  }),
  make({
    key: "mean",
    name: "MPC on the mean",
    note: "Same controller, same tariff, same physics. It aims at the ceiling with the mean forecast, and half its errors are above it.",
    reserveFrac: 1, overshoot: 1, bandWidth: 0.18, biasScale: 1, coverage: 0.51,
    study: { pinball: 2.397, breaches: 12, note: "same model, mean substituted for q95" },
  }),
  make({
    key: "persistence",
    name: "Persistence",
    note: "Tomorrow looks like today. Claims a narrow band, so the controller aims high, and then the evening arrives.",
    reserveFrac: 0.35, overshoot: 2.4, bandWidth: 0.55, biasScale: 3.4, coverage: 0.44,
    study: { pinball: 27.582, breaches: 87, note: "second-most headroom in the table, 87 breaches" },
  }),
  make({
    key: "seasonal_naive",
    name: "Seasonal naive",
    note: "Last Tuesday at this time. Genuinely safe on a calm month, and it is reported that way — our margin over it here is headroom and peak, not safety.",
    reserveFrac: 0.85, overshoot: 0.45, bandWidth: 1.5, biasScale: 1.8, coverage: 0.88,
    study: { pinball: 6.213, breaches: 0, note: "against us on safety, and reported anyway" },
  }),
  make({
    key: "climatology",
    name: "Climatology",
    note: "The average of every day like this one. Smooth, blind to the particular evening, and one breach.",
    reserveFrac: 0.78, overshoot: 0.7, bandWidth: 1.8, biasScale: 2.1, coverage: 0.86,
    study: { pinball: 7.314, breaches: 1, note: "one breach on the study month" },
  }),
  make({
    key: "static_margin",
    name: "Static margin, no forecast",
    note: "What the utility does today: derate the transformer by a fixed fraction and hope. Safe, and it throws away the capacity the EVs needed.",
    reserveFrac: 2.6, overshoot: 0, bandWidth: 2.9, biasScale: 0, coverage: 1,
    study: { pinball: 20.307, breaches: 11, note: "at the derating that matches our safety, 198.1 kW usable against our 354.1" },
  }),
  make({
    key: "perfect",
    name: "Perfect foresight",
    note: "Knows the month in advance. Not a controller you can build — it is the ceiling on what any controller could do.",
    reserveFrac: 1.28, overshoot: 0, bandWidth: 0.02, biasScale: 0, coverage: 1,
    study: { pinball: 0, breaches: 0, note: "the bound, not a baseline" },
  }),
];

export const DEFAULT_FORECASTER = "q95";

export function forecasterOf(key: string): Forecaster {
  return FORECASTERS.find((f) => f.key === key) ?? FORECASTERS[0];
}

/* ------------------------------------------------- what it does to the day */

/** The peak this forecaster's quantiles actually let through, in kVA. */
export function realisedPeak(f: Forecaster, sc: Scenario): number {
  const reserve = CEILING - sc.planPeak;          // what a calibrated q95 holds back
  const gap = sc.fcPeak - sc.planPeak;            // what the mean gives away
  return CEILING - f.reserveFrac * reserve + f.overshoot * gap;
}

/** Headroom this forecaster leaves unused below the ceiling. Negative means it
 *  is over the transformer, which is the number that ends the argument. */
export function usableHeadroom(f: Forecaster, sc: Scenario): number {
  return CEILING - realisedPeak(f, sc);
}
