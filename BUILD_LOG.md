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

## Entry 3 — July 18, 2026: Teaching the app the book Navid is actually reading

**What we were trying to do.** Navid is working through *The Blue Book of Grammar and
Punctuation* (Kaufman & Straus, 12th ed.) — the standard plain-English grammar manual. He
asked for a section of the app with end-of-chapter exercises that test the same concepts as
the book's own quizzes but use different sentences, so reading the book doesn't spoil the
practice.

**The decision that drove it.** Rather than guess at the book's contents, we extracted all
272 pages of its text and read it: every rule chapter, and — just as important — the *format*
of its 40-odd quizzes. The book has a signature exercise style worth copying: "Correct the
error in each sentence. Place a check mark in front of sentences that are correct." That is
proofreading in miniature, including the discipline of leaving a clean sentence alone.

**What got built.** A new **Book** tab with 23 units mirroring the book's own chapter
structure — from "Finding Nouns, Verbs, and Subjects" through two mastery tests — holding
**284 new exercises**, all newly written. Each unit shows the book pages it covers and a
short refresher of the rules before you start; progress saves after every question, so a
unit can be done in two-minute pieces; clearing one takes 80%. Thirty-four of the sentences
are deliberately already correct. The app gained a new question type along the way — tap the
subject, tap the main verb — because the book teaches sentence anatomy that way and multiple
choice can't test it.

**The interesting wrinkle: the book and the judge disagree.** The Blue Book repeatedly says
"pick a formula and be consistent" where authorities differ — possessives of names ending in
s, the serial comma, spacing around dashes, how many numbers to spell out. Judge Grant's
opinions pick a side on every one of those. So the app now carries a plain-language
"Where this app and the book disagree" note, reachable from the Book tab, listing all seven
divergences. Where the disagreement is genuinely live, the exercise asks Navid to *recognize
the split* rather than pretend one answer is correct.

**Dead ends and fixes.** Three real bugs, all caught by testing rather than by reading the
code. (1) The unit runner crashed on launch because the screen tried to draw the progress bar
before it knew which unit it was running. (2) Grading a Blue Book sentence silently died
halfway through — a variable defined in one function was used in another, so the score never
appeared. (3) The most consequential one: the mastery system required seeing each rule in two
different question formats, but a few rules had only a single question, so those rules could
never be mastered — which quietly made 100% completion unreachable. Fixed by never demanding
more formats than the content actually offers, and by writing 20 more questions so no rule
rests on one item. The build now stands at **544 exercises across 87 rules**, and the honest
time estimate rose from about 6 hours to about 11 — more ground to cover, stated plainly.

**Try it yourself.** When you build a study tool around a book, extract the book's *exercise
formats*, not just its rules. The format is where the pedagogy lives — the Blue Book's habit
of slipping already-correct sentences into every quiz teaches restraint, which no amount of
rule-reading does.

---
