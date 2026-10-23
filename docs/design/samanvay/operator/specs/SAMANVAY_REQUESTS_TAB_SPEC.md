# SAMANVAY — Requests tab and trust layer

**Build spec, addendum to `SAMANVAY_UI_SPEC.md`.**
Adds one new tab, three new overlays, and a set of transparency features that live across the existing tabs.

Everything here inherits the existing design system. Do not introduce a new palette, a new type scale, or a new radius. If a value is not restated below, it is unchanged from the main spec.

---

## 0. Read this first

Three decisions shape every screen in this document. If you understand these, the rest follows.

**This is not a chat.** A chat is unbounded text. It cannot be fed to the optimizer, it needs someone watching it, and an unpaid association secretary will not answer messages at 11pm. Everything here is a **structured request object** with four machine readable fields and one human sentence. The structured fields drive the controller. The sentence is for the operator's judgment.

**Most requests never reach a human.** If a request fits inside forecast headroom, the system approves it automatically and the resident hears back in seconds. Only requests that would actually cost money reach the operator's queue. In a normal week that is two out of thirty. This is what makes the feature scale to a portfolio of societies rather than becoming an inbox.

**Consent runs the same way.** The operator asking a household for permission to use their data is the same object shape, pointed in the other direction. Build one component and use it twice.

---

## 1. The request object

```json
{
  "id": "req_2026_0841",
  "direction": "resident_to_operator",
  "flat": "A2 1204",
  "resident_name_shown": false,
  "type": "extra_power",
  "window": { "date": "2026-08-29", "start": "19:00", "end": "23:00" },
  "magnitude": "high",
  "reason": "Housewarming, about 40 guests",
  "status": "needs_decision",
  "auto_decision": null,
  "impact": {
    "forecast_peak_without_kva": 84.4,
    "forecast_peak_with_kva": 88.2,
    "ceiling_kva": 92,
    "society_cost_rupees": 0,
    "cost_per_flat_rupees": 0,
    "fits_in_headroom": true
  },
  "counter_offer": { "start": "20:00", "end": "00:00", "society_cost_rupees": 0 },
  "budget": { "used": 2, "total": 6, "counts_against_budget": true },
  "created_at": "2026-08-26T09:14:00",
  "decided_at": null,
  "decided_by": null
}
```

**Request types**

| Type | Resident says | What the optimizer receives |
|---|---|---|
| `extra_power` | I need more power for an evening | A raised ceiling allowance for that flat in that window |
| `deadline` | Car charged by 8am, hot water by 7am | A hard completion constraint |
| `pause` | Pause my participation for a while | That flat drops out of shifting for the period |
| `problem` | Something is wrong | No optimizer effect. Routes to the operator only |
| `consent` | (operator to resident) | Changes the data tier for that flat |

**Magnitude is worded, not numeric, on the resident side.** `a little` · `normal` · `a lot`. The mapping to kW lives in config and is never shown to a resident. Show the kW value on the operator card only, at Small size in `--ink-500`.

**Status values:** `auto_approved` · `needs_decision` · `approved` · `countered` · `declined` · `expired` · `withdrawn`

---

## 2. The REQUESTS tab

Add as the fifth tab, after Evidence. Keyboard `T`.

Tab label carries a **count badge** when items need a decision: a 16px circle, `--red-600` fill, `--paper` text at 10.5px. No badge when the queue is empty. Never show a badge for auto approved items, because a badge that is always lit stops meaning anything.

### 2.1 Main canvas

Three stacked sections, 24px vertical gaps, in this order.

---

#### Section A — Needs your decision

Label: `NEEDS YOUR DECISION` with the count next to it at Small in `--ink-500`.

Typically zero to three cards. Each card is `--paper`, 1px `--ink-150`, radius 2px, padding 20px, full canvas width.

**Card anatomy, left to right in a three column layout**

