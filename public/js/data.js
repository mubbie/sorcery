/* Sorcery — Cocktail data loader */

let cocktails = [];

export async function loadCocktails() {
  const tiers = ['tavern', 'merchant', 'alchemist', 'archmage'];
  const results = await Promise.all(
    tiers.map(t => fetch(`data/${t}.json`).then(r => r.json()))
  );
  cocktails = results.flat();
}

export function getCocktails() {
  return cocktails;
}
