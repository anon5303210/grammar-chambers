// engine.js — mastery model, spaced-repetition scheduler, completion percentage,
// hours-remaining estimate, and the reward ledger. Formulas documented in SPEC.md.

import { load, save } from './store.js';
import { content, itemRuleIds, ruleHasProofCoverage } from './content.js';

// ---- deadline ----
// "Before August 17" = end of August 16, 11:59 pm America/New_York (EDT in August).
export const DEADLINE = new Date('2026-08-17T00:00:00-04:00').getTime();

export function daysLeft() {
  return Math.max(0, Math.ceil((DEADLINE - Date.now()) / 86400000));
}

// ---- Leitner boxes: review intervals in hours ----
const BOX_HOURS = [0, 8, 24, 72, 168, 336];
const H = 3600000;

// ---- mastery thresholds (see SPEC.md) ----
const SOLID = { enc: 6, acc: 0.8, forms: 2, delayHrs: 8 };
const AUTO = { enc: 12, acc: 0.9, delayed: 2, delayGapHrs: 20 };

export function ruleStateFor(ruleId) {
  const s = load();
  if (!s.ruleState[ruleId]) {
    s.ruleState[ruleId] = {
      enc: 0, cor: 0, recent: [], forms: {}, firstSeen: 0, lastSeen: 0,
      delayedTimes: [], proofOK: false,
    };
  }
  return s.ruleState[ruleId];
}

function recentAcc(rs, n = 10) {
  const r = rs.recent.slice(-n);
  if (!r.length) return 0;
  return r.reduce((a, b) => a + b, 0) / r.length;
}

export function masteryOf(ruleId) {
  const rs = ruleStateFor(ruleId);
  if (rs.enc < SOLID.enc) return 'novice';
  const acc10 = recentAcc(rs, 10);
  const forms = Object.keys(rs.forms).length;
  const hadDelay = rs.delayedTimes.length >= 1;
  const isSolid = acc10 >= SOLID.acc && forms >= SOLID.forms && hadDelay;
  if (!isSolid) return 'novice';
  // automatic?
  const last5 = rs.recent.slice(-5);
  const missesLast5 = last5.filter(x => x === 0).length;
  const proofNeeded = ruleHasProofCoverage(ruleId);
  const spacedDelays = countSpacedDelays(rs.delayedTimes, AUTO.delayGapHrs);
  const isAuto =
    rs.enc >= AUTO.enc &&
    acc10 >= AUTO.acc &&
    (!proofNeeded || rs.proofOK) &&
    spacedDelays >= AUTO.delayed &&
    missesLast5 < 2;
  if (!isAuto) return 'solid';
  // demotion guard: accuracy over last 6 must stay >= 75%
  const last6 = rs.recent.slice(-6);
  if (last6.length >= 6 && last6.reduce((a, b) => a + b, 0) / 6 < 0.75) return 'solid';
  return 'auto';
}

function countSpacedDelays(times, gapHrs) {
  if (!times.length) return 0;
  let count = 1;
  let anchor = times[0];
  for (const t of times.slice(1)) {
    if (t - anchor >= gapHrs * H) { count++; anchor = t; }
  }
  return count;
}

// ---- recording answers ----

export function recordAnswer(item, correct, seconds, { inProof = false } = {}) {
  const s = load();
  const now = Date.now();
  // item-level Leitner
  const ist = s.itemState[item.id] || { seen: 0, cor: 0, lastSeen: 0, nextDue: 0, box: 0 };
  ist.seen++; if (correct) ist.cor++;
  ist.box = correct ? Math.min(ist.box + 1, BOX_HOURS.length - 1) : 1;
  ist.lastSeen = now;
  ist.nextDue = now + BOX_HOURS[ist.box] * H;
  s.itemState[item.id] = ist;
  // rule-level
  for (const rid of itemRuleIds(item)) {
    const rs = ruleStateFor(rid);
    rs.enc++; if (correct) rs.cor++;
    rs.recent.push(correct ? 1 : 0);
    if (rs.recent.length > 12) rs.recent = rs.recent.slice(-12);
    rs.forms[item.type] = true;
    if (!rs.firstSeen) rs.firstSeen = now;
    // a "delayed review" = an encounter ≥ SOLID.delayHrs after the first encounter
    if (now - rs.firstSeen >= SOLID.delayHrs * H) rs.delayedTimes.push(now);
    if (rs.delayedTimes.length > 8) rs.delayedTimes = rs.delayedTimes.slice(-8);
    rs.lastSeen = now;
    if (inProof && correct) rs.proofOK = true;
  }
  // timing samples
  if (seconds && seconds > 1 && seconds < 600) {
    const arr = s.timing[item.type === 'proof' ? 'proof' : item.type];
    if (arr) { arr.push(seconds); if (arr.length > 40) arr.shift(); }
  }
  save();
}

