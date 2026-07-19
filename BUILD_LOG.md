# Grammar Chambers — Build Journal

A plain-English record of how this app got built, written for a smart non-technical
reader. (Same journal habit as the Oyez Arguments project.)

---

## Entry 1 — July 18, 2026: The plan, the questions, and the reading assignment

**What we were trying to do.** Navid starts a federal clerkship on August 17 and wants
his grammar to be automatic by then — clean bench memos, sharp proofreading — without
adding a draining chore on top of bar study. The idea we landed on: a phone-friendly
web game ("Grammar Chambers"), free to host on GitHub Pages (a service that turns a
folder of files into a public website), with a single honest **completion bar** showing
how much total work remains, and a self-funded reward ledger that ends in a watch.

**The decisions that drove it.** We went through three rounds of prompt-sharpening
first. Key choices Navid made: pure grammar (no citation-format drills, no spelling
drills); a thorough ~1-hour diagnostic he can chip away at over several days; a
"balanced mix" reward scheme (small per-session payouts, bigger category bonuses, and
a 100% bonus that tops the fund up to a sub-$250 watch); and absolutely no daily
quotas — he self-paces, the app just keeps score honestly.

**What actually happened.** Before writing a single quiz question, we sent six
research agents (think: six research assistants working in parallel) to actually read
judicial opinions — 26 published opinions by Judge Britt Grant of the Eleventh
Circuit, whose chambers Navid is joining, spanning 2021–2026, plus twelve recent
Supreme Court majority opinions by six different Justices. Their job: document the
punctuation and grammar habits of top-tier judicial prose (does she use the serial
comma? contractions? how does she punctuate multi-factor tests?) so the drills train
the actual house style, not textbook trivia. One rule we set for ourselves: anything
the corpus shows judges doing *differently from each other* must never become a
right/wrong quiz question — only consistent conventions get drilled as rules.

**A wrinkle we caught early.** The GitHub account that hosts the Oyez site was renamed
(chicoboy700 → anon5303210) at some point. Web addresses for GitHub *pages* don't
follow renames, so the old Oyez bookmark is probably dead — worth re-checking when we
deploy this app. Deployment credentials still work, so this site can go live without
any manual steps.

**Try it yourself.** If you ever want software to teach you something, make the tool
study the real material first. "Teach me grammar" gets you generic worksheets; "read
26 of my judge's opinions and drill what actually appears in them" gets you a
curriculum with a reason for every question.

---

## Entry 2 — July 18, 2026: Built, tested, and live in one sitting

**What we were trying to do.** Turn the corpus findings into a working, deployed app the
same day: the drill engine, the actual questions, and a public web address.

**What the reading found.** Four of the six research agents returned before hitting a
usage cap (the fifth and sixth were cut short — noted honestly in CORPUS_REPORT.md).
The three completed Judge Grant batches (~450 pages) agreed on nearly everything, which
is what let us treat her habits as rules: serial comma always, "that" for defining
clauses, unspaced dashes, "Congress's"-style possessives, numbers spelled through one
hundred, institutions always singular. Just as valuable: the readers caught real,
published mistakes — a typo ("unecessary") and a grammar slip in Supreme Court opinions,
and two agreement slips in Judge Grant's own — which became the model for the app's
find-the-error passages. Anything judges do differently from one another (contractions,
generic he/she) got walled off so the app never marks a legitimate choice "wrong."

**What got built.** 51 rules across 11 categories; 240 hand-written drill items (163
multiple-choice, 55 tap-the-error, 22 proofreading passages — 5 of them deliberately
error-free, because knowing when NOT to edit is half of proofreading); a 78-question
diagnostic that saves after every answer so it can be done in pieces across days; a
spaced-repetition engine with three mastery levels; the completion bar with an honest
hours-remaining estimate; and the watch-fund ledger with anti-cheating rules (a
"session" only pays if it's 10+ questions and 5+ minutes, at most twice a day).

**Dead ends and fixes.** (1) A one-line CSS rule accidentally made every screen render
at once — the styling overrode the HTML "hidden" flag; one line fixed it. (2) The app's
offline cache kept serving the OLD stylesheet after the fix, which is why the site now
version-stamps its stylesheet. (3) A quality safeguard that earned its keep: every
planted error in a proofreading passage records which word it expects at its position,
and a validator script checks all 240 items' answer keys and positions before deploy —
it passed, but it's the reason a miscounted word position can't silently ship. (4) The
screenshot tool in the testing pane kept timing out, so visual checks were done through
the page structure instead — the app itself was unaffected.

**Deployment.** New public repo under the same GitHub account as the Oyez site, Pages
enabled by script, verified live: **https://anon5303210.github.io/grammar-chambers/**.
One discovery worth knowing: the GitHub account was renamed at some point
(chicoboy700 → anon5303210), and page addresses do NOT follow renames — the old Oyez
bookmark now 404s. The Oyez site still works at
https://anon5303210.github.io/Oyez-Arguments/ — update the phone's home-screen icon.

**Try it yourself.** Two habits made this build trustworthy: write the checker before
the content (the validator caught nothing only because writing it first forced careful
counting), and test the real thing (the live URL, on the phone-sized screen), not just
the local copy.

---
