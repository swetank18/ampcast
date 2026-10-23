# SAMANVAY — Resident app

**Execution plan. A separate interface for the flat owner.**

Same design system as the operator app. Same palette, same type scale, same radius, same tone. A resident who walks past the lobby display and then opens their own screen should recognise it as the same product.

This is a **new surface**, not a tab inside the operator app. It has its own five tabs.

---

## 0. The five decisions that shape everything below

Read these before building anything. Every screen follows from them.

**1. This person is not an operator.** They do not know what kVA is, they will not read a chart, and they open this maybe twice a month. Every screen has to make sense to someone who has never seen it before and will not see it again for weeks.

**2. Motivation comes from money, and money comes from evidence.** Do not use badges, streaks, points or leaderboards. Show rupees, show what produced them, and show what is still on the table. That is enough. Anything gamified ages badly and looks patronising in a residential society.

**3. Suggestions are offers, never commands.** The operator suggests, the resident decides. Every suggestion has an accept and a decline, and declining costs nothing punitive. Say so on the screen.

**4. Solar is the biggest number this person will ever see here, and they do not have it yet.** Our demo resident benefits from society solar only. The personal solar tab exists mainly to show them what they are missing, honestly, with payback maths they can check.

**5. Never make them feel watched.** Show what the system did for them, not what it noticed about them. Same fact, opposite feeling.

---

## 1. Who this resident is

Use these details consistently across every screen in the build.

- **Flat:** A2 0202
- **Owner:** shown as `Flat A2 0202` in the header. A name field exists but is not displayed to anyone except the operator
- **Tower A, 3BHK, 4 residents**
- **Solar:** society solar only. No rooftop panels of their own
- **Consent tier:** currently tier 2, per flat readings shared
- **Not medical flagged**
- **Boost days:** 2 of 6 used this year

---

## 2. Tabs

Five tabs, same segmented control treatment as the operator app, same position in the header. Keyboard shortcuts in brackets.

| Tab | Label | What it holds |
|---|---|---|
| 1 | `MY FLAT` `[Q]` | Home. Status, what changed today, this month's saving |
| 2 | `SUGGESTIONS` `[W]` | Operator suggestions, each with an accept or decline |
| 3 | `SAVINGS` `[E]` | The money tab. Where every rupee came from |
| 4 | `SOLAR` `[R]` | Society solar now, personal solar as an opportunity |
| 5 | `REQUESTS` `[T]` | Ask for something. Medical emergency button lives here |

**Consent lives in a settings overlay**, reachable from a gear icon in the header, not as a tab. It is important but it is not something a resident visits weekly.

**Badge rules**
- `SUGGESTIONS` shows a count badge when new suggestions are waiting: 16px circle, `--red-600`, `--paper` text
- `REQUESTS` shows a badge only when the operator has sent a counter offer awaiting a reply
- No other tab ever carries a badge

---

## 3. Persistent chrome

Present on every tab. Build this first.

### 3.1 Header (48px)

Left to right:
- Brand mark, 10x10 `--ink-900` square, then `SAMANVAY` in Label style
- 1px vertical divider `--ink-150`
- Body, `--ink-900`: `Flat A2 0202`
- Small, `--ink-500`: `Anna Nagar Residency · Tower A`
- Spacer
- The five tab segmented control
- A gear icon, 20px, `--ink-500`, opening the settings overlay

### 3.2 Status line (40px)

One sentence, full width, same three state treatment as the operator status strip but with resident facing copy.

| State | Background | Copy |
|---|---|---|
| Normal | `--green-100`, 3px left border `--green-600` | `Your home is running normally. Nothing was changed today.` |
| Something changed | `--ink-40`, 3px left border `--ink-900` | `One thing was moved today. Your geyser started 20 minutes later.` |
| Paused | `--amber-100`, 3px left border `--amber-600` | `You have paused participation until 6:00 pm. Nothing will be changed.` |

Right aligned, Small, `--ink-500`: `Updated 6 min ago`

**Never show a danger state to a resident.** A society at risk of a breach is the operator's problem. Telling a resident their building is in trouble creates anxiety they cannot act on. The only red on a resident screen is the medical emergency button.

### 3.3 Footer (56px)

- Left: `PAUSE FOR 3 HOURS` button, `--paper`, 1px `--ink-900`, height 40px. Small beneath: `Guests coming? Someone unwell? Nothing will be changed until 6:00 pm.`
- Right: Small, `--ink-500`: `If this system goes offline, your home runs exactly as it always has. Nothing depends on it.`

