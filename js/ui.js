// ui.js — all screen rendering and drill interaction.

import { load, save, exportBlob, importFrom, resetAll, toastQueue } from './store.js';
import { content, itemRuleIds } from './content.js';
import {
  daysLeft, masteryOf, completion, hoursRemaining, nextItem, recordAnswer,
  recordProofRuleResult, earnedTotal, maybeSessionReward, checkMilestones,
  diagnosticReward, ruleStateFor,
} from './engine.js';

const $ = (id) => document.getElementById(id);
const els = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

let session = null; // {mode:'drill'|'diag'|'single', seen:Set, items:0, correct:0, start, itemStart, current, singleId}

export function toast(msg, ms = 2600) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, ms);
}

function confirmModal(title, body, okLabel, onOk, danger = false) {
  const root = $('modal-root');
  root.innerHTML = '';
  const scrim = els('div', 'modal-scrim');
  const m = els('div', 'modal');
  m.appendChild(els('h3', null, title));
  m.appendChild(els('p', null, body));
  const ok = els('button', danger ? 'btn btn-danger' : 'btn btn-primary', okLabel);
  const cancel = els('button', 'btn btn-secondary', 'Cancel');
  ok.onclick = () => { root.innerHTML = ''; onOk(); };
  cancel.onclick = () => { root.innerHTML = ''; };
  m.appendChild(ok); m.appendChild(cancel);
  scrim.appendChild(m);
  root.appendChild(scrim);
}

// ---------- navigation ----------

const SCREENS = ['home', 'drill', 'mastery', 'passages', 'rewards', 'settings'];

export function show(name) {
  for (const s of SCREENS) $(`screen-${s}`).hidden = s !== name;
  $('tabbar').hidden = name === 'drill';
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.nav === name));
  if (name === 'home') renderHome();
  if (name === 'mastery') renderMastery();
  if (name === 'passages') renderPassages();
  if (name === 'rewards') renderRewards();
  if (name === 'settings') renderSettings();
  window.scrollTo(0, 0);
}

// ---------- home ----------

export function renderHome() {
  const c = completion();
  const pct = Math.floor(c.overall * 100);
  $('home-pct').textContent = `${pct}%`;
  const circ = 2 * Math.PI * 52;
  $('ring-fg').style.strokeDashoffset = String(circ * (1 - c.overall));
  const hrs = hoursRemaining();
  $('stat-hours').textContent = hrs.hours >= 9.95 ? Math.round(hrs.hours) : hrs.hours.toFixed(1);
  $('stat-hours-label').textContent = hrs.calibrating ? 'hours left (est.)' : 'hours left';
  $('stat-days').textContent = String(daysLeft());
  $('stat-auto').textContent = `${c.autoCount}/${c.ruleTotal}`;
  $('stat-passages').textContent = `${c.clearedP}/${c.totalP}`;
  const note = $('est-note');
  note.hidden = false;
  note.textContent = hrs.calibrating
    ? `Roughly ${hrs.low.toFixed(1)}–${hrs.high.toFixed(1)} hours of drilling to 100% — calibrating to your pace as you play.`
    : `About ${hrs.low.toFixed(1)}–${hrs.high.toFixed(1)} hours to 100% at your measured pace.`;
  // watch
  const s = load();
  const earned = earnedTotal();
  $('watch-earned').textContent = `$${earned.toFixed(2).replace(/\.00$/, '')}`;
  $('watch-budget').textContent = `$${s.settings.watchBudget}`;
  $('watch-bar').style.width = `${Math.min(100, (earned / s.settings.watchBudget) * 100)}%`;
  // diagnostic banner
  const banner = $('diag-banner');
  if (s.diag.done) banner.hidden = true;
  else {
    banner.hidden = false;
    if (s.diag.started) {
      $('diag-banner-sub').textContent = `${s.diag.idx} of ${s.diag.queue.length} answered — pick up where you left off.`;
      $('btn-diagnostic').textContent = 'Resume';
    }
  }
  // weak list
  const weak = content.rules
    .map(r => ({ r, rs: ruleStateFor(r.id) }))
    .filter(x => x.rs.enc >= 3)
    .map(x => ({ ...x, acc: x.rs.recent.length ? x.rs.recent.reduce((a, b) => a + b, 0) / x.rs.recent.length : 1 }))
    .filter(x => x.acc < 0.75)
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 5);
  const ul = $('weak-list');
  ul.innerHTML = '';
  if (!weak.length) {
    ul.appendChild(els('li', 'muted', 'Play a few rounds and your weak spots will show here.'));
  } else {
    for (const w of weak) {
      const li = els('li');
      li.appendChild(els('span', null, w.r.name));
      li.appendChild(els('span', 'weak-acc', `${Math.round(w.acc * 100)}%`));
      ul.appendChild(li);
    }
  }
}

