# SAMANVAY — REQUESTS tab

**Build spec. One new tab in the existing interface.**

Inherits everything from the current design system. Do not introduce a new palette, type scale, radius or shadow. If a value is not stated here, it is unchanged.

---

## 0. The one decision that shapes every screen below

**This is not a chat.**

A chat is unbounded text. It cannot be fed to the optimizer, it needs someone watching it, and an unpaid association secretary will not answer messages at 11pm.

Build a **structured request system**. Every request is an object with four machine readable fields and one human sentence. The structured fields drive the controller. The sentence is for the operator's judgment. That split is the whole design.

**Second rule, equally important: most requests never reach a human.** If a request fits inside forecast headroom, the system approves it automatically and the resident hears back in seconds. Only requests that would actually cost money reach the operator's queue. In a normal week that is two out of thirty.

---

## 1. Tab placement

- Fifth tab, after Evidence. Label `REQUESTS`. Keyboard `T`.
- Count badge on the tab label when items need a decision: 16px circle, `--red-600` fill, `--paper` text at 10.5px.
- **No badge for auto approved items.** A badge that is always lit stops meaning anything.

---

## 2. The request object

```json
{
  "id": "req_2026_0841",
  "flat": "A2 1204",
  "tower": "A",
  "type": "extra_power",
  "window": { "date": "2026-08-29", "start": "19:00", "end": "23:00" },
  "magnitude": "high",
  "magnitude_kw": 6.0,
  "reason": "Housewarming, about 40 guests",
  "status": "needs_decision",
  "medical_flag": false,
  "impact": {
    "forecast_peak_without_kva": 84.4,
    "forecast_peak_with_kva": 88.2,
    "ceiling_kva": 92,
    "society_cost_rupees": 0,
    "cost_per_flat_rupees": 0,
    "fits_in_headroom": true
  },
  "counter_offer": {
    "start": "20:00",
    "end": "00:00",
    "society_cost_rupees": 0
  },
  "budget": { "used": 2, "total": 6, "counts_against_budget": true },
  "created_at": "2026-08-26T09:14:00",
  "decided_at": null,
  "decided_by": null
}
```

**Types**

| Type | Resident says | What the optimizer receives |
|---|---|---|
| `extra_power` | I need more power for an evening | A raised allowance for that flat in that window |
| `deadline` | Car charged by 8am, hot water by 7am | A hard completion constraint |
| `pause` | Pause my participation for a while | That flat drops out of shifting for the period |
| `problem` | Something is wrong | No optimizer effect. Routes to the operator only |
| `consent` | (operator asking the resident) | Changes the data tier for that flat |

**Magnitude is worded on the resident side, numeric on the operator side.** Resident picks `a little`, `normal`, `a lot`. The kW mapping lives in config, never shown to a resident, shown on the operator card at Small in `--ink-500`.

**Status values:** `auto_approved` · `needs_decision` · `approved` · `countered` · `declined` · `expired` · `withdrawn`

---

## 3. Main canvas

Three stacked sections, 24px vertical gaps, in this order. The order matters: what needs you, then what did not need you, then what is coming.

---

### 3.1 Section A — Needs your decision

Label: `NEEDS YOUR DECISION`, with the count next to it at Small in `--ink-500`.

Cards: `--paper`, 1px `--ink-150`, radius 2px, padding 20px, full canvas width, 12px gaps between cards. Typically zero to three.

**Three column layout inside each card.**

**Column 1 — 220px — who and when**

- Flat at Large, `--ink-900`: `A2 1204`
- Small, `--ink-500`: `Tower A · 3BHK · 4 residents`
- 1px `--ink-150` divider, 12px above and below
- Small label: `REQUESTED FOR`
- Body, `--ink-900`: `Saturday 29 Aug`
- Body, `--ink-900`: `7:00 pm to 11:00 pm`

**Column 2 — flexible — the ask and the reason**