*Column 1, 220px — who and when*
- Flat identifier at Large, `--ink-900`: `A2 1204`
- Small, `--ink-500`: `Tower A · 3BHK · 4 residents`
- Divider, 12px gap
- Small label: `REQUESTED FOR`
- Body, `--ink-900`: `Saturday 29 Aug`
- Body, `--ink-900`: `7:00 pm to 11:00 pm`

*Column 2, flexible — the ask and the reason*
- Body 500, `--ink-900`: `More power for an evening`
- Body 400, `--ink-700`, in quotes: `"Housewarming, about 40 guests"`
- Small, `--ink-500`: `Asked for a lot of extra power. About 6 kW above their normal evening.`
- A **mini forecast sparkline**, 180 x 44px, showing that evening's forecast peak with and without the request granted. Two lines: `--ink-350` dashed for without, `--ink-900` solid for with, and a `--red-600` horizontal ceiling. No axes, no labels. It is a glance, not a chart.

*Column 3, 280px — the arithmetic and the buttons*

This is the most important part of the whole feature. **Show the number, never an opinion.**

When it fits:
- Large, `--green-600`: `₹0`
- Body, `--ink-700`: `Fits inside the headroom. Peak would reach 88.2 kVA against a 92 ceiling.`

When it does not fit:
- Large, `--red-600`: `₹1,276`
- Body, `--ink-700`: `Would push the peak to 94.1 kVA, past the 92 ceiling. That is ₹21 per flat this month.`

Then three buttons in a row, 8px gaps, height 40px:
- `APPROVE` — filled `--ink-900`, `--paper` text, when it fits. When it does not fit the label becomes `APPROVE ANYWAY` and the fill becomes `--paper` with a `--red-600` border and `--red-600` text
- `COUNTER OFFER` — `--paper`, 1px `--ink-900` border. See 2.2
- `DECLINE` — `--paper`, 1px `--ink-150` border, `--ink-500` text. Deliberately the quietest of the three

Beneath the buttons, Small, `--ink-350`: `This flat has used 2 of 6 boost days this year.`

**Empty state.** Do not show a blank section. Show a single line, Body, `--ink-500`, centred in a 96px tall dashed `--ink-150` box:
`Nothing needs you right now. Every request this week fitted inside the headroom and was approved automatically.`

---

#### Section B — Approved automatically

Label: `APPROVED AUTOMATICALLY` and at Small in `--ink-500`: `These fitted inside the forecast headroom, so nobody had to decide.`

A quiet table, not cards. Row height 44px, 1px `--ink-150` rules between rows, no outer card border.

| Column | Width | Content |
|---|---|---|
| Flat | 120px | `B1 0703`, Body, `--ink-900` |
| Ask | flexible | `Car charged by 8am, Thursday`, Body, `--ink-700` |
| Reason | 200px | Small, `--ink-500`, truncated with a tooltip on overflow |
| Peak impact | 100px | `+0.4 kVA`, Small, `--ink-500`, right aligned |
| Cost | 90px | `₹0`, Body, `--green-600`, right aligned |
| Decided | 100px | `2 min ago`, Small, `--ink-350` |

Collapsed to the most recent eight, with a `Show all 34 this month` link at Small.

This section exists to prove the system is working without demanding attention. It should feel boring. Boring is the point.

---

#### Section C — Coming up

Label: `COMING UP` and Small: `Granted requests laid over the forecast peak for each day.`

A seven day horizontal strip, one column per day, full canvas width, 180px tall.

Each day column contains:
- Day label at Small, `--ink-500`: `Thu 27`
- A vertical bar, width 40px, height proportional to that day's forecast peak, scaled against the ceiling
  - Fill `--ink-900` for the base forecast
  - The portion attributable to granted requests stacked on top in `--ink-350`
  - A 2px `--red-600` horizontal tick across the column at the ceiling position
  - If the stacked total crosses the ceiling, the crossing portion turns `--red-600`
- Below the bar, Small, `--ink-500`: the count of granted requests, e.g. `3 granted`
- Days with any crossing get a `--red-600` dot above the column