// ---------- session control ----------

export function startDrill() { beginSession('drill'); advance(); }

export function startDiagnostic() {
  const s = load();
  if (!s.diag.started) {
    s.diag.started = true;
    s.diag.queue = content.items
      .filter(i => i.diagnostic && i.type !== 'proof')
      .map(i => i.id);
    s.diag.idx = 0;
    save();
  }
  beginSession('diag');
  advance();
}

export function startSinglePassage(id) {
  beginSession('single');
  session.singleId = id;
  advance();
}

function beginSession(mode) {
  session = { mode, seen: new Set(), items: 0, correct: 0, start: Date.now(), itemStart: 0, current: null, singleId: null };
  $('drill-mode-chip').hidden = mode !== 'diag';
  show('drill');
  updateSessionBar();
}

function updateSessionBar() {
  const s = load();
  if (session.mode === 'diag') {
    $('session-count').textContent = `Question ${Math.min(s.diag.idx + 1, s.diag.queue.length)} of ${s.diag.queue.length}`;
    const part = Math.floor(s.diag.idx / 10) + 1;
    const parts = Math.ceil(s.diag.queue.length / 10);
    $('session-correct').textContent = `part ${Math.min(part, parts)} of ${parts}`;
  } else {
    $('session-count').textContent = `${session.items} answered`;
    $('session-correct').textContent = `${session.correct} correct`;
  }
}

function endSession(silent = false) {
  if (!session) return;
  const s = load();
  const rec = { start: session.start, end: Date.now(), items: session.items, correct: session.correct, qualified: false };
  if (session.items > 0 && session.mode !== 'single') {
    const paid = maybeSessionReward(rec);
    s.sessions.push(rec);
    if (s.sessions.length > 200) s.sessions.shift();
    save();
    if (paid && !silent) toast(`Session logged — $${s.settings.rwSession} to the watch fund ⌚`);
  }
  session = null;
  show('home');
}

function advance() {
  const s = load();
  let item = null;
  if (session.mode === 'diag') {
    if (s.diag.idx >= s.diag.queue.length) { finishDiagnostic(); return; }
    item = content.byId.get(s.diag.queue[s.diag.idx]);
    if (!item) { s.diag.idx++; save(); advance(); return; }
  } else if (session.mode === 'single') {
    if (session.seen.has(session.singleId)) { endSession(true); return; }
    item = content.byId.get(session.singleId);
  } else {
    item = nextItem(session.seen);
  }
  if (!item) { toast('Nothing left to drill right now — everything is scheduled for later review.'); endSession(); return; }
  session.current = item;
  session.seen.add(item.id);
  session.itemStart = Date.now();
  updateSessionBar();
  if (item.type === 'mc') renderMC(item);
  else if (item.type === 'fixit') renderFixit(item);
  else renderProof(item);
}

