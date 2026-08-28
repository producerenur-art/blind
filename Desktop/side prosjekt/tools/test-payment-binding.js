#!/usr/bin/env node
/**
 * test-payment-binding.js — verifiserer at konto-bindingssjekken i
 * Payment.handleSuccessRedirect() (js/payment.js) IKKJE gir falske positiv for
 * ekte kjøparar, men FRAMLEIS blokkerer gjenbruk av ein annan konto sin sesjon.
 *
 * Køyrer den EKTE deployde payment.js i ekte Chrome. Berre HTTP-svaret frå
 * /api/verify-session stubbast (det er Stripe-sida, ikkje vår logikk) — sjølve
 * beslutninga (`result.username !== current.username`) køyrer urørt.
 *
 * Scenario:
 *   1) Ekte Pro-kjøp (same konto)        → oppgraderast til Pro, INGEN «annen konto»-feil.
 *   2) Ekte upload-hours-kjøp (same konto)→ får kreditt, INGEN «annen konto»-feil.
 *   3) Angrep: annan konto sin sesjon     → BLOKKERAST, ikkje oppgradert.
 *   4) Kant: metadata.username = null     → sjekk hoppast (dokumenterer åtferd).
 */
'use strict';
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon', '.woff2':'font/woff2' };

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      let file = path.join(ROOT, p);
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('nf'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

let passed = 0, failed = 0;
const ok = (n) => { passed++; console.log(`  \x1b[32m✓\x1b[0m ${n}`); };
const bad = (n, d) => { failed++; console.log(`  \x1b[31m✗\x1b[0m ${n}${d ? ' — ' + d : ''}`); };

// Kjør ett scenario: seeder `loginAs`, stubbar verify-svaret til `verifyResp`,
// simulerer retur frå Stripe (?payment_success=...) og køyrer handleSuccessRedirect.
async function runScenario(browser, { loginAs, verifyResp }) {
  const page = await browser.newPage();
  const BASE = page.__base;
  await page.evaluateOnNewDocument(`(function(){try{
    localStorage.setItem('pv_users', ${JSON.stringify(JSON.stringify({ [loginAs]: {
      username: loginAs, displayName: loginAs + ' Navn', password:'x', email: loginAs+'@t.no',
      createdAt: 1, activated:true, theme:null, bio:'', links:[], mediaIds:[], musicIds:[],
      avatarMediaId:null, bannerMediaId:null, followers:[], following:[], events:[], friends:[],
      friendRequests:[], sentRequests:[], mixIds:[], subscription:'free', role:'dj',
      labelName:'', buyUrl:'', profileVisibility:'public', uploadCreditSec:0 } }))});
    localStorage.setItem('pv_session', ${JSON.stringify(JSON.stringify({ username: loginAs, ts: 1 }))});
  }catch(e){}})();`);
  await page.goto(BASE + '/#/shop', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 1200));

  const result = await page.evaluate(async (verifyResp) => {
    const toasts = [];
    // Fang toasts. NB: App/Payment er leksikalske const (IKKJE på window) — bruk
    // bare namn, ikkje window.App/window.Payment (window-global-gotcha).
    if (typeof App !== 'undefined') { App.toast = (msg, type) => { toasts.push({ msg, type }); }; }
    // Stub berre HTTP-svaret frå Stripe-verifiseringa — logikken er urørt.
    const realFetch = window.fetch;
    window.fetch = async (url, opts) => {
      if (String(url).includes('/api/verify-session')) {
        return { ok: true, json: async () => verifyResp };
      }
      return realFetch(url, opts);
    };
    // Simuler retur frå Stripe
    history.replaceState({}, '', '/?payment_success=cs_live_FAKE123#/shop');
    const before = JSON.parse(localStorage.getItem('pv_users'))[JSON.parse(localStorage.getItem('pv_session')).username];
    await Payment.handleSuccessRedirect();
    await new Promise(r => setTimeout(r, 200));
    const after = JSON.parse(localStorage.getItem('pv_users'))[JSON.parse(localStorage.getItem('pv_session')).username];
    return {
      toasts,
      beforeSub: before.subscription, afterSub: after.subscription,
      beforeCredit: before.uploadCreditSec || 0, afterCredit: after.uploadCreditSec || 0,
      afterPlan: after.proPlan || null,
    };
  }, verifyResp);

  await page.close();
  return result;
}

