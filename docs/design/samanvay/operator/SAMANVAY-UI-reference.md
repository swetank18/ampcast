# SAMANVAY — UI reference

**Detailed specification of what is built, as at 28 August 2026.**

One file: `SAMANVAY.dc.html`. Opens at 1440 × ~1010. Five tabs, four overlays, five
stress scenarios, full keyboard control. Operator console. Single role signed in.

---

## 1. What the product is

Tariff-native demand control for a 60-flat residential cooperative society. The
society pays a demand charge of ₹608 per kVA of monthly peak. One fifteen-minute
interval in the month sets that charge for every bill in it, so the entire product
exists to keep one number down without anyone in the building noticing.

The interface has two audiences held in one screen: the operator who makes
decisions, and the resident whose evening is affected. The resident view appears
as a phone overlay inside the operator console, so a decision and its human
consequence are never more than one click apart.

---

## 2. Design system

**The build spec's tokens win over Modernist**, which is attached to the project.
This was decided deliberately and is worth restating, because it looks like a
system violation until you know why: the money column needs green ₹0 against a red
cost in the same row, and a single-accent system cannot express that distinction.
A full reskin remains a single pass if wanted.

### Palette

| Token | Value | Role |
| --- | --- | --- |
| `--ink-900` | `#111111` | Primary text, active tab fill, chart primary line |
| `--ink-700` | `#3A3A3A` | Body text on paper |
| `--ink-500` | `#6B6B6B` | Secondary text, axis labels, kickers |
| `--ink-350` | `#9A9A9A` | Ghost line, footnotes, drained states |
| `--ink-150` | `#DCDCDC` | Every border and hairline |
| `--ink-80` | `#EDEDEB` | Inert fills, cell dividers |
| `--ink-40` | `#F6F5F3` | Page ground, inset panels |
| `--paper` | `#FFFFFF` | Card surfaces |
| `--red-600` | Ceiling, breaches, cost, override | Never a fill except the override |
| `--green-600` | Money saved, safe state, ₹0 | Never used for solar |
| `--amber-600` | Watch state, ageing, counter offers | Tinted at `--amber-100` |

The warm sub-palette in the isometric scene — sand, terracotta, slate, cream, lamp
amber, sage — is separate and unchanged. **Slate always means society solar. Green
always means money saved.** The two never share a chart.

### Type and structure

Inter throughout, tabular numerals. Scale: 44px hero figure, 26px card figure,
15px body, 12.5px secondary, 10.5px uppercase kicker at `.09em` tracking. Radius
2px. Borders 1px. No shadows anywhere — structure comes from alignment and rule
weight.

---

## 3. Chrome

**Header.** Brand mark, society name, live clock, the three standing figures
(current load against ceiling, kept off the maintenance charge at ₹204 per flat,
common services bill), tab group, override button.

**Status strip.** The single authority on system state. One sentence of verdict
plus one of detail, tinted by state: green when safe, amber when load runs high,
red when data is stale or the grid is out. No other element in the product repeats
its sentence — the Forecast health panel deliberately says something different so
the two can never disagree.

**Scenario bar.** Five stress states — normal, heatwave, sensor drop, grid outage,
festival — each rewriting load, forecast, health, queue contents and copy.

**Override.** Returns the society to its existing schedule. Never asks for
confirmation; posts a red toast with undo instead.

---

## 4. Tab 1 — NOW

The isometric estate is the hero, roughly 70% of the canvas. Sixty homes in two
towers, sand walls and terracotta roofs, windows lit according to actual load,
sky and shadow shifting through the day. Clicking a home opens the resident phone.

The rail carries three plain-language panels:

**Forecast health** — the word `Accurate`, `Drifting` or `Out of date` at 26px,
one line of context, `AUTO CALIBRATE`, and the last calibration time. Owns the
*action*; the strip owns the verdict.

**Happening now** — two short sentences on what the system is doing and why.

**Comfort budget** — how much shifting the society has absorbed this month against
what it agreed to.

Critical services, the full chart and the caution dial live in Timeline, so NOW
reads as welcoming rather than as a control room.

---

## 5. Tab 2 — TIMELINE

Fifteen-minute load curve across the day. Ceiling at 92 kVA in red, ghost line for
what would have happened without the system, forecast band ahead of now, tariff
strip beneath, and a red marker on the interval that sets the bill.

Two cards below: **the interval that sets the bill** (₹51,313 demand charge, set at
18:45, with the one-line explanation) and the running total. Then critical
services — pumps, lifts, fire systems, STP, tank level — and the caution dial.

---

## 6. Tab 3 — COMPARE

A draggable split between forecast-only operation at 87.0 kVA and this system at
84.4. Below it, the five-row controller table: what each controller did, when, what
it cost and what it saved.

---

## 7. Tab 4 — EVIDENCE

Calibration plot at 92% coverage against a 90% band, described as slightly cautious
rather than as a win. Month carpet of every interval. A rendered invoice with the
changed lines ticked. Fairness bars showing how the shifting was distributed.

---

