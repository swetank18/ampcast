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

## Opening a prototype

Open the `.dc.html` file in a browser, from inside its folder, so the files it loads are found. Fonts load from Google Fonts, so it needs an internet connection.

## Live app

- Resident: https://aethergrid-vert.vercel.app/samanvay/resident
- Operator: https://aethergrid-vert.vercel.app/samanvay?mode=REQUESTS