The pause button is the highest value trust feature in the whole app. Most residents who would quit permanently will pause instead. It goes on every screen, not buried in a menu.

---

## 4. Tab 1 — MY FLAT

The default. Answers three questions in order: is everything fine, what happened, and what did I get.

### 4.1 Hero block

Full width card, `--paper`, 1px `--ink-150`, 24px padding.

Two columns.

**Left, flexible — what happened today**

- Small label: `TODAY`
- Body 500, `--ink-900`: `One thing was moved.`
- Then up to three rows, each 12px apart:
  - Time at Small `--ink-500`: `11:20 pm`
  - Sentence at Body `--ink-900`: `Your geyser started 20 minutes later than usual. Hot water was ready before 7 am.`
  - Saving at Small `--green-600`: `Saved you about ₹4.`
  - A `Why?` link at Small `--ink-500`, expanding to one sentence: `Because between 6 pm and 10 pm electricity costs 26 percent more, and the society was close to its limit.`
- **Empty state:** `Nothing changed today. Your home ran exactly as it always does.`
- An `UNDO` link appears at the bottom of any row from the last 15 minutes

**Right, 280px — this month**

- Small label: `SAVED THIS MONTH`
- Display size, `--green-600`: `₹204`
- Small, `--ink-500`: `off your maintenance charge`
- 1px divider
- Two rows, Small label left, Body right:
  - `From the society` `₹204`
  - `From your own solar` `₹0`
- Small, `--ink-500`: `You do not have rooftop panels yet. See what they would be worth.` with a link into the SOLAR tab

### 4.2 What we never touch

A quiet reassurance card. This is the single most welcoming element in the app and it goes high, not buried.

- Small label: `WE NEVER TOUCH THESE`
- Five items in a row, each a small lock icon at 14px `--ink-500` above a Small label:
  `Lights` · `Fans` · `TV` · `Cooking` · `Fridge`
- One Body line, `--ink-700`: `Only your water heater, air conditioning and car charger are ever moved, and never by more than 40 minutes.`
- A link at Small: `Read the house rules` opening the house rules overlay

### 4.3 Your part in the society

Three figures in a row, each a Small label above a Large number.

- `TIMES ASKED TO SHIFT` `3` with Small: `The society average is 3.2.`
- `BOOST DAYS LEFT` `4 of 6` with Small: `Free extra power for evenings you need it.`
- `YOUR SHARE OF SOCIETY SOLAR` `₹86` with Small: `Included in your ₹204.`

**Aggregate comparison only.** Never `You participate less than 40 percent of your neighbours`. Never a rank, never a list of other flats.

---

## 5. Tab 2 — SUGGESTIONS

The operator, or the system on the operator's behalf, proposes something specific to this flat. The resident accepts or declines.

### 5.1 Section A — Waiting for you

Label: `WAITING FOR YOU` with the count at Small.

One card per suggestion. `--paper`, 1px `--ink-150`, radius 2px, 20px padding, full width, 12px gaps.

**Card anatomy, two columns.**

**Left, flexible — the suggestion**

- Small label: `SUGGESTED BY MANAGEMENT` with the date at Small `--ink-500` on the right
- Body 500, `--ink-900`: `Let us move your water heater to the morning solar hours.`
- Body, `--ink-700`: `Right now it runs at 6:00 am. If we run it between 7:00 and 9:00 am instead, you get the same hot water at a cheaper rate. You would not notice any difference.`
- A **before and after strip**, 260 x 40px, same visual language as the operator counter offer timeline:
  - Two rows labelled `Now` and `Suggested` at Small `--ink-500`
  - Current window in `--ink-350`, proposed window in `--ink-900`
  - The tariff bands behind, with the solar window in a lighter fill and a small `SOLAR HOURS −20%` label
- Small, `--ink-500`: `You can change your mind at any time.`

**Right, 260px — the money and the buttons**

This is the motivating half. Lead with the number.

- Small label: `YOU WOULD SAVE`
- Large, `--green-600`: `₹38`
- Small, `--ink-500`: `per month, about ₹456 a year`
- 12px gap
- Two buttons, stacked, full width, 40px:
  - `ACCEPT` filled `--ink-900`, `--paper` text
  - `NO THANKS` `--paper`, 1px `--ink-150`, `--ink-500` text
