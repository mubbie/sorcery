/* Sorcery — App entry point */

import { loadCocktails } from './data.js';
import { initRuneRing, handleCast, handleReset } from './divination.js';
import { summonOracle } from './oracle.js';

function updateCastButton() {
  const tier = document.querySelector('input[name="tier"]:checked');
  const mood = document.querySelector('input[name="mood"]:checked');
  document.getElementById('cast').disabled = !(tier && mood);
}

/* Wire up event listeners */
document.querySelectorAll('input[name="tier"], input[name="mood"]').forEach(input => {
  input.addEventListener('change', updateCastButton);
});

document.getElementById('cast').addEventListener('click', handleCast);
document.getElementById('oracle-btn').addEventListener('click', summonOracle);
document.getElementById('reset-btn').addEventListener('click', handleReset);

/* Init */
initRuneRing();
loadCocktails().catch(err => console.error('Failed to load cocktails:', err));
