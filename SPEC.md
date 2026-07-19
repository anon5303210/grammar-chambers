# Grammar Chambers — Final Specification (Phase 0 decisions)

Locked in with Navid on 2026-07-18.

## Product decisions
- **Scope**: pure grammar and mechanics. **Excluded**: Bluebook/citation mechanics
  (brackets, ellipses, alterations, block quotes) and spelling/typo drills.
- **Diagnostic**: thorough (~60 questions, ≈1 hour total), designed to be done
  **piecemeal over several days** — progress saves after every answer, organized in
  short sections. Results seed the spaced-repetition priorities and mastery grid.
- **Pacing**: fully self-paced. No daily quotas, no guilt mechanics. The core progress
  mechanic is a **total completion bar** with an honest estimated-hours-remaining
  figure and a countdown to August 17, 2026 (America/New_York).
- **Watch budget**: user selected "Under $250" → default fund target **$225**,
  editable in Settings.
- **Rewards (balanced mix, all editable in Settings)**:
  - Qualified session: **$2** (≥10 graded items AND ≥5 min active; ≥3 h since last
    qualified session; max 2/day)
  - Diagnostic completed: **$10**
  - Category fully mastered (every rule Automatic): **$15**
  - All proofreading passages cleared: **$25**
  - Reaching 100% before the deadline: bonus that **tops the fund up to the watch
    budget** (guarantees the watch at 100%)
  - Milestones pay once; changing settings never rewrites history.

## Mastery model (documented defaults)
Recent accuracy = share correct of last 10 graded encounters for that rule.
- **Novice** → default state.
- **Solid**: ≥6 encounters, recent accuracy ≥80%, seen in ≥2 item forms, ≥1 review
  ≥8 h after first encounter.
- **Automatic**: ≥12 encounters, recent accuracy ≥90%, ≥1 correct application in a
  proofreading passage (when the rule appears in one), ≥2 delayed reviews ≥20 h
  apart, and fewer than 2 misses in the last 5.
- **Demotion**: Automatic → Solid when accuracy over the last 6 falls below 75%.
  A single isolated miss never demotes.

## Completion formula (fixed denominator per content version)
`overall = 75% × rule mastery + 25% × proofreading sets`
- Rule credit: Novice 0, Solid 0.6, Automatic 1.0 — weighted by each rule's
  corpus-derived weight.
- Proofreading credit: cleared passages / total passages. A passage clears only when
  every planted error is found and corrected with ≤2 false flags (≤1 in strict mode).
  Zero-error passages clear only when submitted with no flags.

## Hours-remaining estimate
Defaults: quick-fire 25 s, fix-it 35 s, proofreading passage 3 min (×1.4 expected
attempts). Estimated remaining encounters per rule = distance to Automatic plus an
accuracy-gap penalty. Once ≥15 timed samples exist per drill type, the user's median
replaces the default. Displayed as a point estimate with a range (×0.8–1.25) and a
"calibrating" label until samples suffice. Never converted into a daily quota.

## Corpus & authority
- Primary corpus: Judge Britt Grant (CA11) — 26 published opinions sampled 2021–2026.
- Secondary corpus: recent SCOTUS majority opinions — 6 Justices × 2 opinions.
- Authority hierarchy: Grant's consistent practice (chambers style only) → Garner's
  Redbook → Garner's Modern English Usage → Chicago. House-style adoptions logged in
  KNOWN_STYLE_CHOICES.md. Variable practices never become binary drills.

## Deployment
GitHub account `anon5303210` (renamed from chicoboy700; stored git credentials work,
verified 2026-07-18). New public repo `grammar-chambers`, Pages from main branch root.
Expected URL: https://anon5303210.github.io/grammar-chambers/