- Small, `--ink-350`: `Declining costs you nothing. Your bill stays exactly as it is.`

**The decline button is deliberately the quieter of the two, but the decline copy is warm.** The resident must never feel that saying no has a penalty attached, because a resident who feels cornered opts out entirely.

### 5.2 Suggestion types to support

| Type | Example headline | Typical saving |
|---|---|---|
| `shift_load` | `Let us move your water heater to the morning solar hours.` | ₹38 per month |
| `shift_ev` | `Let us charge your car after 10 pm instead of at 7 pm.` | ₹165 per month |
| `comfort_trade` | `Allow one degree of extra warmth on hot afternoons.` | ₹92 per month |
| `deadline_setup` | `Tell us when you need hot water and we will work around it.` | Enables better scheduling |
| `solar_install` | `Rooftop panels on your balcony would cover most of your daytime use.` | ₹1,240 per month |
| `consent_upgrade` | `Share appliance level readings so we can suggest things that fit your routine.` | Unlocks better suggestions |

**Solar suggestions do not live here in full.** Show a short teaser card that links into the SOLAR tab, where the full payback case lives. Do not try to fit a payback analysis into a suggestion card.

### 5.3 Section B — Things you accepted

A quiet table below Section A. This is where motivation actually compounds, because it shows accepted suggestions still earning.

| Column | Content |
|---|---|
| What | `Water heater moved to solar hours` |
| Since | `12 Jul` |
| Saved so far | `₹68` in `--green-600` |
| Still running | A small `ACTIVE` tag, or `STOPPED` in `--ink-500` |

Each row has a quiet `Turn this off` link at Small `--ink-500`. Reversibility visible in the same place as the result is what makes people willing to accept the next one.

**Footer line beneath the table**, Body, `--ink-700`:
`Everything you have accepted is worth ₹106 a month. That is ₹1,272 a year.`

### 5.4 Section C — Things you declined

Collapsed by default, behind a `Show 2 declined` link at Small.

Shows what was declined, when, and what it would have been worth. No pressure copy, no re asking. One line only:
`Water heater to solar hours · declined 2 Aug · would have been ₹38 a month`

A quiet `Reconsider` link. That is all.

**Rate limit, enforced in code:** the same suggestion cannot be re sent within 90 days of a decline. Nagging is how you lose a resident.

### 5.5 Empty state

`Nothing waiting for you. We will let you know when we find something worth suggesting.`

---

## 6. Tab 3 — SAVINGS

The money tab. Its job is to prove the number on the home screen is real, and to show what is still on the table.

### 6.1 Hero

Centred block, generous whitespace.

- Small label: `SAVED THIS MONTH`
- Display size, `--green-600`: `₹204`
- Body, `--ink-500`: `off your share of the maintenance charge, August 2026`

### 6.2 Where it came from

A horizontal stacked bar, 32px tall, full width, with a legend beneath. Segments in ink values, with the total in green above.

| Source | Amount | Segment fill |
|---|---|---|
| Your share of society solar | ₹86 | `--ink-350` |
| Suggestions you accepted | ₹68 | `--ink-900` |
| Society wide peak control | ₹50 | `--ink-500` |
| Your own solar | ₹0 | not shown when zero |

Below the bar, one row per source: a colour square, the label at Body, the amount at Body right aligned, and a Small explanation line.

- `Your share of society solar` · `₹86` · Small: `The society's rooftop panels generated 412 units this month. Your share is based on your flat's size.`
- `Suggestions you accepted` · `₹68` · Small: `Two suggestions, running since July. See the Suggestions tab.`
- `Society wide peak control` · `₹50` · Small: `The society avoided setting a high peak this month. Everyone's maintenance charge is lower as a result.`

### 6.3 Still on the table

The motivating section. Same visual weight as the section above, so it does not feel like an upsell buried at the bottom.

- Small label: `STILL ON THE TABLE`
- Large, `--ink-900`: `₹1,278 a month`
- Body, `--ink-700`: `Here is what you are not yet claiming.`

Three rows, each with the opportunity at Body, the value at Body in `--ink-900`, and a link:

- `Rooftop solar on your balcony` · `₹1,240` · `See the numbers` → SOLAR tab
- `Move your car charging to after 10 pm` · `₹165` · `Review this` → SUGGESTIONS tab
- `One degree of extra warmth on hot afternoons` · `₹92` · `Review this` → SUGGESTIONS tab

