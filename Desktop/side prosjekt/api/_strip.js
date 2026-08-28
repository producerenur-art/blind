// _strip.js — reinsar AI-generert magasintekst før han når brukaren.
//
// Modellen tek av og til med kjeldemarkering i brødteksten — typisk
// `<cite index="15-4,15-5">…</cite>`, av og til `[12]`-referansar. Frontenden
// escapar teksten (som han skal), så markupen blir vist som bokstavleg tekst
// midt i ingressen — både på #/magazine/sjanger/* og i den vekentlege
// «kva er nytt»-e-posten.
//
// Delt mellom api/magazine.js (som lagar og les cachen) og api/send-email.js
// (som les same cache direkte). Blir brukt på LES, ikkje berre på skriv, slik at
// artiklar som alt ligg i magazine_cache blir reine med ein gong — utan å vente
// på at cron genererer dei på nytt.

// Ein HTML-tagg: <cite …>, </cite>, <b>, osv. Bevisst smal — krev at det som
// står etter `<` ser ut som eit taggnamn, så «5 < 7 in techno» overlever.
const TAG = /<\/?[a-z][a-z0-9]*(?:\s[^<>]*)?>/gi;
// Kjeldereferansar på forma [3] eller [12, 15]. Maks tre siffer, så eit årstal
// i klammer ([2026]) overlever — det er innhald, ikkje ein referanse.
const REF = /\[\s*\d{1,3}(?:\s*[,–-]\s*\d{1,3})*\s*\]/g;

function stripMarkup(s) {
  if (s == null) return '';
  return String(s)
    .replace(TAG, '')
    .replace(REF, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// Reinsar dei felta som faktisk blir viste. Muterer ikkje inn-objektet.
function cleanArticle(a) {
  if (!a || typeof a !== 'object') return a;
  const out = { ...a };
  for (const k of ['tittel', 'title', 'ingress', 'summary', 'brodtekst', 'body']) {
    if (typeof out[k] === 'string') out[k] = stripMarkup(out[k]);
  }
  if (out.kilde && typeof out.kilde === 'object' && typeof out.kilde.navn === 'string') {
    out.kilde = { ...out.kilde, navn: stripMarkup(out.kilde.navn) };
  }
  return out;
}

function cleanArticles(arr) {
  return Array.isArray(arr) ? arr.map(cleanArticle) : [];
}

module.exports = { stripMarkup, cleanArticle, cleanArticles };
