/* Sorcery — Static divination flow */

import { esc, sleep } from './helpers.js';
import { getCocktails } from './data.js';
import { resetOracle } from './oracle.js';

let lastShownId = null;
let currentCocktail = null;
let phraseInterval = null;

const RUNES = ['🜀','🜂','🜄','🜔','🜛','🜚','🜻','🝔','♃','♄','☿','♆'];

const PHRASES = [
  'The candles gutter\u2026',
  'Reagents are summoned from shelf and shadow\u2026',
  'The sorcerer consults the spirits of bottled fire\u2026',
  'An ancient ratio reveals itself\u2026',
  'Your elixir takes shape\u2026'
];
let phraseIndex = 0;

export function getCurrentCocktail() {
  return currentCocktail;
}

export function initRuneRing() {
  const runeRing = document.getElementById('rune-ring');
  RUNES.forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'rune';
    span.textContent = char;
    const deg = (i / 12) * 360;
    span.style.transform = `rotate(${deg}deg) translateY(-62px) rotate(-${deg}deg)`;
    runeRing.appendChild(span);
  });
}

function transitionTo(state) {
  document.querySelectorAll('.state').forEach(el =>
    el.classList.remove('active', 'state-fade-in')
  );
  const target = document.getElementById('state-' + state);
  target.classList.add('active', 'state-fade-in');
}

function startPhraseCycle() {
  const el = document.getElementById('divining-phrase');
  const runeRing = document.getElementById('rune-ring');
  phraseIndex = 0;
  el.style.opacity = '1';
  el.textContent = PHRASES[0];
  runeRing.classList.add('spinning');

  phraseInterval = setInterval(() => {
    el.style.opacity = '0';
    setTimeout(() => {
      phraseIndex = (phraseIndex + 1) % PHRASES.length;
      el.textContent = PHRASES[phraseIndex];
      el.style.opacity = '1';
    }, 400);
  }, 2600);
}

function stopPhraseCycle() {
  clearInterval(phraseInterval);
  phraseInterval = null;
  document.getElementById('rune-ring').classList.remove('spinning');
}

function renderCocktail(c) {
  document.getElementById('r-mystical').textContent = c.mystical_name;
  document.getElementById('r-real').innerHTML =
    '&mdash; known to mortals as &ldquo;' + esc(c.real_name) + '&rdquo; &mdash;';
  document.getElementById('r-tagline').textContent = c.tagline;

  const reagentList = document.getElementById('r-reagents');
  reagentList.innerHTML = c.ingredients.map(ing =>
    '<li><span class="reagent-amount">' + esc(ing.amount) + '</span>' +
    '<span class="reagent-name">' + esc(ing.name) + '</span></li>'
  ).join('');

  const incList = document.getElementById('r-incantation');
  incList.innerHTML = c.instructions.map(step =>
    '<li>' + esc(step) + '</li>'
  ).join('');

  document.getElementById('r-glassware').textContent = c.glassware;
  document.getElementById('r-garnish').textContent = c.garnish;
  document.getElementById('r-omen').textContent = c.omen;
  document.getElementById('r-cost').textContent = c.cost_estimate;

  resetOracle();
}

export async function handleCast() {
  const tier = document.querySelector('input[name="tier"]:checked')?.value;
  const mood = document.querySelector('input[name="mood"]:checked')?.value;
  if (!tier || !mood) return;

  transitionTo('divining');
  startPhraseCycle();

  const cocktails = getCocktails();
  let candidates = cocktails.filter(c => c.tier === tier && c.moods.includes(mood));

  if (candidates.length === 0) {
    candidates = cocktails.filter(c => c.tier === tier);
  }
  if (lastShownId && candidates.length > 1) {
    candidates = candidates.filter(c => c.id !== lastShownId);
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  lastShownId = chosen.id;
  currentCocktail = chosen;

  await sleep(3200 + Math.random() * 600);

  stopPhraseCycle();
  transitionTo('result');
  renderCocktail(chosen);
}

export function handleReset() {
  currentCocktail = null;
  document.querySelectorAll('input[name="tier"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="mood"]').forEach(r => r.checked = false);
  document.getElementById('cast').disabled = true;
  transitionTo('inquiry');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
