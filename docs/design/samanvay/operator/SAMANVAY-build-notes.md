# SAMANVAY — UI build notes

Tariff-native demand control for a residential society.
Single interface, four tabs, one file: `SAMANVAY.dc.html` (1440 × ~1010).

---

## 1. What the product does, in one line

The society pays for electricity twice: per unit consumed, and once for the single
highest 15-minute burst of the month. This interface shows the burst being managed
in real time, and proves the saving against the schedule the building used before.

---

## 2. Structure

### Persistent chrome (all tabs)

| Region | Contents |
| --- | --- |
| Header | Brand mark · society line · tariff chip (opens tariff panel) · four tabs · zoom |
| Explainer | One permanent sentence: plan against the worst likely load, not the average |
| KPI row | Two pairs — **peak this month / headroom now**, then **bill to date / per-flat saving** |
| Status strip | One line, four states: safe (green) · watch (amber) · danger (red) · override off (red) |
| Bottom bar | Replay scrubber (96 intervals) · five stress scenarios · operator override |

The bottom bar is sticky: playback, scenarios and the override never scroll away.

### Tab 1 — NOW (the default)

The society view is the hero and takes the full canvas width at 536px tall.

- Isometric estate: 60 homes, 6 × 10, split by a road, on a sand-coloured plate.
- Sky, ground, roofs and windows all shift with the replay clock — dawn, day,
  golden hour, night. Windows glow warm after dusk; rooftop panels read blue in
  daylight.
- Per-home state: normal · shifting now (blue ring) · drawing hard · opted out
  (pale) · offline. Legend counts update live.
- Shared connection node bottom-left, with a vertical bar and the 92 kVA ceiling tick.
- Click any home to open the resident phone panel.
- A green lock badge in the header carries the one-line services reassurance.

Rail (300px): **Forecast health** (with auto calibrate) → **Happening now**
(two plain sentences, plus a jump to Timeline) → **Comfort budget**.

### Tab 2 — TIMELINE

The 15-minute load chart, lifted out of NOW so first-time users aren't met with it.

- Demand ceiling, ghost line (existing schedule), forecast band, solid-to-now /
  dashed-ahead plan line.
- Red tombstone on the peak interval, near-miss rings where the old schedule
  would have crossed, leader lines on planned actions.
- Tariff-window strip and rupees-per-interval bars beneath the plot.
- Hover anywhere for load, ceiling, price window, cost and what the system was doing.
- Three cards below: the interval that sets the bill · crossings avoided ·
  spend so far today.

Rail: **Critical services** (never shed) → **caution dial** (q50–q99, with bill,
breaches and too-warm readouts) → **How to read this** (four-line legend).

### Tab 3 — COMPARE

Draggable split: forecast-only controller on the left (peaks 87.0), this system
on the right (84.4). Breach markers follow the left series. Below, the five-row
controller table from no-control to the oracle, with the achieved share of the
available saving.

Rail: **What changed** — four short before/after lines.

### Tab 4 — EVIDENCE

Calibration plot (92% coverage against a 90% target) · before/after month carpet ·
the rendered invoice with changed lines ticked · fairness bars by tower and group.

Rail: **What is real and what is simulated.**

### Tab 5 — REQUESTS

The operator's queue. Residents ask for things ("more power Saturday evening",
"car charged by 8am"); most are answered by the system, a few need a person.

**Clustered requests.** When two or more pending requests overlap the same window
on the same date, they do not render as separate cards — a joint problem displayed
as independent ones produces two wrong numbers. A2 1204 and B1 0402 both want
Saturday 7 to 11pm, so one cluster card replaces both: member rows with each
flat's cost *if approved alone*, then the three figures that matter — ₹0, ₹1,276,
and **₹3,890 together** — and the sentence that explains why the first two are
misleading. Below that, the resolution: a stagger timeline showing what each flat
asked for against what would be offered, and **Stagger and approve both**, which
lands at 90.8 kVA and costs nothing. *Decide individually* dissolves the cluster
into ordinary cards if the operator wants them; *Decline both* is the third option.
When no arrangement fits, the card says so and offers *Approve both anyway*
instead of a false stagger.