- Body 500, `--ink-900`: `More power for an evening`
- Body 400, `--ink-700`, in quotation marks: `"Housewarming, about 40 guests"`
- Small, `--ink-500`: `Asked for a lot of extra power. About 6 kW above their normal evening.`
- **Mini forecast sparkline**, 180 x 44px, no axes and no labels:
  - `--ink-350` dashed line: that evening without the request
  - `--ink-900` solid line: that evening with it granted
  - `--red-600` horizontal line at the ceiling
  - It is a glance, not a chart. Resist adding anything to it.

**Column 3 — 280px — the arithmetic and the buttons**

This is the most important part of the entire feature. **Show the number, never an opinion.**

*When it fits inside headroom:*
- Large, `--green-600`: `₹0`
- Body, `--ink-700`: `Fits inside the headroom. Peak would reach 88.2 kVA against a 92 ceiling.`

*When it does not fit:*
- Large, `--red-600`: `₹1,276`
- Body, `--ink-700`: `Would push the peak to 94.1 kVA, past the 92 ceiling. That is ₹21 per flat this month.`

Three buttons in a row, 8px gaps, height 40px, radius 2px:

| Button | When it fits | When it costs money |
|---|---|---|
| Approve | `APPROVE`, filled `--ink-900`, `--paper` text | `APPROVE ANYWAY`, `--paper` fill, 1px `--red-600` border, `--red-600` text |
| Counter offer | `COUNTER OFFER`, `--paper`, 1px `--ink-900` border | same |
| Decline | `DECLINE`, `--paper`, 1px `--ink-150` border, `--ink-500` text | same |

**The decline button is deliberately the quietest of the three.** The system must not make refusing feel like the default, because an operator under time pressure clicks whatever looks safe.

Beneath the buttons, Small, `--ink-350`: `This flat has used 2 of 6 boost days this year.`

**If the flat is medical flagged**, the card does not appear here at all. It appears in Section B with a `MEDICAL` badge and the note `Always approved. Not counted against their allowance.`

**Empty state.** Never a blank section. A 96px tall box with a dashed 1px `--ink-150` border, one centred line at Body in `--ink-500`:

`Nothing needs you right now. Every request this week fitted inside the headroom and was approved automatically.`

---

### 3.2 Section B — Approved automatically

Label: `APPROVED AUTOMATICALLY`
Small next to it, `--ink-500`: `These fitted inside the forecast headroom, so nobody had to decide.`

A quiet table, not cards. Row height 44px, 1px `--ink-150` rules between rows, no outer card border.

| Column | Width | Content and style |
|---|---|---|
| Flat | 120px | `B1 0703` — Body, `--ink-900` |
| Ask | flexible | `Car charged by 8am, Thursday` — Body, `--ink-700` |
| Reason | 200px | Small, `--ink-500`, truncated with a tooltip on overflow |
| Peak impact | 100px | `+0.4 kVA` — Small, `--ink-500`, right aligned |
| Cost | 90px | `₹0` — Body, `--green-600`, right aligned |
| Decided | 100px | `2 min ago` — Small, `--ink-350` |

Show the most recent eight, then a `Show all 34 this month` link at Small in `--ink-500`.

**This section should look boring.** That is the point. It is proof the system works without demanding attention.

**Also lives here: broadcast compliance.** Twenty four hours after a heads up broadcast, insert a single row above the table, `--ink-40` background:

`Yesterday's broadcast went to 60 flats. Evening load dropped 6.2 kVA against the forecast.`

That number is the only evidence that residents actually respond. Give it a permanent home.

---

### 3.3 Section C — Coming up

Label: `COMING UP`
Small: `Granted requests laid over the forecast peak for each day.`

A seven day horizontal strip, one column per day, full canvas width, 180px tall.

Each column:
- Day label at Small, `--ink-500`: `Thu 27`
- A vertical bar, 40px wide, height proportional to that day's forecast peak scaled against the ceiling
  - Base forecast: `--ink-900`
  - Portion from granted requests: stacked on top in `--ink-350`
  - A 2px `--red-600` horizontal tick across the column at the ceiling
  - Any portion crossing the ceiling turns `--red-600`
