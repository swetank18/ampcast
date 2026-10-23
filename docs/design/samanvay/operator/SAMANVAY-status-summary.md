# SAMANVAY — UI status summary

**As at 27 August 2026.** Deliverable: `SAMANVAY.dc.html`, one file, 1440 × ~1010.

---

## Where the build stands

Five tabs, all working, in one interface. Four were built earlier; **REQUESTS**
was added and extended over the last two passes and is now the deepest tab in the
product.

| Tab | State | What it carries |
| --- | --- | --- |
| NOW | Complete | Isometric estate of 60 homes as the hero, time-of-day scene, per-home state, resident panel on click |
| TIMELINE | Complete | 15-minute load chart, ceiling, ghost line, forecast band, tariff strip, rupees per interval |
| COMPARE | Complete | Draggable split — forecast-only 87.0 kVA against this system 84.4 — and the five-row controller table |
| EVIDENCE | Complete | Calibration plot at 92% coverage, month carpet, rendered invoice, fairness bars |
| REQUESTS | Complete this pass | Cluster card, decision queue, auto-approved log, seven-day strip, four rail panels |

---

## What landed in the REQUESTS passes

**The cluster card** is the centrepiece. Two pending requests that overlap the
same window on the same date no longer render as separate cards, because each
card computing its cost in isolation produces two numbers that both go wrong the
moment either is approved. One card replaces both: each flat's cost if approved
alone, then the three figures that matter — ₹0, ₹1,276, and ₹3,890 together — and
the sentence explaining why the first two mislead. Below that, a stagger timeline
and one button that lands the evening at 90.8 kVA for nothing.

**Preview before commit.** Hovering approve or stagger animates the affected day
in the seven-day strip to its post-decision height. The stagger hover shows a
crossing not happening. Declining animates nothing and instead names the free 8pm
window, so the operator reaches for counter offer instead.

**Undo replaced confirmation.** No dialogue anywhere in the tab. Every decision
commits at once, its toast carries a 10-second draining undo, and after that
window the action is final.

**Context on every card:** source tag (WhatsApp, app, operator), ageing in amber
past 24 hours and red past five days, deadline pressure inside 48 hours, a
precedent line naming the last comparable decision and its cost, and the flat's
boost-day usage. Queue order is by requested date, so this Saturday outranks
next month.

**Dignity rules made visible.** The medically flagged request offers only
*Acknowledge* — no decline, no counter offer — and cites clause 4 as ratified
14 June 2026. An opted-out flat still gets its request processed, with one line
saying so.

**Quiet automation, shown anyway.** Requests for days already at the ceiling are
declined before the operator sees them, with a counter offer attached, and appear
in the log behind a *Show 2 auto declined* toggle rather than being hidden.

---

## Decisions settled

**Visual language.** Modernist is attached to the project, but the build spec's
ink-on-paper tokens win across all five tabs: Inter, 2px radius, 1px rules, red
for the ceiling, green for money saved, amber for watch states. The one place
semantic colour does real work is the money column — green ₹0 against a red cost
— which a single-accent system could not express. A full reskin is a single pass
if wanted.

**Bill figure.** ₹204 per flat is authoritative. ₹12,227 across 60 flats is ₹204,
not ₹68, and that now reads consistently on the header stat, the resident panel
and Evidence.

**Festival moment.** Twelve same-evening requests collapse into one grouped card
under a banner; one button staggers them into two groups, dropping ₹3,891 to ₹0
and settling Saturday at 90.8 kVA. Nobody is refused. This is the twenty-second
demo.

**Role.** Operator throughout.

---

## Interaction

`Q` `W` `E` `R` `T` for tabs · `1`–`5` for scenarios · `Space` to play the replay ·
`G` for the 2D grid · `J` `K` to move through the queue · `A` `C` `X` to approve,
counter or decline · `/` to search · `Esc` to close any panel.

---

## Open items

**Not built.** House-rules overlay, audit log, site switcher and portfolio view,
role-based disabled-with-reason controls, public lobby view, Evidence
reconciliation and fairness-rotation cards, resident quiet mode, what-if drag on
the chart.

**Known limits.** Clustering matches on date and window label, not on the load
curves, so two requests at genuinely non-overlapping hours on the same evening
would still group. Clause 4 is cited but the document behind it does not exist
yet. The ₹412-interval against ₹4,055-running-total conflict in Timeline is
untouched; the running total computes from the data.

**Real against simulated.** Household load traces and the society itself are
simulated. The forecast model, calibration figures, tariff structure and bill
arithmetic are real.
