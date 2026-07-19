// Content validator — the build is not done unless this passes.
// Run: node tests/content-validator.js
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const rulesDoc = JSON.parse(fs.readFileSync(path.join(dataDir, 'rules.json'), 'utf8'));
const qf = JSON.parse(fs.readFileSync(path.join(dataDir, 'quick-fire.json'), 'utf8'));
const fx = JSON.parse(fs.readFileSync(path.join(dataDir, 'fix-it.json'), 'utf8'));
const pr = JSON.parse(fs.readFileSync(path.join(dataDir, 'proofreading.json'), 'utf8'));

const errors = [];
const warn = [];
const ruleIds = new Set(rulesDoc.rules.map(r => r.id));
const catIds = new Set(rulesDoc.categories.map(c => c.id));
const seenIds = new Set();

for (const r of rulesDoc.rules) {
  if (!catIds.has(r.categoryId)) errors.push(`rule ${r.id}: unknown category ${r.categoryId}`);
  if (!r.name || !r.summary || !r.weight) errors.push(`rule ${r.id}: missing name/summary/weight`);
}

function checkId(id, where) {
  if (seenIds.has(id)) errors.push(`duplicate id ${id} (${where})`);
  seenIds.add(id);
}

const promptSeen = new Map();
for (const it of qf.items) {
  checkId(it.id, 'quick-fire');
  if (!ruleIds.has(it.ruleId)) errors.push(`${it.id}: unknown rule ${it.ruleId}`);
  if (!it.prompt) errors.push(`${it.id}: missing prompt`);
  if (!Array.isArray(it.options) || it.options.length < 2) errors.push(`${it.id}: needs >=2 options`);
  else {
    if (new Set(it.options).size !== it.options.length) errors.push(`${it.id}: duplicate options`);
    if (typeof it.answer !== 'number' || it.answer < 0 || it.answer >= it.options.length) errors.push(`${it.id}: answer out of range`);
  }
  if (!it.explanation || it.explanation.length < 20) errors.push(`${it.id}: explanation missing/too short`);
  const pkey = (it.prompt + '|' + (it.options || [])[0]).toLowerCase();
  if (promptSeen.has(pkey)) warn.push(`${it.id}: near-duplicate of ${promptSeen.get(pkey)}`);
  promptSeen.set(pkey, it.id);
}

for (const it of fx.items) {
  checkId(it.id, 'fix-it');
  if (!ruleIds.has(it.ruleId)) errors.push(`${it.id}: unknown rule ${it.ruleId}`);
  if (!Array.isArray(it.tokens) || it.tokens.length < 3) errors.push(`${it.id}: tokens missing`);
  if (typeof it.errorIndex !== 'number' || it.errorIndex < 0 || it.errorIndex >= it.tokens.length) errors.push(`${it.id}: errorIndex out of range`);
  if (!Array.isArray(it.choices) || it.choices.length < 2) errors.push(`${it.id}: needs >=2 choices`);
  else {
    if (new Set(it.choices).size !== it.choices.length) errors.push(`${it.id}: duplicate choices`);
    if (typeof it.answer !== 'number' || it.answer < 0 || it.answer >= it.choices.length) errors.push(`${it.id}: answer out of range`);
    // the correction must actually change the token
    if (it.choices[it.answer] === it.tokens[it.errorIndex]) errors.push(`${it.id}: correct choice equals the defective token`);
    // the original (wrong) token should appear among choices as a distractor guard
    if (!it.choices.includes(it.tokens[it.errorIndex])) warn.push(`${it.id}: original token not among choices`);
  }
  if (!it.explanation || it.explanation.length < 20) errors.push(`${it.id}: explanation missing/too short`);
}

for (const it of pr.items) {
  checkId(it.id, 'proofreading');
  if (!it.title || !it.function) errors.push(`${it.id}: missing title/function`);
  if (!Array.isArray(it.tokens) || it.tokens.length < 10) errors.push(`${it.id}: tokens missing`);
  if (!Array.isArray(it.errors)) { errors.push(`${it.id}: errors array missing`); continue; }
  if (it.errors.length > 3) errors.push(`${it.id}: more than 3 planted errors`);
  for (const [i, e] of it.errors.entries()) {
    const len = e.len || 1;
    if (typeof e.at !== 'number' || e.at < 0 || e.at + len > it.tokens.length) { errors.push(`${it.id} error ${i}: span out of range`); continue; }
    const actual = it.tokens.slice(e.at, e.at + len).join(' ');
    if (e.token !== undefined && actual !== e.token) errors.push(`${it.id} error ${i}: token mismatch — expected "${e.token}", tokens say "${actual}"`);
    if (!ruleIds.has(e.ruleId)) errors.push(`${it.id} error ${i}: unknown rule ${e.ruleId}`);
    if (!Array.isArray(e.choices) || e.choices.length < 2) errors.push(`${it.id} error ${i}: needs >=2 choices`);
    else {
      if (new Set(e.choices).size !== e.choices.length) errors.push(`${it.id} error ${i}: duplicate choices`);
      if (typeof e.answer !== 'number' || e.answer < 0 || e.answer >= e.choices.length) errors.push(`${it.id} error ${i}: answer out of range`);
      if (e.choices[e.answer] === actual) errors.push(`${it.id} error ${i}: correct choice equals the defective span`);
    }
    if (!e.explanation || e.explanation.length < 20) errors.push(`${it.id} error ${i}: explanation missing/too short`);
  }
}

// coverage: every rule needs at least one item; report counts
const counts = {};
const proofCovered = new Set();
for (const it of qf.items) counts[it.ruleId] = (counts[it.ruleId] || 0) + 1;
for (const it of fx.items) counts[it.ruleId] = (counts[it.ruleId] || 0) + 1;
for (const it of pr.items) for (const e of it.errors) { counts[e.ruleId] = (counts[e.ruleId] || 0) + 1; proofCovered.add(e.ruleId); }
for (const r of rulesDoc.rules) {
  if (!counts[r.id]) errors.push(`rule ${r.id}: no items at all`);
  else if (counts[r.id] < 3) warn.push(`rule ${r.id}: only ${counts[r.id]} items`);
}

const diagCount = [...qf.items, ...fx.items].filter(i => i.diagnostic).length;
const zeroErr = pr.items.filter(p => p.errors.length === 0).length;

console.log(`content ${rulesDoc.contentVersion}: ${qf.items.length} quick-fire, ${fx.items.length} fix-it, ${pr.items.length} passages (${zeroErr} zero-error), ${rulesDoc.rules.length} rules, ${diagCount} diagnostic items`);
console.log(`rules with proofreading coverage: ${proofCovered.size}/${rulesDoc.rules.length}`);
if (warn.length) { console.log(`\nWARNINGS (${warn.length}):`); warn.forEach(w => console.log('  ⚠ ' + w)); }
if (errors.length) { console.log(`\nERRORS (${errors.length}):`); errors.forEach(e => console.log('  ✗ ' + e)); process.exit(1); }
console.log('\nAll checks passed.');
