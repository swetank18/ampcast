# SAMANVAY — UI Build Specification

**Product:** Tariff native demand control for a residential society
**Deliverable:** One single page web interface, desktop first, plus one phone shaped panel inside it
**Read this whole file before writing any code.** Section 1 and Section 2 are non negotiable. Everything else is instruction.

---

## 0. How to use this document

This is a complete build brief. Every colour, size, position and piece of copy is specified. Where a value is given, use that value. Where something is marked OPTIONAL, build it only if the rest is finished.

The interface reads from a precomputed JSON file. There is no live backend, no solver in the render loop, and no network call. See Section 16 for the data contract. If the JSON is not available yet, build against the fake fixture described there.

**Priority order if you run out of time:** Section 6 (persistent chrome) → Section 8 (NOW mode) → Section 12 (alert system) → Section 9 (COMPARE) → Section 13 (resident panel) → Section 10 (EVIDENCE). Section 22 has the full cut list.

---

## 1. What this product is, in one sentence

A residential society has one shared electricity connection. The bill on that connection is set partly by total units used, and partly by the single highest fifteen minute peak in the whole month. One bad evening sets that charge for all thirty days. This system predicts the worst plausible load rather than the average one, and schedules the society's shared equipment so the peak never gets set by accident.

**The interface has exactly one job:** make it obvious, within five seconds and without anyone explaining it, that the system is holding the load under a limit and turning that into money.

Everything else on screen is supporting evidence for that one claim.

---

## 2. Design principles — do not violate these

1. **One screen.** No login, no settings page, no routing, no multipage navigation. Detail opens as a panel over the main view and closes back to it.
2. **One hero number.** The month peak is the largest thing on screen. Everything else is a visible step down in size.
3. **One meaning per colour.** See Section 3. Red means the ceiling and danger, nothing else. Green means safe and money saved, nothing else.
4. **Plain language in the large text, technical language in the small grey text.** Never lead with jargon.
5. **Nothing about the optimizer is tunable.** The user sets policy, never solver parameters.
6. **Every panel that can be empty has a written empty state.** No blank boxes.
7. **Four text sizes plus one display size. Two weights.** Listed in Section 4.
8. **Everything is keyboard reachable and has a visible focus ring.** This gets demoed on a projector by someone who cannot find the mouse.

---

## 3. Colour

### Tokens

Define these as CSS custom properties on `:root`. Never write a hex value anywhere else in the codebase.

```css
:root {
  /* Neutral ink scale — the entire interface is built from these */
  --ink-900: #111111;   /* primary text, primary chart line */
  --ink-700: #3A3A3A;   /* secondary headings */
  --ink-500: #6B6B6B;   /* secondary text, axis labels */
  --ink-350: #9A9A9A;   /* ghost line, tertiary text */
  --ink-200: #C9C9C9;   /* forecast band stroke */
  --ink-150: #DCDCDC;   /* all borders and hairlines */
  --ink-80:  #EDEDEB;   /* fills, inactive bars, track backgrounds */
  --ink-40:  #F6F5F3;   /* page background */
  --paper:   #FFFFFF;   /* card background */

  /* Red — the ceiling, danger, and nothing else */
  --red-600: #C4392B;   /* ceiling line, breach, danger icon, override button */
  --red-700: #9A2C20;   /* text on red tint */
  --red-100: #FBE9E6;   /* danger banner background */

  /* Green — safe, calibrated, money saved, and nothing else */
  --green-600: #1E7A4B; /* safe icon, saved rupee figure, calibrated state */
  --green-800: #145635; /* text on green tint */
  --green-100: #E7F3EC; /* safe banner background */

  /* Amber — watch this, drifting, approaching */
  --amber-600: #B07000;
  --amber-800: #7A4D00;
  --amber-100: #FCF0DB;

  /* Focus */
  --focus: #1F6FEB;
}
```

### Rules of use

| Colour | Allowed uses | Never used for |
|---|---|---|
| Red | The demand ceiling line, the peak tombstone, a breach or near miss marker, the danger banner, the override button, breach counts above zero | Brand marks, slider handles, section labels, savings, anything decorative |
| Green | The safe banner, the calibrated confirmation, the rupees saved figure, the "kept off the maintenance charge" card, the safe state of the status strip | Anything else |
| Amber | The watch banner, the "approaching ceiling" state of the headroom bar, drift warnings | Anything else |
| Ink scale | Everything else without exception | — |

**Critical correction from the current mockup.** The saved rupee figure is currently red. It must be `--green-600`. Your best news must not look like a warning.

**Also change:** the brand square in the header goes from red to `--ink-900`. Slider handles go from red to `--ink-900`. The peak time of day strip goes from red tint to `--ink-80` with a darker fill for the peak window, since it is information, not danger.

### Dark mode

Not required. Build light only. If time permits, invert the ink scale and keep the three semantic colours at the same hex.

---

## 4. Typography

**Face:** Inter, or the closest available grotesk. Load weights 400 and 500 only.
**Numerals:** apply `font-variant-numeric: tabular-nums` globally so figures do not jitter when they animate.

