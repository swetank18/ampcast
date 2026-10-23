# SAMANVAY — Operator console, change spec

**Changes to the existing operator console. Not a rebuild.**

Six changes. Three are cosmetic or structural, three exist because the resident app now sends things the operator console has nowhere to receive.

Do not touch anything not named in this document.

---

## 1. Token unification — do this first

The resident app is bound to the Modernist design system. The operator console was built against a different set. Right now the two apps will not read as one product when shown back to back, which they will be.

**Modernist wins.** It is already bound in the resident build and the operator console is close to it already. Move the operator console onto these exact values.

### 1.1 Palette

```
--ink          #201e1d   primary text, active tab fill, section rules, chart primary line
--ink-700      #444141   secondary headings
--ink-500      #7d7979   secondary text, axis labels
--ink-350      #9b9797   ghost line, meta, footnotes
--ink-150      #d7d3d3   all borders and hairlines
--ink-80       #eae9e9   inert fills, track backgrounds
--ground       #f3f2f2   page background
--paper        #ffffff   card surfaces
--row-hover    #f8f4f4   table row hover

--red          #ec3013   the ceiling, breaches, tombstone, override button, low band chip, focus ring
--green        #15703f   money saved, safe state, strong band
--green-deep   #0e4b2a   text on green tint
--green-tint   #e4efe6   safe banner background
--amber        #a86a05   watch state, counter offers, occasional band
--amber-tint   #f6edda   watch banner background
```

The warm sub palette used in the 3D scene — sand, terracotta, slate, cream, lamp amber, sage — stays exactly as built. **Slate always means society solar. Green always means money saved.** The two never appear in the same chart.

### 1.2 Structure

- **Zero corner radius everywhere.** No exceptions. Cards, buttons, chips, tags, badges, toasts, modals. Modernist forbids rounding
- **Archivo throughout**, replacing whatever face is currently loaded
- **2px rules between major sections, 1px within them**
- **No shadows, no floating surfaces.** Structure comes from alignment and rule weight only
- **Labels flush left, including inside buttons**
- **Focus ring:** `:focus-visible { outline: 2px solid #ec3013; outline-offset: 2px }` on every interactive element

### 1.3 What this changes in practice

- The contribution band chip goes to **radius 0**
- Every card, button and tag in the console loses its 2px radius
- The demand ceiling line becomes `#ec3013`
- Money figures become `#15703f`
- The override button becomes `#ec3013`

### 1.4 One thing to watch

Red now does five jobs on the operator side: the ceiling line, breach figures, the tombstone, the override button, and the low band chip. That is more load than red carries in the resident app, where it appears once.

Keep it manageable by holding the chip rule already specified: **the band chip is an outline with a dot, never a filled background, never a card border, never a row highlight.** If red still feels crowded after the retheme, the thing to drop is the chip's red, not the ceiling's.

---

## 2. One status authority

The status strip and the Forecast health rail panel currently say the same sentence: `The plan has been right 92 times out of 100.` Two places claiming the same fact means neither is authoritative, and if they ever disagree the whole screen loses credibility.

**Split them by job.**

**The status strip owns the verdict.** Unchanged:
`All good — forecast is accurate · Load is 48.6 kVA under the limit. The plan has been right 92 times out of 100. Nothing for you to do.`

**The Forecast health panel owns the action.** Remove the duplicated sentence. It becomes:

- Kicker: `FORECAST HEALTH`
- The word `Accurate` at large size in `--green`
- **Delete** the line `The plan has been right 92 times out of 100.`
- Replace with: `Last checked against the last 200 intervals.`
- `AUTO CALIBRATE` button, unchanged
- `Last calibrated 14:12 today`, unchanged

Same rule for the other two states. The strip says what is happening, the panel says what you can do about it. Neither repeats the other's sentence.

**Also remove** any remaining coverage chip from the header. The strip is the single home for system state.

---

## 3. Undo toasts, 5 seconds

**Remove every confirmation dialogue from the console.** Undo replaces them. A confirmation asks a question before the fact; undo lets the operator move fast and fix a mistake after it. For a queue of thirty decisions, the second is far better.

**Toast treatment**

- Bottom right, 340px wide, stacked upward with 8px gaps
- `--paper` background, 1px border in the state colour, **radius 0**
- Body text at 16px, an `UNDO` link at the right in `--ink`
- A 2px progress rule along the bottom edge, `--ink-350`, draining left to right over **5 seconds**
- The toast dismisses itself when the rule empties

**Copy per action**

