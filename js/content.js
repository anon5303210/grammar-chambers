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
};

export async function loadContent() {
  const [rulesDoc, qf, fx, pr] = await Promise.all([
    fetchJson('./data/rules.json'),
    fetchJson('./data/quick-fire.json'),
    fetchJson('./data/fix-it.json'),
    fetchJson('./data/proofreading.json'),
  ]);
  content.version = rulesDoc.contentVersion;
  content.categories = rulesDoc.categories;
  content.rules = rulesDoc.rules;
  content.items = [
    ...qf.items.map(i => ({ ...i, type: 'mc' })),
    ...fx.items.map(i => ({ ...i, type: 'fixit' })),
    ...pr.items.map(i => ({ ...i, type: 'proof' })),
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
  return [item.ruleId, ...(item.secondaryRuleIds || [])].filter(Boolean);
}

// Does this rule appear as a planted error in at least one proofreading passage?
export function ruleHasProofCoverage(ruleId) {
  return content.proofItems.some(p => (p.errors || []).some(e => e.ruleId === ruleId));
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}
