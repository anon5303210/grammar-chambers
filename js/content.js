// content.js — loads and indexes the drill content (data/*.json).
// Content is versioned; the completion denominator is fixed per content version.

export const content = {
  version: null,
  categories: [],
  rules: [],
  items: [],        // all items (mc + fixit + proof)
  byRule: new Map(),
  byId: new Map(),
  ruleById: new Map(),
  catById: new Map(),
  proofItems: [],
  units: [],          // Blue Book companion units
  unitById: new Map(),
};

export async function loadContent() {
  const [rulesDoc, qf, fx, pr, bbG, bbP, bbC, bbW] = await Promise.all([
    fetchJson('./data/rules.json'),
    fetchJson('./data/quick-fire.json'),
    fetchJson('./data/fix-it.json'),
    fetchJson('./data/proofreading.json'),
    fetchJson('./data/bb-grammar.json'),
    fetchJson('./data/bb-punctuation.json'),
    fetchJson('./data/bb-capnum.json'),
    fetchJson('./data/bb-words.json'),
  ]);
  content.version = rulesDoc.contentVersion;
  content.categories = rulesDoc.categories;
  content.rules = rulesDoc.rules;
  content.units = [...bbG.units, ...bbP.units, ...bbC.units, ...bbW.units];
  content.unitById = new Map(content.units.map(u => [u.id, u]));
  // Unit items join the main pool so the spaced-repetition scheduler can serve
  // them too; they carry unitId so the Blue Book screen can find them again.
  const unitItems = content.units.flatMap(u =>
    u.items.map(i => ({ ...i, unitId: u.id })));
  content.items = [
    ...qf.items.map(i => ({ ...i, type: 'mc' })),
    ...fx.items.map(i => ({ ...i, type: 'fixit' })),
    ...pr.items.map(i => ({ ...i, type: 'proof' })),
    ...unitItems,
  ];
  content.proofItems = content.items.filter(i => i.type === 'proof');
  content.byId = new Map(content.items.map(i => [i.id, i]));
  content.ruleById = new Map(content.rules.map(r => [r.id, r]));
  content.catById = new Map(content.categories.map(c => [c.id, c]));
  content.byRule = new Map();
  for (const item of content.items) {
    for (const rid of itemRuleIds(item)) {
      if (!content.byRule.has(rid)) content.byRule.set(rid, []);
      content.byRule.get(rid).push(item);
    }
  }
  return content;
}

export function itemRuleIds(item) {
  if (item.type === 'proof') {
    return [...new Set((item.errors || []).map(e => e.ruleId))];
  }
  // 'spot' items are single sentences with 0–1 planted errors; the unit item
  // declares its own ruleId, which covers the zero-error ("leave it alone") case.
  return [item.ruleId, ...(item.secondaryRuleIds || [])].filter(Boolean);
}

// Does this rule appear as a planted error in at least one proofreading passage?
export function ruleHasProofCoverage(ruleId) {
  return content.proofItems.some(p => (p.errors || []).some(e => e.ruleId === ruleId));
}

// How many distinct drill formats exist for this rule? Mastery can't demand more
// forms than the content actually offers, or a thin rule would never reach Solid.
export function formsAvailable(ruleId) {
  const items = content.byRule.get(ruleId) || [];
  return new Set(items.map(i => i.type)).size || 1;
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}