| Role | Size / line height | Weight | Letter spacing | Used for |
|---|---|---|---|---|
| Display | 44px / 44px | 500 | -0.02em | The month peak number only. Nothing else uses this size. |
| Large | 26px / 30px | 500 | -0.01em | Secondary KPI numbers, panel headline numbers |
| Body | 15px / 22px | 400 | 0 | All sentences, all descriptive text |
| Small | 12.5px / 17px | 400 | 0 | Secondary lines, axis labels, subtext under labels |
| Label | 10.5px / 14px | 500 | 0.09em, uppercase | Section labels only. Never a full sentence. |

**Hard rules**
- Never use weight 600 or 700. Emphasis comes from size and colour, not from heavier type.
- Never use a size not in this table.
- Sentence case in all body text. Uppercase only in the Label role.
- Units go at Small size next to a Display or Large number, baseline aligned, in `--ink-500`. Example: `84.4` at Display followed by `kVA` at Small.

---

## 5. Layout, spacing and surfaces

**Design canvas:** 1440 x 900. Build fluid, but design and test at this size.

**Spacing scale:** 4, 8, 12, 16, 24, 32, 48. Nothing in between.

**Surfaces**
- Page background: `--ink-40`
- Cards: `--paper`, 1px border `--ink-150`, radius 2px
- Full width bars (header, status strip): no radius, 1px bottom border `--ink-150`
- No shadows anywhere. No gradients anywhere.

**Frame**

```
+--------------------------------------------------------------+
| HEADER BAR                                    height 48       |
+--------------------------------------------------------------+
| KPI ROW                                       height 104      |
+--------------------------------------------------------------+
| STATUS STRIP  (the alert system lives here)   height 44       |
+---------------------------------------------+----------------+
|                                             |                |
|  MAIN CANVAS                                |  RIGHT RAIL    |
|  flexible width                             |  width 300     |
|  changes with mode                          |  fixed         |
|                                             |                |
+---------------------------------------------+----------------+
| BOTTOM BAR                                    height 92       |
+--------------------------------------------------------------+
```

Outer page padding: 24px left and right. Gutter between main canvas and right rail: 20px. The header bar, KPI row, status strip and bottom bar all span the full width including the rail.

---

## 6. Persistent chrome

These four regions never change between modes. Build them first.

### 6.1 Header bar (48px)

Left to right:

- **Brand mark.** 10x10 square, `--ink-900`, radius 0. Then `SAMANVAY` in Label style, `--ink-900`.
- **Divider.** 1px vertical rule, `--ink-150`, 16px tall, 16px margin either side.
- **Context line.** Body size, `--ink-500`: `Anna Nagar Residency · common services connection · 60 flats`
- **Spacer, pushing the rest right.**
- **Tariff chip.** Bordered pill, 1px `--ink-150`, radius 2px, padding 4px 10px, Small size: `TN HT · ₹7.50/kWh · ₹608/kVA`. Add a small info icon that opens the tariff panel on click.
- **Mode switch.** Three buttons, described in Section 7.

### 6.2 KPI row (104px)

Four cards, but grouped into **two visual pairs with a 32px gap between the pairs and a 12px gap inside each pair**. This is important. The current design shows four equal items and the eye reads four things. Grouped, the eye reads two ideas: what the system is doing, and what it is worth.

**Pair one — state**

*Card A: Peak so far this month*
- Label: `PEAK SO FAR THIS MONTH`
- Number: `84.4` in Display, `--ink-900`, with `kVA` in Small, `--ink-500`
- Subtext, Small, `--ink-500`: `Set 18:45 today. This one number sets the demand charge for all 30 days.`
- This card is visually the heaviest thing on the screen. If it does not obviously dominate, make the others smaller.

*Card B: Headroom right now*
- Label: `HEADROOM RIGHT NOW`
- Number: `48.6` in Large, then `kVA below the 92 kVA ceiling` in Small
- Below the number, a **horizontal bar**, height 8px, full card width, radius 0:
  - Track `--ink-80`
  - Fill `--ink-900` when headroom is healthy
  - Fill turns `--amber-600` when current load is within 20 percent of the ceiling
  - Fill turns `--red-600` on a breach
  - A 2px vertical `--red-600` tick at the ceiling position, always visible

**Pair two — money**

*Card C: Common services bill, month to date*
- Label: `COMMON SERVICES BILL, MONTH TO DATE`
- **Lead with the difference, not the pair.** The current mockup shows two numbers side by side and makes the reader subtract. Instead:
  - Large, `--green-600`: `₹12,227 lower`
  - Small, `--ink-500`, on one line beneath: `₹2,16,924 with this system · ₹2,29,151 on the existing schedule`
  - Second Small line, `--ink-500`: `Both figures come from the bill engine, not an estimate.`

*Card D: Kept off the maintenance charge*
- Label: `KEPT OFF THE MAINTENANCE CHARGE`
- Number: `₹68` in Display, `--green-600`, with `per flat, this month` in Small
- Subtext, Small, `--ink-500`: `₹12,227 across the society so far`
- This is the number a resident actually feels. It gets the second largest treatment on the screen after the peak.

### 6.3 Status strip (44px)

This is the alert system. Full specification in Section 12. It is always present and it is the only place on screen that reports overall system state.

### 6.4 Bottom bar (92px)

Three regions, left to right, separated by 1px vertical rules `--ink-150`.

