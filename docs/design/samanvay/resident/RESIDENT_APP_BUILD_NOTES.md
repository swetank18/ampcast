# Samanvay — Resident App

**Build notes for `Samanvay Resident.dc.html`**
Design system: Modernist (bound, bundle loaded). Last updated 28 August 2026.

---

## 1. What this is

A single interactive desktop mockup of the resident-facing side of Samanvay — what a flat
owner sees, as distinct from the operator/management console. One Design Component holds
five tabbed screens plus a settings modal, all live: state is real, so clicking through
changes numbers, badges and copy the way the shipped product would.

- **File:** `Samanvay Resident.dc.html`
- **Canvas:** fixed 1280px column, centred, white page on the Modernist `#f3f2f2` ground
- **Persona:** Flat A2 0202, Anna Nagar Residency, Tower A — 3BHK, four residents, no rooftop panels of their own
- **Society:** 60 flats
- **Reference month:** August 2026

### The five screens

| Tab | Shortcut | Purpose |
| --- | --- | --- |
| MY FLAT | `Q` | Notices, status, savings at a glance, the reassurance contract |
| SUGGESTIONS | `W` | Consent queue — accept or decline proposed changes |
| SAVINGS | `E` | Where the money came from, contribution standing, what is unclaimed |
| SOLAR | `R` | Society solar today, and the payback case for their own panels |
| REQUESTS | `T` | Medical emergency, consent tiers, requests |

Plus a **settings modal** (gear, top right) mirroring the tier data and holding quiet
mode, notifications and the opt-out.

---

## 2. Design language

Everything comes from the bound Modernist system, whose stylesheet and bundle are loaded
in the helmet — `.table`, `.input`, `.radio` and `.tag` are the system's own classes, not
local imitations. Archivo throughout, zero corner radius anywhere, 2px rules between
major sections and 1px within them, labels flush left including inside buttons, no
shadows. Structure is carried by alignment and rule weight.

### Palette

| Role | Value | Where |
| --- | --- | --- |
| Ink | `#201e1d` | Primary text, active tab and tier fills, section rules |
| Ground | `#f3f2f2` | Outside the 1280px column; the consent-ask panel |
| Surface | `#ffffff` | The app column and all cards |
| Accent red | `#ec3013` | Medical emergency button, notification badges, focus ring |
| Neutral ramp | `#444141` · `#7d7979` · `#9b9797` · `#d7d3d3` · `#eae9e9` | Body, meta, borders, inert fills |
| Money green | `#15703f` (deep `#0e4b2a`) | Every rupee figure that is a saving; confirmation banners |
| Caution amber | `#a86a05` on `#f6edda` | Paused state; "offered a different time instead" |
| Confirm green | `#15703f` on `#e4efe6` | Normal-running and approval banners |
| Row hover | `#f8f4f4` | Table rows, open accordion rows, highlighted breakdown rows |

### Warm sub-palette (from the shared operator screenshot)

Used only in the isometric flat panel and the solar charts:

| Swatch | Value | Meaning |
| --- | --- | --- |
| Sand | `#efe3d4` → `#e5d2ba` → `#dcc6ab` | The plot |
| Terracotta | `#c25a33` | Roof; in the legend, "your own roof is empty" |
| Slate | `#5d6b7a` · `#7b8794` · `#9aa8b5` | Society solar — roof panel, generation bars, solar bar in the breakdown |
| Cream / stone | `#eae5dd` · `#ded5c8` · `#c9c1b4` · `#dad3c8` | Walls and shaded faces |
| Lamp amber | `#f0b95c` | Lit windows |
| Sage | `#8a9c7a` · `#7d9070` | Trees |
| Warm tint | `#f7f2ea` | Fill behind "we never touch these" |

Slate always means society solar; green always means money saved. The two never mix in
one chart.

### Type scale

- `10.5–11px` / 800 / `.14–.16em`, uppercase — kickers, button labels, tier eyebrows
- `13px` — meta, captions, footnotes, legends
- `14–15px` — secondary body, tier detail
- `16px` — body and table cells
- `17px` / 700 — tier titles
- `20px` / 800 — the REQUESTS section headings ("Make a request", "Your requests")
- `26px` / 800 — the tier numeral
- `28px` / 800 — the live suggestion totals
- `32px` / 800 — secondary metrics
- `40px` / 800 — KPI figures
- `72px` / 800 — the hero savings figure on SAVINGS

### Interaction states

Ink buttons darken to `#000` on hover; outlined buttons take the `#eae9e9` tint or an ink
border. Every interactive element carries the Modernist keyboard ring —
`:focus-visible { outline: 2px solid #ec3013; outline-offset: 2px }`. Table rows tint on
hover. The savings breakdown has a dedicated cross-highlight (§6).

