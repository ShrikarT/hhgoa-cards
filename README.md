# HH Goa 2026 · Graded Builder Cards

PSA-style graded slabs for **Hacker House Goa 2026** — Goa, India · 28–31 Oct 2026.

Type a name, drop a photo, pick a Goa scene, and the Grading Bureau mints a deterministic
collector card: 5 rarity tiers, 6 scene artworks, a printed field-pass back, front + back
PNG export, and public card links that unfurl as full-bleed images on X.

Everything renders client-side with Canvas 2D — no framework, no bundler, no build step.
The serverless functions exist only for publishing shareable card links.

## Deploy

1. Import this repo at [vercel.com/new](https://vercel.com/new)
2. Framework Preset **Other** — no build command, no install command, no output directory
3. Deploy. The card generator is live immediately.

### Optional: public links + X image previews

Add these under **Settings → Environment Variables**, then redeploy once.

| Variable | Purpose |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare R2 account id |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key |
| `R2_BUCKET` | Bucket name, e.g. `hhgoa-cards` |
| `PUBLIC_BASE` | Optional. Your final domain, e.g. `https://hhgoa-cards.vercel.app` |

Without them the site still grades, flips, and exports cards. Only **COPY PUBLIC CARD
LINK**, `/c/<id>` pages, hosted certs, and X unfurls need R2.

## Routes

| Route | What it does |
| --- | --- |
| `/` | Card generator (`index.html`) |
| `POST /api/card` | Stores a rendered PNG + metadata, returns `id`, `imageUrl`, `shareUrl` |
| `POST /api/serial` | Issues a unique `HHG-26-######` cert, idempotent per card seed |
| `GET /c/:id` | Share page carrying `og:image` and `twitter:card=summary_large_image` |
| `GET /i/:file` | Streams the stored PNG/JSON out of private R2 |

## Layout

```
index.html     the entire front end, self-contained
fonts/         offline WOFF fallbacks, used only if webfonts fail to load
api/           Vercel serverless functions
vercel.json    rewrites for /c/:id and /i/:file, cache + security headers
build.py       reassembles index.html from the _*.html / _*.js / _*.txt parts
qa.mjs         headless Chromium QA: export parity, share routing, layout
```

## Card system

| Tier | Treatment | Odds |
| --- | --- | ---: |
| Common | Riso two-colour screenprint | 38% |
| Uncommon | Reverse holo parallel | 30% |
| Rare | Cosmos galaxy holo | 20% |
| Epic | Cracked ice refractor | 9% |
| Legendary | Rainbow etch full-art | 3% |

Scenes: First Light Arambol · Latin Quarter Fontainhas · Low Tide Palolem · Night Swim
Anjuna · Full Monsoon Dudhsagar · Last Shack Baga (Legendary lock).

Grades derive from name + stack, so the same builder always mints the same card.

## Typography

Every text style in the site **and** on the card resolves to one of five tokens.
Nothing is left on a browser default.

| Token | Webfont | Used for |
| --- | --- | --- |
| `--f-official` | Archivo Black | Masthead + card-back wordmark |
| `--f-display` | Unbounded | Card type, section headings, buttons |
| `--f-ui` | Bricolage Grotesque | Body copy, leads, step text |
| `--f-mono` | Martian Mono | Labels, data, ticker, footer |
| `--f-deva` | Baloo Bhai 2 | गोवा |

Two rules worth keeping:

- **Archivo Black is a single-weight family.** It is always set at `font-weight:400`,
  both in CSS and in the canvas exporter (`FO` in `_canvas.js`). Asking for 700 or 900
  makes the browser synthesise fake-bold, which desynchronises the exported PNG from
  the on-screen card.
- **The masthead is a two-line flex stack** (`HACKER` / `HOUSE गोवा`) that wraps
  naturally. It must never be given `white-space:nowrap` or a width greater than 100%.
  That combination is exactly what used to clip the wordmark off the right edge on
  phones, and what absolutely-positioned गोवा over the middle of the word.

The WOFF files in `fonts/` are offline fallbacks used only when Google Fonts is
unreachable. Each one matches the *category* of the webfont it stands in for, so
`official.woff` is a heavy sans — never a serif. See `fonts/NOTICE.txt`.

## Local dev

```bash
npm install
npx vercel dev      # serverless routes plus the static front end
python3 build.py    # rebuild index.html after editing the _* parts
node qa.mjs         # headless QA suite
```

`#FrameInGoa`