// Rule-level grading for proofreading (missed errors count as misses even though
// no single "item answer" happened for them).
export function recordProofRuleResult(ruleId, correct) {
  const rs = ruleStateFor(ruleId);
  const now = Date.now();
  rs.enc++; if (correct) rs.cor++;
  rs.recent.push(correct ? 1 : 0);
  if (rs.recent.length > 12) rs.recent = rs.recent.slice(-12);
  rs.forms.proof = true;
  if (!rs.firstSeen) rs.firstSeen = now;
  if (now - rs.firstSeen >= SOLID.delayHrs * H) rs.delayedTimes.push(now);
  if (rs.delayedTimes.length > 8) rs.delayedTimes = rs.delayedTimes.slice(-8);
  rs.lastSeen = now;
  if (correct) rs.proofOK = true;
  save();
}

// ---- scheduler ----
// Priorities: due reviews → recently-missed rules → low-mastery rules → rules
// lacking proof application → unseen items → occasional mastered resurfacing.

export function nextItem(sessionSeen, { allowProof = true } = {}) {
  const s = load();
  const now = Date.now();
  const pool = content.items.filter(i => !sessionSeen.has(i.id) && (allowProof || i.type !== 'proof'));
  if (!pool.length) return null;

  const scored = pool.map(item => {
    const ist = s.itemState[item.id];
    const rids = itemRuleIds(item);
    const rs0 = rids.map(r => ruleStateFor(r));
    const worstAcc = Math.min(...rs0.map(r => (r.recent.length ? recentAcc(r) : 0.5)));
    const mastery = rids.map(r => masteryOf(r));
    const anyNovice = mastery.includes('novice');
    const allAuto = mastery.every(m => m === 'auto');
    const w = Math.max(...rids.map(r => content.ruleById.get(r)?.weight || 1));
    let score = 0;
    if (ist && ist.nextDue <= now && ist.box > 0) score += 50 + Math.min(20, (now - ist.nextDue) / H); // overdue
    if (!ist) score += 25 + w * 4; // unseen, weighted by rule importance
    if (worstAcc < 0.6) score += 30;            // recently missed rules
    if (anyNovice) score += 12;
    if (item.type === 'proof' && rids.some(r => !ruleStateFor(r).proofOK && masteryOf(r) === 'solid')) score += 18;
    if (allAuto) score = ist && ist.nextDue <= now ? score : 2; // resurface mastered only occasionally
    if (ist && ist.nextDue > now) score -= 40;  // not due yet
    score += Math.random() * 8;                 // tie-break variety
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].item;
}

// ---- completion ----
// overall = 75% × weighted rule mastery + 25% × passages cleared.
// Credit: novice 0, solid 0.6, auto 1.0.

export function completion() {
  const s = load();
  let wSum = 0, wGot = 0;
  for (const r of content.rules) {
    const w = r.weight || 1;
    wSum += w;
    const m = masteryOf(r.id);
    wGot += w * (m === 'auto' ? 1 : m === 'solid' ? 0.6 : 0);
  }
  const ruleFrac = wSum ? wGot / wSum : 0;
  const totalP = content.proofItems.length;
  const clearedP = content.proofItems.filter(p => s.proof[p.id]?.cleared).length;
  const proofFrac = totalP ? clearedP / totalP : 0;
  const overall = 0.75 * ruleFrac + 0.25 * proofFrac;
  const autoCount = content.rules.filter(r => masteryOf(r.id) === 'auto').length;
  return { overall, ruleFrac, proofFrac, autoCount, ruleTotal: content.rules.length, clearedP, totalP };
}

// ---- hours-remaining estimate ----
// Defaults: mc 25 s, fixit 35 s, proof 180 s ×1.4 expected attempts. Once ≥15
// timed samples exist for a type, the user's median replaces the default.

const TIME_DEFAULTS = { mc: 25, fixit: 35, proof: 180 };

function median(arr) {
  const a = [...arr].sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
}

export function perItemSeconds() {
  const s = load();
  const out = {};
  let calibrating = false;
  for (const t of ['mc', 'fixit', 'proof']) {
    const samples = s.timing[t] || [];
    if (samples.length >= 15) out[t] = median(samples);
    else { out[t] = TIME_DEFAULTS[t]; calibrating = true; }
  }
  return { ...out, calibrating };
}

export function hoursRemaining() {
  const s = load();
  const t = perItemSeconds();
  let seconds = 0;
  for (const r of content.rules) {
    const rs = ruleStateFor(r.id);
    const m = masteryOf(r.id);
    if (m === 'auto') continue;
    let reps = Math.max(0, AUTO.enc - rs.enc);
    if (m === 'novice' && rs.enc >= SOLID.enc) reps = Math.max(reps, 6); // stuck: accuracy gap
    if (rs.recent.length >= 4 && recentAcc(rs) < 0.8) reps += 4;
    reps = Math.max(reps, m === 'solid' ? 3 : 6);
    // encounters arrive ~65% via quick-fire, 25% fix-it, 10% inside passages (no extra time)
    seconds += reps * (0.65 * t.mc + 0.25 * t.fixit);
  }
  for (const p of content.proofItems) {
    if (!s.proof[p.id]?.cleared) seconds += t.proof * 1.4;
  }
  const hours = seconds / 3600;
  return {
    hours,
    low: hours * 0.8,
    high: hours * 1.25,
    calibrating: t.calibrating,
  };
}

// ---- rewards ----

export function earnedTotal() {
  return load().ledger.reduce((a, e) => a + e.amount, 0);
}

export function award(reasonKey, reason, amount) {
  const s = load();
  if (amount <= 0) return false;
  if (reasonKey && s.milestones[reasonKey]) return false; // pay once
  if (reasonKey) s.milestones[reasonKey] = Date.now();
  s.ledger.unshift({ ts: Date.now(), reason, amount: Math.round(amount * 100) / 100 });
  if (s.ledger.length > 400) s.ledger.pop();
  save();
  return true;
}

// Qualified session: ≥10 graded items AND ≥5 min active; ≥3 h since the last
// qualified session; at most 2 per calendar day.
export function maybeSessionReward(session) {
  const s = load();
  const items = session.items || 0;
  const mins = (session.end - session.start) / 60000;
  if (items < 10 || mins < 5) return false;
  const today = new Date().toDateString();
  const qualifiedToday = s.sessions.filter(x => x.qualified && new Date(x.start).toDateString() === today).length;
  if (qualifiedToday >= 2) return false;
  const lastQ = s.sessions.filter(x => x.qualified).map(x => x.end).sort((a, b) => b - a)[0];
  if (lastQ && session.start - lastQ < 3 * H) return false;
  session.qualified = true;
  award(null, 'Qualified drilling session', s.settings.rwSession);
  return true;
}

// Category mastered / all passages / 100% — call after any grading event.
export function checkMilestones() {
  const s = load();
  const paid = [];
  for (const cat of content.categories) {
    const rules = content.rules.filter(r => r.categoryId === cat.id);
    if (rules.length && rules.every(r => masteryOf(r.id) === 'auto')) {
      if (award(`cat:${cat.id}`, `Category mastered: ${cat.name}`, s.settings.rwCategory)) paid.push(`Category mastered: ${cat.name} — $${s.settings.rwCategory}`);
    }
  }
  const c = completion();
  if (c.totalP && c.clearedP === c.totalP) {
    if (award('allpassages', 'All proofreading passages cleared', s.settings.rwAllPassages)) paid.push(`All passages cleared — $${s.settings.rwAllPassages}`);
  }
  if (c.overall >= 0.9999 && Date.now() < DEADLINE) {
    const topUp = Math.max(0, s.settings.watchBudget - earnedTotal());
    if (award('done100', 'Reached 100% before August 17 — watch fund topped up', topUp || 0.01)) {
      paid.push('100% complete — watch fund topped to full budget ⌚');
    }
  }
  return paid;
}

export function diagnosticReward() {
  const s = load();
  return award('diagnostic', 'Diagnostic completed', s.settings.rwDiagnostic);
}
