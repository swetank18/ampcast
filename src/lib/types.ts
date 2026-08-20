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
}
