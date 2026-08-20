-- Aethergrid — simulation results store.
--
-- The simulation is the authority; this is where its output lives so the
-- dashboard can query it instead of shipping a JSON blob in the bundle. The
-- table names follow the vocabulary of the problem, not of the code: a run is
-- one controller over one scenario for one billing month.

create table if not exists buildings (
  id                   text primary key,
  label                text not null,
  site                 text not null,
  sqm                  double precision not null,
  contract_demand_kva  double precision not null,
  hvac_capacity_kw     double precision not null,
  ua_w_per_m2k         double precision not null,
  time_constant_h      double precision not null,
  c_kwh_per_k          double precision not null,
  hvac_share_of_meter  double precision not null,
  why_chosen           text
);

create table if not exists tariffs (
  id                        text primary key,
  state                     text not null,
  category                  text not null,
  order_ref                 text not null,
  energy_rate               double precision not null,
  demand_charge_per_kva     double precision not null,
  billing_interval_minutes  int not null,
  contract_demand_kva       double precision not null,
  billing_demand_floor_pct  double precision not null,
  electricity_duty_pct      double precision not null,
  tod_windows               jsonb not null
);

create table if not exists scenarios (
  key         text primary key,
  label       text not null,
  description text not null,
  sort_order  int not null default 0
);

create table if not exists controllers (
  key         text primary key,
  label       text not null,
  colour      text not null,
  blurb       text not null,
  sort_order  int not null
);

create table if not exists runs (
  id                     text primary key,
  building_id            text not null references buildings(id),
  scenario_key           text not null references scenarios(key),
  controller_key         text not null references controllers(key),
  demand_target_kw       double precision not null,
  bill_inr               double precision not null,
  energy_charge          double precision not null,
  demand_charge          double precision not null,
  energy_kwh             double precision not null,
  peak_kw                double precision not null,
  peak_kva               double precision not null,
  peak_at                text,
  ceiling_breaches       int not null,
  worst_breach_kw        double precision not null,
  first_breach_at        text,
  comfort_violation_pct  double precision not null,
  comfort_kelvin_hours   double precision not null,
  pct_of_oracle_savings  double precision,
  solve_ms_mean          double precision,
  energy_by_window       jsonb not null
);
create index if not exists runs_scenario_idx on runs (scenario_key, controller_key);

-- Block-averaged series, one row per billing block. Columnar in the API, rows
-- here: 24 runs x 1440 blocks is small, and rows keep it queryable.
create table if not exists series_points (
  run_id     text not null references runs(id) on delete cascade,
  t          timestamptz not null,
  grid_kw    real not null,
  t_indoor   real not null,
  t_lo       real not null,
  t_hi       real not null,
  t_out      real not null,
  base_kw    real not null,
  hvac_kw    real not null,
  pv_kw      real not null,
  viol_k     real not null,
  bill_cum   real not null,
  primary key (run_id, t)
);

create table if not exists calibration (
  building_id             text primary key references buildings(id),
  coverage_90             double precision not null,
  acceptance_pass         boolean not null,
  worst_horizon_coverage  double precision not null,
  mae_median_kw           double precision not null,
  mean_interval_width_kw  double precision not null,
  reliability             jsonb not null,
  coverage_by_horizon     jsonb not null
);

create table if not exists frontier (
  building_id            text not null references buildings(id),
  comfort_ceiling_c      double precision not null,
  band_width_k           double precision not null,
  target_kw              double precision not null,
  shave_pct              double precision not null,
  bill_inr               double precision not null,
  saving_inr             double precision not null,
  comfort_violation_pct  double precision not null,
  primary key (building_id, comfort_ceiling_c)
);

create table if not exists mv_baseline (
  building_id   text not null references buildings(id),
  baseline      text not null,
  start_date    text not null,
  reported      double precision not null,
  ci_low        double precision not null,
  ci_high       double precision not null,
  naive         double precision not null,
  true_saving   double precision not null,
  inside_band   boolean not null,
  pct_of_truth  double precision not null,
  extrapolation text not null,
  primary key (building_id, baseline)
);

create table if not exists target_search (
  building_id           text not null references buildings(id),
  target_kw             double precision not null,
  ceiling_breaches      int not null,
  comfort_violation_pct double precision not null,
  bill_inr              double precision not null,
  chosen                boolean not null default false,
  primary key (building_id, target_kw)
);

-- One row describing where the bundle came from, so a stale database is
-- visible rather than silently wrong.
create table if not exists bundle_meta (
  id            int primary key default 1,
  generated_at  timestamptz not null,
  building_id   text not null,
  demand_target_kw double precision not null,
  uncontrolled_peak_kw double precision,
  shave_pct     double precision,
  comfort_budget_pct double precision,
  window_start  text not null,
  window_end    text not null,
  seeded_at     timestamptz not null default now()
);
