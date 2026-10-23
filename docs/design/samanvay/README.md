# Samanvay UI design

Design specs and clickable prototypes for the two Samanvay interfaces. Team Antimatter, HACK IT 2026 (Dept. of EEE, SRMIST), 2nd place.

Designed by Devansh Pathak in Claude Design. The working app in `src/app/samanvay/` and `src/components/samanvay/` is built from these.

## Folders

| Folder | Interface | Main file |
|---|---|---|
| `operator/` | Operator console: the society's control screen, including the Requests tab | `SAMANVAY.dc.html` |
| `resident/` | Resident app: what a flat owner sees on their own screen | `Samanvay Resident.dc.html` |

Each folder has:
- `specs/`: the build specs the prototype was made from
- the build notes for that interface
- `support.js`, `doc-page.js` and `_ds/`: the runtime and design system the prototype needs to render

`operator/shots/` holds screenshots of the console states.

## Spec files

Operator console (`operator/specs/`):
1. `UI FINAL.md`: the full build spec for the console
2. `SAMANVAY_REQUESTS_TAB_SPEC.md`: the Requests tab plus a trust layer (three overlays and transparency features across the other tabs)
3. `SAMANVAY_REQUESTS_TAB.md`: the Requests tab as one new tab inside the existing design system
4. `SAMANVAY_OPERATOR_CHANGES.md`: six changes to the console, three of them so it can receive what the resident app sends

Resident app (`resident/specs/`):
1. `SAMANVAY_RESIDENT_APP.md`: the plan for a separate screen for the flat owner, using the operator's design system
2. `SAMANVAY_RESIDENT_ROUND3.md`: a contribution rank with colour bands, consent tiers shown as benefit cards, more operator suggestions, and tab styling matched to the console

`operator/SAMANVAY-status-summary.md` records where the console stood on 27 Aug 2026.

## Opening a prototype

Open the `.dc.html` file in a browser, from inside its folder, so the files it loads are found. Fonts load from Google Fonts, so it needs an internet connection.

## Live app

- Resident: https://aethergrid-vert.vercel.app/samanvay/resident
- Operator: https://aethergrid-vert.vercel.app/samanvay?mode=REQUESTS
