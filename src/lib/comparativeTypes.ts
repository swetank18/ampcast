/** Shapes of eval/comparative_web.py's payload. Kept beside the data, not inferred. */
export type ModelScore = {
  pinball: number | null;
  skill: number | null;
  cov90: number | null;
  pct: number | null;
};

export type Row = {
  id: string;
  site: string | null;
  usage: string | null;
  country: string;
  tier: number;
  cddShare: number | null;
  tMean: number | null;
  hvacShare: number | null;
  corrTemp: number | null;
  medianLoad: number | null;
  uaFlagged: boolean;
  note: string | null;
  nativeMin: number | null;
  models: Record<string, ModelScore>;
};

export type SiteRow = {
  site: string; country: string; metered: number;
  passes: number; heating: number; cddShare: number; tMean: number;
};

export type Comparative = {
  generated: string;
  sites: SiteRow[];
  arms: Record<"climate" | "office" | "demographic" | "national", Row[]>;
  correlations: Record<string, { r: number; n: number } | null>;
  counts: { passing: number; heatingOnly: number; sitesWithPasses: number; countries: number };
};
