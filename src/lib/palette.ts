/**
 * Colour and naming for the forecaster family.
 *
 * Lives here rather than in the chart module because the model page renders its
 * table on the server, and a "use client" module cannot be called from one. The
 * rule is the same as everywhere else on this site: colour is functional. Ours
 * is the only cool highlight, anything that spends money on the ceiling owns the
 * hot end, and the rest is neutral ink.
 */

export function rowColour(key: string): string {
  if (key === "lightgbm_quantile") return "var(--ours)";
  if (key === "static_margin" || key === "persistence") return "var(--ceiling)";
  if (key === "perfect_foresight") return "var(--oracle)";
  if (key === "neural_quantile") return "var(--mpc-mean)";
  return "var(--nocontrol)";
}

/** Short labels for axes and bar rows, where the full name will not fit. */
export const FORECASTER_SHORT: Record<string, string> = {
  static_margin: "static",
  persistence: "persist",
  seasonal_naive: "seasonal",
  climatology: "climatol",
  linear_quantile: "linear",
  lightgbm_quantile: "OURS",
  neural_quantile: "neural",
  perfect_foresight: "perfect",
};
