# SAMANVAY — Resident app, round 3

**Build spec. Additions to `Samanvay Resident.dc.html`.**

Three things go in: a contribution rank with colour bands, the consent tiers presented as benefit cards, and a wider set of operator suggestions. Plus tab styling brought in line with the operator console.

Everything inherits the existing design system. No new palette, no new type scale, no new radius.

---

## 0. Read this first

**1. Rank is computed from participation, not from rupees saved.**

Ranking on absolute money saved would rank flats by size and by what appliances they own. A 4BHK with a car charger has far more available to save than a 2BHK retired couple who already use very little. The couple would sit at the bottom forever while doing everything asked of them.

The score is built from **what the resident chose to do**, normalised for flat size. Someone in the smallest flat who accepts every suggestion can rank first. The rupee figure is still displayed everywhere, it is just not what produces the rank.

**2. The band is context, never a verdict.**

On the operator side the colour band sits on a request card as a small chip. It must never fill the card, never colour the border, and never override the cost arithmetic. The operator approves or declines based on whether the request fits under the ceiling. The band tells them who they are dealing with, nothing more.

**3. Red already means something in this product.**

Red is the ceiling, a breach, and the medical button. Adding a third meaning weakens all three. So the band never renders as a card background or border. It is a small chip with a coloured dot, and that is the only place band colour appears.

---

## 1. The contribution score

### 1.1 What goes into it

A 0 to 100 score, recomputed monthly, rolling over the last three months so one bad month does not tank someone.

| Input | Weight | What it measures |
|---|---|---|
| Suggestions accepted | 35 | Accepted, still running, out of those offered |
| Shifts honoured | 25 | Load actually moved when the system asked, out of times asked |
| Broadcast follow through | 20 | Said `I will try` and load actually dropped |
| Requests that fit | 10 | Asked inside spare capacity rather than at peak |
| Consent tier | 10 | Tier 2 or 3 shared, because it lets the system help them properly |

**Normalisation.** Every input is a ratio, never an absolute. `Suggestions accepted` is a percentage of suggestions offered, not a count. This is what stops flat size and appliance ownership leaking into the rank.

**Neutral start.** A new flat begins at the society median, not at zero. Never punish someone for being new.

**Exemptions, enforced in code**
- Medical flagged flats are **excluded from ranking entirely**. No score, no band, no rank position. Their card on the operator side shows the `MEDICAL` badge in the band's place
- Flats in quiet mode keep their last score frozen and are not penalised
- Flats on holiday mode are not penalised for the period

### 1.2 The three bands

| Band | Score | Chip colour | Label shown |
|---|---|---|---|
| Strong | 70 to 100 | `--green-600` | `Strong contributor` |
| Occasional | 40 to 69 | `--amber-600` | `Sometimes takes part` |
| Low | 0 to 39 | `--red-600` | `Not taking part yet` |

**Labels matter as much as colours.** `Not taking part yet` is forward looking. Anything reading as a judgement of the person, rather than of their participation so far, will read badly in a residential society.

### 1.3 The chip

The only visual form the band ever takes.

- Inline element, height 22px, padding 3px 8px, radius 2px
- 1px border in the band colour, `--paper` background
- A 6px filled dot in the band colour, then the label at Small in the band colour
- Never a filled background, never a card border, never a row highlight

---

## 2. Resident side — where rank appears

### 2.1 MY FLAT — a new card in the row

Add a fifth card to the KPI row, or place it directly beneath if five will not fit. `--paper`, 1px `--ink-150`, same treatment as the other four.

- Kicker: `YOUR CONTRIBUTION`
- Figure at 40px / 800: `14th`
- Beside it at Small `--ink-500`: `of 60 flats`
- The band chip
- Small, `--ink-500`: `Based on how often you take part, not on how much electricity you use.`

**That last line is not optional.** Without it a resident assumes a low rank means they are wasteful, which is a different accusation entirely and one they will resent.

### 2.2 A CONTRIBUTION section on SAVINGS

Place it below `Where it came from`, above `Still on the table`.

**Block 1 — where you sit**

- Kicker: `WHERE YOU SIT`
- A horizontal band strip, 32px tall, full width, split into three segments sized by how many flats are in each band
  - Strong segment in `--green-600` at low opacity, Occasional in `--amber-600`, Low in `--red-600`, all at around 15 percent opacity so it reads as a background
  - A 3px `--ink-900` vertical marker showing where this flat sits
