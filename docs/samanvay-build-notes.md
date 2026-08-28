# Samanvay — build notes

**Work log, 28 August 2026.** What was built from the `design/` folder, how it is put
together, and what is still open.

---

## 1. What was in the brief

The `design/` folder held two finished mockups and their build notes:

| File | What it specified |
| --- | --- |
| `OPERATOR DASHBOARD FINAL.zip` | `SAMANVAY.dc.html` — five tabs, REQUESTS being the newest and deepest. Plus `SAMANVAY_REQUESTS_TAB_SPEC.md`, a twelve-section spec. |
| `Resident dashboard FINAL.zip` | `Samanvay Resident.dc.html` — five tabs and a settings modal, entirely new. |
| `RESIDENT_MD FINAL.md` | The resident build notes, 483 lines, the authoritative spec for that app. |

The repo already carried the operator console with a `LOG` tab. The resident app did not
exist at all, and neither did REQUESTS.

---

## 2. What was built

### 2.1 The resident app — new, at `/samanvay/resident`

Five tabs (`Q W E R T`) and a settings modal, all live: accepting a suggestion genuinely
moves it between arrays and every total, badge, count and chart recomputes from those
arrays in the same frame.

| Tab | Carries |
| --- | --- |
| MY FLAT | The 96-interval hero, management notices with a pledge, four KPIs, the isometric flat and the privacy statement, the untouchable-appliance boundary |
| SUGGESTIONS | Live totals, the accordion, structured decline, accepted and declined tables |
| SAVINGS | The ₹ hero, the breakdown with its two-way cross-highlight, contribution band, unclaimed value, twelve months |
| SOLAR | Society generation, the day profile, the personal-panel payback case |
| REQUESTS | Medical flag, the consent ask, the four data tiers, request forms, open requests |

Five figures are drawn in CSS and inline SVG. **No chart library**: the 96-interval day,
the suggestion timeline, the day profile, the savings breakdown, the contribution band,
and the twelve-month bars.

### 2.2 The operator gains REQUESTS

Added on `T`; the decision log moved to `Y` and was not touched otherwise.

- **Section A — needs your decision.** Cards carrying the flat, the ask, a mini forecast
  sparkline, and the arithmetic. The number, never an opinion.
- **Section B — approved automatically.** A deliberately boring table. Auto-declined items
  sit behind a toggle rather than being hidden.
- **Section C — coming up.** Seven-day strip, granted requests stacked over the forecast
  peak, crossings in red.
- **Rail.** Live resident feed, month stats, broadcast composer, flexibility budget,
  consent coverage.

**The cluster card is the point of it.** Two requests overlapping the same evening are one
decision, because each card costing itself in isolation produces two numbers that both go
wrong the moment either is approved. It shows each flat's cost alone (₹0, ₹1,276), the
cost together (₹3,890), and the stagger that lands the evening at 90.8 kVA for nothing.
Nobody is refused.

There is **no confirmation dialogue anywhere in the tab**. Every decision commits at once
and its toast carries a ten-second draining undo, after which it is final.

**Dignity rules are enforced in code, not only in design.** A medically flagged request
offers only *Acknowledge* — no decline, no counter offer — and cites clause 4. The
flexibility budget shows the distribution and never names which flats spent their
allowance.

### 2.3 The bridge — resident ↔ operator, live

Both apps read and write **one shared store** (`src/lib/bridge.ts`), so the two views
cannot drift.

A resident accepting a suggestion, declining one, turning one off, raising a medical flag,
withdrawing a data tier, pausing, or sending a request appears on the operator's feed as
it happens — **across browser tabs, over `BroadcastChannel`, with no server**. Resident
requests enter the operator queue as ordinary decidable cards; the medical flag raises a
banner; consent coverage moves with the tier switches.

Implementation notes:

- Exposed through `useSyncExternalStore`, not an effect. The server renders the empty
  society, hydration matches, and the stored value is adopted in the commit that follows.
- `getSnapshot` caches the parsed object so the reference is stable between real writes.
- `localStorage` is wrapped in try/catch throughout — a private window or blocked site
  data must still render both apps correctly.
- `BroadcastChannel` covers same-origin tabs; a `storage` listener covers browsers without
  it.

---

## 3. The design pass

The resident app was redesigned after the first implementation. The brief was pinned as:
*a flat owner, non-technical, being asked to let software move their water heater; the
page's one job is to earn enough trust to say yes to one more thing.*

### Palette

Not cream. The ground is the cool pale slate of a meter cabinet.

| Token | Value | Means |
| --- | --- | --- |
| `--ground` | `#e9edf1` | The page behind the app |
| `--surface` | `#ffffff` | Cards |
| `--ink` | `#101720` | Text, filled controls |
| `--peak` | `#b96a15` | **6 pm to 10 pm, when a unit costs 26% more. Nothing else.** |
| `--saved` | `#0e7a55` | Money saved |
| `--solar` | `#4e6e8e` | Society solar |
| `--alert` | `#d1361c` | The medical button, and only that |