- Below the bar, Small, `--ink-500`: `3 granted`
- A `--red-600` dot above any column that crosses

Hover a day for a tooltip listing that day's granted requests.

**Why this earns its space:** the operator sees Saturday getting crowded three days before it becomes a problem. Nothing else in the product gives them that.

---

### 3.4 Metrics row

A single row of six figures at the bottom of the canvas, each a Small label above a Large number.

`REQUESTS` `34` · `AUTO APPROVED` `91%` · `COUNTER OFFERS ACCEPTED` `78%` · `COST OF GRANTS` `₹1,276` · `BREACHES AVOIDED` `2` · `BROADCAST COMPLIANCE` `6.2 kVA`

---

## 4. The rail — 300px, four panels

### Panel 1 — This month

Label: `THIS MONTH`

Four rows, Small label left, Large number right:
- `Requests received` `34`
- `Approved automatically` `31`
- `Decided by you` `3`
- `Median response` `4 min`

Beneath, Small, `--ink-500`: `31 of 34 needed nobody.`

### Panel 2 — Send a broadcast

Label: `SEND A BROADCAST`

Three stacked buttons, full width, 40px, `--paper`, 1px `--ink-150`, left aligned Body text:
- `Heads up about tomorrow`
- `Thank the society`
- `Maintenance notice`

Each opens the composer in Section 6.

### Panel 3 — Flexibility budget

Label: `FLEXIBILITY BUDGET`

- Body, `--ink-700`: `Every flat gets 6 boost days a year, free. Beyond that, the cost of granting appears on their maintenance bill.`
- A horizontal distribution bar: how many flats have used 0, 1 to 3, 4 to 5, and all 6
- Small, `--ink-500`: `4 flats have used their full allowance.`
- **Never a list of which flats.** See Section 8.

### Panel 4 — Consent coverage

Label: `CONSENT COVERAGE`

- Large, `--ink-900`: `47 of 60`
- Small, `--ink-500`: `flats share per flat readings. The rest count in the society total only.`
- A stacked bar across the four tiers
- Button, full width, `--paper`, 1px `--ink-900`: `ASK FOR CONSENT`
- Small, `--ink-350`: `You can ask each flat once per quarter. Last asked 12 Jul.`

---

## 5. Counter offer flow

Never make the operator choose only between yes and no. When a request does not fit, the system computes the nearest window that does.

Clicking `COUNTER OFFER` opens a panel **inside the card**, 240ms fade, pushing the buttons down. Not a modal.

- Body 500, `--ink-900`: `The nearest free window is 8:00 pm to midnight.`
- Body, `--ink-700`: `Same length, one hour later, and it costs the society nothing.`
- A two row mini timeline showing requested and offered windows against the tariff strip
- An editable message line, prefilled:
  `We cannot do 7pm without a cost to everyone, but 8pm to midnight is completely free. Would that work?`
- Buttons: `SEND OFFER` filled `--ink-900`, and `BACK` ghost

Track acceptance. Most residents accept, because they wanted the evening, not the specific hour.

---

## 6. Broadcast composer (overlay)

Centred modal, 560px wide, `--paper`, 1px `--ink-150`, radius 2px. Backdrop `--ink-900` at 40 percent.

**Fields**

- **Template** — three options in a row
- **Audience** — a segmented control:
  - `Everyone` · `One tower` · `Flats drawing hard right now` · `Flats with an upcoming request`
  - The third option is the useful one. It reaches exactly the households whose behaviour matters in the next hour
  - Below it, Small, `--ink-500`, updating live: `Goes to 14 flats.`
- **Message** — textarea, 4 rows, prefilled from the template, Body size, editable
- **Preview** — a phone shaped mini frame, 200px wide, showing exactly what the resident receives. Never let an operator send something they have not seen in final form

**Template text**

