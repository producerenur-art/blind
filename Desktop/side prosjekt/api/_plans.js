// Delt prisliste for Sound Core Pro — AUTORITATIV kjelde for itemisert kvittering.
// Underscore-prefiks = ikkje ein Vercel-route; berre required av andre api-funksjonar.
// Beløp i øre (NOK). Lengre bindingstid = lågare månadspris.
const PLANS = {
  monthly: { key: 'monthly', amount:  14900, interval: 'month', interval_count: 1, months:  1, label: '1 måned',    perMonthKr: '149 kr', save: null    },
  quarter: { key: 'quarter', amount:  39900, interval: 'month', interval_count: 3, months:  3, label: '3 måneder',  perMonthKr: '133 kr', save: '11 %'  },
  half:    { key: 'half',    amount:  74900, interval: 'month', interval_count: 6, months:  6, label: '6 måneder',  perMonthKr: '125 kr', save: '16 %'  },
  year:    { key: 'year',    amount: 129000, interval: 'year',  interval_count: 1, months: 12, label: '12 måneder', perMonthKr: '108 kr', save: '28 %'  },
};

// Pro-fordelar — vist i kvittering og e-post.
const PRO_BENEFITS = [
  'DJ-mixes over 3 timer (opptil 20 t)',
  'Privat / offentlig synlighet på mixes',
  'Pro-badge på profilen',
  'Ubegrenset lagring',
  'Prioritert støtte',
];

function getPlan(key) { return PLANS[key] || PLANS.monthly; }

function fmtKr(ore) { return Math.round(ore / 100).toLocaleString('nb-NO') + ' kr'; }

function fmtDate(d) {
  return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Neste fornying = startdato + planens lengde.
function nextRenewal(planKey, from) {
  const p = getPlan(planKey);
  const d = new Date(from || Date.now());
  d.setMonth(d.getMonth() + p.months);
  return d;
}

module.exports = { PLANS, PRO_BENEFITS, getPlan, fmtKr, fmtDate, nextRenewal };