Hovering a day shows a tooltip listing that day's granted requests.

**Why this matters:** the operator sees Saturday getting crowded three days before it becomes a problem. Nothing else in the product gives them that.

---

### 2.2 Counter offer flow

Never make the operator choose only between yes and no. When a request does not fit, the system computes the nearest window that does, and offers it in one tap.

Clicking `COUNTER OFFER` opens a small panel inside the card, 240ms fade, pushing the buttons down:

- Body 500, `--ink-900`: `The nearest free window is 8:00 pm to midnight.`
- Body, `--ink-700`: `Same length, one hour later, and it costs the society nothing.`
- A two row mini timeline showing requested and offered windows against the tariff strip
- An editable message line, prefilled: `We cannot do 7pm without a cost to everyone, but 8pm to midnight is completely free. Would that work?`
- Buttons: `SEND OFFER` filled `--ink-900`, and `BACK`

Track acceptance. Most residents accept, because they wanted the evening, not the specific hour. The acceptance rate is one of your best metrics, see Section 6.

---

### 2.3 The rail in this tab (300px)

Four panels, top to bottom.

**Panel 1 — This month**

Label: `THIS MONTH`
Four rows, each a Small label on the left and a Large number on the right:
- `Requests received` `34`
- `Approved automatically` `31`
- `Decided by you` `3`
- `Median response` `4 min`

Beneath, Small, `--ink-500`: `31 of 34 needed nobody.`

**Panel 2 — Send a broadcast**

Label: `SEND A BROADCAST`

Three template buttons, stacked, full width, height 40px, `--paper`, 1px `--ink-150`, left aligned text at Body size:
- `Heads up about tomorrow`
- `Thank the society`
- `Maintenance notice`

Clicking one opens the broadcast composer, Section 3.

**Panel 3 — Flexibility budget**

Label: `FLEXIBILITY BUDGET`
- Body, `--ink-700`: `Every flat gets 6 boost days a year, free. Beyond that, the cost of granting appears on their maintenance bill.`
- A horizontal distribution bar showing how many flats have used 0, 1 to 3, 4 to 5, and all 6 days
- Small, `--ink-500`: `4 flats have used their full allowance.`
- **Never a list of which flats.** See Section 7.

**Panel 4 — Consent coverage**

Label: `CONSENT COVERAGE`
- Large, `--ink-900`: `47 of 60`
- Small, `--ink-500`: `flats share per flat readings. The rest count in the society total only.`
- A stacked bar showing the four tiers
- Button, full width, `--paper`, 1px `--ink-900`: `ASK FOR CONSENT`
- Small, `--ink-350`: `You can ask each flat once per quarter. Last asked 12 Jul.`

---

## 3. Broadcast composer (overlay)

A centred modal, 560px wide, `--paper`, 1px `--ink-150`, radius 2px. Backdrop `--ink-900` at 40 percent opacity.

**Fields**

- **Template**, three radio style options in a row
- **Audience**, a segmented control with four options:
  - `Everyone` · `One tower` · `Flats drawing hard right now` · `Flats with an upcoming request`
  - The third option is the useful one. It targets exactly the households whose behaviour matters in the next hour
  - Below the control, Small, `--ink-500`, updating live: `Goes to 14 flats.`
- **Message**, a textarea prefilled from the template, 4 rows, editable, Body size
- **Preview**, a phone shaped mini frame, 200px wide, showing exactly what the resident sees. Never let an operator send something they have not seen in its final form

**Templates, prefilled**

- Heads up: `Tomorrow is forecast at 41 degrees. If you can run washing machines and dishwashers after 10pm, we will avoid a peak that costs everyone.`
- Thank you: `Last night's coordination kept us 8 kVA under the limit. That is about ₹40 per flat off this month's maintenance.`
- Maintenance: `Water pump maintenance on Thursday, 2pm to 4pm. Supply to towers A and B will be intermittent.`