## 8. Tab 5 — REQUESTS

The deepest tab. Residents ask for things; most are answered by the system, a few
need a person.

### 8.1 The cluster card

**The correctness fix, and the centrepiece.** Two pending requests overlapping the
same window on the same date do not render as separate cards, because each card
pricing itself in isolation produces two numbers that both go wrong the moment
either is approved — the answer would depend on click order, and nothing on screen
would say so.

One card replaces both:

- **Header** — `2 requests want the same 4 hours on Saturday`, with the date and window right-aligned
- **Member rows** — flat, tower and size, the reason in their words, the magnitude, and that flat's cost *if approved alone*; ageing shows here
- **The three figures** — `A2 1204 ALONE ₹0`, `B1 0402 ALONE ₹1,276`, `BOTH TOGETHER ₹3,890` in red, then the sentence explaining why the first two mislead
- **Resolution** — a stagger timeline with each flat's asked window in grey against the offered one in black, labels and notes in an HTML column beside the chart, all on one 512-wide time scale with the peak-pricing line marked
- **Actions** — `STAGGER AND APPROVE BOTH` filled, `DECIDE INDIVIDUALLY` outlined, `DECLINE BOTH` quiet

Where no arrangement fits, the card says so and offers `APPROVE BOTH ANYWAY`
instead of a false stagger. *Decide individually* dissolves the cluster into
ordinary cards.

### 8.2 Decision cards

Three columns. Left: flat, tower, household size, requested day and window, plus
ageing and deadline lines. Middle: the ask in the resident's own words, the
magnitude in kW, a sparkline of that evening with and without them against the
ceiling, captioned. Right: the money, the arithmetic in one sentence, the actions,
and the fairness context.

**The arithmetic is the point.** Fits the headroom → **₹0** green, `APPROVE`.
Crosses the ceiling → society cost in red, per-flat share, `APPROVE ANYWAY` in red
outline, never a solid primary button, because the operator should feel the weight.

**Counter offer** expands in place: the nearest free window, a two-bar asked
against offered comparison, and a pre-written editable message.

**Per-card context** — source tag (`via WhatsApp`, `via app`, `entered by
operator`); ageing in amber past 24 hours, red past five days; `Needed in 2 days`
inside 48 hours; boost-day usage; a precedent line naming the most recent
comparable decision and its cost, amber when that precedent was a refusal; and one
line for opted-out flats clarifying that opting out of load shifting does not
forfeit the right to ask.

**Queue order is by requested date**, not arrival, so this Saturday outranks next
month.

### 8.3 Preview before commit

Hovering `APPROVE` animates that day's bar in Coming Up to its post-approval
height and redraws the sparkline, 240ms. Hovering `STAGGER AND APPROVE BOTH` shows
the bar growing and stopping under the ceiling tick — a crossing not happening, and
the strongest hover in the product. Hovering `DECLINE` animates nothing and instead
names the free 8pm window, which exists to make the operator reach for counter
offer. `prefers-reduced-motion` swaps all of it for instant state changes.

### 8.4 Undo, not confirmation

No confirmation dialogue anywhere in the tab, including on override. Every decision
commits at once and posts a 340px toast bottom-right carrying `UNDO` and a 2px rule
draining over **5 seconds**. Undo reverses the decision, returns the card to its
original queue position, and posts `Restored.` After the window closes the action
is final and never offers undo, because an undo that sometimes works is worse than
none.

### 8.5 Approved automatically

Eight rows of what the system settled alone: flat, ask, reason, source, peak
impact, cost, when. `MED` badges on medically flagged flats, with a tooltip
covering the full rule. Above the table, one line carrying reach, intention and
result together: *60 flats, 34 said they would try, load dropped 6.2 kVA.*

Requests for days already at the ceiling are declined before the operator sees
them, with a counter offer attached automatically, and appear behind a
`Show 2 auto declined` toggle with the cost column reading `Auto declined` in ink
rather than red. Nothing is hidden, only quiet.

### 8.6 Coming up

Seven-day strip: forecast peak per day, granted load stacked on top, the part above
the ceiling in red, the ceiling drawn across, a dot on days that cross. Bars start
at 60 kVA with a labelled floor line so the truncation is visible rather than only
captioned.

Then six metrics: requests, auto-approved share, counter-offer acceptance, cost of
grants, breaches avoided, broadcast compliance.

### 8.7 What residents told us

Structured declines from the resident app. The aggregate line comes first and
matters most — *3 of 5 declines this month said they need hot water earlier than we
suggested* — because it tells the operator to change the default, which is worth
more than any individual row.

Then the table: flat, suggestion, preset reason, the resident's own words truncated
with a tooltip, when, and a `REVISE` action opening the composer prefilled.

**Rules, enforced in code rather than judgement:** the free text appears here and
nowhere else — never in an export, a broadcast, or the audit log's shareable form —
and the same suggestion is never re-sent to a flat within 90 days of a decline.

### 8.8 Anticipation card