- Beneath, three counts at Small: `Strong 22` · `Sometimes 24` · `Not yet 14`
- One Body line: `You are 14th of 60 this month, in the strong group.`

**No names. No other flats. No list.** The strip shows the shape of the society, and one marker for the reader.

**Block 2 — how to move up**

The motivating half. Three rows, each with an action at Body, the score gain at Small in `--ink-500`, and the money at Body in `--green-600`, plus a link.

- `Accept the car charging suggestion` · `+8 points` · `₹165 a month` · `Review this`
- `Share appliance readings` · `+4 points` · `Better suggestions` · `Open settings`
- `Say I will try on the next heads up` · `+3 points` · `Helps everyone` · —

**Block 3 — what it means**

One quiet paragraph, Small, `--ink-500`:

`Your contribution score is based on how often you take part, not on how much you save. It is adjusted for the size of your flat, so a smaller home that says yes to everything can rank above a larger one. Medical flagged flats are not ranked at all.`

Publishing the formula is what makes a rank acceptable rather than resented.

### 2.3 What is never shown to a resident

- Any other flat's rank, score, band, name or number
- A full ordered list of the society
- Their own rank history as a falling line, which reads as a scolding. Show the current position only

---

## 3. Operator side — band on request cards

### 3.1 Where it goes

On every request card in `NEEDS YOUR DECISION`, in **column one**, directly beneath the tower and flat size line:

```
A2 1204
Tower A · 3BHK · 4 residents
[● Strong contributor]        ← the chip

REQUESTED FOR
Saturday 29 Aug
7:00 pm to 11:00 pm
```

On the `APPROVED AUTOMATICALLY` table, add a `CONTRIBUTION` column, 150px, holding just the coloured dot and the rank number: `● 14th`. No label, to keep the table quiet.

On a cluster card, the chip appears on each member row.

### 3.2 Rules the build must enforce

- **The band never changes the arithmetic.** The rupee figure and the kVA numbers are identical regardless of band
- **The band never disables a button.** Every request keeps approve, counter offer and decline
- **Medical flagged flats show the `MEDICAL` badge in the chip's place**, never a band
- **Never sort the queue by band.** Sort stays by requested date. A filter chip for band is acceptable, sorting is not, because it buries requests from the people the system most needs to bring in
- **Never show a band on a `problem` type request.** Someone reporting a fault is not being scored

### 3.3 The hover line

Hovering the chip shows a small tooltip with the reasoning, so the operator understands what they are looking at:

`Strong contributor. Accepted 4 of 5 suggestions, honoured 12 of 13 shifts. Adjusted for flat size.`

For a low band flat:

`Not taking part yet. Declined 3 of 3 suggestions. This does not affect whether their request should be approved.`

That last sentence is the important one. It is written into the tooltip so the operator reads it every single time.

### 3.4 A rail panel

Add to the Requests tab rail, below `THIS MONTH`:

- Kicker: `CONTRIBUTION ACROSS THE SOCIETY`
- The same three segment band strip, without a personal marker
- Three counts: `Strong 22` · `Sometimes 24` · `Not yet 14`
- Body, `--ink-700`: `14 flats have not taken part yet. A heads up broadcast to that group usually brings a few in.`
- Button, `--paper`, 1px `--ink-900`: `MESSAGE THE NOT YET GROUP`

This turns the rank from a scoring exercise into an operator action, which is the only reason to build it. It opens the broadcast composer with the audience preset. **The composer must show a count, never a list of flats.**

---

## 4. Consent tiers as benefit cards

Move the tiers out of a settings list and present them as four cards the resident can actually read. Keep the switches in settings as well, both must work.

### 4.1 Placement

A new section on the **REQUESTS** tab, above the make a request tiles, and mirrored inside the settings overlay.

Kicker: `WHAT WE CAN SEE ABOUT YOUR FLAT`
Body, `--ink-700`: `You control this. Everything essential works no matter what you choose.`

### 4.2 The four cards

A 2x2 grid, each card `--paper`, 1px `--ink-150`, 20px padding. Each card carries: a tier number, a title, one line of what it is, a `WHAT THIS UNLOCKS` block, a `WHAT STAYS PRIVATE` block, and the control.

---

**Tier 0 — The society meter**