- Heads up: `Tomorrow is forecast at 41 degrees. If you can run washing machines and dishwashers after 10pm, we will avoid a peak that costs everyone.`
- Thank you: `Last night's coordination kept us 8 kVA under the limit. That is about ₹40 per flat off this month's maintenance.`
- Maintenance: `Water pump maintenance on Thursday, 2pm to 4pm. Supply to towers A and B will be intermittent.`

**Buttons:** `SEND` filled `--ink-900`, `CANCEL` ghost.
**After sending:** green toast, `Sent to 14 flats.`

---

## 7. Consent, the operator to resident direction

Same object, pointed the other way. Build one card component and reuse it.

### 7.1 The four tiers

| Tier | Covers | Consent | What stops working without it |
|---|---|---|---|
| 0 | The society meter | None. Shared bill, already collectively owned | Nothing |
| 1 | Your flat counts in the society total, never shown alone | Implied by residency | Nothing |
| 2 | Per flat meter readings | **Explicit** | Savings shown separately instead of as a society average |
| 3 | Appliance level readings | **Explicit** | Personal nudges and deadline scheduling |

**Build this rule in, and say it out loud:** the system runs fine at tier 1 for everybody. Higher tiers buy better results, never basic function. A product that breaks without personal data is a product that will end up coercing people into giving it.

### 7.2 The ask, as the resident sees it

A card in the resident phone panel, `--paper`, 1px `--ink-150`:

- Small label: `A REQUEST FROM MANAGEMENT`
- Body 500, `--ink-900`: `Can we see your flat's meter readings?`
- Body, `--ink-700`: `Not appliance level. Just the total for your flat, every 15 minutes.`
- Small label: `WHY`
- Body, `--ink-700`: `So your savings can be shown separately instead of as a society average.`
- Small label: `FOR HOW LONG`
- Body, `--ink-700`: `12 months. It expires on 26 Aug 2027 unless you renew it.`
- Three stacked buttons, full width, 40px:
  - `ALLOW` filled `--ink-900`
  - `NOT NOW` `--paper`, 1px `--ink-900`
  - `NEVER ASK AGAIN` `--paper`, 1px `--ink-150`, `--ink-500` text
- Small, `--ink-350`: `You can withdraw this any time, in the same place you granted it.`

### 7.3 Rules the code must enforce

- **Default is no.** Nothing on until they tap allow
- **Withdraw sits where grant sits.** One tap, never in a settings menu
- **Withdrawing costs nothing punitive.** The flat drops to tier 1 and everything essential keeps working. Say so on the confirmation
- **Consent expires.** Twelve months by default. Consent that never expires reads as a trap
- **Never ask again is permanent.** One ignored request is a decision, not an opening
- **Rate limit, system enforced:** one consent ask per flat per quarter, so an eager secretary cannot pressure anyone
- **Deletion means deletion.** Withdraw and historical per flat data is removed, not hidden

### 7.4 What the resident sees afterwards

Under the consent switches in the resident panel:

- Small label: `HOW YOUR DATA WAS USED`
- Body, `--ink-700`: `Your readings were used 4 times this month, all to schedule your geyser.`
- Link at Small: `See every use` — expands into a plain list, one line per use, with date, purpose and a download link

Usage shown in the same place as the switch is what turns a consent screen from a legal formality into something a person believes.

---

## 8. Dignity rules — enforce in code, not just design

Easy to get wrong, expensive to get wrong.

- **Never expose who opted out.** Not as a list, not as a count by tower, not in the 3D scene in any way that identifies a flat
- **Never expose who refused consent.** Coverage is a number, never a roster
- **Never show a resident's name to another resident.** Flat identifiers only, and only to the operator
- **No streaks, scores, badges or leaderboards.** Gamifying someone's home comfort ages badly
- **Neighbour comparison is aggregate only:** `You were asked to shift 3 times this month. The society average is 3.2.` Never `You participate less than 40 percent of your neighbours`
- **The free text reason is visible to the operator only.** Never in an export, a broadcast, or a shareable log

---

## 9. Medical flag

Set by the operator from the household drill down.