**Needs your decision** — one card per open request. Left: flat, tower, household
size, requested day and window. Middle: the ask in the resident's own words, how
large it is in kW, and a sparkline of that evening with and without them against
the ceiling. Right: the money, the arithmetic in a sentence, and three actions.

The arithmetic is the whole point. A request that fits the headroom shows **₹0**
in green and *Approve*. One that crosses the 92 kVA ceiling shows the society
cost in red, the per-flat share, and *Approve anyway* in red outline — never a
solid primary button, because the operator should feel the weight.

Cards carry their own context: a source tag (`via WhatsApp`, `via app`,
`entered by operator`), an ageing line in amber past 24 hours and red past five
days, `Needed in 2 days` when the requested date is close, and a precedent line
naming the most recent comparable decision and its cost — amber when that
precedent was a refusal. An opted-out flat gets one line clarifying that opting
out of load shifting does not forfeit the right to ask. Queue order is by
requested date, not arrival, so this Saturday outranks next month.

*Counter offer* expands in place: the nearest free window, a two-bar
asked/offered comparison against the ceiling, and a pre-written message the
operator can edit. Below every card, that flat's boost-day usage, so a decision
is never made blind to fairness.

**Approved automatically** — eight-row log of what the system settled alone, with
peak impact and cost per row. A `MED` badge marks medically flagged flats: always
approved, never counted against an allowance. Above the log, one line reporting
what yesterday's broadcast actually achieved (6.2 kVA against forecast) — the
society's own compliance, measured rather than assumed.

**Preview before commit.** Hovering *Approve* or *Approve anyway* animates that
day's bar in Coming Up to its post-approval height and redraws the card's
sparkline, 240ms, reverting on mouse out. Hovering *Stagger and approve both*
shows the bar growing and stopping under the ceiling tick — a crossing not
happening. Hovering *Decline* animates nothing and instead surfaces one line
about the resident losing the evening and the 8pm window we could offer, which
exists to make the operator reach for counter offer.

**Undo instead of confirmation.** No confirmation dialogue anywhere in this tab.
Every decision commits immediately and its toast carries *Undo* with a 10-second
draining rule; undo restores the card to its position in the queue. After the
window closes the action is final, because an undo that sometimes works is worse
than none.

**Coming up** — seven-day strip, forecast peak per day with granted load stacked
on top and the ceiling drawn across. Bars start at 60 kVA so the granted portion
is legible; the truncation is labelled. Then six metrics: requests, auto-approved
share, counter-offer acceptance, cost of grants, breaches avoided, broadcast
compliance. A 60 kVA floor line is drawn across the strip and labelled, so the
truncation is visible rather than only captioned.

**Anticipation card** sits above the queue when a day in the next seven has three
or more grants and a forecast peak within 5 kVA of the ceiling: amber, naming the
day, with *Send a heads up* opening the composer with the date already in the
message. Dismissing hides it until another request lands on that day.

**Auto-declined requests.** A request for a day already at the ceiling is
declined before the operator sees it, with a counter offer for the nearest free
window attached automatically. It never enters the queue; it appears in the log
behind a *Show 2 auto declined* toggle, cost column reading `Auto declined` in
ink rather than red. Nothing is hidden, only quiet.

Rail: **This month** (34 received, 31 automatic, 3 decided by a person, 4-minute
median) → **Send a broadcast** (three templates) → **Flexibility budget** (six
free boost days a year per flat, distribution across all 60) → **Consent
coverage** (47 of 60, three tiers, one ask per quarter).

Festival scenario collapses twelve same-evening requests into one grouped card
and puts a banner above the queue: granting all twelve crosses by 6.4 kVA, two
staggered groups doesn't. One button staggers them — cost drops ₹3,891 to ₹0,
Saturday settles at 90.8 kVA, nobody is refused. This is the demo moment.

Empty queue is a designed state, not a blank: *"Nothing needs you right now.
Every request this week fitted inside the headroom."*

### Overlays

- **Resident phone panel** — flat label, what changed today with a "Why?"
  expander, the five loads never touched, ₹204 off maintenance, pause-for-3-hours,
  opt-in switch, fairness line.