- State tag, top right: `ALWAYS ON` in `--ink-500`, 1px `--ink-150` border
- What it is: `The total for the whole building, every 15 minutes.`
- `WHAT THIS UNLOCKS` — `The whole system. Peak control, the ceiling, and the ₹12,227 the society saved this month.`
- `WHAT STAYS PRIVATE` — `Nothing about your flat is in this. It is one number for 60 homes.`
- Footer, Small `--ink-500`: `No consent needed. This is the shared bill everyone pays into.`

---

**Tier 1 — Your flat counts in the total**

- State tag: `ALWAYS ON`
- What it is: `Your usage is inside the society number, never shown on its own.`
- `WHAT THIS UNLOCKS` — `Your fair share of the society saving. You get the full ₹198 society average at this tier.`
- `WHAT STAYS PRIVATE` — `Nobody, including management, can pull your flat out of the total at this level.`
- Footer: `Implied by living here. There is nothing to switch.`

---

**Tier 2 — Your flat's meter readings**

- Switch, top right. Currently **on**
- What it is: `The total for your flat, every 15 minutes. Not what individual appliances are doing.`
- `WHAT THIS UNLOCKS`, three lines with a small tick each:
  - `Your own figure. ₹204 instead of the ₹198 society average.`
  - `Requests priced for your flat, so more of them fit for free.`
  - `Your contribution rank.`
- `WHAT STAYS PRIVATE` — `Which appliances you run, when you are home, how many people live here. None of that is visible at this tier.`
- Footer, Small `--ink-350`: `Expires 26 Aug 2027. Turning this off removes your past readings, it does not just hide them.`

---

**Tier 3 — Appliance level readings**

- Switch, top right. Currently **off**
- What it is: `Your water heater, air conditioning and car charger only.`
- `WHAT THIS UNLOCKS`, three lines:
  - `Suggestions built around your actual routine instead of a general pattern.`
  - `Deadline scheduling. Tell us hot water by 7 am and we work around it.`
  - `A warning if something is running that should not be.`
- `WHAT STAYS PRIVATE`, and this block gets extra weight here: `Never your lights, television, cooking, fridge or anything else. Only those three appliances, and only when they are on.`
- Footer: `Worth about ₹90 a month in better suggestions, based on similar flats.`

---

### 4.3 The line under all four

Body, `--ink-700`, full width beneath the grid:

`The system works fully at Tier 1 for everyone. Higher tiers buy better results, never basic function. Nothing stops working if you say no.`

**This is the most important sentence in the consent design.** A product that breaks without personal data is a product that ends up coercing people into giving it. Say it plainly and make it true.

### 4.4 The inbound consent ask

When management sends a consent request, it lands in the resident's REQUESTS tab as a card above the tier grid.

- `--ink-40` background, 3px `--ink-900` left border
- Kicker: `A REQUEST FROM MANAGEMENT`
- Body 500: `Can we see which appliances are running?`
- Body: `Your water heater, air conditioning and car charger only. Nothing else.`
- `WHY` — `So we can suggest changes that fit your routine instead of a general pattern.`
- `WHAT YOU GET` — `About ₹90 a month in better suggestions, and deadline scheduling.`
- `FOR HOW LONG` — `12 months. It expires unless you renew it.`
- Three buttons: `ALLOW` filled `--ink-900` · `NOT NOW` outlined · `NEVER ASK AGAIN` quiet
- Small `--ink-350`: `You can withdraw this at any time, in the same place you granted it.`

**Rate limit, enforced in code:** one ask per flat per quarter. `NEVER ASK AGAIN` is permanent, per tier.

---

## 5. More operator suggestions

Widen the suggestion set so the SUGGESTIONS tab has real variety. Each card keeps the existing anatomy: headline, plain explanation, before and after strip where relevant, saving figure in `--green-600`, accept and decline.

| Type | Headline | Saving |
|---|---|---|
| `shift_water_heater` | `Let us move your water heater to the morning solar hours.` | ₹38 a month |
| `shift_ev` | `Let us charge your car after 10 pm instead of at 7 pm.` | ₹165 a month |
| `comfort_trade` | `Allow one degree of extra warmth on hot afternoons.` | ₹92 a month |
| `deadline_setup` | `Tell us when you need hot water and we will work around it.` | Better scheduling |
| `shift_washing` | `Run your washing machine after 10 pm on weekdays.` | ₹54 a month |
| `pump_timer` | `Your overhead tank fills at 7 pm. Moving it to 2 pm costs less.` | ₹31 a month |
| `ac_precool` | `Let us cool your flat slightly before 6 pm so the AC works less during peak hours.` | ₹118 a month |
| `standby_audit` | `Something in your flat draws 90 watts all night. We can help you find it.` | ₹64 a month |
| `festival_planning` | `Diwali is in six weeks. Tell us now and we will hold capacity for you.` | Avoids a boost day |
| `holiday_mode` | `Going away? Tell us the dates and we will save you the most we ever can.` | Up to ₹400 |
| `solar_install` | `Rooftop panels on your balcony would cover most of your daytime use.` | ₹1,240 a month |
| `consent_upgrade` | `Share appliance readings so suggestions fit your actual routine.` | ₹90 a month |

