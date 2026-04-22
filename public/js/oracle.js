/* Sorcery — Drunken Oracle */

import { getCurrentCocktail } from './divination.js';
import { esc } from './helpers.js';

// In-character error messages from PLAN §9 that the server may return.
// If the server sends one of these, we pass it through to the user as-is.
const KNOWN_ORACLE_ERRORS = new Set([
  "The oracle is confused.",
  "The oracle\u2019s chamber is empty.",
  "The oracle has passed out.",
  "The oracle was silent \u2014 perhaps a sign.",
  "The oracle sleeps. He will stir again at the witching hour (00:00 UTC).",
  "Incomplete cocktail payload."
]);

const ORACLE_PHRASES = [
  'the oracle stirs\u2026',
  'he finds his cup half-empty\u2026',
  'he is thinking, possibly\u2026',
  'he remembers something, or almost does\u2026'
];

let oraclePhraseInterval = null;
let oraclePhraseIndex = 0;

function startOraclePhraseCycle() {
  const el = document.getElementById('oracle-loading-phrase');
  oraclePhraseIndex = 0;
  el.textContent = ORACLE_PHRASES[0];
  oraclePhraseInterval = setInterval(() => {
    oraclePhraseIndex = (oraclePhraseIndex + 1) % ORACLE_PHRASES.length;
    el.textContent = ORACLE_PHRASES[oraclePhraseIndex];
  }, 2400);
}

function stopOraclePhraseCycle() {
  clearInterval(oraclePhraseInterval);
  oraclePhraseInterval = null;
}

export function resetOracle() {
  const btn = document.getElementById('oracle-btn');
  btn.style.display = '';
  btn.disabled = false;
  document.getElementById('oracle-loading').classList.remove('active');
  document.getElementById('oracle-panel').classList.remove('active');
  document.getElementById('oracle-panel').textContent = '';
  document.getElementById('oracle-error').classList.remove('active');
  document.getElementById('oracle-error').textContent = '';
}

export async function summonOracle() {
  const cocktail = getCurrentCocktail();
  if (!cocktail) return;

  const btn = document.getElementById('oracle-btn');
  btn.style.display = 'none';
  const loading = document.getElementById('oracle-loading');
  loading.classList.add('active');
  startOraclePhraseCycle();

  try {
    const resp = await fetch('/api/drunken-oracle', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mystical_name: cocktail.mystical_name,
        real_name: cocktail.real_name,
        tagline: cocktail.tagline,
        ingredients: cocktail.ingredients
      })
    });

    // Guard: verify we actually got JSON back, not an HTML error page
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('non-json-response');
    }

    const data = await resp.json();
    if (!resp.ok) {
      // Server returned a known in-character error — use it directly
      throw new Error(data.error || 'server-error');
    }

    const panel = document.getElementById('oracle-panel');
    panel.innerHTML = '<span class="oracle-quote-open">\u201C</span>'
        + esc(data.utterance)
        + '<span class="oracle-quote-close">\u201D</span>';
    panel.classList.add('active');
  } catch (err) {
    // NEVER expose raw JS error messages to the user.
    // Map to in-character strings from SORCERY-PLAN.md §9.
    let msg;
    const m = err.message;
    if (m === 'non-json-response') {
      msg = "The oracle\u2019s chamber is empty.";
    } else if (err.name === 'TypeError' && String(err).includes('fetch')) {
      msg = "The oracle could not be roused.";
    } else if (m === 'server-error') {
      msg = "The oracle has passed out. Try again when the moons are favourable.";
    } else if (KNOWN_ORACLE_ERRORS.has(m)) {
      // Server sent a known in-character error string — pass it through
      msg = m;
    } else {
      msg = "The oracle has passed out. Try again when the moons are favourable.";
    }
    const errorEl = document.getElementById('oracle-error');
    errorEl.textContent = msg;
    errorEl.classList.add('active');
  } finally {
    stopOraclePhraseCycle();
    loading.classList.remove('active');
  }
}