---

## 3. Persistent chrome

### Header (48px, 2px bottom rule)

Brand mark and `SAMANVAY`, a divider, then **Flat A2 0202** with
`Anna Nagar Residency · Tower A`. Right side: five tab pills, then the settings button.

- Tabs are 32px separate boxed pills, 6px apart, each with its shortcut as a dimmed glyph. Active is a solid ink fill, white text.
- **Badges** sit on the pill's top-right corner in accent red: SUGGESTIONS shows the live queue length, REQUESTS shows `1` while a consent ask is pending. Both clear themselves as the queue empties.
- The **settings button** is a bordered ink square that inverts to a black fill on hover.

### Status strip (40px)

One line, always present, 3px left border keyed to meaning. Three mutually exclusive states:

- **Changed** (ink) — "One thing was moved today. Your geyser started 20 minutes later."
- **Normal** (green) — "Your home is running normally. Nothing was changed today."
- **Paused** (amber) — "You have paused participation until 6:00 pm. Nothing will be changed."

Each closes with `Updated 6 min ago`.

### Footer (2px top rule)

**PAUSE FOR 3 HOURS**, becoming **RESUME PARTICIPATION**, with "Guests coming? Someone
unwell? Nothing will be changed until 6:00 pm, and pausing never counts against you."
Right-aligned: "If this system goes offline, your home runs exactly as it always has.
Nothing depends on it."

---

## 4. MY FLAT

### From management

A tinted panel with a 3px ink left border holding the current notice — a heat-wave
heads-up asking residents to run washing machines after 10 pm — with **I WILL TRY** and
**CANNOT THIS TIME**. Answering replaces the buttons with either "Thanks. 34 flats have
said the same." or "Noted, and nothing counts against you for saying no." Two earlier
notices collapse behind a link.

### KPI row — four cards

1. **KEPT OFF YOUR CHARGE** — `₹204 this month`, green, "Checked against the society's actual bill."
2. **SHARE OF SOCIETY SOLAR** — `₹86 of that total`, an 8px slate bar at 42%, "412 units on the society roof."
3. **MOVED IN YOUR HOME** — `1 thing today`, "By 20 minutes. Never more than 40."
4. **YOUR CONTRIBUTION** — `14th of 60 flats`, the band chip, and "Based on how often you take part, not on how much electricity you use."

### The isometric flat panel

A 400px sand panel holding an isometric of **one home only** — theirs. Sand plot in two
tones, cream and stone walls, terracotta roof, a slate panel on the roof, two amber-lit
windows, two shaded, sage trees. Caption: `Tower A · 3BHK · 4 residents`.

Beside it the statement the drawing exists to make legible:

> **This is the only home this app can see.**
> No neighbour's flat, name or usage appears anywhere in here, and nothing about your home is shown to anyone else in the society.