| Action | Border | Message |
|---|---|---|
| Approve | `--ink-150` | `Approved. A2 1204 has their Saturday evening.` |
| Decline | `--ink-150` | `Declined. B1 0402 has been told.` |
| Stagger both | `--green` | `Both approved, staggered. Saturday peaks at 90.8 kVA.` |
| Counter offer sent | `--ink-150` | `Offer sent to B1 0402.` |
| Broadcast sent | `--green` | `Sent to 14 flats.` |
| Override | `--red` | `Returned to the existing schedule. The optimizer is no longer running.` |

**Behaviour**

- Undo reverses the decision, returns the card to the queue in its original position, and posts a brief `Restored.` toast
- After 5 seconds the action is final and enters the audit log
- **Never offer undo after the window closes.** An undo that sometimes works is worse than none
- The override toast is the one exception worth noting: undo restores optimizer control, so keep the same 5 seconds and the same behaviour. Do not add a confirmation dialogue to the override button under any circumstances

---

## 4. Decline reasons inbox

The resident app now sends a structured decline: one of three preset reasons plus optional free text. Nothing on the operator side receives it.

**Placement.** A new section in the REQUESTS tab canvas, below `COMING UP`.

- Kicker: `WHAT RESIDENTS TOLD US`
- Subhead at 13px `--ink-500`: `Why suggestions were turned down. Use it to send a better one.`

**The aggregate line, first and most prominent**

This is the actually valuable output. One sentence above the table, at 16px `--ink`:

`3 of 5 declines this month said they need hot water earlier than we suggested.`

That tells the operator to change the default, which is worth more than any individual row.

**The table**, using the system `.table` class

| Column | Width | Content |
|---|---|---|
| Flat | 120px | `B2 0207` |
| Suggestion | flexible | `Move water heater to solar hours` |
| Reason | 240px | `I need hot water earlier than that` |
| In their words | flexible | Free text, truncated with a tooltip, `--ink-500`. Empty is common and fine |
| When | 100px | `3 days ago`, `--ink-350` |

Each row carries a quiet `SEND A REVISED SUGGESTION` link that opens the suggestion composer prefilled with that flat and that suggestion type.

**Rules**

- **The free text is visible here and nowhere else.** Never in an export, a broadcast, the audit log's shareable form, or any report
- **Never re send the same suggestion within 90 days of a decline**, regardless of what reason was given. Enforce it in code, not in the operator's judgement
- Empty state: `No declines this month.`

---

## 5. Pledge counts

The resident sees `Thanks. 34 flats have said the same.` after pressing `I WILL TRY`. The operator has nowhere to see that number.

### 5.1 Extend the existing compliance line

The `APPROVED AUTOMATICALLY` section already carries a compliance row. Widen it to include the pledge, so the operator sees intention and outcome in one sentence:

`Yesterday's broadcast went to 60 flats. 34 said they would try. Evening load dropped 6.2 kVA against the forecast.`

Three numbers in one line: reach, intention, result. That progression is the whole evidence that the advisory model works.

### 5.2 A live rail panel while a broadcast is open

Add to the REQUESTS rail, directly beneath `SEND A BROADCAST`, appearing only while a broadcast is awaiting responses.

- Kicker: `LAST BROADCAST`
- 13px `--ink-500`: `Sent 2 hours ago to 60 flats`
- Two figures side by side, each a kicker above a 32px number:
  - `WILL TRY` `34`
  - `CANNOT` `8`
- A thin three segment bar showing will try, cannot, and no response yet
- 13px `--ink-500`: `18 have not answered.`
- Once the evening passes, add: `Load dropped 6.2 kVA against the forecast.`

### 5.3 Rules

- **Counts only, never names.** No list of who pledged and no list of who did not
- **An unfulfilled pledge is never held against a flat.** It simply does not count toward their contribution score. Never a broken promise indicator, never a follow up asking why
- The pledge count is a forecast input. It should be visible to the controller, not just decorative

---

## 6. Consent tiers are nested, not independent

The resident app now enforces: **tier 3 implies tier 2**, and **turning tier 2 off turns tier 3 off with it**. The operator's consent coverage panel currently treats the tiers as four independent buckets, which will produce numbers that do not reconcile.

### 6.1 Fix the coverage bar

The bar must show **the highest tier each flat has granted**, so the segments are exclusive and sum correctly.

- Kicker: `CONSENT COVERAGE`
- Large: `47 of 60`
- 13px `--ink-500`: `flats share per flat readings or more. The rest count in the society total only.`
- The bar, labelled explicitly as highest tier held:
  - `Tier 1 only` `13`
  - `Tier 2` `32`
  - `Tier 3` `15`