**Honesty rule:** these are not additive with each other in every case, and the copy must not imply they are. Add one Small line: `These overlap in places. Taking all three is worth about ₹1,380, not the exact sum.`

Getting this right is worth more than the extra hundred rupees of headline. A resident who catches you inflating a number never trusts the app again.

### 6.4 Twelve month history

A simple bar chart, one bar per month, `--ink-900` fill, height proportional to saving. Current month highlighted with a 2px `--ink-900` outline.

Beneath, one Body line: `You have saved ₹1,847 since March.`

### 6.5 The honest line

At the bottom of the tab, Small, `--ink-500`, always present:

`These figures come from the society's bill engine and are checked against the actual utility bill every month. Last month we were within 1 percent.`

This single sentence does more for credibility than the entire rest of the tab.

---

## 7. Tab 4 — SOLAR

Two halves. What you already get, and what you could get.

### 7.1 Top half — Society solar

- Small label: `SOCIETY SOLAR`
- Body 500, `--ink-900`: `The society's rooftop panels are working for you already.`
- Three figures in a row, Small label above Large number:
  - `GENERATED THIS MONTH` `412 units`
  - `YOUR SHARE` `₹86`
  - `COVERED` `9%` with Small: `of your flat's electricity`
- A simple day profile chart, 100px tall: a curve showing society solar generation across a day in `--ink-350` fill, with your flat's typical consumption line over it in `--ink-900`
- One Body line, `--ink-700`: `Society panels only cover common areas and a share of your usage. They do not power your flat directly.`

### 7.2 Bottom half — Personal solar

The resident does not have this yet. The tab's real job is to show what it is worth, honestly enough that they can check it.

- Small label: `YOUR OWN PANELS`
- A `--ink-40` background block, 24px padding, no border
- Body 500, `--ink-900`: `You do not have rooftop panels yet.`
- Body, `--ink-700`: `Management estimates your balcony and roof share could hold about 3 kW of panels.`

**The numbers block** — four figures in a 2x2 grid, each Small label above Large number:

- `WOULD GENERATE` `340 units a month`
- `WOULD SAVE` `₹1,240 a month` in `--green-600`
- `COSTS TO INSTALL` `₹1,80,000`
- `PAYS BACK IN` `4 years 1 month`

**The comparison chart.** The same day profile as above, with a third layer showing what personal panels would add, in `--green-600` at low opacity. The resident sees their own consumption curve getting covered.

**Below it, three Body lines:**
- `After payback, that is roughly ₹14,880 a year for the remaining life of the panels, which is usually 20 years or more.`
- `Subsidies under the national rooftop scheme may reduce the install cost. Management can tell you what currently applies.`
- Small, `--ink-500`: `These figures are an estimate based on your flat's usage and typical panel output in Chennai. A proper site survey is needed before committing.`

**That last line is not optional.** Never present an install estimate as a quote.

**Buttons**, two side by side:
- `ASK MANAGEMENT ABOUT THIS` filled `--ink-900`. Creates a request of type `problem` addressed to the operator with the subject prefilled
- `NOT INTERESTED` `--paper`, 1px `--ink-150`. Hides the personal solar prompt for 12 months and stops any solar suggestion appearing in the Suggestions tab

### 7.3 The combined view

At the very bottom, a single line that makes the point of the tab:

- Small label: `SOCIETY + PERSONAL`
- Body, `--ink-700`: `Today you save ₹86 a month from society solar. With your own panels that becomes ₹1,326 a month.`
- A two segment bar showing today against the potential, `--ink-350` for society solar and `--green-600` for personal, with the current state clearly the smaller one

---

## 8. Tab 5 — REQUESTS

The resident side of the operator's Requests tab. Same object, same rules, opposite direction.

### 8.1 Medical emergency button

**Top of the tab, above everything else.** Full width, 64px tall, filled `--red-600`, `--paper` text, Label style at 12.5px:

`MEDICAL EMERGENCY — UNINTERRUPTED POWER`

Beneath, Small, `--ink-500`:
`Press this if someone in your home needs uninterrupted power for medical equipment. Your flat is protected immediately and management is told. No approval is needed.`