Then three legend rows tying the drawing's colours to live facts — green for running
normally, slate for society solar at 9% (noting the roof panel is the society's), and
terracotta for the empty roof worth ₹1,240 a month.

The drawing is an inline vector sketch, not a rendered image.

### Today

`11:20 pm` — "Your geyser started 20 minutes later than usual. Hot water was ready before
7 am. Saved you about ₹4." with **Why?** and **UNDO** indented under it. Why? expands:

> Because between 6 pm and 10 pm electricity costs 26 percent more, and the society was close to its limit.

### We never touch these

Warm-tinted card, five padlocked items — Lights, Fans, TV, Cooking, Fridge — then the
boundary: "Only your water heater, air conditioning and car charger are ever moved, and
never by more than 40 minutes." with a house-rules link inline.

---

## 5. SUGGESTIONS

### Header and live totals

`WAITING FOR YOU · 4 suggestions` with "Worth ₹342 a month if you take all of them", over
a two-cell figure bar:

- **SAVING NOW, EACH MONTH** — `₹68 from 1 accepted`, green
- **IF YOU ACCEPT EVERYTHING BELOW** — `₹342 a month`, ink

Both are derived from the same arrays as the tables, so accepting moves the left figure up
and the right figure down in the same frame.

### The accordion

One suggestion open at a time. Each collapsed row is a marker square, the headline, the
saving in green in a fixed 130px right-aligned column, and a `+` / `−` in its own centred
24px cell. The open row tints and its marker fills.

Expanded, the left side carries the reasoning; the heater suggestion also shows a
**timeline strip** — a green `SOLAR HOURS −20%` band with a grey "now" bar at 6:00–7:00 am
and an ink "suggested" bar at 7:00–9:00 am. Then: "You can change your mind at any time.
Declining costs you nothing, and your bill stays exactly as it is."

The right rail shows the saving at 32px, **ACCEPT**, and **NO THANKS**.

**"This does not work for me"** opens a structured decline: three radios — "I need hot
water earlier than that" / "I am not usually home then" / "I would rather this appliance
was not touched" — a free-text field, and **SEND AND DECLINE**.

Accepting or declining **auto-opens the next suggestion in the queue**, so the resident
never lands on a collapsed list.

### The five suggestion types

| id | Headline | Worth |
| --- | --- | --- |
| `heater` | Move the water heater to morning solar hours | ₹38 a month |
| `standby` | Something draws 90 watts all night — help find it | ₹64 a month |
| `holiday` | Tell us your away dates and we save the maximum | up to ₹400 |
| `precool` | Cool the flat slightly before 6 pm | ₹118 a month |
| `washing` | Run the washing machine after 10 pm | ₹54 a month |

Each also carries a short `label` — "Water heater moved to solar hours", "Overnight
standby draw traced" — used in the accepted and declined tables so cells stay one phrase.

### Accepted and declined

The accepted table (WHAT / SINCE / SAVED SO FAR / STILL RUNNING) uses the system's
`.table` with an `ACTIVE` `.tag` and a "Turn this off" link per row, closing with
"Everything you have accepted is worth ₹68 a month. That is ₹816 a year."

Declined items collapse behind a count, each keeping its date, forgone value and a
**Reconsider** link, plus: "A suggestion you declined is not sent again for 90 days."

---

## 6. SAVINGS

Opens on `₹204` at 72px in green — "off your share of the maintenance charge, August 2026".

### Where it came from — the cross-highlight

A 32px stacked bar in slate / ink / grey over three explained rows. **Hovering either the
bar segment or its row highlights both**: the segment gets a 2px inset outline, the row
tints and takes a 3px ink left border, and the other two drop to 35–50% opacity. It works
from either direction, driven by one `hoverSlice` value.

- **Your share of society solar** ₹86 — 412 units, apportioned by flat size
- **Suggestions you accepted** ₹68 — running since July
- **Society wide peak control** ₹50 — the society avoided a high peak, so everyone's charge is lower

### Your contribution

Left: a three-segment band strip — Strong 22 / Sometimes 24 / Not yet 14, tinted green /
amber / red at 15% — with a 3px ink marker for this flat, over-hanging the strip top and
bottom. "You are 14th of 60 this month, in the strong group", then: "No other flat is
named or shown. This strip is the shape of the society, and one marker for you."

Right: **HOW TO MOVE UP** — three ruled rows, each with the action, the points, the gain
and a link that navigates. Accept car charging `+8 points` ₹165 a month; share appliance
readings `+4 points` better suggestions; say I will try on the next heads-up `+3 points`.

Footnote: the score counts participation, not savings; it is adjusted for flat size, so a
small home that says yes to everything can outrank a larger one; medical-flagged flats are
not ranked.

### Still on the table

`₹1,278 a month` unclaimed, as three ruled rows with a route each — rooftop solar ₹1,240 →
SOLAR; car charging after 10 pm ₹165 → SUGGESTIONS; one degree of warmth ₹92 →
SUGGESTIONS. Footnoted: "These overlap in places. Taking all three is worth about ₹1,380,
not the exact sum."

### Twelve months

Bar chart, current month outlined, pre-programme months as stubs, with "You have saved
₹1,847 since March." Hideable via a tweak.

Closing note: figures come from the society's bill engine, checked monthly against the
utility bill, within 1 percent last month.

---

## 7. SOLAR

### Society solar

Three metrics — 412 units generated, ₹86 your share, 9% covered — then the **day profile
chart**: 24 slate bars for generation with the flat's typical use drawn over them as a
single continuous SVG polyline (`preserveAspectRatio="none"`, non-scaling 2px stroke).
Axis 12 am → 6 am → 12 pm → 6 pm → 12 am, both series in the legend. Then: "Society panels
only cover common areas and a share of your usage. They do not power your flat directly."

### Your own panels

On a `#eae9e9` field: no panels yet, about 3 kW possible, then a four-cell payback grid on
1px gaps:

| | |
| --- | --- |
| **WOULD GENERATE** 340 units a month | **WOULD SAVE** ₹1,240 a month (green) |
| **COSTS TO INSTALL** ₹1,80,000 | **PAYS BACK IN** 4 years 1 month |

The same day profile is redrawn with a translucent green layer for what their own panels
would cover of the identical day — persuasive precisely because it is the chart they just
read. Then the long-run case (₹14,880 a year after payback, 20-year life), the subsidy
note, and the survey caveat. Actions: **ASK MANAGEMENT ABOUT THIS** / **NOT INTERESTED**.

### Society + personal

One 24px bar splitting ₹86 today from ₹1,240 available: "Today you save ₹86 a month from
society solar. With your own panels that becomes ₹1,326 a month."

---

## 8. REQUESTS

### Medical emergency

A full-width 64px red button — the only field of accent red in the app —
**MEDICAL EMERGENCY — UNINTERRUPTED POWER**, with "Your flat is protected immediately and
management is told. No approval is needed."

Pressing it swaps in a green confirmation: nothing will be moved, the flat is no longer
ranked while the flag is on, and a phone number. Reversible via "This was a mistake,
remove the flag."

### A request from management

A ground-tinted panel asking for appliance-level readings, answered in three columns —
**WHY** (suggestions that fit your routine), **WHAT YOU GET** (about ₹90 a month plus
deadline scheduling), **FOR HOW LONG** (12 months, expires unless renewed) — then
**ALLOW**, **NOT NOW**, and "Never ask again". Closing: "You can withdraw this at any
time, in the same place you granted it. We ask at most once a quarter."

### What we can see about your flat — the tier cards

A 2×2 grid. Each card opens with a header band: a 56px numeral block, the `TIER n`
eyebrow, the title at 17px, and the control on the right.

**Tier state is expressed structurally.** An on tier — which includes 0 and 1, since they
are always on — gets a black-filled numeral with white text, a black card border and a 3px
black top rule. An off tier gets a grey numeral block, grey border and grey top rule, so
the grid reads at a glance.

**Tiers 2 and 3 are labelled buttons, not bare switches:** a 40px bordered control holding
the switch track and the words `ON` or `TURN ON`, black-filled when on, outlined when off.

| Tier | What it is | Control |
| --- | --- | --- |
| **0 — The society meter** | The total for the whole building, every 15 minutes | `ALWAYS ON` |
| **1 — Your flat counts in the total** | Inside the society number, never shown alone | `ALWAYS ON` |
| **2 — Your flat's meter readings** | The flat total every 15 minutes, not appliances | Toggle, on |
| **3 — Appliance level readings** | Water heater, AC and car charger only | Toggle, off |

Each card then carries **WHAT THIS UNLOCKS** as green-ticked lines and **WHAT STAYS
PRIVATE** as prose — with tier 3's privacy block given extra rule weight, because it is
the one that stops adoption. A footer line per card holds the expiry or the consent basis.
Under the grid: "The system works fully at Tier 1 for everyone. Higher tiers buy better
results, never basic function. Nothing stops working if you say no."

Turning tier 2 off drops the headline figure from ₹204 to the ₹198 society average
everywhere and switches tier 3 off with it; granting tier 3 implies tier 2 and clears the
consent ask.

### Make a request

A 20px heading with the subhead "Ask for something you need. Most requests are answered
the same day." Four tiles: **MORE POWER FOR AN EVENING**, **SOMETHING READY BY A TIME**,
**PAUSE MY PARTICIPATION**, **REPORT A PROBLEM** — the selected tile takes an ink border.

Any tile opens one form titled by intent: a date, a free-text window, an
**A little / Normal / A lot** segmented choice, and an optional why field placeheld
"Housewarming, about 40 guests". **SEND REQUEST** returns a green approval — "Approved.
You have Saturday evening from 7 to 11 pm." — with the part that matters: "This did not
use one of your boost days because it fitted inside the society's spare capacity."

### Your requests

A 20px heading with "Three open. You can withdraw anything that has not started.", then a
`.table` showing all three statuses the system produces: **Approved** green,
**Offered 8 pm instead** amber, **Waiting** grey. Withdrawable rows carry a link.

---

## 9. Settings modal

A 560px panel over a 50% ink backdrop. **Closes on backdrop click, on the cross, or on
`Esc`** — clicks inside the panel stop propagating, so every control still works.

Titled "What we can see about your flat", subtitled "You control this. Everything
essential works no matter what you choose." It renders the same four tiers as compact
rows from the same data as the cards, so the two views can never drift. Turning tier 2 off
posts an inline note that savings now show as the society average and the flat is no
longer ranked.

Then **HOW YOUR DATA WAS USED** — "used 4 times this month, all to schedule your water
heater", with "See every use". Under a 2px rule: **Quiet mode** ("Your score freezes, it
does not fall"), **Notifications** as *Only when something matters* / Everything / Nothing,
a house-rules link, and "Stop taking part in load balancing — Your bill goes back to
normal. You can come back any time."

---

## 10. Interactive behaviour

Live in the mockup, not static states:

- **Navigation** — click a pill or press `Q W E R T`; `Esc` closes settings. Key handling is suppressed while typing in a field.
- **Accept a suggestion** → row leaves the queue, the next one auto-opens, the accepted table gains a row, both live totals move, the header badge decrements, and the month figure and breakdown recompute.
- **Decline** → same, and the declined list opens so the decision stays visible and reversible.
- **Structured decline** → three preset reasons plus free text before sending.
- **Notice pledge** → I WILL TRY / CANNOT THIS TIME, each with its own acknowledgement.
- **Savings breakdown hover** → cross-highlights bar and row from either direction.
- **Tier 2 / 3** → labelled toggles; tier 2 off recomputes savings app-wide and disables tier 3; tier 3 on implies tier 2 and clears the consent ask.
- **Consent ask** → ALLOW / NOT NOW / never ask again, each a different end state.
- **Medical flag** → red button to green protected state, removes the contribution rank, reversible.
- **Request tiles** → open one form titled by intent, with a live amount choice; sending returns the approval banner.
- **Pause** → footer label flips, status strip switches to amber.

### Tweaks exposed to the editor

- `contributionBand` — `strong` / `occasional` / `low`, driving the chip, rank and marker
- `statusMode` — `normal` / `changed`
- `showHistory` — show or hide the twelve-month chart

---

## 11. Charts

No chart library. Five figures in CSS and inline SVG:

1. **Suggestion timeline** — absolutely positioned bands: a green solar window, a grey "now" bar, an ink "suggested" bar.
2. **Day profile** — 24 flex bars for generation with usage as one SVG polyline over the top. Reused on SOLAR with a translucent green personal-panel layer.
3. **Savings breakdown** — a 32px stacked bar wired to its legend rows by shared hover state.
4. **Contribution band strip** — three tinted segments sized to the real distribution, with an over-hanging ink marker.
5. **Twelve months** — flex bars from an array, current month outlined.

Generation is sinusoidal around solar noon; usage is a base load plus a morning rise and a
6–10 pm peak, so the charts show the problem the product exists to solve.

---

## 12. How it scales

The logic class holds one state object as the single source of truth. Suggestions,
notices, tiers, request kinds, breakdown slices, and the accepted and declined lists are
all arrays shaped like the spec's JSON. Adding a suggestion type is one object with an
`id`, `label`, `headline`, `why`, `saving` and `rupees` — no markup. Accepting and
declining genuinely move items between arrays, and every total, badge, count and chart
derives from them, so no figure can fall out of step with another.

The tier data feeds both the cards and the settings modal from one definition. Styles are
computed per item in the logic class and passed as whole-value attributes, so a state
change restyles without duplicated markup.

---

## 13. Editorial rules held throughout

- Every number is a rupee amount or a count of minutes — never kWh where money would do.
- Every automated action states its comfort cost before its saving.
- Every decline, toggle-off and pause is stated as free of penalty, in the same place as the action.
- The boundary — lights, fans, TV, cooking, fridge — is repeated on MY FLAT and again in tier 3.
- Contribution is participation, never consumption, and the formula is published on the same screen as the rank.
- Estimates are labelled as estimates; the bill engine's accuracy is disclosed.
- Red appears once as a field, on the medical button. Green means money saved. Slate means society solar.

---

## 14. Deliberate deviations from the spec

- **Chip radius is 0, not 2px.** Modernist forbids rounding anywhere.
- **Notices show one live plus two collapsed**, rather than three expanded — the live one is the only one that needs an answer.
- **Boost days were removed** as a standalone section at the user's request. The mechanic still appears where it is decided: the BOOST DAY USED column in the requests table, and the approval banner explaining why one was not spent.
- **Language was removed** from settings at the user's request. Tamil is no longer offered in the UI.

---

## 15. Open items

- **The isometric flat is a hand-drawn vector sketch.** If the real asset from the operator app exists, it should replace the inline SVG.
- **No mobile layout.** Desktop only at a fixed 1280px, though this is the screen most likely to be used on a phone.
- **Single flat, single month.** No multi-month drill-down, no appliance detail view, no notification inbox.
- **"See every use", "Turn this off", "Reconsider", "Withdraw" and the house rules are links without destinations.**
- **The layout validator reports a 9px overlap on the REQUESTS badge.** That is the badge deliberately over-hanging the pill corner, not a defect.