The three semantics inherited from the build spec hold. Amber, which the spec used loosely
for "caution", was promoted to one precise meaning: the expensive hours.

### Type

- **Anek Latin** (Ek Type, drawn in India for Indian scripts) for display and every rupee
  figure, narrowed on its width axis so a large number is not a loud one.
- **Inter** for body.
- **Geist Mono** for meter readings, interval times and clock labels.

Money speaks in the display face; machine data speaks in mono. Because Anek is variable on
both `wght` and `wdth`, headings drive `font-variation-settings` directly rather than
relying on `font-weight` mapping onto the variable instance — the shorthand rendered
ghost-light.

### The signature

**"Your day, in 96 intervals."** The society is billed on its single highest fifteen
minutes of the month, so a day here is ninety-six intervals rather than twenty-four hours.
The hero draws the flat's real day at that resolution, tints the 6–10 pm window amber,
and shows the one interval that was moved as a hatched ghost at its old position with the
filled tick at its new one. The whole argument of the product in one figure.

The series is deterministic — no `Math.random` — because the server and the browser have
to draw the identical figure or hydration breaks.

### Restraint

One orchestrated moment: the ninety-six ticks draw themselves left to right, once, then
hold still. Everything else is interaction feedback only. Reduced motion is respected
throughout, and the layout goes to one column at 1080px and 720px.

---

## 4. Where the spec's numbers did not reconcile

The spec's headline figures do not close:

- The ₹204 breakdown needs an accepted total of **₹68**, but no suggestion type is worth
  ₹68.
- The four pending suggestions are said to total **₹342**; the listed worths do not sum to
  that under any grouping.

Section 12 of the resident notes says the arrays are the source of truth and every total
derives from them. That rule was followed, so the opening figures differ slightly from the
prose:

- Accepted seed is `standby` at **₹68** — the spec's own example label for the accepted
  table is "Overnight standby draw traced", so this is the item it meant.
- Pending queue is heater ₹38, precool ₹118, washing ₹54, plus holiday as an **"up to
  ₹400" estimate held out of the headline totals**.
- Breakdown therefore closes exactly: 86 solar + 68 accepted + 50 peak = **₹204**.

Give me the authoritative numbers and it is a one-line change per value.

---

## 5. Files

| Path | Lines | What |
| --- | --- | --- |
| `src/lib/bridge.ts` | ~230 | The shared store, `useSyncExternalStore` |
| `src/components/resident/data.ts` | ~470 | Resident data layer; suggestions, tiers, slices, the 96-interval day |
| `src/components/resident/Resident.tsx` | ~1450 | The resident app, five tabs and the modal |
| `src/app/samanvay/resident/page.tsx` | 12 | Route |
| `src/app/samanvay/resident/resident.css` | ~790 | The design system |
| `src/components/samanvay/requests.ts` | ~360 | Request objects, cluster, week ahead, rail data |
| `src/components/samanvay/RequestsTab.tsx` | ~680 | The operator REQUESTS tab |
| `src/app/samanvay/samanvay.css` | +350 | REQUESTS styles |
| `src/components/samanvay/Samanvay.tsx` | +12 | Tab wiring and the count badge |
| `src/app/layout.tsx` | +12 | Anek Latin and Geist Mono |

---

## 6. How to see the link working

```bash
npm run dev
```

1. Open `/samanvay/resident` in one tab and `/samanvay?mode=REQUESTS` in another.
2. On the resident tab, accept a suggestion, or send a request from REQUESTS.
3. The operator's **From residents** rail updates without a refresh, and a sent request
   arrives at the top of the decision queue.

The two apps link to each other: "Operator console" in the resident header, "Open resident
app" on the operator's feed card.

---

## 7. Verification done

- `tsc --noEmit` clean.
- `next build` clean; `/samanvay/resident` prerenders.
- `eslint` clean on all new files. Four warnings remain, all pre-existing in `model.ts`
  and `ResidentPanel`.
- **End-to-end in headless Chromium**: seeded the shared store from the same origin, loaded
  the operator console, and confirmed the accepted suggestion, the medical-flag banner and
  the resident-submitted request all appeared. The resident headline recomputed to ₹174
  (86 + 38 + 50) from the seeded array, which proves the figures derive rather than being
  hardcoded.

---

## 8. Still open

- **The operator spec's section 8** — enterprise structure: site switcher, portfolio view,
  roles, audit log, bulk actions, search and filter. Deliberately out of scope; the
  mockup does not ship it either.
- **The broadcast composer** is functional but minimal against section 3 of the spec.
- **The isometric flat** is a hand-drawn inline vector. If the real asset from the operator
  app exists it should replace it — and it currently reads a little scattered at small
  sizes.
- **The operator console is desktop-only** and still renders at a fixed 1440 canvas with a
  zoom control. The resident app is responsive; the operator app is not.
- **Dead links**: "See every use", "Turn this off", "Reconsider", "Withdraw" and the house
  rules have no destinations.
- **Single flat, single month.** No multi-month drill-down, no appliance detail, no
  notification inbox.
