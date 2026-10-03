# Yabi Ena Johnny 💍

A private wedding-planning workspace: store, compare and rank every option, track budget ranges and timelines, map "if X then Y" decisions, keep a conversation log, and talk to a Claude assistant that can edit it all for you.

## Features

| Area | What it does |
| --- | --- |
| **Categories** (Venues & Locations, Honeymoon, Planner & Misc; add or restore others in Settings) | Per-category page with a **Top 3** podium, ranked list, filters, sorting, and **side-by-side compare** (up to 4). Venues carry a **country**: anything outside your home country is flagged **Abroad**, with a Where filter (All / home / Abroad / each country). Each option has cost, rating, pros/cons, status (idea → shortlist → chosen / passed), lead time, availability and **custom fields**. |
| **Guest list** | Yabi's side and Johnny's side; **import an .xlsx** (Bride → Yabi, Groom → Johnny, with a preview first); add (paste many names at once), mark **Yes** or **Maybe**, move across sides, remove. Shows the headcount range. |
| **Timelines** | Three plans to start: **A (Sep 2027)**, **B (May 2027)** and **C (Oct 2027)**; add more any time. Each has its own date, milestones and auto "book by" dates from option lead times. Options can be tied to specific scenarios, and the scenario switcher at the top re-filters the whole app (Top 3, budget estimate…). |
| **Budget** | Min / target / max range for every category, a visual band, and a live estimate from your chosen (or #1) option vs. your total budget. |
| **Decision tree** | Drag-and-drop canvas (decisions, options, outcomes) with labelled "if…" lines. |
| **Discussions** | A log of what you talked about and decided, tagged by category, with open/resolved. |
| **Checklist** | ~45 prompts of "things to think about", grouped by category, plus your own. |
| **Ring & Proposal** | Collect rings from vendors with a top choice, brainstorm/rank proposal locations, and a prep list. |
| **Assistant (Claude)** | Chat with saved threads. Paste a link and it reads the page and adds the option; ask it to re-rank, change costs, adjust the budget, log notes, add timelines or tree branches. |
| **Settings** | Names, currency, budget, guest count, category editor, JSON export/import. |

Data lives in `data/db.json` on the server, so you and your partner see the same planner (it refreshes when you switch back to the tab). A copy is also cached in each browser, so it still works if the server is down.

## Run it

```bash
npm install
cp .env.example .env      # add your ANTHROPIC_API_KEY to enable the assistant
npm run dev               # web on http://localhost:5173, API on :8787
```

Production-style: `npm run build && npm start` serves everything on http://localhost:8787.

To share it with your partner, deploy it anywhere that runs Node (Render, Fly, Railway, a small VPS) with a persistent disk for `data/`, set `ANTHROPIC_API_KEY`, and put it behind a login or private network — **there is no built-in authentication**.

## Layout

```
shared/   data model, seed data, ranking/budget logic, Claude tool definitions
server/   Express API: shared JSON store, URL fetcher, Claude agent loop
src/      React + TypeScript UI (pages/, components/)
```