**Behaviour**
- One press, no confirmation dialogue. Speed matters more than accidental presses here
- The flat is immediately flagged, its load is never shifted, and its requests are always auto approved
- A green confirmation state replaces the button within one second: `--green-100` background, 3px `--green-600` left border, Body 500 `--green-800`: `Your flat is protected. Management has been told.` with Small: `Nothing in your home will be moved. Call the society office on 044 XXXX XXXX if you need anything else.`
- A quiet `This was a mistake, remove the flag` link at Small `--ink-500`, which requires a confirmation, because removing protection is the dangerous direction

**This is the only red element on any resident screen.** That is what makes it findable in a hurry.

### 8.2 Make a request

Four large tiles in a 2x2 grid, each 120px tall, `--paper`, 1px `--ink-150`, hover border `--ink-900`:

- `MORE POWER FOR AN EVENING` with Small: `Guests, a function, a celebration`
- `SOMETHING READY BY A TIME` with Small: `Hot water by 7 am, car charged by 8 am`
- `PAUSE MY PARTICIPATION` with Small: `For a day, a week, or longer`
- `REPORT A PROBLEM` with Small: `Something is not working`

Clicking a tile opens a short form, inline, never a modal.

**The form — four fields maximum**

- **When.** A date picker and a time range. Default to this coming weekend evening for the extra power type
- **How much.** Three large tiles: `A little` · `Normal` · `A lot`. Never kW, never a slider with numbers
- **Why.** One line of free text, optional, with placeholder: `Housewarming, about 40 guests`
- Submit button: `SEND REQUEST` filled `--ink-900`

**Immediately after submitting**, show the outcome inline. Most requests are answered in seconds because the system auto approves anything that fits.

- Fits: `--green-100` block, `Approved. You have Saturday evening from 7 to 11 pm.` with Small: `This did not use one of your boost days because it fitted inside the society's spare capacity.`
- Needs a decision: `--ink-40` block, `Sent to management. Most requests are answered within a few minutes.`
- Auto declined with a counter offer: `--amber-100` block, `Saturday evening is already full. We can offer 8 pm to midnight instead, which costs the society nothing.` with `ACCEPT 8 PM` and `NO THANKS` buttons

### 8.3 Your requests

A table of past and pending requests.

| Column | Content |
|---|---|
| What | `More power for an evening` |
| When | `Sat 29 Aug, 7 to 11 pm` |
| Status | `Approved` in `--green-600`, `Waiting` in `--ink-500`, `Offered 8 pm instead` in `--amber-600`, `Declined` in `--ink-500` |
| Boost day used | `Yes` or `No` |

Pending rows carry a `Withdraw` link.

### 8.4 Boost days

A small block at the bottom of the tab.

- Small label: `YOUR BOOST DAYS`
- Six squares in a row, 24px each. Used ones filled `--ink-900`, remaining ones `--paper` with 1px `--ink-150`
- Body, `--ink-700`: `You have 4 of 6 left this year.`
- Small, `--ink-500`: `Boost days are free evenings of extra power. They are only used when your request would otherwise cost the society money. Requests that fit inside spare capacity never use one.`

That last sentence matters. Without it, residents assume every request costs them a boost day and stop asking.

---

## 9. Settings overlay — consent

Reachable from the gear icon. A centred panel, 560px wide, `--paper`, 1px `--ink-150`, radius 2px. Backdrop `--ink-900` at 40 percent.

### 9.1 The tiers, explained in plain words

Do not present this as a legal notice. Present it as four switches with honest consequences.

Header: Body 500, `--ink-900`: `What we can see about your flat`
Then Body, `--ink-700`: `You control this. Everything essential works no matter what you choose.`

Four rows, each 1px `--ink-150` separated, 16px vertical padding. Each row: a switch on the right, and on the left a title, a plain description, and a consequence line.

**Tier 0 — The society meter**
- Switch: absent. Show a small `ALWAYS ON` tag in `--ink-500` instead
- Body, `--ink-700`: `The total for the whole society. This is the shared bill everyone pays into.`
- Small, `--ink-500`: `Nothing personal to you. It is on for everyone.`

**Tier 1 — Your flat counts in the total**
- Switch: absent. `ALWAYS ON` tag
- Body: `Your usage is included in the society total, but never shown on its own.`
- Small: `Nobody, including management, can see your flat separately at this level.`

**Tier 2 — Your flat's meter readings**
- Switch, currently on
- Body: `The total for your flat, every 15 minutes. Not what individual appliances are doing.`
- Small, `--green-600`: `This is what lets us show your ₹204 separately instead of a society average.`
- Small, `--ink-500`: `Turn it off and you still save the same money. You would just see the society average instead of your own figure.`

