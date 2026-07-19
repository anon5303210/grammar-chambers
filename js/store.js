// store.js — versioned localStorage persistence with backup, export/import,
// and corrupt-data recovery. Everything stays on-device.

const KEY = 'gc.v1';
const BAK = 'gc.v1.bak';

export const DEFAULT_SETTINGS = {
  fontScale: '1',
  theme: 'auto',
  strict: false,
  watchBudget: 225,
  rwSession: 2,
  rwCategory: 15,
  rwDiagnostic: 10,
  rwAllPassages: 25,
};

export function freshState() {
  return {
    schemaVersion: 1,
    contentVersion: null,
    createdAt: Date.now(),
    settings: { ...DEFAULT_SETTINGS },
    // per-rule learning state
    ruleState: {},   // ruleId -> {enc, cor, recent:[], forms:{}, firstSeen, lastSeen, delayedTimes:[], proofOK}
    // per-item spaced-repetition state
    itemState: {},   // itemId -> {seen, cor, lastSeen, nextDue, box}
    proof: {},       // itemId -> {attempts, cleared, bestScore}
    ledger: [],      // {ts, reason, amount, key}
    milestones: {},  // milestoneKey -> ts (pay-once guard)
    sessions: [],    // {start, end, items, correct, qualified}
    diag: { started: false, done: false, idx: 0, queue: [], results: [] },
    timing: { mc: [], fixit: [], proof: [] }, // seconds samples (most recent 40)
    saves: 0,
  };
}

let state = null;

export function load() {
  if (state) return state;
  state = tryParse(localStorage.getItem(KEY));
  if (!state) {
    const bak = tryParse(localStorage.getItem(BAK));
    if (bak) {
      state = bak;
      toastQueue.push('Recovered progress from automatic backup.');
    }
  }
  if (!state) state = freshState();
  // forward-compatible defaults for any keys added later
  const fresh = freshState();
  for (const k of Object.keys(fresh)) if (state[k] === undefined) state[k] = fresh[k];
  for (const k of Object.keys(fresh.settings)) if (state.settings[k] === undefined) state.settings[k] = fresh.settings[k];
  return state;
}

function tryParse(raw) {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (s && typeof s === 'object' && s.schemaVersion === 1) return s;
  } catch { /* corrupt */ }
  return null;
}

export const toastQueue = [];

export function save() {
  if (!state) return;
  state.saves = (state.saves || 0) + 1;
  const raw = JSON.stringify(state);
  try {
    localStorage.setItem(KEY, raw);
    if (state.saves % 15 === 0) localStorage.setItem(BAK, raw);
  } catch {
    // storage full or blocked — nothing sane to do beyond not crashing
  }
}

export function exportBlob() {
  return new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
}

export function importFrom(text) {
  const s = tryParse(text);
  if (!s) throw new Error('That file is not a valid Grammar Chambers backup.');
  localStorage.setItem(BAK, localStorage.getItem(KEY) || '');
  state = s;
  save();
  return state;
}

export function resetAll() {
  localStorage.setItem(BAK, localStorage.getItem(KEY) || '');
  state = freshState();
  save();
  return state;
}
