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