- A small `--ink-900` badge on the household card: `MEDICAL`
- Enforced in code: requests from this flat are always auto approved, never counted against the boost budget, and their load is never shifted
- Appears in Section B with the note `Always approved. Not counted against their allowance.`

About ten lines of logic, and one of the strongest things you can say on stage, because it shows you thought about who gets hurt when a system like this is wrong.

---

## 10. Operator speed

Someone processing a queue should never touch the mouse.

| Key | Effect |
|---|---|
| `J` `K` | Move down and up the queue |
| `A` | Approve the focused request |
| `C` | Open counter offer |
| `X` | Decline |
| `Enter` | Confirm the focused action |
| `/` | Focus search |
| `Esc` | Close any overlay |

The focused card gets a 2px `--ink-900` left border.

**Search and filter.** A search field at the top of the tab, `/` to focus, searching flat, reason text and type. Filter chips beside it: `Needs decision` · `This week` · `Costs money` · `Medical flagged`.

**Bulk actions.** When the queue has more than three items, a checkbox appears on each card and a bar appears above: `3 selected`, with `APPROVE ALL THAT FIT`, `COUNTER OFFER ALL`, `DECLINE`.

`APPROVE ALL THAT FIT` approves only the subset that stays inside headroom, then reports what it did:
`Approved 7. Two would have crossed the ceiling and are still waiting for you.`

---

## 11. States

- **Loading:** skeleton rows in `--ink-80`. Never a spinner
- **Empty queue:** the copy in 3.1
- **New society:** `This society joined 4 days ago. We need about two weeks of readings before the forecast is reliable. Until then the system watches and does not act.`
- **Stale data:** an `--amber-600` strip at the top of the tab: `Showing data from 14:20. Reconnecting.`
- **Failed action:** inline, next to the button that failed, one sentence saying what happened and what to do. No modal, no apology

---

## 12. Visual rules

- **The tab is mostly quiet.** Colour appears only where a decision or a cost is involved
- **Red appears only on cost and on breach.** A request that costs money shows red on the figure. A request that fits shows green on the `₹0`. Nothing else in this tab is coloured
- **Every card that shows money shows the arithmetic behind it.** Never a figure without the kVA numbers that produced it
- **Row height 44px throughout**, so a queue of thirty is scannable
- **Tabular numerals everywhere**, so columns hold still when figures animate
- No new radius, no new shadow, no new colour. If you feel you need one, use the ink scale

---

## 13. Demo moment to design for

Press **Festival** on the stress bar. Twelve flats have requested extra power for the same evening.

Section C shows them clustered on one day with the ceiling clearly crossed. A single line appears at the top of the section:

> `Granting all twelve crosses the ceiling by 6.4 kVA. Granting them in two staggered groups does not.`
> `STAGGER AND APPROVE ALL`

One press. The bar drops below the ceiling. Everyone gets their evening.

That is coordination made visible, and it is what the name means.

---

## 14. Build order

**First, or the tab does not exist**
- [ ] Request card with the headroom arithmetic and three buttons
- [ ] Auto approve when it fits, with Section B as the log
- [ ] Section C, the seven day strip
- [ ] Rail panel 1

**Second**
- [ ] Counter offer flow
- [ ] Broadcast composer with audience targeting and preview
- [ ] Consent tiers and the resident consent card
- [ ] Flexibility budget counter
- [ ] Medical flag

**Third**
- [ ] Keyboard queue navigation
- [ ] Bulk approve all that fit
- [ ] Search and filter chips
- [ ] Data usage list on the resident panel
- [ ] Metrics row

**Never cut:** the headroom arithmetic on the card, auto approve, the counter offer, the medical flag, and the dignity rules in Section 8. Those five are the feature.

**Cut first:** bulk actions, search, the metrics row, the mini sparkline.

---

## 15. Skip entirely

Do not build: message threading, attachments, read receipts, typing indicators, notification preference screens, or anything else resembling a messaging app. Every one of those turns a bounded decision queue back into an inbox.