*Left, flexible width — replay control*
- Label: `REPLAY · 20 AUG` then the time `14:45` in Large
- Small, `--ink-500`: `Solid line is measured. Dashed line ahead of now is planned.`
- A horizontal scrubber, full width of the region: track 4px `--ink-80`, handle 14x14 square `--ink-900`, radius 0
- Play and pause buttons left of the scrubber, 28x28, bordered
- Second Small line beneath: `If this system goes offline, every load returns to its existing timer schedule. Nothing needs the optimizer to run.`

*Middle, 380px — stress the day*
- Label: `STRESS THE DAY`
- Five buttons in a row, 8px gap, height 40px, radius 2px, Label style text:
  - `NORMAL DAY` — active state is filled `--ink-900` with `--paper` text
  - `HEATWAVE`
  - `SENSOR DROP`
  - `GRID OUTAGE`
  - `FESTIVAL`
- Inactive state: `--paper` background, 1px `--ink-150` border, `--ink-900` text. Hover: border `--ink-900`.
- Small line beneath, `--ink-500`, updates live: `No avoided breaches on this day yet.`

*Right, 300px, aligned with the rail — operator override*
- Label: `OPERATOR OVERRIDE`
- Full width button, height 52px, filled `--red-600`, text `--paper`, Label style, radius 2px: `RETURN TO EXISTING SCHEDULE`
- Small beneath, `--ink-500`: `One press. No confirmation, no login.`
- This button must work on the first press with no dialogue. That is the point of it.

---

## 7. The three modes

Three buttons top right of the header, each 32px tall, Label style, 1px `--ink-150` border, joined into a single segmented control with no gap. Active mode is filled `--ink-900` with `--paper` text.

| Mode | Label | What it holds | Why it exists |
|---|---|---|---|
| 1 | `NOW` | Live state: 3D scene, critical services, main chart, controls | The default. Where the demo opens. |
| 2 | `COMPARE` | Controller comparison, split screen, what if drag | Where you show the alternative failing. |
| 3 | `EVIDENCE` | Calibration report, carpet plot, results table, invoice, fairness | Where you close the argument. |

Switching modes changes only the main canvas and parts of the right rail. Header, KPI row, status strip and bottom bar are identical in all three.

This structure exists so that a first time user has an obvious path, and so that walking left to right across three buttons tells a complete story.

---

## 8. NOW mode — main canvas

Two rows.

### 8.1 Top row (height 260px)

Split into two cards, 20px gutter.

**Card: Society view, 3D scene (flexible width, about 70 percent)**

- Label top left: `SOCIETY VIEW`
- A small expand icon top right that makes this card fill the whole main canvas. Clicking again restores.
- The 3D canvas fills the rest of the card.
- Full 3D specification in Section 15.
- Beneath the canvas, a **house state legend** in one row, Small size: five items, each a 8x8 square followed by a label and a count.
  - `Normal` `--ink-200` · `Shifting now` `--ink-500` · `Drawing hard` `--ink-900` · `Opted out` `--ink-80` with 1px border · `Offline` `--ink-150`
  - Note: none of these are red or green. House states are neutral information, not danger.

**Card: Critical services, never shed (300px wide)**

- Label: `CRITICAL SERVICES — NEVER SHED`
- Five rows, each 34px, separated by 1px `--ink-150`:
  - `Water pumps` · status `RUNNING` · lock icon
  - `Lifts, both towers` · `RUNNING` · lock
  - `Fire systems` · `ARMED` · lock
  - `STP` · `RUNNING` · lock
  - `Tank level` · `78%` · lock
- Status text at Small size, `--green-600` when healthy, `--red-600` when not.
- The lock icon is `--ink-500` and is not interactive. It is there to be seen, not pressed.
- Empty state is impossible here. If data is missing show `NO DATA` in `--amber-600`, never a blank.

### 8.2 Bottom row — the main chart (flexible height, minimum 300px)

This is the analytical heart of the screen. Full specification in Section 14.

---

## 9. COMPARE mode — main canvas

**Top: split screen scrubber (height 300px)**

Two synchronised views of the same instant, divided by a draggable vertical handle.
- Left half: the forecast only controller
- Right half: this system
- Both show the same 3D scene or the same chart, user's choice via a small toggle
- The divider is a 2px `--ink-900` vertical line with a 24x24 grab handle at its midpoint
- Labels sit at the top of each half, Label style: `FORECAST ONLY CONTROLLER` and `THIS SYSTEM`

**Middle: controller comparison table**

Moved here out of the right rail, where it does not belong. Five rows, four columns.

| Controller | Peak kVA | Breaches | Bill |
|---|---|---|---|
| No control | 97.8 | 3 | ₹2.29L |
| Rule based timers | 93.5 | 1 | ₹2.25L |
| Forecast only controller | 87.0 | 0 | ₹2.19L |
| **This system** | **84.4** | **0** | **₹2.17L** |
| Best possible, knows the future | 79.6 | 0 | ₹2.13L |

- The row for this system is highlighted with a 3px left border in `--ink-900` and a `--ink-40` row background.
- Any peak value above the ceiling is `--red-600`. Any breach count above zero is `--red-600`.
- Under the table, one Small line: `Best possible is an optimizer that knows the future perfectly. It is not achievable, it is there to show how much of the available saving we actually captured.`
- Right of that line, a captured figure at Large in `--green-600`: `73% of the achievable saving`

