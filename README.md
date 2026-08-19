# User Manual — Proposal Assistant (Purrposal)

This app turns a client brief into a 10-slide proposal deck, ready to
present. Edit any slide with a plain-language instruction, then export
straight to PowerPoint or PDF.

---

## 1. Prerequisites

| Requirement       | Version / Notes                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Node.js           | >= 20.9                                                                                                                 |
| pnpm              | The project is locked to `pnpm-lock.yaml` — **do not use npm or yarn** to install packages                              |
| Anthropic API key | Required — needed to generate/edit slides. Get one at [console.anthropic.com](https://console.anthropic.com) → API Keys |
| Clerk account     | Not required for dev — see Environment variables below                                                                  |

If pnpm isn't installed yet:

```bash
npm install -g pnpm
```

---

## 2. Setup

```bash
git clone <repo-url>
cd proposal-assistant
cp .env.example .env.local
```

Open `.env.local` and set at least this one line (the only one that's required):

```
ANTHROPIC_API_KEY=sk-ant-...
```

Then install and run:

```bash
pnpm install
pnpm dev
```

Open your browser to **http://localhost:3000**

---

## 3. Environment variables (.env.local) — explained

```
ANTHROPIC_API_KEY=

# Clerk
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# vercel
UPLOAD_STORE_ID=
BLOB_READ_WRITE_TOKEN=
```

| Variable                                                 | Required?          | Description                                                                                                                                                                                                      |
| -------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`                                      | **Required**       | Used to call Claude to draft slides (`/api/generate`) and edit them (`/api/edit`). Without it, the app loads fine but clicking Generate fails.                                                                   |
| `NEXT_PUBLIC_CLERK_*_URL`                                | No                 | Clerk's default scaffold values — the actual sign-in flow is embedded on the landing page itself (it never navigates to a separate `/sign-in` page). Leave these as-is, no need to change them.                  |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | No                 | If left blank, the first time you run `pnpm dev`, Clerk automatically provisions a temporary dev instance (**keyless mode**) and writes the keys into `.env.local` for you — no need to sign up for Clerk first. |
| `UPLOAD_STORE_ID` / `BLOB_READ_WRITE_TOKEN`              | Not currently used | Reserved for Vercel Blob down the line. No code currently reads these — safe to leave blank.                                                                                                                     |

**Note on login:** Google sign-in works immediately, with zero extra setup
(uses Clerk's shared dev credentials). Microsoft sign-in requires claiming
the Clerk app first (run `npx clerk@latest auth login`, then enable
Microsoft under Dashboard → Social Connections) — until that's done, the
Microsoft button just shows an error message rather than breaking the app.

---

## 4. Common commands

| Command       | What it does                                       |
| ------------- | -------------------------------------------------- |
| `pnpm dev`    | Runs the dev server at http://localhost:3000       |
| `pnpm build`  | Builds for production                              |
| `pnpm start`  | Runs the production build (run `pnpm build` first) |
| `pnpm lint`   | Runs ESLint                                        |
| `pnpm format` | Formats code with Prettier                         |

---

## 5. How to use it (user flow)

1. Open the landing page and click **Start**.
2. **If not signed in yet** — you'll see a sign-in step (still on the same
   page, no navigation):
   - Continue with Google
   - Continue with Microsoft
   - Anyone can sign in — no restriction to a specific company domain.
   - Already signed in? This step is skipped entirely, straight to the
     input screen.
3. Input screen ("The input"):
   - Attach a source document (.docx / .pdf / .pptx / .txt) **or** type
     the brief directly (at least 20 characters).
   - Choose the deck shape and the content depth.
4. Click **Generate deck** — progress streams in slide by slide, not just
   a generic loading spinner.
5. In the Workspace:
   - Click a slide to select it (multiple slides can be selected at once).
   - Type a plain-language instruction in the box below, e.g. "make this
     shorter" or "add a risk about vendor lock-in", then send it.
   - If no slide is selected, the instruction applies to the whole deck
     (the UI warns about this before you send).
   - Add a blank slide with the **+** button, remove one with the delete
     button on its card (an Undo toast appears if you delete by mistake).
   - Pricing/commercial numbers can only be edited on the Commercial Terms
     slide — a money-guard blocks free-typed prices anywhere else, and
     only allows a price change there when it maps to an actual scope
     addition.
6. Export the deck from the menu in the top-right corner:
   - **PowerPoint (.pptx)** — built server-side, in the Balerion brand theme.
   - **PDF** — captured client-side from the exact on-screen slides.
7. Sign out from the avatar in the top-right corner (available on both the
   landing page and the Workspace) — this clears the generated deck and
   returns you to the landing page automatically.
8. Click **Start over** in the Workspace to begin a new deck without
   reloading the page.

---

## 6. Things worth knowing (for judges / testers)

- **No database** — all config (rate card, team roster, module catalogs)
  is static, living under `src/config/`. Adding a new proposal type only
  requires adding an entry there, no other code changes.
- **Generated decks aren't persisted** — they live only in the browser's
  session for the duration of the demo. Refreshing the page clears the
  deck and you'll need to generate again.
- **No real client data anywhere** — the sample brief and every config
  default are fabricated, or drawn only from Balerion's own reusable
  boilerplate.
- **Anyone can sign in**, as required by the brief — there's no allowlist
  or email-domain restriction.