- **Consent request card** (resident panel, from *Ask for consent*) — what is
  asked for, explicitly not appliance-level, why, and for how long, with
  Allow / Not now / Never ask again. Below it, how the data was actually used,
  every entry downloadable. Withdrawal sits where consent was granted.
- **Broadcast composer** — template, audience (60 / 30 / 14 / 9 flats), editable
  message, and a live phone preview of what lands on the resident's screen.
- **Tariff panel** — the four windows with rates, and the demand-charge arithmetic.
- **Toasts** — three treatments (neutral, green confirm, red warning), auto-dismiss.

---

## 3. Interaction

| Input | Effect |
| --- | --- |
| `Q` `W` `E` `R` `T` | NOW · Timeline · Compare · Evidence · Requests |
| `1`–`5` | Normal day · Heatwave · Sensor drop · Grid outage · Festival |
| `Space` | Play / pause the replay |
| `G` | Swap the isometric scene for the 2D tile grid |
| `J` `K` | Move down / up the request queue |
| `A` `C` `X` | Approve · counter offer · decline the focused request |
| `/` | Focus the queue search |
| `Esc` | Close resident, tariff, composer and counter panels |
| Click a home | Resident phone panel |
| Drag the split handle | Compare wipe |

Scenario behaviour: heatwave and festival raise the evening peak and push the
status strip to watch; sensor drop widens the forecast band, greys the forward
plan and shows the stale-estimate note; grid outage darkens the estate, kills
streetlights and puts critical services on backup.

Auto calibrate runs four visible steps (~2.4s, collapsed to one under
`prefers-reduced-motion`), then reports the quantile move and the risk change.

---

## 4. Visual language

Ink scale on paper, per the build spec: `#111` through `#F6F5F3`, with red
(`#C4392B`) for the ceiling and breaches, green (`#1E7A4B`) for money saved and
amber (`#B07000`) for watch states. Type is Inter at 44 / 26 / 15 / 12.5 / 10.5px,
tabular numerals throughout, 2px radius, 1px rules.

Colour is confined to the society scene — terracotta and slate roofs, planting,
warm window light, a time-of-day sky. The chrome stays monochrome so the semantic
colours keep their meaning.

Requests inherits all of it unchanged. The one place semantic colour does real
work here is the money column: green ₹0 against red cost, which is why the
existing palette was kept rather than moving to a single-accent system.

**Settled:** Modernist is attached, but the build spec's ink-on-paper tokens win
across all five tabs. A full reskin remains a single pass if wanted.

---

## 5. Tweakable props

| Prop | Options | Purpose |
| --- | --- | --- |
| `startMode` | NOW · COMPARE · EVIDENCE · REQUESTS | Which tab the page opens on |
| `startScenario` | normal · heatwave · sensor_drop · grid_outage · festival | Opening conditions |
| `alertState` | Auto · safe · watch · danger | Force the status strip for a demo |
| `societyView` | 3D isometric · 2D tiles | Scene treatment |

---

## 6. Not built / open

- **What-if drag** on the chart (move a load, see the peak and bill respond).
- **Bill figure settled at ₹204 per flat.** ₹12,227 across 60 flats is ₹204, and
  that now reads consistently on the header stat, the resident panel and Evidence.
  The ₹412-interval against ₹4,055-running-total conflict in Timeline is untouched;
  the running total still computes from the data.
- **Requests, not built this pass:** house-rules overlay, audit log, site switcher
  and portfolio view, role-based disabled-with-reason controls, public lobby view,
  Evidence reconciliation and fairness-rotation cards, resident quiet mode.
  Signed-in role is Operator throughout.
- **Medical flag now cites its rule.** The A1 0308 card explains that the request
  cannot be declined, naming clause 4 as ratified 14 Jun 2026. The house-rules
  overlay itself is still unbuilt, so that clause has no document behind it yet.
- Clustering is computed from date and window overlap only. Two requests on the
  same evening at genuinely non-overlapping hours would still cluster; a real
  implementation would compare the load curves, not the labels.
- Household load traces, and the society itself, are simulated. The forecast model,
  calibration figures, tariff structure and bill arithmetic are real.
