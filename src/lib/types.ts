export type ScenarioKey = "none" | "heatwave" | "sensor_dropout" | "outage";

export interface Scenario {
  key: ScenarioKey;
  label: string;
  description: string;
}

export interface Run {
  id: string;
  scenario: ScenarioKey;
  controller: string;
  controller_label: string;
  color: string;
  blurb: string;
  order: number;
  demand_target_kw: number;
  bill_inr: number;
  energy_charge: number;
  demand_charge: number;
  energy_kwh: number;
  peak_kw: number;
  peak_kva: number;
  peak_at: string;
  ceiling_breaches: number;
  worst_breach_kw: number;
  first_breach_at: string | null;
  comfort_violation_pct: number;
  comfort_kelvin_hours: number;
  pct_of_oracle_savings: number | null;
  solve_ms_mean: number | null;
  energy_by_window: Record<string, { kwh: number; charge: number; rate: number; multiplier: number }>;
}

export interface Series {
  t: number[];
  grid_kw: number[];
  t_indoor: number[];
  t_lo: number[];
  t_hi: number[];
  t_out: number[];
  base_kw: number[];
  hvac_kw: number[];
  pv_kw: number[];
  viol_k: number[];
  bill_cum: number[];
}

export interface ToDWindow {
  name: string;
  start: string;
  end: string;
  multiplier: number;
}

export interface Bundle {
  generated_at: string;
  building: {
    id: string; label: string; site: string; sqm: number;
    contract_demand_kva: number; hvac_capacity_kw: number;
    ua_w_per_m2k: number; time_constant_h: number; c_kwh_per_k: number;
    why_chosen: string; hvac_share_of_meter: number;
  };
  tariff: {
    state: string; category: string; order_ref: string; energy_rate: number;
    demand_charge_per_kva: number; billing_interval_minutes: number;
    contract_demand_kva: number; billing_demand_floor_pct: number;
    electricity_duty_pct: number; tod_windows: ToDWindow[];
  };
  scenarios: Scenario[];
  demand_target_kw: number;
  demand_target_search: {
    uncontrolled_peak_kw?: number; target_kw?: number; shave_pct?: number;
    comfort_budget_pct?: number;
    trace?: { target_kw: number; ceiling_breaches: number; comfort_violation_pct: number; bill_inr: number }[];
  };
  runs: Run[];
  series_index: string[];
  calibration: Record<string, {
    building: string; coverage_90: number; acceptance_pass: boolean;
    worst_horizon_coverage: number; mae_median_kw: number; mean_interval_width_kw: number;
    reliability: { nominal: number; empirical: number; pinball: number }[];
    coverage_by_horizon: Record<string, number>;
  }>;
  frontier: {
    comfort_ceiling_c: number; band_width_k: number; uncontrolled_peak_kw: number;
    uncontrolled_bill_inr: number; target_kw: number; shave_pct: number;
    bill_inr: number; saving_inr: number; comfort_violation_pct: number;
  }[];
  mv_baseline_length: {
    baseline: string; start: string; reported: number; ci: [number, number];
    naive: number; true: number; inside: boolean; naive_inside: boolean;
    pct_of_truth: number; extrapolation: string;
  }[];
  window: { start: string; end: string };
  model?: ModelEvidence;
  ablation_index?: AblationIndexEntry[];
}

/* ------------------------------------------------------------------ model */
/* The evidence layer. Round 1 was told there was no model in this; these are
 * the shapes of the answer, exported from the same files that produced the
 * numbers in the paper so the two cannot drift. Every field is optional at the
 * top level because a half-run pipeline should render a gap, not a lie. */

export interface BenchmarkRow {
  key: string;
  name: string;
  definition: string;
  pinball_mean: number;
  crps: number | null;
  winkler_90: number | null;
  mae_median: number;
  coverage_90: number;
  below_q95: number;
  sharpness_90: number;
  calibration_error: number;
  fit_seconds: number | null;
}

export interface AblationRow {
  key: string;
  forecaster: string;
  pinball_mean: number;
  coverage_90: number;
  calibration_error: number;
  ceiling_breaches: number;
  peak_kva: number;
  bill_inr: number;
  usable_headroom_kw: number;
  comfort_violation_pct: number;
  sharpness_90: number;
  worst_breach_kw: number;
  first_breach_at: string | null;
  bill_vs_ours: number;
  breaches_vs_ours: number;
  headroom_vs_ours_kw: number;
}