**Bottom: what if drag** (OPTIONAL, build last)

A horizontal timeline of shiftable load blocks. Drag a block to a different hour and the bill figure recomputes within 300ms. If recompute takes longer than that, do not build this.

---

## 10. EVIDENCE mode — main canvas

Four cards in a 2x2 grid, 20px gutters.

**Card 1: Is the forecast honest?**
- The calibration reliability chart: predicted probability on x, observed frequency on y, a diagonal reference line in `--ink-150` dashed, and the measured points in `--ink-900`.
- Coverage figure at Large: `92%` with Small beneath: `Our 90 percent band actually covered 92 percent of intervals. Slightly cautious, which is the safe direction to be wrong in.`
- This card exists specifically to prove there is a real trained model behind the interface. Give it the top left position.

**Card 2: The month at a glance (carpet plot)**
- Hours 00 to 24 on the x axis, days of the month down the y axis, one cell per interval, colour by load using the ink scale only from `--ink-40` to `--ink-900`.
- Two of these side by side inside the card, labelled `BEFORE` and `WITH THIS SYSTEM`.
- One Small caption: `Each row is a day. The dark patches are the evening peaks. Notice they get lighter and flatter on the right.`

**Card 3: The bill, rendered**
- A before and after invoice in the format of a real electricity bill: energy charge broken out by time of day window, demand charge on peak kVA, power factor line, taxes, total.
- Changed lines are marked with a small left tick in `--green-600`.
- This is the last thing shown in a demo. Make it look like a document, not a dashboard: white background, hairline rules, tabular numbers, no cards inside cards.

**Card 4: Who carried the load (fairness)**
- A horizontal bar per household group showing how often each was asked to shift.
- One Small line: `You were asked to shift 3 times this month. The society average is 3.2.` and a fairness index figure.
- Purpose: answer the question "why is it always my flat" with data instead of a shrug.

---

## 11. The right rail (300px, fixed)

In NOW mode the rail holds exactly three things, in this order, top to bottom. It currently holds five and that is the main source of clutter. Two of the current panels move: the controller table goes to COMPARE mode, and the planned actions list moves onto the chart as inline labels.

### 11.1 Auto calibrate (top of the rail)

It goes at the top, above the risk dial, because calibration is the thing that gives the dial its meaning.

**Resting state**
- Label: `FORECAST HEALTH`
- A single line at Large: `Accurate` in `--green-600`, or `Drifting` in `--amber-600`, or `Out of date` in `--red-600`
- Small beneath, `--ink-500`: `The plan has been right 92 times out of 100 over the last 200 intervals.`
- Full width button, height 40px, 1px border, radius 2px: `AUTO CALIBRATE`
  - Border and text `--ink-900` in the accurate state
  - Border and text `--amber-600` in the drifting state
  - Filled `--red-600` with `--paper` text in the out of date state
- Small line under the button, `--ink-350`: `Last calibrated 14:12 today`

**Running state — this matters, do not skip it**

A button that instantly snaps a number looks fake and a judge will ask what it did. Show the work for about 2.4 seconds, four steps at roughly 600ms each, each line replacing the last with a small ticking progress rule beneath:

1. `Reading the last 200 intervals`
2. `Measuring how often the forecast was right`
3. `Searching for the least cautious safe setting`
4. `Applying`

**Result state — a green panel that stays for about 8 seconds, then fades to the resting state**

- Background `--green-100`, 3px left border `--green-600`, radius 0
- Headline, Body 500 weight, `--green-800`: `Calibrated. The plan is accurate again.`
- Three lines at Small, `--ink-700`:
  - `Caution level moved from q85 to q88`
  - `Coverage measured 92%, target is 90%, so the forecast was running slightly wide`
  - `Breach risk 1.2% → 0.4% · costs ₹3 per flat per month`
- The risk dial handle **animates visibly** to its new position while this panel appears. The user must see the cause and the effect together.

**Two hard rules**
- Auto calibrate may only move the caution level. It must never change comfort, the ceiling, or load priorities. Anything that silently changes comfort destroys trust in one press.
- It must always produce a visible before and after. Never a silent success.

### 11.2 Caution level (the risk dial)

- Label: `HOW CAUTIOUS THE PLAN IS`
- Value line at Large, `--ink-900`: `Balanced` and to the right of it at Small in `--ink-350`: `q85`
  - The plain word is the headline. The quantile is the small grey footnote. Never the other way round.
  - Mapping: q50 to q65 `Cheapest`, q66 to q80 `Relaxed`, q81 to q90 `Balanced`, q91 to q99 `Safest`
- Slider: track 4px `--ink-80`, filled portion `--ink-900`, handle 16x16 square `--ink-900`, radius 0
- End labels at Small, `--ink-500`: left `Cheaper, riskier` right `Safer, dearer`
- Three figures in a row beneath, each with a Label above and a Large value:
  - `BILL` `₹2.17L`
  - `BREACHES` `0` — turns `--red-600` if above zero
  - `TOO WARM` `1.2%`
- These three update live while the slider is dragged, not on release. The live update is the entire effect.

### 11.3 Comfort budget

- Label: `COMFORT BUDGET, COMMON AREAS`
- Value at Large: `1.5°C`
- Same slider treatment as above
- **The cost of comfort readout**, Body size, `--ink-700`, updating live while dragging:
  `One more degree of slack in the clubhouse and lobbies is worth about ₹126 per flat per month. Right now you are spending ₹126 per flat to stay this cool.`