**Tier 3 — Appliance level readings**
- Switch, currently off
- Body: `Which appliances are running and when. Your water heater, air conditioning and car charger only.`
- Small: `This lets us suggest things that fit your actual routine instead of a general pattern.`
- Small, `--ink-500`: `Never your lights, television, cooking or anything else.`

### 9.2 Rules the build must enforce

- **Default is off** for tiers 2 and 3. Nothing on until the resident switches it on
- **The switch that grants is the switch that withdraws.** Same place, one tap, never a separate flow
- **Withdrawing shows a plain confirmation**, not a warning: `Turned off. Your savings will now show as a society average. You can turn this back on any time.`
- **Consent expires after 12 months.** Show the date under each active switch at Small `--ink-350`: `Expires 26 Aug 2027`
- **Renewal is one tap**, offered 30 days before expiry as a suggestion card
- **Never ask again** must be honoured permanently, per tier
- **One consent ask per flat per quarter**, enforced by the system
- **Deletion means deletion.** Under the tier 2 switch: `Turning this off removes your past readings, it does not just hide them.`

### 9.3 How your data was used

Below the tiers, inside the same overlay.

- Small label: `HOW YOUR DATA WAS USED`
- Body, `--ink-700`: `Your readings were used 4 times this month, all to schedule your water heater.`
- A link at Small, `--ink-500`: `See every use` expanding to a plain list, one line per use with a date, a purpose, and a download link

Usage shown in the same place as the switch is what turns a consent screen from a formality into something a person believes.

### 9.4 Also in settings

- **Quiet mode.** A switch with a duration picker. While on: no suggestions, no requests for consent, no broadcasts. No reason field, and no reason asked. Someone unwell, a bereavement, exam season
- **Language.** English and Tamil
- **Notifications.** One question, three options: `Only when something matters` (default) · `Everything` · `Nothing`
- **House rules.** A link opening the ratified rules document
- **Leave.** `Stop taking part in load balancing` with Small: `Your bill goes back to normal. You can come back any time.`

---

## 10. Copy rules

**The large text is what a neighbour would say. The small grey text is where any precision goes.**

**Banned words on every resident screen:** kVA, kWh, curtail, curtailed, defer, deferred, load shedding, quota, optimisation, optimizer, algorithm, constraint, quantile, forecast band, peak demand charge.

**Say instead:** units, moved, waited, later, earlier, spare capacity, the limit, the plan.

| Never write | Write instead |
|---|---|
| Your load was curtailed at 19:15 | Your geyser waited 20 minutes |
| Peak demand charge avoided | The society avoided setting a high peak |
| 2.4 kWh shifted | About ₹4 saved |
| Optimisation accepted | Suggestion accepted |
| Consent granted for tier 2 processing | You let us see your flat's meter readings |

**Tone**
- No exclamation marks anywhere
- No `simply`, `just`, or `easy`
- Never congratulate someone for pressing a button
- Ask, never announce, for anything that touches their home
- Always name what was **not** touched alongside what was
- Errors say what happened and what to do, in one sentence, with no apology

---

## 11. Dignity rules — enforce in code

- **Never show another resident's flat, name or behaviour.** Not in a comparison, not in a list, not in a chart
- **Comparison is aggregate only:** `The society average is 3.2.` Never a rank, never a percentile
- **No streaks, scores, badges, levels or leaderboards.** Gamifying home comfort ages badly and reads as patronising in a residential society
- **Never show a society danger state to a resident.** They cannot act on it and it creates anxiety
- **Never re ask a declined suggestion within 90 days**
- **The free text reason on a request is seen by the operator only.** Never in an export, a broadcast, or anything shareable

---

## 12. Visual rules

Everything inherits the operator design system. The differences:

- **More whitespace.** A resident opens this twice a month. Density that helps an operator hurts them. Roughly 1.4 times the padding of the operator app throughout
- **Larger base type.** Body goes from 15px to 16px, Small from 12.5px to 13px. Everything else unchanged
- **Green is the dominant accent**, because almost everything on these screens is money saved. Amber appears only on paused state and counter offers
- **Red appears exactly once**, on the medical emergency button. Nowhere else, on any tab, ever. That is what makes it findable in a hurry
- **Touch targets minimum 44px**, because this will be opened on a phone even though the demo runs on desktop
- **One idea per card.** If a card needs a scroll, it is two cards

