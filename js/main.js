// main.js — boot sequence.
import { load, save } from './store.js';
import { loadContent, content } from './content.js';
import { show, wireEvents, applyDisplaySettings, toast } from './ui.js';

async function boot() {
  const s = load();
  try {
    await loadContent();
  } catch (err) {
    document.body.innerHTML =
      `<div style="padding:40px 24px;font-family:sans-serif;text-align:center">
        <h2>Couldn't load the drill content</h2>
        <p>${String(err.message || err)}</p>
        <p>Check your connection and reload — your progress is safe.</p>
      </div>`;
    return;
  }
  if (!s.contentVersion) { s.contentVersion = content.version; save(); }
  else if (s.contentVersion !== content.version) {
    // Content expanded: keep all progress; the denominator change is announced, not silent.
    s.contentVersion = content.version;
    save();
    setTimeout(() => toast('New drill content added — your completion bar now includes it.', 4500), 600);
  }
  applyDisplaySettings();
  wireEvents();
  show('home');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* PWA optional */ });
  }
}

boot();