- This sentence is the most persuasive thing in the rail. Give it room and do not shorten it into a number.

### 11.4 Rail contents in other modes

- COMPARE mode: caution level and comfort budget stay, auto calibrate is replaced by a small `WHAT CHANGED` panel listing the differences between the two controllers on screen.
- EVIDENCE mode: the rail holds a short `WHAT IS REAL AND WHAT IS SIMULATED` panel. Honest limitations, plainly stated. This scores.

---

## 12. The alert system

### 12.1 Where alerts live

The status strip under the KPI row **is** the alert. Do not add a floating notification for overall system state. The strip is always visible, it never covers anything, and a colour change in a bar the user already reads is far less startling than something appearing over the screen.

Reserve floating toasts for events that have **finished**. Bottom right, 340px wide, stacked upward with 8px gaps, auto dismissing after 5 seconds, with a close affordance.

### 12.2 The three states of the status strip

Full width, 44px tall, no radius, 3px left border in the state colour, 16px horizontal padding, icon at 18px on the left, text vertically centred.

**Safe**
- Background `--green-100`, left border and icon `--green-600`, headline text `--green-800`
- Headline, Body 500: `All good — forecast is accurate`
- Detail on the same line, Body 400, `--ink-700`: `Load is 48.6 kVA under the limit. The plan has been right 92 times out of 100. Nothing for you to do.`
- Right aligned, Small, `--ink-500`: `Checked 6 min ago`

**Watch**
- Background `--amber-100`, left border and icon `--amber-600`, headline `--amber-800`
- Headline: `Load is running higher than expected`
- Detail: `Still safe, but the plan is being surprised more often than usual. Recalibrating takes about 3 seconds.`
- Right aligned: a `RECALIBRATE` button, height 32px, border `--amber-600`, text `--amber-800`

**Danger**
- Background `--red-100`, left border and icon `--red-600`, headline `--red-700`
- Headline: `Recalibrate now — the plan is out of date`
- Detail: `Load came within 4 kVA of the limit twice today. One crossing sets the charge for the whole month.`
- Right aligned: a `RECALIBRATE NOW` button, height 32px, filled `--red-600`, text `--paper`

Transitions between states: cross fade the background over 240ms. No slide, no bounce, no sound. The alarm should feel like the room getting warmer, not like a fire drill.

### 12.3 Triggers

Write these into the code as named conditions so they can be explained on stage.

| State | Condition |
|---|---|
| Safe | Forecast coverage inside the target band over the recent window, and current load more than 20 percent below the ceiling |
| Watch | Coverage slipping outside the target band, **or** current load within 20 percent of the ceiling |
| Danger | Coverage clearly outside the band, **or** a near miss within 5 kVA of the ceiling, **or** an actual breach |

**The framing to use out loud:** red does not mean the building is drawing too much. It means the system is being surprised, and a system that is being surprised should not be trusted to protect the ceiling. That is a more accurate statement than "load is high" and it survives a judge asking what the trigger actually is.

### 12.4 Toasts

Same three colour treatments, 340px wide, radius 2px, 1px border in the state colour, 12px padding.

- After calibration: green, `Calibrated. The plan is accurate again.` with one Small line: `Caution level q85 → q88. Your saving is protected.`
- After a stress scenario is applied: neutral ink, `Heatwave applied. Same day, harder conditions.`
- After override: red, `Returned to the existing schedule. The optimizer is no longer running.`

---

## 13. The resident phone panel

**This is not a separate app.** It is a phone shaped rectangle drawn inside the same page, 320px wide by 620px tall, that slides in from the right edge over the rail when a house is clicked in the 3D scene. Same codebase, same page, no routing. It is deliberately phone shaped so a viewer immediately understands whose screen this is.

Frame: `--paper` background, 1px `--ink-150` border, radius 20px, a 4px `--ink-900` bar at the top centre suggesting a phone speaker. Close button top right, 28x28.

Six blocks, top to bottom. No scrolling if you can avoid it. No navigation inside it.

**1. One sentence about their home**
- Body 500, `--ink-900`: `Your home is running normally.`
- Body 400, `--ink-500`: `Nothing was changed today.`
- That is the whole top of the screen. No chart, no number.

**2. What we never touch**
- Label: `WE NEVER TOUCH THESE`
- Five items in a two column list, Small size, each with a small lock icon: `Lights` `Fans` `TV` `Cooking` `Fridge`
- This is the single most welcoming element in the whole product. It answers the actual fear directly instead of arguing with it. Put it high, never bury it.

**3. What we changed today**
- Label: `WHAT WE CHANGED TODAY`
- Up to three rows, each: a time in Small `--ink-500`, then a sentence in Body `--ink-900`
- Example: `11:20 pm · Your geyser started 20 minutes later than usual. Hot water was ready before 7 am. Saved you about ₹4.`
- Empty state, Body, `--ink-500`: `Nothing changed today. Your home ran exactly as it always does.`
- Every row has a `Why?` link at Small in `--ink-500`. One tap reveals one sentence: `Because electricity costs 26 percent more between 6 and 10 pm.`