function finishDiagnostic() {
  const s = load();
  s.diag.done = true;
  save();
  const paid = diagnosticReward();
  const body = paid
    ? `Your weak spots are mapped and your queue is prioritized. $${s.settings.rwDiagnostic} added to the watch fund.`
    : 'Your weak spots are mapped and your queue is prioritized.';
  const root = $('modal-root');
  root.innerHTML = '';
  const scrim = els('div', 'modal-scrim');
  const m = els('div', 'modal');
  m.appendChild(els('h3', null, 'Diagnostic complete 🎉'));
  m.appendChild(els('p', null, body));
  const ok = els('button', 'btn btn-primary', 'See my mastery grid');
  ok.onclick = () => { root.innerHTML = ''; session = null; show('mastery'); };
  m.appendChild(ok);
  scrim.appendChild(m);
  root.appendChild(scrim);
}

function elapsedSeconds() { return (Date.now() - session.itemStart) / 1000; }

function afterAnswer(item, correct) {
  session.items++;
  if (correct) session.correct++;
  if (session.mode === 'diag') {
    const s = load();
    s.diag.idx++;
    s.diag.results.push({ id: item.id, correct });
    save();
  }
  updateSessionBar();
  const paid = checkMilestones();
  for (const p of paid) toast(p, 4200);
}

function ruleName(ruleId) {
  return content.ruleById.get(ruleId)?.name || ruleId;
}

