#!/usr/bin/env node
/**
 * preview-digest-email.js — byggjer den vekentlege «kva er nytt»-e-posten
 * (api/send-email.js, type:'live_now') med EKTE innhald frå live, og lagrar
 * han som HTML + skjermbilete. Sender ingenting.
 *
 * Køyr:  node tools/preview-digest-email.js
 *        node tools/preview-digest-email.js --send din@epost.no   (sender for ekte)
 *
 * Kvifor: på produksjon manglar SUPABASE_SERVICE_ROLE_KEY, så readMagazine()
 * returnerer tomt og cron-jobben feilar før han kjem så langt. Her hentar vi
 * dei same artiklane frå det opne /api/magazine i staden, slik at vi kan sjå
 * korleis e-posten SKAL sjå ut når serveren er rett konfigurert.
 */
'use strict';
const path = require('path');
const fs   = require('fs');

const ROOT = path.join(__dirname, '..');
const BASE = 'https://www.siriusfm.no';
const argv = process.argv.slice(2);
const sendTo = argv.includes('--send') ? argv[argv.indexOf('--send') + 1] : null;

// Fang e-posten i staden for å sende, med mindre --send er gitt.
let captured = null;
if (!sendTo) {
  const resendPath = require.resolve('resend', { paths: [ROOT] });
  require.cache[resendPath] = {
    id: resendPath, filename: resendPath, loaded: true,
    exports: { Resend: class { constructor() { this.emails = { send: async (o) => { captured = o; return { data: { id: 'preview' }, error: null }; } }; } } },
  };
  process.env.RESEND_API_KEY = 'preview_key';
} else {
  const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  for (const line of env.split('\n')) {
    if (!line.includes('=') || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    if (k === 'RESEND_API_KEY') process.env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
}
process.env.SITE_URL = BASE;

const handler = require(path.join(ROOT, 'api', 'send-email.js'));

const mkRes = () => {
  const r = { statusCode: 0, body: null };
  r.status = c => { r.statusCode = c; return r; };
  r.json = b => { r.body = b; return r; };
  r.setHeader = () => {}; r.end = () => r;
  return r;
};

(async () => {
  // Hent det EKTE magasininnhaldet frå live, same kjelde som sida viser.
  const arts = await fetch(`${BASE}/api/magazine`)
    .then(r => r.json()).then(j => j.articles || []).catch(() => []);
  const fest = await fetch(`${BASE}/api/magazine?genre=festivals`)
    .then(r => r.json()).then(j => j.articles || []).catch(() => []);

  console.log(`Magasinsaker frå live: ${arts.length}   festivalsaker: ${fest.length}`);
  const interviews = handler.pickInterviews(arts, 3);
  const shown = new Set(interviews.map(a => a.tittel || a.title));
  const magazine = arts.filter(a => !shown.has(a.tittel || a.title)).slice(0, 3);
  console.log(`→ intervju: ${interviews.length}, nytt i magasinet: ${magazine.length}`);
  interviews.forEach(a => console.log(`   [intervju] ${a.tittel || a.title}`));
  magazine.forEach(a => console.log(`   [magasin]  ${a.tittel || a.title}`));

  const res = mkRes();
  await handler({
    method: 'POST', headers: {}, query: {},
    body: {
      type: 'live_now',
      toEmail: sendTo || 'preview@example.com',
      toName: 'Test Bruker',
      interviews, magazine, festivals: fest.slice(0, 3),
    },
  }, res);

  console.log(`\nhandler → ${res.statusCode}`, JSON.stringify(res.body));

  if (sendTo) { console.log(`Sendt til ${sendTo}`); return; }
  if (!captured) { console.log('Ingen e-post bygd — sjå status over.'); process.exit(1); }

  const out = path.join(__dirname, '_shots', 'digest-email.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, captured.html, 'utf8');
  console.log(`\nEmne:  ${captured.subject}`);
  console.log(`HTML:  ${out}  (${captured.html.length} teikn)`);

  // Kva seksjonar kom faktisk med?
  for (const [label, re] of [
    ['Live no',            /live now|listening now|on air/i],
    ['Radioprogram',       /shows?|schedule/i],
    ['Nytt i magasinet',   /magazine/i],
    ['Intervju',           /interview/i],
    ['Festivalar',         /festival/i],
    ['Arrangement',        /event|part(y|ies)/i],
    ['Avmeldingslenke',    /unsubscribe/i],
  ]) console.log(`  ${re.test(captured.html) ? '✓' : '✗'} ${label}`);

  // Skjermbilete av e-posten
  try {
    const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer-core'));
    const b = await puppeteer.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: 'new', args: ['--no-sandbox'],
    });
    const p = await b.newPage();
    await p.setViewport({ width: 700, height: 1200 });
    await p.goto('file://' + out, { waitUntil: 'networkidle2', timeout: 30000 });
    const png = path.join(__dirname, '_shots', 'digest-email.png');
    await p.screenshot({ path: png, fullPage: true });
    await b.close();
    console.log(`Bilete: ${png}`);
  } catch (e) { console.log('(kunne ikkje ta skjermbilete:', e.message, ')'); }
})().catch(e => { console.error('FATAL', e); process.exit(2); });