(async () => {
  const srv = await startServer();
  const BASE = `http://127.0.0.1:${srv.address().port}`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
  const origNewPage = browser.newPage.bind(browser);
  browser.newPage = async () => { const p = await origNewPage(); p.__base = BASE; return p; };

  const hasBlockToast = (t) => t.toasts.some(x => /belongs to another account/i.test(x.msg));

  try {
    // 1) Ekte Pro-kjøp, same konto
    console.log('\n1) Ekte Pro-kjøp (kjøper1) — same konto som er innlogga');
    let r = await runScenario(browser, { loginAs: 'kjoper1', verifyResp: { success: true, username: 'kjoper1', plan: 'quarter', subscriptionId: 'sub_x' } });
    hasBlockToast(r) ? bad('INGEN falsk «annen konto»-feil', 'fekk blokkerings-toast!') : ok('ingen falsk «annen konto»-feil for ekte kjøpar');
    r.afterSub === 'pro' ? ok('kontoen blei oppgradert til Pro') : bad('kontoen blei oppgradert til Pro', 'sub=' + r.afterSub);
    r.afterPlan === 'quarter' ? ok('rett plan lagra (quarter)') : bad('rett plan lagra', 'plan=' + r.afterPlan);

    // 2) Ekte upload-hours-kjøp, same konto
    console.log('\n2) Ekte upload-hours-kjøp (kjøper1) — 2 timer, same konto');
    r = await runScenario(browser, { loginAs: 'kjoper1', verifyResp: { success: true, username: 'kjoper1', product: 'upload-hours', hours: 2 } });
    hasBlockToast(r) ? bad('INGEN falsk «annen konto»-feil', 'fekk blokkerings-toast!') : ok('ingen falsk «annen konto»-feil for ekte timekjøp');
    (r.afterCredit - r.beforeCredit) === 7200 ? ok('fekk 2 t (7200 s) opplastingskreditt') : bad('fekk 2 t kreditt', 'diff=' + (r.afterCredit - r.beforeCredit));
    r.afterSub === 'free' ? ok('timekjøp gav IKKJE Pro (rett — engangskjøp)') : bad('timekjøp gav ikkje Pro', 'sub=' + r.afterSub);

    // 3) Angrep: annan konto sin sesjon opna medan innlogga som kjøper2
    console.log('\n3) Angrep: sesjon høyrer kjøper1, men innlogga som kjøper2');
    r = await runScenario(browser, { loginAs: 'kjoper2', verifyResp: { success: true, username: 'kjoper1', plan: 'year', subscriptionId: 'sub_y' } });
    hasBlockToast(r) ? ok('blokkerings-toast vist («tilhører en annen konto»)') : bad('blokkerings-toast vist', 'ingen toast!');
    r.afterSub === 'free' ? ok('kjøper2 blei IKKJE oppgradert (angrep stoppa)') : bad('kjøper2 ikkje oppgradert', 'sub=' + r.afterSub);

    // 4) Kant: metadata.username mangler (null) → sjekken hoppast over
    console.log('\n4) Kant: verify returnerer username=null (gamal sesjon utan metadata)');
    r = await runScenario(browser, { loginAs: 'kjoper3', verifyResp: { success: true, username: null, plan: 'monthly', subscriptionId: 'sub_z' } });
    hasBlockToast(r) ? bad('ingen falsk feil ved null-username', 'blokkerte!') : ok('null-username → sjekk hoppast, ingen falsk feil');
    r.afterSub === 'pro' ? ok('oppgradert (dokumentert åtferd: null-username låser opp)') : bad('oppgradert ved null-username', 'sub=' + r.afterSub);

    console.log(`\n${failed ? '\x1b[31m' : '\x1b[32m'}${passed} ok, ${failed} feil${failed ? '' : ' ✅'}\x1b[0m\n`);
  } catch (e) {
    console.error('\x1b[31mTESTFEIL:\x1b[0m', e.message, '\n', e.stack);
    failed++;
  } finally {
    await browser.close();
    srv.close();
  }
  process.exit(failed ? 1 : 0);
})();