**4. Your saving this month**
- Large, `--green-600`: `₹68`
- Small, `--ink-500`: `off your maintenance charge this month`
- Never kWh. Never a percentage.

**5. Snooze**
- Full width button, height 44px, 1px `--ink-900` border: `PAUSE FOR 3 HOURS`
- Small beneath: `Guests coming? Someone unwell? Nothing will be changed until 6 pm.`
- This is the highest value trust feature on the list. Most people who would have quit permanently will snooze instead. Do not cut it.

**6. Opt out, visible and honest**
- A toggle, not buried in a menu: `Take part in load balancing` with the toggle on the right
- Small beneath: `Turn this off any time. Your bill goes back to normal.`
- Below it, one Small line: `You were asked to shift 3 times this month. The society average is 3.2.`

**Undo.** If the system did something in the last fifteen minutes, show a single `UNDO` link at the bottom of block 3. One tap reverses it.

---

## 14. The main chart — full specification

The most important component on the screen after the peak number.

**Frame**
- Card, `--paper`, 1px `--ink-150`
- Label top left: `COMMON SERVICES LOAD · 15 MIN INTERVALS`
- Small next to it, `--ink-500`: `Ordinary weekday, replayed at speed`
- **No legend.** Label each line directly at its right hand end instead, Small size, in the line's own colour. A legend costs a round trip of eye travel every single time.

**Axes**
- Y: kVA, 0 to 125, gridlines every 25 in `--ink-80`, labels Small `--ink-500`
- X: 00:00 to 24:00, tick every 3 hours, labels Small `--ink-500`

**Series, in draw order back to front**

1. **Forecast band (q05 to q95).** Fill `--ink-80` at 100 percent opacity, no stroke. Drawn only ahead of the now marker.
2. **Ghost line — the baseline controller.** 1.5px, `--ink-350`, dashed 4 2. Runs the whole width, simultaneous with the real line. **The gap between this line and the solid one is the saving, made visible at every instant.** This is the cheapest high impact element in the entire build. Do not cut it and do not make it lighter than `--ink-350`, because it will vanish on a projector.
3. **This system.** 2px solid `--ink-900` before the now marker, 2px dashed 6 3 after it.
4. **The demand ceiling.** 2px solid `--red-600`, spanning the full width, with a label sitting just above it on the left at Small in `--red-600`: `DEMAND CEILING 92 kVA`
5. **Now marker.** 1px vertical `--ink-900` with `NOW 14:45` at Small above the plot area.

**Markers**

- **Peak tombstone.** At the interval where the month peak was set, a filled `--red-600` rectangle with `--paper` text at Small: `₹51,313 · 18:45 peak`. Anchored to the point with a 1px leader line. This is the one bad Tuesday story rendered as an object instead of a sentence. It persists across replays.
- **Near miss markers.** Small hollow `--red-600` circles, 6px, at every interval where the ghost line would have breached but the solid line did not. Avoided disasters are invisible by nature and counting them turns your safety argument into a number.
- **Planned action labels.** Moved out of the right rail and onto the chart, sitting on the dashed future portion of the line. Small size, `--ink-500`, with a 1px leader down to the line: `Pump run moved here to catch the solar hour rate` at 15:45, `Clubhouse cooling starts early` at 17:45. Temporal data belongs on a timeline, not in a list.

**Strips beneath the plot**

- **Time of day strip**, 20px tall, full plot width, segmented by tariff window. Each segment is `--ink-80` with the peak windows filled `--ink-200`, and Small centred text: `NIGHT -6%`, `PEAK +26%`, `SOLAR HOURS -20%`, `NORMAL`. Not red. It is information, not danger.
- **Rupees per interval**, 28px tall, bar per interval. Currently this is the least legible thing on the screen. Give it real height, a single Small y label reading `RUPEES PER INTERVAL`, and bars in `--ink-500` with the peak window bars in `--ink-900`. Total at the right end at Large: `₹4,055` with Small: `today, to now`.

**Tooltip — one interaction that replaces four panels**

Hover anywhere on the plot and show a small `--paper` card with 1px `--ink-150` border, following the cursor with 12px offset:

```
18:45
Load            84.4 kVA
Ceiling          92.0 kVA
Price window     Peak, +26%
This interval    ₹412
Doing            Holding the clubhouse 0.8°C warmer
Binding          Demand ceiling
```

That single interaction covers most of what a separate decision replay panel would show, at a fraction of the cost.

---

## 15. The 3D scene

The scene is a data display, not scenery. Every visual channel carries a number.

**Technology.** Three.js. Procedural geometry only. Do not import a single model. Every house is built from boxes and one cone. Mismatched downloaded assets look worse than clean procedural shapes, and a consistent low poly look reads as a deliberate style.

**Layout.** 60 houses in a 10 by 6 grid, a road down the middle, the shared connection node at the entrance. Do not attempt an organic layout, it reads worse from the only camera angle that matters.

**Camera.** Fixed isometric, looking down at about 35 degrees, with orbit enabled so a judge can drag it. Two preset buttons only: `WIDE` and `ONE HOUSE`. No camera path, no flythrough, no first person.

**Shadows disabled entirely.** They are the single largest performance risk in this scene and they carry no information.

**Channels**