---

## 13. Data shape

```json
{
  "flat": {
    "id": "A2 0202",
    "tower": "A",
    "size": "3BHK",
    "residents": 4,
    "medical_flag": false,
    "consent_tier": 2,
    "consent_expires": "2027-08-26",
    "paused_until": null,
    "opted_out": false,
    "boost_days": { "used": 2, "total": 6 }
  },
  "savings": {
    "month": 204,
    "society_solar_share": 86,
    "accepted_suggestions": 68,
    "society_peak_control": 50,
    "personal_solar": 0,
    "twelve_month": [0, 0, 118, 142, 176, 190, 198, 204],
    "on_the_table": 1278,
    "on_the_table_realistic": 1380
  },
  "solar": {
    "society_units_month": 412,
    "society_share_rupees": 86,
    "society_coverage_pct": 9,
    "personal_installed": false,
    "personal_estimate": {
      "capacity_kw": 3.0,
      "units_month": 340,
      "saving_month": 1240,
      "install_cost": 180000,
      "payback_months": 49
    }
  },
  "suggestions": [
    {
      "id": "sug_2026_0221",
      "type": "shift_load",
      "headline": "Let us move your water heater to the morning solar hours.",
      "detail": "Right now it runs at 6:00 am...",
      "saving_month": 38,
      "current_window": { "start": "06:00", "end": "07:00" },
      "proposed_window": { "start": "07:00", "end": "09:00" },
      "status": "waiting",
      "sent_at": "2026-08-24T10:00:00",
      "decided_at": null
    }
  ],
  "today": {
    "changes": [
      {
        "time": "23:20",
        "sentence": "Your geyser started 20 minutes later than usual. Hot water was ready before 7 am.",
        "saving": 4,
        "why": "Because between 6 pm and 10 pm electricity costs 26 percent more, and the society was close to its limit.",
        "undoable_until": "2026-08-20T23:35:00"
      }
    ]
  }
}
```

The request object is unchanged from the operator spec. Reuse it.

---

## 14. Build order

**First — the app does not exist without these**
- [ ] Header, status line, footer with the pause button
- [ ] MY FLAT hero with today's changes and the month figure
- [ ] SUGGESTIONS section A: the card with the saving and accept or decline
- [ ] REQUESTS: the medical emergency button and the four request tiles
- [ ] Tab switching and keyboard shortcuts

**Second**
- [ ] SAVINGS: hero, where it came from, still on the table
- [ ] SOLAR: society half and personal half with the payback figures
- [ ] SUGGESTIONS section B, things you accepted, with the running total
- [ ] Request form with inline outcome, including the auto approve path
- [ ] What we never touch card

**Third**
- [ ] Consent settings overlay with the four tiers
- [ ] How your data was used
- [ ] Boost days block
- [ ] Twelve month history
- [ ] SUGGESTIONS section C, declined, collapsed
- [ ] Quiet mode, language, notifications

**Never cut**
- The medical emergency button
- The saving figure on every suggestion card
- Accept and decline on every suggestion, with the no penalty line
- The pause button in the footer
- The dignity rules in Section 11

**Cut first**
- Twelve month history
- The day profile charts on the SOLAR tab
- Language toggle
- Declined section

---

## 15. Do not build

- Message threading, attachments, read receipts, typing indicators
- Any chat surface. Requests and suggestions are structured objects, not conversation
- Push notification preference screens beyond the single three option question
- A dashboard for the resident. They do not want one and will not read it
- Any comparison against a named or identifiable neighbour
- Any badge, streak, score, level or leaderboard

---

## 16. The demo sequence

1. Open on MY FLAT. One sentence says the home is running normally, ₹204 saved this month.
2. Go to SUGGESTIONS. One card: move the water heater to solar hours, ₹38 a month. Press accept. The month figure updates.
3. Go to SOLAR. Society solar is already earning ₹86. Personal panels would earn ₹1,240 and pay back in four years. The bar shows how small today's benefit is against what is available.
4. Go to REQUESTS. Press the medical emergency button. The flat is protected in one second, no approval needed.
5. Open settings. Turn off tier 2. The app keeps working, and the savings figure switches to a society average.

Step 5 is the one that lands with judges. It proves the system does not need to know everything about everyone in order to work.