**Two of these are worth building even if others get cut.**

- **`standby_audit`** is the only suggestion that saves the resident money without asking them to change any behaviour at all. It is the easiest yes in the entire app and it makes the system feel like it is on their side
- **`holiday_mode`** is the opposite of pause. The system gets full freedom, the resident saves more than in any other month, and nobody has to be persuaded of anything

### 5.1 A third option on every suggestion card

Accept and decline are binary, so the operator never learns why something did not land. Add a quiet third link beneath the two buttons, at Small `--ink-500`:

`This does not work for me`

Clicking it expands three preset reasons, radio style, plus an optional line of text:
- `I need hot water earlier than that`
- `I am not usually home then`
- `I would rather this appliance was not touched`

Sending it declines the suggestion **and** sends the reason to the operator, who can issue a revised one. Structured, not a chat.

**Rate limit:** the same suggestion cannot be re sent within 90 days of a decline, regardless of reason given.

---

## 6. Notices and the I will try button

The operator can send broadcasts and the resident app currently has nowhere to show them.

**Placement:** a notices block on MY FLAT, below the status strip, above the KPI row. Shows the most recent three.

Each notice: a date at Small `--ink-500`, the message at Body `--ink-900`, and where the operator asked for something, two buttons.

- `I WILL TRY` filled `--ink-900`, height 36px
- `CANNOT THIS TIME` outlined, quiet

After pressing `I WILL TRY`, the notice shows a green line: `Thanks. 34 flats have said the same.`

**Why this is worth building.** It converts a broadcast from a one way announcement into a measurable commitment. The operator gets a count they can feed into the forecast, and the resident feels asked rather than told. It also feeds the contribution score, and following through is a stronger signal than any other input.

**Track follow through honestly.** If they said `I will try` and load actually dropped, that counts. If they said it and nothing changed, it does not count against them, it simply does not count for them. Never punish an intention.

---

## 7. Tab styling to match the operator console

The operator console renders tabs as separate boxed pills with the active one a solid ink fill and white text. Match it exactly.

- Each tab is its own box, 1px `--ink-150` border, radius 2px, height 32px, padding 0 14px, 6px gap between them
- Label at Label style, `--ink-900`
- Keyboard shortcut glyph inside each pill, at 10px in `--ink-350`, right of the label
- **Active tab:** solid `--ink-900` fill, `--paper` text, shortcut glyph at 40 percent opacity white
- **Hover on inactive:** border to `--ink-900`, no fill change
- **Badge** on SUGGESTIONS and REQUESTS: 16px circle, `--red-600` fill, `--paper` text at 10.5px, sitting on the pill's top right corner and overlapping the border slightly

The gear icon sits after the last pill, 20px, `--ink-500`, hover `--ink-900`.

Same 48px header height, same 2px bottom rule, same brand mark treatment as the operator console.

---

## 8. Colour, unchanged from the operator console

Restated so nothing drifts.

```
--ink-900  #201e1d   primary text, active tab fill, section rules
--ink-500  #7d7979   secondary text
--ink-350  #9b9797   meta, footnotes
--ink-150  #d7d3d3   borders
--ink-80   #eae9e9   inert fills
--ink-40   #f3f2f2   page ground
--paper    #ffffff   surfaces

--green-600  #15703f  money saved, strong band, confirmations
--green-100  #e4efe6  confirmation backgrounds
--amber-600  #a86a05  paused, counter offers, occasional band
--amber-100  #f6edda  caution backgrounds
--red-600    #ec3013  medical button, low band chip, ceiling and breach
```

**Red budget for the resident app: two places.** The medical emergency button, and the low band chip. Nowhere else, on any tab.

The society solar slate palette and the isometric warm palette stay exactly as built.

---