| Channel | Carries | How |
|---|---|---|
| Window glow | Household instantaneous load | Unlit window plane, colour lerped from `--ink-200` at low load to a warm off white at high load |
| Sun position and sky tint | Time of day, therefore the tariff window | Directional light on an arc, background lerped. Warm during solar hours, cool during peak. This teaches the tariff structure without a word of text. |
| Car in the driveway | EV state | Small box, subtle pulse when charging, static when idle, absent when the household has no EV |
| Rooftop panels | Solar generation | Dark quad on the roof, brightness scaled by output |
| The shared connection node | The constraint | A visible object at the entrance with a vertical bar beside it filling toward a red line. This is the thing the whole system protects. If it is not visible, the demand charge story has no anchor on screen. |
| Streetlights | Common area load | On at dusk, and they go out during an outage, which is the most legible failure signal available |
| A thin ring at a house base | That household is shifting load right now | Deliberately subtle. The point is that residents barely notice. |
| Animated energy flow | Where power is coming from | Flow lines from the grid node and from rooftops into houses, thickness proportional to magnitude. This is the element that makes people say "oh, I see it now." |

**Archetype variety.** Vary floors between one and two, roof colour across four ink values, and footprint slightly. Ten minutes of work and it is the difference between a model and a place. If all sixty houses are identical the scene reads as a spreadsheet in perspective.

**Click a house** opens the resident phone panel from Section 13.

**Shared time cursor.** Scrubbing the bottom bar moves both the 3D scene and the chart together. They are two views of one moment.

**2D fallback.** Build a 60 tile grid version, same data, same codebase, reachable with one keypress. It takes about 45 minutes and it is what you switch to if the 3D scene is unstable, or when a judge asks a question the perspective view cannot answer.

---

## 16. Data contract

The interface reads a precomputed JSON. No live solver, no network call in the render loop. The renderer never computes anything.

```json
{
  "meta": {
    "society": "Anna Nagar Residency",
    "n_households": 60,
    "ceiling_kva": 92,
    "interval_minutes": 15,
    "scenario": "normal",
    "date": "2026-08-20",
    "tariff": {
      "label": "TN HT",
      "energy_rate": 7.50,
      "demand_charge_per_kva": 608,
      "windows": [
        { "name": "night",  "start": "22:00", "end": "06:00", "multiplier": 0.94 },
        { "name": "solar",  "start": "06:00", "end": "10:00", "multiplier": 0.80 },
        { "name": "normal", "start": "10:00", "end": "18:00", "multiplier": 1.00 },
        { "name": "peak",   "start": "18:00", "end": "22:00", "multiplier": 1.26 }
      ]
    }
  },
  "month": {
    "peak_kva": 84.4,
    "peak_set_at": "2026-08-20T18:45:00",
    "bill_ours": 216924,
    "bill_baseline": 229151,
    "saving_per_flat": 68,
    "coverage_pct": 92,
    "coverage_target_pct": 90,
    "quantile": 85
  },
  "controllers": [
    { "name": "No control", "peak_kva": 97.8, "breaches": 3, "bill": 229151 },
    { "name": "Rule based timers", "peak_kva": 93.5, "breaches": 1, "bill": 225400 },
    { "name": "Forecast only controller", "peak_kva": 87.0, "breaches": 0, "bill": 219200 },
    { "name": "This system", "peak_kva": 84.4, "breaches": 0, "bill": 216924 },
    { "name": "Best possible, knows the future", "peak_kva": 79.6, "breaches": 0, "bill": 213100 }
  ],
  "frames": [
    {
      "t_min": 1125,
      "sun_altitude": 0.18,
      "outdoor_temp_c": 34.2,
      "tariff_window": "peak",
      "load_kva": 84.4,
      "baseline_kva": 91.2,
      "forecast_q05": 78.1,
      "forecast_q95": 88.9,
      "rupees_this_interval": 412,
      "binding_constraint": "demand_ceiling",
      "action_note": "Holding the clubhouse 0.8C warmer",
      "near_miss": true,
      "houses": [
        { "id": 0, "kw": 4.2, "ac_on": true, "ev_state": "charging", "shifting": false }
      ]
    }
  ]
}
```

**Fixture.** If the real file is not ready, hand write one with 6 houses and 30 frames and build against that. Do not wait for the simulation team. Do not change this schema after the first hour.

**Size.** Never load a whole month at per household detail. Three representative days only: normal, heatwave, high EV. Month level figures come from the small summary block above.

**Scenario switching.** The stress buttons load a different precomputed file. Preload all of them at startup so switching is instant. From the viewer's side this is indistinguishable from live computation.

---

## 17. Interaction and motion

- **Transitions:** 240ms, ease out, on colour and opacity only. Nothing slides, nothing bounces.
- **The risk dial and comfort slider update their dependent figures on drag, not on release.** The live update is the whole point of both controls.
- **Hover states:** border goes from `--ink-150` to `--ink-900`. No background change, no lift.
- **Focus:** 2px `--focus` outline with 2px offset, on every interactive element, always visible on keyboard focus.
- **Reduced motion:** respect `prefers-reduced-motion`. Replace the calibration progress animation with a static line that swaps text.

**Presenter mode.** Number keys 1 to 5 trigger the five stress scenarios. Keys Q, W, E switch modes. Space plays and pauses the replay. Nobody should be hunting for a button while a judge watches.

