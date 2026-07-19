# Grammar Chambers

A mobile-first grammar and proofreading trainer for a federal law clerk, grounded in a
corpus study of Judge Britt Grant's Eleventh Circuit opinions (primary) and recent
Supreme Court majority opinions (secondary). Plain HTML/CSS/JS, no server, no accounts,
no analytics — all progress lives in the browser's localStorage.

**Live site:** https://anon5303210.github.io/grammar-chambers/

## Using it on a phone
Open the URL in Safari (iPhone) or Chrome (Android), then **Add to Home Screen** for an
app-like icon. Always use the same browser on the same phone — progress is stored
locally. Use **Settings → Back up progress** occasionally; the backup JSON restores
everything via **Restore from backup**.

## What's inside
- `index.html`, `styles.css`, `js/` — the app (ES modules: store, content, engine, ui)
- `data/rules.json` — 51 rules in 11 categories with corpus-derived weights
- `data/quick-fire.json`, `data/fix-it.json`, `data/proofreading.json` — the drill
  content (163 + 55 + 22 items in v2026-07-18.1)
- `tests/content-validator.js` — run `node tests/content-validator.js`; the build is
  broken if it fails. It verifies answer keys, rule references, and (critically) that
  every proofreading error's token index matches its expected token.
- `CORPUS_REPORT.md`, `corpus/` — what the opinions taught us, with per-batch reports
- `KNOWN_STYLE_CHOICES.md` — every point where the app adopts a house style rather than
  a universal rule
- `SPEC.md` — mastery/completion/reward formulas and product decisions
- `BUILD_LOG.md` — plain-English build journal

## How progress works (short version)
Every rule climbs Novice → Solid → Automatic on spaced, repeated evidence (details in
SPEC.md). The completion bar = 75% weighted rule mastery + 25% proofreading passages
cleared, with a fixed denominator per content version. The hours-remaining estimate
starts from defaults and calibrates to measured pace. Rewards accrue to a self-funded
watch ledger; reaching 100% before August 17, 2026 tops the fund to the full budget.

## Updating content
Add items to the `data/*.json` files (see existing items for the schema — proofreading
errors need `at`, `token`, `ruleId`, `choices`, `answer`, `explanation`), bump
`contentVersion` in `rules.json`, run the validator, and push. The app announces the
expanded completion denominator instead of changing it silently.

## Redeploying from scratch
GitHub repo → Settings → Pages → Deploy from branch `main`, folder `/ (root)`. No build
step. All paths are relative, so it works from any repo name.

Data sources: opinions read via the CourtListener API (Free Law Project). Authorities:
Garner's Redbook, Garner's Modern English Usage, Chicago Manual of Style.