**Buttons:** `SEND` filled `--ink-900`, `CANCEL` ghost.

**After sending**, a green toast: `Sent to 14 flats.`

**Compliance tracking.** Twenty four hours after a heads up broadcast, the tab shows a card: `Yesterday's broadcast went to 60 flats. Evening load dropped 6.2 kVA against the forecast.` This single number is what proves residents actually cooperate, and it is the strongest evidence the advisory model works. Give it a permanent home in Section B of the canvas.

---

## 4. Consent, the operator to resident direction

Consent is the same request object pointed the other way. Build one card component and reuse it.

### 4.1 The four tiers

Show these as a table inside the consent panel, and as four switches on the resident side.

| Tier | What it covers | Consent needed | What stops working without it |
|---|---|---|---|
| 0 | The society meter | None. It is a shared bill, already collectively owned | Nothing |
| 1 | Your flat counts in the society total, never shown alone | Implied by residency | Nothing |
| 2 | Per flat meter readings | **Explicit** | Your savings shown separately instead of as a society average |
| 3 | Appliance level readings | **Explicit** | Personal nudges and deadline scheduling |

**The rule to build in and to say out loud:** the system runs fine at tier 1 for everybody. Higher tiers buy better results, never basic function. A product that breaks without personal data is a product that will end up coercing people into giving it.

### 4.2 The ask, as the resident sees it

A card inside the resident phone panel, `--paper`, 1px `--ink-150`:

- Small label: `A REQUEST FROM MANAGEMENT`
- Body 500, `--ink-900`: `Can we see your flat's meter readings?`
- Body, `--ink-700`: `Not appliance level. Just the total for your flat, every 15 minutes.`
- Small label: `WHY`
- Body, `--ink-700`: `So your savings can be shown separately instead of as a society average.`
- Small label: `FOR HOW LONG`
- Body, `--ink-700`: `12 months. It expires on 26 Aug 2027 unless you renew it.`
- Three buttons, stacked, full width, 40px:
  - `ALLOW` filled `--ink-900`
  - `NOT NOW` `--paper` with `--ink-900` border
  - `NEVER ASK AGAIN` `--paper` with `--ink-150` border, `--ink-500` text
- Small, `--ink-350`: `You can withdraw this any time, in the same place you granted it.`

### 4.3 Rules the code must enforce

- **Default is no.** Nothing is on until the resident taps allow
- **Withdraw sits in the same place as grant.** One tap. Never buried in a settings menu
- **Withdrawing costs nothing punitive.** The flat drops back to tier 1 and everything essential keeps working. Say so on the withdraw confirmation
- **Consent expires by default.** Twelve months. Consent that never expires reads as a trap
- **Never ask again is honoured permanently.** One ignored request is a decision, not an opening
- **Rate limit, enforced by the system:** one consent ask per flat per quarter, so an eager secretary cannot pressure anyone
- **Deletion means deletion.** Withdraw and the historical per flat data is removed, not hidden. Say this in the copy and mean it

### 4.4 What the resident sees afterwards — the honest part

Inside the resident panel, directly under the consent switches:

- Small label: `HOW YOUR DATA WAS USED`
- Body, `--ink-700`: `Your readings were used 4 times this month, all to schedule your geyser.`
- A link at Small, `--ink-500`: `See every use` which expands into a plain list, one line per use, with a date, a purpose, and a download link

Usage visible in the same place as the switch is what turns a consent screen from a legal formality into something a person actually believes.

---

## 5. The trust layer

These do not live in the Requests tab. They sit across the product and they are what turn a demo into something an organisation would sign for.

### 5.1 House rules (new overlay, reachable from the header)

A one page document inside the app stating exactly what the system may and may not do.