Above the queue when a day in the next seven has three or more grants and a
forecast peak within 5 kVA of the ceiling. Amber, names the day, and offers `SEND A
HEADS UP` which opens the composer with the date already in the message.
Dismissing hides it until another request lands on that day. Only ever one at a
time; if two days qualify, the nearer one shows.

### 8.9 The rail

**This month** — 34 received, 31 automatic, 3 decided by a person, 4-minute median,
and the WhatsApp against app split.

**Send a broadcast** — three templates.

**Last broadcast** — will try 34, cannot 8, 18 unanswered, as a three-segment bar.
**Counts only, never names.** An unfulfilled pledge is never held against a flat
and never surfaces as a broken promise.

**Flexibility budget** — six boost days a year per flat, framed as a system rule
the operator observes: a day is only spent when granting would cost the society
money, and requests fitting spare capacity never use one. Distribution across all
60, no list of which flats.

**Consent coverage** — 47 of 60, segmented by **highest tier held** so the segments
are exclusive and sum to 60, with the clarifying line saying so. `ASK FOR CONSENT`
offers two tier-targeted audiences — Tier 1 only (13 flats, asking for Tier 2) and
Tier 2 but not Tier 3 (32 flats, asking for Tier 3) — and never an option to ask
everyone, since that would ask Tier 3 flats for what they already granted. One ask
per flat per quarter, last-asked date shown, `NEVER ASK AGAIN` permanent and silent.

### 8.10 Festival

Twelve same-evening requests collapse into one grouped card under a banner:
granting all twelve crosses the ceiling by 6.4 kVA, two staggered groups do not.
One button drops ₹3,891 to ₹0 and settles Saturday at 90.8 kVA. Nobody is refused.
Roughly twenty seconds to demonstrate.

### 8.11 Empty state

A designed state, not a blank: *"Nothing needs you right now. Every request this
week fitted inside the headroom and was approved automatically."* Filtered-empty
says something different: *"Nothing matches this filter."*

---

## 9. Overlays

**Resident phone** — flat label, what changed today with a `Why?` expander, the
five loads never touched, ₹204 off maintenance, pause for three hours, opt-in
switch, and the fairness line comparing them to the society average.

**Consent request card** — what is asked for (explicitly not appliance level), why,
and for how long, with Allow / Not now / Never ask again. Below it, how the data
was actually used, each entry downloadable. Withdrawal sits where consent was
granted.

**Broadcast composer** — template, audience, editable message, and a live phone
preview of what lands on the resident's screen. English only.

**Tariff detail** — the full rate structure behind the strip.

---

## 10. Keyboard

| Keys | Action |
| --- | --- |
| `Q` `W` `E` `R` `T` | Now · Timeline · Compare · Evidence · Requests |
| `1`–`5` | Normal · heatwave · sensor drop · grid outage · festival |
| `Space` | Play the replay |
| `G` | 2D grid instead of the isometric scene |
| `J` `K` | Move down / up the request queue |
| `A` `C` `X` | Approve · counter offer · decline the focused request |
| `/` | Focus the queue search |
| `Esc` | Close resident, tariff, composer and counter panels |

Typing in a field suppresses all shortcuts except `Esc`.

---

## 11. Privacy and dignity rules

These are the rules the interface enforces rather than merely displays.

- **Medical flags cannot be declined.** Only `ACKNOWLEDGE` is offered, citing clause 4 as ratified 14 June 2026. Never counted against an allowance, load never shifted, not ranked.
- **Opting out is not forfeiture.** An opted-out flat's request is processed normally.
- **No screen lists which flats** refused consent, pledged, did not pledge, or sit in the low band.
- **Decline free text lives in exactly one place** and cannot be exported.
- **Consent is time-boxed** to 12 months, withdrawable where it was granted, and asked at most once per quarter.
- **Tier 3 implies tier 2.** Withdrawing tier 2 cascades.

---

## 12. Settled decisions

**Visual language.** Build-spec tokens across all five tabs; Modernist not applied.

**Bill figure.** ₹204 per flat is authoritative — ₹12,227 across 60 flats — shown
once in the header and consistently in the resident panel and Evidence.

**Role.** Operator throughout. No role switcher.

**Festival placement.** Banner above the queue plus a grouped card, rather than on
a seven-day strip.

---

## 13. Open items

**Not built.** House-rules overlay, audit log, site switcher and portfolio view,
role-based disabled-with-reason controls, public lobby view, Evidence reconciliation
and fairness-rotation cards, resident quiet mode, what-if drag on the chart.

**Known limits.**

- Clustering matches on date and window label, not on the load curves, so two requests at genuinely non-overlapping hours on the same evening would still group.
- Clause 4 is cited in three places but the document behind it does not exist yet.
- The ₹412-interval against ₹4,055-running-total conflict in Timeline is untouched; the running total computes from the data.
- Consent cascade is specified and reflected in the copy, but the tier counts are static rather than recomputed from a live per-flat model.

**Real against simulated.** Household load traces and the society itself are
simulated. The forecast model, calibration figures, tariff structure and bill
arithmetic are real.