- **Add the clarifying line**, 13px `--ink-350`: `Tier 3 includes Tier 2. Segments show the highest tier each flat has granted, so they add to 60.`

Without that line, an operator adding 32 and 15 will think 47 flats are at tier 2 exactly, and the numbers will look wrong.

### 6.2 Cascade on withdrawal

When a flat turns tier 2 off:
- Tier 3 turns off with it, automatically
- Both the tier 2 and tier 3 counts recompute
- That flat moves to the `Tier 1 only` segment
- The flat drops out of contribution ranking, since ranking needs tier 2. Reflect that in the band distribution counts too

### 6.3 Targeting options for the consent ask

The `ASK FOR CONSENT` button must offer audiences that match the nesting:

- `Flats at Tier 1 only` — 13 flats. Asking for tier 2
- `Flats at Tier 2 but not Tier 3` — 32 flats. Asking for tier 3
- Never an option to ask everyone, because that would ask tier 3 flats for something they already granted

**Rate limit, enforced by the system:** one ask per flat per quarter. Show the last asked date. `NEVER ASK AGAIN` is permanent and per tier, and those flats are excluded from the audience count silently — never shown as a refused list.

---

## 7. Medical badge consistency

A medical flagged flat is excluded from contribution ranking entirely on the resident side. The operator side must be consistent everywhere the band appears.

**Everywhere the band chip would render, show a `MEDICAL` badge in its place instead:**

- Request card, column one, beneath the tower and flat size line
- The `CONTRIBUTION` column of the `APPROVED AUTOMATICALLY` table
- Each member row of a cluster card

**Badge treatment:** ink filled, `--paper` text, 10.5px at 800 weight with `.14em` tracking, radius 0, padding 3px 8px. Deliberately different from the band chip's outline treatment, so it never reads as a fourth band.

**The distribution counts must reconcile.** With medical flats excluded, the three band counts no longer sum to 60. Add a line beneath the band strip, 13px `--ink-350`:

`58 flats ranked. 2 medical flagged flats are not ranked.`

**Hover tooltip on the badge:**
`Medical flagged. Always approved, never counted against their allowance, load never shifted, and not ranked.`

---

## 8. Two wording corrections

**8.1 Boost days.** The standalone boost days section was removed from the resident app. The mechanic still exists, and it still appears to residents in the `BOOST DAY USED` column of their requests table and in the approval banner explaining why one was not spent.

Keep the operator flexibility budget rail panel. Change the framing so it describes a system rule the operator observes, not something residents manage:

`Every flat has 6 boost days a year. A day is only spent when granting a request would cost the society money. Requests that fit inside spare capacity never use one.`

The distribution bar and the `4 flats have used their full allowance` line stay. Still no list of which flats.

**8.2 Tamil.** The language option was removed from the resident app. Remove any language selector from the broadcast composer. Broadcasts go out in English only.

---

## 9. Build order

**First**
- [ ] Token unification. Palette, Archivo, radius 0 everywhere, 2px and 1px rules, focus ring
- [ ] One status authority. Remove the duplicated sentence from Forecast health
- [ ] Undo toasts at 5 seconds. Remove every confirmation dialogue

**Second**
- [ ] Consent coverage bar fixed to highest tier held, with the clarifying line and the cascade
- [ ] Medical badge in place of the band chip, in all three locations, with the reconciliation line
- [ ] Pledge counts folded into the compliance line

**Third**
- [ ] Decline reasons section with the aggregate line and the revised suggestion link
- [ ] Live broadcast rail panel
- [ ] Consent ask audience targeting by tier
- [ ] Boost days rewording, Tamil removal

---

## 10. Acceptance checks

- [ ] Open the operator console and the resident app side by side. Same face, same ink, same red, same green, no rounded corners in either
- [ ] No sentence appears in both the status strip and the Forecast health panel
- [ ] Every decision in the Requests tab is reversible for 5 seconds and asks no confirmation
- [ ] The three consent segments sum to 60 and the panel says why
- [ ] Turning off tier 2 for a flat removes it from tier 3 and from the band counts, in one action
- [ ] No screen anywhere lists which flats refused consent, which pledged, or which are in the low band
- [ ] The decline free text appears in exactly one place and cannot be exported

---

## 11. Still outstanding, not in this document

The earlier additions document specified work that has not landed yet: the cluster card for overlapping requests, preview on hover, auto decline for days already at the ceiling, ageing indicators, the anticipation card, precedent lines, source tags, the Coming Up axis floor, and the medical card explanation line.

The cluster card is the one worth protecting. Two requests for the same Saturday window currently price themselves in isolation, so both figures are wrong the moment either is approved. That is a correctness bug, not a missing feature.