- Label: `HOUSE RULES` with a version and date chip next to it: `v1.2 · ratified 14 Jun 2026`
- Rendered as a document, not a dashboard: `--paper`, generous margins, Body size, hairline rules between clauses, no cards
- Clauses, each numbered, each one sentence:
  1. `The system never switches off lights, fans, televisions, cooking appliances or refrigerators.`
  2. `The system never shifts a load in a flat flagged for medical equipment.`
  3. `No load is ever delayed by more than 40 minutes.`
  4. `Water pumps, lifts, fire systems and the sewage plant are never shed.`
  5. `Any resident can pause participation at any time, without giving a reason.`
  6. `The operator can return the whole society to its existing timer schedule with one button.`
  7. `No flat is asked to shift load more than four times in a month.`
- Footer line, Small, `--ink-500`: `Ratified by the general body on 14 June 2026. Any change requires another vote.`
- A `Download` button

**Why this is the strongest thing in this document.** It reframes the system from a vendor's black box into a policy the society voted for. Once residents have ratified the rules, every action the system takes is something they already agreed to.

### 5.2 Bill reconciliation (add to EVIDENCE tab)

A new card, top right of the Evidence grid.

- Label: `WHAT WE SAID AGAINST WHAT THE UTILITY BILLED`
- Three figures in a row:
  - `WE COMPUTED` `₹2,16,924`
  - `UTILITY BILLED` `₹2,19,180`
  - `VARIANCE` `+1.0%` in `--amber-600`
- Body, `--ink-700`: `We were 1 percent under. The difference is a fuel adjustment charge our tariff object does not yet model.`
- A twelve month sparkline of the variance

**Being visibly wrong by one percent buys more trust than always claiming to be exactly right.** Do not hide this card when the variance is bad. That is when it is doing its job.

### 5.3 What went wrong this month (add to EVIDENCE tab)

- Label: `WHAT WENT WRONG THIS MONTH`
- Large, `--ink-900`: `2 wrong calls`
- Two rows, each: a date, a Body sentence, and a Small consequence line
  - `11 Aug · The forecast missed an evening spike. The clubhouse ran warm for 25 minutes. No breach.`
  - `19 Aug · A sensor went stale and the system held the previous plan for two hours. No effect on the bill.`
- Empty state: `No wrong calls this month.` Never hide the card

Every system has failures. Reporting them yourself is the difference between a dashboard and an honest instrument, and it is the same argument your calibration work already makes.

### 5.4 Public lobby view (new standalone route)

One screen, no login, designed for a display in the society lobby. Reachable at `?view=lobby`.

- Large centred layout, everything at least twice the size of the main app
- Three things only: today's peak against the ceiling as a single bar, the month's saving per flat in `--green-600`, and a one line status sentence
- Auto refreshing, no interaction, no controls
- Residents who never open an app still see the system working

### 5.5 Decision minutes (add to the resident panel)

Any resident can see why their own load waited, not just that it did.

- Under `What we changed today`, every row gets a `Why?` expander
- Expanded, it shows one sentence of cause: `Because between 6pm and 10pm electricity costs 26 percent more, and the society was within 6 kVA of its limit.`

### 5.6 Fairness rotation (add to EVIDENCE tab)

- Show the rotation order, so nobody has to trust it blindly
- A cap that is a setting, not a promise: `No flat is asked more than 4 times a month` with the value editable by an admin and enforced by the optimizer
- A savings distribution setting, decided once by the society: equal per flat, or proportional to participation. Societies will argue about this, so let them settle it and encode it

### 5.7 Medical flag

Set by the operator on any flat, from the household drill down.

- A small `--ink-900` badge on the household card: `MEDICAL`
- Effects, all enforced in code: requests from this flat are always auto approved, never counted against the boost budget, and their load is never shifted
- One line in the House Rules covering it

About ten lines of logic, and one of the strongest things you can say on stage, because it shows you thought about who gets hurt when a system like this is wrong.

### 5.8 Quiet mode (add to the resident panel)

- A switch: `Quiet mode` with a duration picker
- While on: no requests, no nudges, no broadcasts reach that flat
- No reason required, and no reason field. Someone unwell, a bereavement, exam season. Asking why would defeat the purpose

