# Proposal Assistant

Turn a client brief into a pitch-ready, on-brand proposal deck — generate a
10-slide draft, edit any single slide with a plain-language instruction, and
export to PowerPoint or PDF. Built for Balerion's Hackathon 2026 (Case B:
Process Improvement & Tech Delivery).

See `PRD_AI_Proposal_Assistant.md` and `AI-Proposal-Assistant_Design-Document.md`
for the product spec and design rationale this build implements.

## Getting started

1. Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`.
2. Install dependencies and run the dev server:

   ```bash
   pnpm install
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

There is no database and no login for this build — see `4.1` in the
technical design notes: config (rate card, team roster, module catalogs,
boilerplate) is static JSON/TS under `src/config/`, and a generated deck
lives only in the browser's session for the duration of the demo.

## How it works

- **Generate** (`/api/generate`) — streams real pipeline progress (NDJSON)
  while it drafts Project Understanding, Option Analysis, Solution Proposal,
  and Execution Methodology with Claude, retrieves Feature Detail Table /
  Change Management / Team Bios straight from config (no LLM call), computes
  Commercial Terms deterministically from the rate card, then drafts the
  Executive Summary last.
- **Edit** (`/api/edit`) — scoped, single-slide regeneration. A money-guard
  classifies pricing-related instructions in code _before_ any model call:
  a price change on a non-Commercial slide is rejected, and a price change
  on the Commercial slide only goes through if it maps to an actual scope
  addition (which recomputes the rate card total) — never a free-typed
  number.
- **Export** — `.pptx` via `pptxgenjs` (server-side, Balerion brand), or PDF
  via `html2canvas` + `jsPDF` (client-side, captures the exact on-screen
  slide component).

## Proposal types

`src/config/proposal-types.ts` ships four starter configs (Warehouse
Management, Facilities & Campus Operations, Fleet & Vehicle Tracking,
Generic) — each with its own module catalog, KPIs, and default
extend/buy/build comparison frame. Add a new proposal type by adding an
entry there; no other code changes are required.

## Confidentiality

No real client names, figures, or client-engagement data are used anywhere
in this repo — the sample brief and every config default are fabricated or
drawn only from Balerion's own reusable boilerplate (team bios, methodology
copy), never from a specific client deal.