## 9. Data shape

```json
{
  "contribution": {
    "score": 78,
    "band": "strong",
    "rank": 14,
    "of": 60,
    "excluded": false,
    "exclusion_reason": null,
    "inputs": {
      "suggestions_accepted": { "n": 4, "of": 5 },
      "shifts_honoured": { "n": 12, "of": 13 },
      "broadcast_follow_through": { "n": 3, "of": 4 },
      "requests_that_fit": { "n": 2, "of": 2 },
      "consent_tier": 2
    },
    "society_bands": { "strong": 22, "occasional": 24, "low": 14 },
    "next_actions": [
      { "label": "Accept the car charging suggestion", "points": 8, "rupees": 165, "link": "suggestions" },
      { "label": "Share appliance readings", "points": 4, "rupees": null, "link": "settings" },
      { "label": "Say I will try on the next heads up", "points": 3, "rupees": null, "link": null }
    ]
  },
  "notices": [
    {
      "id": "bc_2026_0219",
      "date": "2026-08-26",
      "message": "Tomorrow is forecast at 41 degrees. If you can run washing machines after 10 pm, we will avoid a peak that costs everyone.",
      "asks_commitment": true,
      "response": null,
      "society_pledges": 34
    }
  ],
  "consent": {
    "tier": 2,
    "expires": "2027-08-26",
    "tier3_offered": true,
    "tier3_estimated_value": 90,
    "never_ask": []
  }
}
```

The request and suggestion objects are unchanged. Add `decline_reason` to the suggestion object.

---

## 10. Guardrails — enforce in code, not design

- **Never show another flat's rank, score, band, name or number to a resident**
- **Never show a full ordered list of the society to anyone**, resident or operator
- **Never sort the operator queue by band.** Filter is fine, sort is not
- **Medical flagged flats are excluded from ranking entirely.** No score, no band, no position
- **Quiet mode and holiday mode freeze the score.** No penalty for either
- **The band never changes the arithmetic on a request card, and never disables a button**
- **Never punish an unfulfilled `I will try`.** It just does not count for them
- **Publish the formula.** A rank people cannot understand is a rank they will resent
- **No streaks, no levels, no badges, no points balance shown as a currency.** The score is a percentage of participation, shown as a rank and a band, and nothing more

---

## 11. Build order

**First**
- [ ] Tab pills restyled to match the operator console
- [ ] The band chip component
- [ ] Contribution card on MY FLAT
- [ ] Band chip on operator request cards, with the hover tooltip
- [ ] The four consent tier cards with unlocks and stays private blocks

**Second**
- [ ] Contribution section on SAVINGS: where you sit, how to move up, what it means
- [ ] Notices block on MY FLAT with the `I WILL TRY` button
- [ ] The four new suggestion types: `standby_audit`, `holiday_mode`, `ac_precool`, `shift_washing`
- [ ] Third option on suggestion cards, `This does not work for me`
- [ ] Inbound consent ask card in the REQUESTS tab

**Third**
- [ ] Contribution rail panel on the operator Requests tab, with `MESSAGE THE NOT YET GROUP`
- [ ] Contribution column on the auto approved table
- [ ] Remaining suggestion types
- [ ] Follow through tracking on pledges

**Never cut**
- The medical exclusion from ranking
- The line saying rank is based on participation, not on how much electricity you use
- The tooltip sentence saying the band should not affect the decision
- The line saying the system works fully at Tier 1

---

## 12. Demo sequence

1. **Resident, MY FLAT.** ₹204 saved, and a contribution card reading `14th of 60` with a green `Strong contributor` chip. Point at the line saying it is based on participation, not on usage.
2. **SAVINGS.** The band strip shows 22 strong, 24 sometimes, 14 not yet, with their marker. Three concrete actions to move up, each with a rupee figure.
3. **REQUESTS.** The four consent tier cards. Read the tier 3 `WHAT STAYS PRIVATE` block out loud: never your lights, television, cooking or fridge.
4. **Switch to the operator console, REQUESTS tab.** The same flat's request card now carries the same green chip. Hover it. The tooltip ends with the line saying this should not affect the decision.
5. **Rail panel.** 14 flats have not taken part yet. Press `MESSAGE THE NOT YET GROUP`. The composer opens with a count and no names.

Step 5 is the payoff. The rank exists so the operator can bring people in, not so anyone gets shamed, and the composer showing a count rather than a list is what proves it.