### 5.9 Resident representative role

- A fourth role alongside viewer, operator and admin
- Read only access to the operator view, granted to one elected resident
- Oversight from inside the community rather than from the vendor

---

## 6. Metrics to surface

Put these in a `REQUESTS · THIS MONTH` summary at the bottom of the Requests tab, as a single row of six figures.

**Operational**
- Requests received, auto approved, decided manually, declined
- Median time to decision
- Counter offer acceptance rate

**Money**
- Total cost of granted requests this month
- Peak impact of granted requests, in kVA
- Breaches avoided by declining or counter offering

**Fairness**
- Requests per flat against the society average
- Budget consumed, distribution not names
- Whether any single tower dominates

**Behavioural**
- Most common reasons, ranked. Guests, function, medical, working from home. This tells you what to build next
- **Broadcast compliance: did load actually drop after a broadcast went out.** This is the number that proves residents cooperate. Give it the most prominent position of the six

---

## 7. Dignity rules — enforce these in code, not just in design

These are easy to get wrong and expensive to get wrong.

- **Never expose who opted out.** Not as a list, not as a count by tower, not in the 3D scene in any way that identifies a flat. Opted out houses render in the same pale neutral as any other non participating state, with no label
- **Never expose who refused consent.** The coverage figure is a number, never a roster
- **Never show a resident's name to another resident.** Flat identifiers only, and only to the operator
- **No streaks, no scores, no badges, no leaderboards.** Gamifying someone's home comfort ages badly, and the first judge who has lived in a society will say so
- **Neighbour comparison is aggregate only:** `You were asked to shift 3 times this month. The society average is 3.2.` Never `You participate less than 40 percent of your neighbours`
- **The free text reason is visible to the operator only.** Never in an exported report, never in a broadcast, never in the audit log's shareable form

---

## 8. Enterprise structure

The person running this sits at a desk, has three societies open, and wants to get through the queue fast. Design for that person.

### 8.1 Site switcher

In the header, left of the tariff chip. A dropdown showing every society, each row with its name, its current peak against ceiling as a mini bar, and a `--red-600` dot if anything needs a decision.

Sorted by **risk of breach this month**, not alphabetically. The one that needs attention rises to the top on its own.

### 8.2 Portfolio view

A new route above the tabs, reachable from the site switcher as `All societies`.

A table, one row per society: name, flats, month peak, ceiling, headroom, breaches, saving per flat, requests pending. Sortable on every column. Click a row to enter that society.

### 8.3 Roles

| Role | Can do |
|---|---|
| Viewer | See everything, change nothing |
| Operator | Approve, decline, counter offer, broadcast, override |
| Admin | All of the above, plus the ceiling, the tariff, priorities, house rules and roles |
| Resident representative | Read only operator view |

An operator must not be able to change the ceiling. Show disabled controls with a plain reason on hover rather than hiding them, so nobody wonders where the setting went.

### 8.4 Audit log (new overlay)

Every action, immutable, exportable.

Columns: timestamp, actor, action, object, before value, after value.
Filterable by actor, by date range, by action type.
A `Download CSV` button.

This is the first thing a facility management firm asks about. It is a table and a download button, and it costs you an afternoon.

### 8.5 Keyboard and speed

Someone processing a queue should never touch the mouse.

| Key | Effect |
|---|---|
| `J` `K` | Move down and up the decision queue |
| `A` | Approve the focused request |
| `C` | Open counter offer |
| `X` | Decline |
| `Enter` | Confirm the focused action |
| `/` | Focus search |
| `Cmd K` | Command palette: jump to any society, tab, or flat |
| `Esc` | Close any overlay |

Show a small `?` in the footer that opens a keyboard shortcut sheet.

### 8.6 Bulk actions

When the queue has more than three items, a checkbox appears on each card and a bar appears at the top: `3 selected` with `APPROVE ALL THAT FIT`, `COUNTER OFFER ALL`, `DECLINE`.