export interface ScoreRow {
  label: string;
  pinball_mean: number;
  coverage_90: number;
  below_q95: number;
  sharpness_90: number;
  mae_median: number;
}

export interface ModelEvidence {
  building: string;
  split?: Record<string, string>;
  benchmark?: BenchmarkRow[];
  rolling?: {
    folds: { train_end: string; test_start: string; test_end: string }[];
    summary: Record<string, {
      pinball_mean: number; pinball_std: number; pinball_max: number;
      coverage_mean: number; coverage_worst: number; folds_won: number;
    }>;
  };
  ablation?: {
    meta: {
      building: string; window: [string, string]; stress: string;
      demand_target_kw: number; contract_demand_kva: number; tariff: string;
      held_fixed: string[]; varied: string;
    };
    rows: AblationRow[];
    /** the same experiment under each injected failure; "none" is the calm month */
    stress_rows?: Record<string, AblationRow[]>;
  };
  frontier?: {
    monotonicity: Record<string, { n: number; rho: number; p: number; monotonic: boolean }>;
    exchange_rate: Record<string, { per_unit_pinball: number; intercept: number; r2: number; n: number }>;
    panel_d_note?: string;
  };
  cold_start?: {
    target: string; trained_on: string[]; warmup_days: number; scale_kw: number;
    rows: Record<string, ScoreRow>;
    summary?: {
      cold_vs_warm_pinball_gap: number;
      cold_vs_warm_pinball_pct: number;
      cold_beats_seasonal_naive: boolean;
      statement: string;
    };
  };
  interpretability?: {
    shap: Record<string, { top: string[]; mean_abs_shap: Record<string, number> }>;
    feature_groups: {
      group: string; dropped: string[]; pinball_mean: number;
      degradation: number; degradation_pct: number; coverage_90: number;
    }[];
    feature_full?: number;
    settings?: { n_estimators: number; train_rows: number; seed: number; scored_on: string };
    worst_case?: {
      day: string; worst_exceedance_kw: number; worst_exceedance_at: string;
      actual_kw: number; q95_kw: number; q50_kw: number;
      margin_q95_minus_q50_kw: number; error_of_the_median_kw: number;
      day_q95_hit_rate: number; day_mae_kw: number;
      demand_target_kw: number; headroom_at_worst_kw: number;
      would_have_breached_planning_on_median: boolean;
      series: { t: number[]; actual: number[]; q05: number[]; q50: number[]; q95: number[] };
    };
  };
  impact?: {
    status_quo: Record<string, number>;
    assumptions: Record<string, { value: number; why: string }>;
    static_margin: {
      sweep: { percentile: number; allowance_kw: number; breaches: number;
               peak_kva: number; bill_inr: number; usable_headroom_kw: number }[];
      matched?: { percentile: number; breaches: number; usable_headroom_kw: number; bill_inr: number };
      ours?: Record<string, number>;
      recovered_headroom_kw?: number;
      recovered_headroom_pct?: number;
      bill_gap_inr?: number;
      statement?: string;
    };
    ev_headroom?: {
      sweep: ({ ev_kwh_per_day: number; ev_max_kw: number } & Record<string, number>)[];
      first_breach_kwh_per_day: Record<string, number | null>;
      deferral_years?: number | null;
      deferral_statement?: string | null;
    };
    tier1?: Record<string, number | null>;
    tier3?: Record<string, number | null>;
    tier4?: Record<string, number | string | Record<string, unknown>>;
  };
  model_card?: string;
  missing: string[];
}

/** One ablation row as something you can play: the timeline the optimiser
 *  produced on that forecaster, and the fan it was looking at. */
export interface AblationRun {
  key: string;
  label: string;
  metrics: {
    pinball_mean: number; coverage_90: number; ceiling_breaches: number;
    peak_kva: number; bill_inr: number; usable_headroom_kw: number;
    comfort_violation_pct: number; first_breach_at: string | null; worst_breach_kw: number;
  };
  series: Series;
  band?: Band;
}

export interface Band {
  t: number[];
  q05: number[];
  q50: number[];
  q95: number[];
  actual: number[];
  q95_hit_24h: (number | null)[];
  coverage_24h: (number | null)[];
}

export interface AblationIndexEntry {
  key: string;
  label: string;
  breaches: number;
  bill_inr: number;
  has_band: boolean;
}