function shuffled(n) {
  const idx = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

function explainBlock(item, extra) {
  const ex = els('div', 'explain');
  const rn = els('span', 'rule-name', ruleName(item.ruleId || (item.errors?.[0]?.ruleId)));
  ex.appendChild(rn);
  ex.appendChild(document.createTextNode(extra || item.explanation || ''));
  return ex;
}

function nextButton(label = 'Next') {
  const b = els('button', 'btn btn-primary', label);
  b.onclick = () => advance();
  return b;
}

// ---------- multiple choice ----------

function renderMC(item) {
  const body = $('drill-body');
  const actions = $('drill-actions');
  body.innerHTML = ''; actions.innerHTML = '';
  body.appendChild(els('div', 'item-rule-tag', content.catById.get(content.ruleById.get(item.ruleId)?.categoryId)?.name || ''));
  const prompt = els('div', 'item-prompt');
  prompt.textContent = item.prompt;
  body.appendChild(prompt);
  if (item.stem) {
    const stem = els('div', 'item-passage');
    stem.textContent = item.stem;
    body.appendChild(stem);
  }
  const wrap = els('div', 'options');
  const order = shuffled(item.options.length);
  let answered = false;
  order.forEach(origIdx => {
    const b = els('button', 'opt', item.options[origIdx]);
    b.onclick = () => {
      if (answered) return;
      answered = true;
      const accept = new Set([item.answer, ...(item.accept || [])]);
      const correct = accept.has(origIdx);
      wrap.querySelectorAll('.opt').forEach(o => { o.disabled = true; });
      b.classList.add(correct ? 'correct' : 'wrong');
      if (!correct) {
        // highlight the primary correct answer
        [...wrap.children].forEach((o, i) => {
          if (order[i] === item.answer) o.classList.add('correct');
        });
      }
      recordAnswer(item, correct, elapsedSeconds());
      const v = els('div', `verdict ${correct ? 'good' : 'bad'}`, correct ? '✓ Right' : '✗ Not quite');
      body.appendChild(v);
      body.appendChild(explainBlock(item));
      actions.appendChild(nextButton());
      afterAnswer(item, correct);
    };
    wrap.appendChild(b);
  });
  body.appendChild(wrap);
}

// ---------- fix-it ----------

function renderFixit(item) {
  const body = $('drill-body');
  const actions = $('drill-actions');
  body.innerHTML = ''; actions.innerHTML = '';
  body.appendChild(els('div', 'item-rule-tag', 'Fix it — tap the problem'));
  body.appendChild(els('div', 'item-prompt', item.prompt || 'One thing in this sentence is wrong. Tap it.'));
  const p = els('div', 'item-passage');
  let answered = false;
  item.tokens.forEach((tok, i) => {
    const span = els('span', 'tok', tok);
    span.onclick = () => {
      if (answered) return;
      answered = true;
      if (i === item.errorIndex || (item.alsoAccept || []).includes(i)) {
        span.classList.add('hit');
        chooseCorrection(item, body, actions, span);
      } else {
        span.classList.add('missed');
        const target = p.children[item.errorIndex];
        if (target) target.classList.add('hit');
        recordAnswer(item, false, elapsedSeconds());
        body.appendChild(els('div', 'verdict bad', '✗ The problem was elsewhere'));
        body.appendChild(explainBlock(item));
        actions.appendChild(nextButton());
        afterAnswer(item, false);
      }
    };
    p.appendChild(span);
    p.appendChild(document.createTextNode(joinGlue(item.tokens, i)));
  });
  body.appendChild(p);
}

// Token join: no space before closing punctuation / after opening.
function joinGlue(tokens, i) {
  if (i === tokens.length - 1) return '';
  const next = tokens[i + 1];
  const cur = tokens[i];
  if (/^[,.;:!?)\]”’%]/.test(next) || /^['’]s\b/.test(next) || next === "'" || next === '’' || next === 'n’t') return '';
  if (/[(\[“‘$]$/.test(cur) || cur === '—' || next === '—') return '';
  return ' ';
}

function chooseCorrection(item, body, actions, tokenSpan) {
  body.appendChild(els('div', 'item-prompt', 'Good eye. Now fix it:'));
  const wrap = els('div', 'options');
  const order = shuffled(item.choices.length);
  let done = false;
  order.forEach(origIdx => {
    const b = els('button', 'opt', item.choices[origIdx]);
    b.onclick = () => {
      if (done) return;
      done = true;
      const correct = origIdx === item.answer;
      wrap.querySelectorAll('.opt').forEach(o => { o.disabled = true; });
      b.classList.add(correct ? 'correct' : 'wrong');
      if (!correct) [...wrap.children].forEach((o, i) => { if (order[i] === item.answer) o.classList.add('correct'); });
      if (correct) tokenSpan.textContent = item.choices[item.answer];
      recordAnswer(item, correct, elapsedSeconds());
      body.appendChild(els('div', `verdict ${correct ? 'good' : 'bad'}`, correct ? '✓ Fixed' : '✗ Right spot, wrong fix'));
      body.appendChild(explainBlock(item));
      actions.appendChild(nextButton());
      afterAnswer(item, correct);
    };
    wrap.appendChild(b);
  });
  body.appendChild(wrap);
}

// ---------- proofreading ----------

function renderProof(item) {
  const body = $('drill-body');
  const actions = $('drill-actions');
  body.innerHTML = ''; actions.innerHTML = '';
  const s = load();
  const flags = new Set();
  body.appendChild(els('div', 'item-rule-tag', item.title || 'Proofread'));
  body.appendChild(els('div', 'item-prompt',
    `Tap anything that's wrong — a word or a punctuation mark. This passage has zero to three planted errors. Flag nothing if it's clean.`));
  const p = els('div', 'item-passage');
  const spans = [];
  item.tokens.forEach((tok, i) => {
    const span = els('span', 'tok', tok);
    span.onclick = () => {
      if (span._locked) return;
      if (flags.has(i)) { flags.delete(i); span.classList.remove('flagged'); }
      else { flags.add(i); span.classList.add('flagged'); }
      bar.textContent = flags.size === 1 ? '1 flag' : `${flags.size} flags`;
    };
    spans.push(span);
    p.appendChild(span);
    p.appendChild(document.createTextNode(joinGlue(item.tokens, i)));
  });
  body.appendChild(p);
  const toolbar = els('div', 'proof-toolbar');
  const bar = els('span', null, '0 flags');
  toolbar.appendChild(bar);
  toolbar.appendChild(els('span', null, 'Tap again to unflag'));
  body.appendChild(toolbar);

  const submit = els('button', 'btn btn-primary', 'Submit');
  submit.onclick = () => {
    spans.forEach(sp => { sp._locked = true; });
    submit.remove();
    gradeProof(item, flags, spans, body, actions);
  };
  actions.appendChild(submit);
}

function errorSpanIndexes(err) {
  const len = err.len || 1;
  return [...Array(len).keys()].map(k => err.at + k);
}

function gradeProof(item, flags, spans, body, actions) {
  const s = load();
  const errors = item.errors || [];
  const found = [];
  const missed = [];
  const errTokens = new Set();
  for (const err of errors) {
    const idxs = errorSpanIndexes(err);
    idxs.forEach(i => errTokens.add(i));
    if (idxs.some(i => flags.has(i))) found.push(err); else missed.push(err);
  }
  const falsePos = [...flags].filter(i => !errTokens.has(i));
  // visual verdict on tokens
  for (const err of errors) {
    const idxs = errorSpanIndexes(err);
    const wasFound = found.includes(err);
    idxs.forEach(i => spans[i].classList.add(wasFound ? 'hit' : 'missed'));
  }
  falsePos.forEach(i => spans[i].classList.add('falsepos'));

  // correction phase for found errors, sequentially
  const corrections = [];
  const doCorrection = (k) => {
    if (k >= found.length) { finishProof(); return; }
    const err = found[k];
    const q = els('div');
    q.appendChild(els('div', 'item-prompt', `Fix the highlighted problem ${found.length > 1 ? `(${k + 1} of ${found.length})` : ''}: “${errorSpanIndexes(err).map(i => item.tokens[i]).join(' ')}”`));
    const wrap = els('div', 'options');
    const order = shuffled(err.choices.length);
    let done = false;
    order.forEach(origIdx => {
      const b = els('button', 'opt', err.choices[origIdx]);
      b.onclick = () => {
        if (done) return;
        done = true;
        const ok = origIdx === err.answer;
        wrap.querySelectorAll('.opt').forEach(o => { o.disabled = true; });
        b.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) [...wrap.children].forEach((o, i2) => { if (order[i2] === err.answer) o.classList.add('correct'); });
        corrections.push({ err, ok });
        setTimeout(() => doCorrection(k + 1), ok ? 350 : 900);
      };
      wrap.appendChild(b);
    });
    q.appendChild(wrap);
    body.appendChild(q);
    q.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const finishProof = () => {
    const corrected = corrections.filter(c => c.ok).map(c => c.err);
    const tolerance = s.settings.strict ? 1 : 2;
    const isZeroError = errors.length === 0;
    const cleared = isZeroError
      ? flags.size === 0
      : corrected.length === errors.length && falsePos.length <= tolerance;
    // rule-level grading
    for (const err of errors) {
      const ok = corrected.includes(err);
      recordProofRuleResult(err.ruleId, ok);
    }
    // item-level
    recordAnswer(item, cleared, elapsedSeconds(), { inProof: true });
    const st = s.proof[item.id] || { attempts: 0, cleared: false, bestScore: 0 };
    st.attempts++;
    const score = isZeroError
      ? (cleared ? 100 : Math.max(0, 100 - flags.size * 25))
      : Math.max(0, Math.round(100 * (corrected.length / errors.length) - falsePos.length * 10));
    st.bestScore = Math.max(st.bestScore, score);
    if (cleared) st.cleared = true;
    s.proof[item.id] = st;
    save();

    const sc = els('div', 'proof-score');
    if (isZeroError) {
      sc.innerHTML = cleared
        ? `<b class="good">✓ Clean passage — and you left it alone.</b> That restraint is the proofreader's second skill.`
        : `<b class="bad">This passage had no errors.</b> You flagged ${flags.size} thing${flags.size === 1 ? '' : 's'} that ${flags.size === 1 ? 'was' : 'were'} fine. Knowing when not to edit is half the job.`;
    } else {
      sc.innerHTML =
        `<b class="${cleared ? 'good' : 'bad'}">${cleared ? '✓ Passage cleared' : 'Not cleared yet'}</b> — ` +
        `found and fixed ${corrected.length} of ${errors.length}` +
        (falsePos.length ? `, with ${falsePos.length} false flag${falsePos.length === 1 ? '' : 's'}` : ', no false flags') + '.';
    }
    body.appendChild(sc);
    for (const err of errors) {
      const okd = corrected.includes(err);
      const ex = els('div', 'explain');
      ex.appendChild(els('span', 'rule-name', `${okd ? '✓' : '✗'} ${ruleName(err.ruleId)}`));
      ex.appendChild(document.createTextNode(err.explanation));
      body.appendChild(ex);
    }
    afterAnswer(item, cleared);
    actions.innerHTML = '';
    actions.appendChild(nextButton(session.mode === 'single' ? 'Done' : 'Next'));
    sc.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (found.length) doCorrection(0);
  else finishProof();
}

// ---------- mastery ----------

function renderMastery() {
  const c = completion();
  $('mastery-summary').textContent =
    `${c.autoCount} of ${c.ruleTotal} rules automatic · ${Math.floor(c.ruleFrac * 100)}% of rule mastery earned`;
  const grid = $('mastery-grid');
  grid.innerHTML = '';
  for (const cat of content.categories) {
    const rules = content.rules.filter(r => r.categoryId === cat.id);
    if (!rules.length) continue;
    const box = els('div', 'mast-cat');
    const head = els('div', 'mast-cat-head');
    head.appendChild(els('h3', null, cat.name));
    const dots = els('div', 'mast-dots');
    for (const r of rules) {
      const m = masteryOf(r.id);
      dots.appendChild(els('span', `dot ${m === 'auto' ? 'auto' : m === 'solid' ? 'solid' : ''}`));
    }
    head.appendChild(dots);
    const list = els('div', 'mast-rules');
    for (const r of rules) {
      const m = masteryOf(r.id);
      const rs = ruleStateFor(r.id);
      const row = els('div', 'mast-rule');
      const left = els('div');
      left.appendChild(els('div', null, r.name));
      const acc = rs.recent.length ? Math.round(100 * rs.recent.reduce((a, b) => a + b, 0) / rs.recent.length) : null;
      left.appendChild(els('div', 'meta', rs.enc ? `${rs.enc} seen${acc !== null ? ` · ${acc}% recently` : ''}${rs.proofOK ? ' · proof ✓' : ''}` : 'not yet seen'));
      row.appendChild(left);
      row.appendChild(els('span', `state ${m === 'auto' ? 'auto' : m}`, m === 'auto' ? 'Automatic' : m === 'solid' ? 'Solid' : 'Novice'));
      list.appendChild(row);
    }
    head.onclick = () => box.classList.toggle('open');
    box.appendChild(head);
    box.appendChild(list);
    grid.appendChild(box);
  }
}

// ---------- passages ----------

function renderPassages() {
  const s = load();
  const c = completion();
  $('passages-summary').textContent = `${c.clearedP} of ${c.totalP} cleared — clearing all of them is 25% of your completion bar`;
  const list = $('passage-list');
  list.innerHTML = '';
  for (const p of content.proofItems) {
    const st = s.proof[p.id];
    const row = els('div', 'pass-item');
    const left = els('div');
    left.appendChild(els('div', 'pass-title', p.title));
    left.appendChild(els('div', 'pass-meta',
      `${p.function || 'passage'} · difficulty ${'●'.repeat(p.difficulty || 1)}${st?.attempts ? ` · best ${st.bestScore}%` : ''}`));
    row.appendChild(left);
    row.appendChild(els('span', `pass-badge ${st?.cleared ? 'cleared' : ''}`, st?.cleared ? 'Cleared' : st?.attempts ? 'Retry' : 'New'));
    row.onclick = () => startSinglePassage(p.id);
    list.appendChild(row);
  }
}

// ---------- rewards ----------

function renderRewards() {
  const s = load();
  const earned = earnedTotal();
  $('rw-earned').textContent = `$${earned.toFixed(2).replace(/\.00$/, '')}`;
  $('rw-budget').textContent = `$${s.settings.watchBudget}`;
  $('rw-bar').style.width = `${Math.min(100, (earned / s.settings.watchBudget) * 100)}%`;
  const rules = $('reward-rules');
  rules.innerHTML = '';
  const rows = [
    [`Qualified session (10+ questions, 5+ min; max 2/day)`, `$${s.settings.rwSession}`],
    [`Finish the diagnostic`, `$${s.settings.rwDiagnostic}`],
    [`Master a whole category`, `$${s.settings.rwCategory}`],
    [`Clear every proofreading passage`, `$${s.settings.rwAllPassages}`],
    [`Reach 100% before Aug 17`, `fund topped to $${s.settings.watchBudget}`],
  ];
  for (const [a, b] of rows) {
    const li = els('li');
    li.appendChild(els('span', null, a));
    li.appendChild(els('span', 'ledger-amt', b));
    rules.appendChild(li);
  }
  const led = $('ledger-list');
  led.innerHTML = '';
  if (!s.ledger.length) led.appendChild(els('li', 'muted', 'Nothing earned yet — your first session is $' + s.settings.rwSession + ' away.'));
  for (const e of s.ledger.slice(0, 30)) {
    const li = els('li');
    const left = els('div');
    left.appendChild(els('div', null, e.reason));
    left.appendChild(els('div', 'ledger-when', new Date(e.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })));
    li.appendChild(left);
    li.appendChild(els('span', 'ledger-amt', `+$${e.amount}`));
    led.appendChild(li);
  }
}

// ---------- settings ----------

function renderSettings() {
  const s = load();
  $('set-font').value = s.settings.fontScale;
  $('set-theme').value = s.settings.theme;
  $('set-strict').checked = s.settings.strict;
  $('set-budget').value = s.settings.watchBudget;
  $('set-rw-session').value = s.settings.rwSession;
  $('set-rw-category').value = s.settings.rwCategory;
  $('about-content-version').textContent = content.version || '–';
}

export function applyDisplaySettings() {
  const s = load();
  document.documentElement.style.setProperty('--font-scale', s.settings.fontScale);
  if (s.settings.theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', s.settings.theme);
}

export function wireEvents() {
  document.querySelectorAll('.tab').forEach(t => { t.onclick = () => show(t.dataset.nav); });
  $('btn-drill').onclick = () => startDrill();
  $('btn-diagnostic').onclick = () => startDiagnostic();
  $('btn-exit-drill').onclick = () => endSession();
  $('set-font').onchange = (e) => { const s = load(); s.settings.fontScale = e.target.value; save(); applyDisplaySettings(); };
  $('set-theme').onchange = (e) => { const s = load(); s.settings.theme = e.target.value; save(); applyDisplaySettings(); };
  $('set-strict').onchange = (e) => { const s = load(); s.settings.strict = e.target.checked; save(); };
  $('set-budget').onchange = (e) => { const s = load(); s.settings.watchBudget = Math.max(10, Number(e.target.value) || 225); save(); };
  $('set-rw-session').onchange = (e) => { const s = load(); s.settings.rwSession = Math.max(0, Number(e.target.value) || 0); save(); };
  $('set-rw-category').onchange = (e) => { const s = load(); s.settings.rwCategory = Math.max(0, Number(e.target.value) || 0); save(); };
  $('btn-export').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(exportBlob());
    a.download = `grammar-chambers-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  $('btn-import').onclick = () => $('import-file').click();
  $('import-file').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      importFrom(await f.text());
      applyDisplaySettings();
      show('home');
      toast('Progress restored from backup.');
    } catch (err) { toast(err.message, 4000); }
    e.target.value = '';
  };
  $('btn-reset').onclick = () => confirmModal(
    'Reset everything?',
    'This erases all mastery, passage, and reward progress on this phone. A last-chance internal backup is kept, but do not count on it. Consider "Back up progress" first.',
    'Erase my progress', () => { resetAll(); applyDisplaySettings(); show('home'); toast('Fresh start.'); }, true);
  for (const msg of toastQueue.splice(0)) toast(msg, 4000);
}