`APPROVE ALL THAT FIT` is the important one. It approves only the subset that stays inside headroom, and reports what it did: `Approved 7. Two would have crossed the ceiling and are still waiting for you.`

### 8.7 Search and filter

A search field at the top of the tab, `/` to focus. Searches flat, reason text and type.
Filter chips beside it: `Needs decision` · `This week` · `Costs money` · `Medical flagged`.

### 8.8 States that must exist

- **Loading:** skeleton rows in `--ink-80`, never a spinner
- **Empty queue:** the copy in 2.1, not a blank
- **New society, no history:** `This society joined 4 days ago. We need about two weeks of readings before the forecast is reliable. Until then the system watches and does not act.`
- **Offline or stale data:** a `--amber-600` strip at the top of the tab: `Showing data from 14:20. Reconnecting.`
- **Failed action:** inline, next to the button that failed, one sentence saying what happened and what to do. No modal, no apology

---

## 9. Visual rules for this tab

Everything inherits from the main spec. The additions:

- **The tab is mostly quiet.** Section B should look boring. Colour appears only where a decision or a cost is involved
- **Red appears only on cost and on breach.** A request that costs money shows red on the figure. A request that fits shows green on the ₹0. Nothing else in this tab is coloured
- **The decline button is the quietest of the three.** Deliberately. The system should not make refusing feel like the default
- **Every card that shows money shows the arithmetic that produced it.** Never a figure without the kVA numbers behind it
- **Row height 44px throughout**, so a queue of thirty is scannable
- **Tabular numerals on every figure**, so columns line up when they animate
- No new radius, no new shadow, no new colour. If you feel you need one, use the ink scale instead

---

## 10. Demo moment to design for

Press **Festival** on the stress bar. Twelve flats have requested extra power for the same evening.

The tab should show them clustered on one day in Section C, with the ceiling clearly crossed. A single line appears at the top of the section:

> `Granting all twelve crosses the ceiling by 6.4 kVA. Granting them in two staggered groups does not.`
> `STAGGER AND APPROVE ALL`

One press. The bar drops below the ceiling. Everyone gets their evening.

That is coordination made visible, and it is what the name means.

---

## 11. Build order

**First, or the tab does not exist**
- [ ] Request card with the headroom arithmetic and the three buttons
- [ ] Auto approve when it fits, with Section B as the log
- [ ] Section C, the seven day upcoming strip
- [ ] Rail panel 1, this month

**Second, high value**
- [ ] Counter offer flow
- [ ] Broadcast composer with three templates and audience targeting
- [ ] Consent tiers and the resident consent card
- [ ] Flexibility budget counter
- [ ] Medical flag
- [ ] House rules overlay

**Third, enterprise**
- [ ] Audit log
- [ ] Site switcher and portfolio view
- [ ] Roles and disabled state reasons
- [ ] Keyboard queue navigation and bulk actions
- [ ] Search and filter chips

**Fourth, trust layer**
- [ ] Bill reconciliation card
- [ ] What went wrong this month card
- [ ] Decision minutes on the resident panel
- [ ] Data usage list on the resident panel
- [ ] Quiet mode
- [ ] Public lobby view
- [ ] Fairness rotation and caps
- [ ] Resident representative role

**Cut before anything else:** the public lobby view, the portfolio view, bulk actions, the command palette.

**Never cut:** the headroom arithmetic on the request card, auto approve, the counter offer, the medical flag, and the dignity rules in Section 7. Those five are the feature.

---

## 12. One thing to decide before building

Two figures in the earlier spec disagree with each other. ₹12,227 across 60 flats is roughly ₹204 per flat, not ₹68, and a ₹412 interval does not sum to ₹4,055 by 14:45.

Pick which is authoritative and derive the rest from it. The bill engine should be the single source of every rupee on every screen, so whichever number the engine produces is the one that goes everywhere. Do not leave two figures on screen that a judge can subtract.
