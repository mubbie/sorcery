/* Sorcery — App entry point */

import { loadCocktails } from './data.js';
import { initRuneRing, handleCast, handleReset, handleDirectDrink } from './divination.js';
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
document.getElementById('share-btn').addEventListener('click', () => {
  const btn = document.getElementById('share-btn');
  const original = btn.innerHTML;
  navigator.clipboard.writeText(window.location.href).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => btn.innerHTML = original, 1500);
  }).catch(() => {
    btn.textContent = 'Could not copy';
    setTimeout(() => btn.innerHTML = original, 1500);
  });
});

/* Init */
initRuneRing();

const VALID_TIERS = ['tavern', 'merchant', 'alchemist', 'archmage'];
const VALID_MOODS = ['brooding', 'celebratory', 'contemplative', 'amorous', 'courageous', 'weary'];

loadCocktails().then(() => {
  const params = new URLSearchParams(window.location.search);

  // Direct drink link — skip everything, show the exact drink
  const drinkId = params.get('drink');
  if (drinkId && handleDirectDrink(drinkId)) return;

  // Random or tier+mood selection
  const random = params.get('random');
  let tier = params.get('tier');
  let mood = params.get('mood');

  if (random === 'true') {
    tier = tier && VALID_TIERS.includes(tier) ? tier : VALID_TIERS[Math.floor(Math.random() * VALID_TIERS.length)];
    mood = mood && VALID_MOODS.includes(mood) ? mood : VALID_MOODS[Math.floor(Math.random() * VALID_MOODS.length)];
  }

  if (VALID_TIERS.includes(tier) && VALID_MOODS.includes(mood)) {
    const tierRadio = document.querySelector(`input[name="tier"][value="${tier}"]`);
    const moodRadio = document.querySelector(`input[name="mood"][value="${mood}"]`);
    if (tierRadio) tierRadio.checked = true;
    if (moodRadio) moodRadio.checked = true;
    updateCastButton();
    handleCast();
  }
}).catch(err => console.error('Failed to load cocktails:', err));