**Presentation zoom.** A single control that scales the whole interface up by 20 percent. The smallest text in this spec is unreadable from three metres, and this gets demoed in a room on a projector.

---

## 18. Copy rules

**Every large piece of text is what a resident would say. Every small grey piece of text is what you would write in a paper.** That is the whole rule, and it gets you jargon free without losing rigour.

| Never write | Write instead |
|---|---|
| Risk the plan is built against, q85 | How cautious the plan is: Balanced (q85 in small grey) |
| Mean forecast MPC | Forecast only controller |
| Perfect foresight oracle | Best possible, knows the future |
| Band covered 92% of last 200 intervals | The plan has been right 92 times out of 100 |
| Comfort out 1.2% | Too warm for 1.2% of the day |
| Curtailed, deferred, load shedding, quota | Moved, waited, later, earlier |

**Banned words in anything a resident sees:** curtailed, deferred, load shedding, quota, optimisation, algorithm, constraint, kWh, kVA.

**Tone rules**
- Never make the user feel watched. `Your AC ran late, so here is what we did` is service. `We noticed your AC ran late` is surveillance. Same fact, opposite feeling.
- Never make the user feel stupid. No exclamation marks. No "simply", "just", or "easy". No congratulating someone for pressing a button.
- Ask, do not announce, for anything touching a household. `Can we start your washing machine at 11 pm instead? It will still be done by morning.` with yes and no buttons.
- Always say what was **not** touched alongside what was.
- Errors say what happened and what to do, in one sentence, with no apology.

**A permanent one line explainer** sits under the header, Small, `--ink-500`, always visible: `We plan against the worst likely load, not the average one, so the monthly peak never gets set by accident.` This is free, and it means the screen explains itself when nobody is standing next to it.

---

## 19. Empty, loading and failure states

Every panel that can be empty needs written copy. No blank boxes, ever.

- Stress panel, nothing triggered: `No avoided breaches on this day yet.`
- Resident panel, nothing changed: `Nothing changed today. Your home ran exactly as it always does.`
- Chart, before data loads: skeleton rules in `--ink-80`, no spinner.
- **Forecast stale, triggered by the sensor drop scenario:** the chart's future portion goes `--ink-350` and a Small label appears on the plot: `Running on last good estimate. Sensor data went stale at 14:00.` A system that displays this instead of freezing looks engineered rather than fragile.
- Solver missed a deadline: `Holding the previous plan. Nothing unsafe happened.`

---

## 20. Accessibility and projector readiness

- Contrast: all text meets 4.5:1 against its background. Check `--ink-350` on `--paper` specifically, because the ghost line and the forecast band carry the core argument and they are the two most likely things to vanish under projector light.
- All interactive elements reachable by keyboard, in a sensible tab order, with visible focus.
- Icons that carry meaning have text labels next to them. No icon only controls except the panel close button, which gets an aria label.
- Do not rely on colour alone. The three alert states differ by icon, by headline text, and by colour.

---

## 21. Screen inventory checklist

Build these, in this order.

**Persistent**
- [ ] Header bar with brand, context, tariff chip, mode switch
- [ ] Permanent one line explainer
- [ ] KPI row, four cards in two visual pairs
- [ ] Status strip with three states
- [ ] Bottom bar: replay scrubber, five stress buttons, override

**NOW mode**
- [ ] 3D society scene with all channels
- [ ] House state legend
- [ ] Critical services panel with locks
- [ ] Main chart with ceiling, ghost line, forecast band, tombstone, near miss markers, planned action labels
- [ ] Time of day strip and rupees per interval strip
- [ ] Chart tooltip
- [ ] Right rail: auto calibrate, caution level, comfort budget

**COMPARE mode**
- [ ] Split screen scrubber
- [ ] Controller comparison table with the oracle row
- [ ] What if drag (optional)

**EVIDENCE mode**
- [ ] Calibration reliability chart
- [ ] Carpet plot, before and after
- [ ] Rendered invoice
- [ ] Fairness view

**Overlays**
- [ ] Resident phone panel, six blocks
- [ ] Toasts, three treatments
- [ ] Tariff panel (opened from the header chip)

**Fallbacks**
- [ ] 2D tile grid, one keypress away
- [ ] Presenter mode key bindings
- [ ] Presentation zoom

---

## 22. If you run out of time

**Never cut:** the peak number, the chart with the red ceiling line, the ghost line, the three state status strip, the stress buttons, the override button, the controller comparison table with the oracle row.

**Cut in this order:**
1. What if drag
2. Carpet plot and fairness view
3. Split screen scrubber
4. 3D fidelity — fall back to the 2D tile grid. A beautiful society with a controller that breaches the ceiling loses to plain rectangles that hold the line.
5. Animated energy flow and archetype variety
6. Presentation zoom
7. The rendered invoice becomes a plain table

**Cut the 3D before you cut the evidence.** The scene earns attention. The table earns the score.

---

## 23. Two things to fix in the source data before the interface ships

- The tariff chip currently shows ₹608 per kVA. Tamil Nadu revises annually and we are past the July revision date. Pull the current order and update the number, because it sits in the header of every screenshot this project will ever produce.
- The header must say 60 flats, matching the simulation. Any mismatch between the header count and the scene will be spotted, and once a judge finds one wrong number they start checking all of them.
