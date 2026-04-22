/* Sorcery — Shared helpers */

export function esc(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])
  );
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
