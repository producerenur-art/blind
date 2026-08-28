// E2E: Aksepter/Avslå venneforespurnad rett i varselpanelet (bjelle-dropdown).
// Køyrer mot LIVE siriusfm.no med system-Chrome (puppeteer-core). Registrerer to
// brukarar lokalt i same nettlesar, simulerer at A si forespurnad landar hos B
// (same veg som Gun-varselet: Notify.emit → onIncoming), opnar bjella, og
// verifiserer at Accept/Deny-knappane dukkar opp OG at Accept faktisk gjer venner.
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'https://www.siriusfm.no';

const A = { u: 'e2e_alice_' + Math.floor(Date.now() / 1000), name: 'E2E Alice' };
const B = { u: 'e2e_bob_'   + Math.floor(Date.now() / 1000), name: 'E2E Bob'   };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  const fail = (msg) => { console.error('❌ FAIL:', msg); };
  let ok = true;

  await page.goto(BASE + '/#/', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => typeof Auth !== 'undefined' && typeof Notify !== 'undefined', { timeout: 30000 });

  // 1) Registrer + aktiver begge brukarane, logg inn som B (mottakaren).
  const setup = await page.evaluate((A, B) => {
    const reg = (x) => {
      const r = Auth.register(x.u, 'Passord!23', x.name, x.u + '@e2e.test');
      if (r && r.activationToken) Auth.activate(r.activationToken);
      return !!Auth.getUser(x.u);
    };
    const okA = reg(A), okB = reg(B);
    Auth.login(B.u, 'Passord!23');
    const me = Auth.current();
    return { okA, okB, loggedIn: me && me.username };
  }, A, B);
  if (!setup.okA || !setup.okB) { fail('kunne ikkje registrere testbrukarar'); ok = false; }
  if (setup.loggedIn !== B.u) { fail('ikkje logga inn som B, fekk: ' + setup.loggedIn); ok = false; }

  // Re-init varsel for innlogga B og send forespurnaden A→B via same payload som
  // Social.friendAction('add') brukar (type friend_request). Køyrer onIncoming-vegen
  // manuelt sidan Gun-relay ikkje er garantert i headless: skriv inn forespurnaden
  // + legg varselet i B si liste, akkurat slik onIncoming gjer det.
  await page.evaluate((A, B) => {
    Notify.init();
    Auth.receiveFriendRequest(B.u, A.u, Date.now());   // forespurnaden landar hos B
    Notify.pushLocal({ type: 'friend_request', from: A.u, fromDisplay: A.name,
      text: 'sent you a friend request', link: '#/u/' + A.u, ts: Date.now() });
  }, A, B);

  // 2) Status skal vere pending_received, og panelet skal vise Accept + Deny.
  const beforeStatus = await page.evaluate((A, B) => Auth.getFriendStatus(B.u, A.u), A, B);
  if (beforeStatus !== 'pending_received') { fail('forventa pending_received, fekk: ' + beforeStatus); ok = false; }

  await page.evaluate(() => Notify.openPanel());
  await page.waitForSelector('.sc-notif-item-fr', { timeout: 8000 }).catch(() => {});
  const hasBtns = await page.evaluate(() => ({
    accept: !!document.querySelector('.sc-notif-fr-btn.accept'),
    deny:   !!document.querySelector('.sc-notif-fr-btn.deny'),
    acceptText: (document.querySelector('.sc-notif-fr-btn.accept')?.textContent || '').trim(),
    denyText:   (document.querySelector('.sc-notif-fr-btn.deny')?.textContent || '').trim(),
  }));
  if (!hasBtns.accept || !hasBtns.deny) { fail('Accept/Deny-knappar mangla i panelet: ' + JSON.stringify(hasBtns)); ok = false; }
  else console.log('✓ Panelet viser knappar:', JSON.stringify(hasBtns));

  // 3) Klikk Accept → skal bli venner + knappane byter til statuslinje.
  await page.evaluate(() => document.querySelector('.sc-notif-fr-btn.accept').click());
  await page.waitForFunction(() => document.querySelector('.sc-notif-fr-done'), { timeout: 8000 }).catch(() => {});
  const afterAccept = await page.evaluate((A, B) => ({
    status: Auth.getFriendStatus(B.u, A.u),
    friends: (Auth.getUser(B.u).friends || []).includes(A.u),
    doneShown: !!document.querySelector('.sc-notif-fr-done'),
    btnsGone: !document.querySelector('.sc-notif-fr-btn'),
  }), A, B);
  if (afterAccept.status !== 'friends') { fail('etter Accept: status = ' + afterAccept.status); ok = false; }
  if (!afterAccept.friends) { fail('etter Accept: B har ikkje A i friends'); ok = false; }
  if (!afterAccept.doneShown) { fail('etter Accept: statuslinje «You are now friends» mangla'); ok = false; }
  if (ok) console.log('✓ Accept: no venner, knappar → statuslinje', JSON.stringify(afterAccept));

  // 4) DENY-test: ny mottakar C avviser ein forespurnad frå A.
  const C = { u: 'e2e_cara_' + Math.floor(Date.now() / 1000), name: 'E2E Cara' };
  await page.evaluate((A, C) => {
    const r = Auth.register(C.u, 'Passord!23', C.name, C.u + '@e2e.test');
    if (r && r.activationToken) Auth.activate(r.activationToken);
    Auth.login(C.u, 'Passord!23');
    Notify.init();
    Auth.receiveFriendRequest(C.u, A.u, Date.now());
    Notify.pushLocal({ type: 'friend_request', from: A.u, fromDisplay: A.name,
      text: 'sent you a friend request', link: '#/u/' + A.u, ts: Date.now() });
    Notify.openPanel();
  }, A, C);
  await page.waitForSelector('.sc-notif-fr-btn.deny', { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('.sc-notif-fr-btn.deny').click());
  await page.waitForFunction(() => !document.querySelector('.sc-notif-fr-btn'), { timeout: 8000 }).catch(() => {});
  const afterDeny = await page.evaluate((A, C) => ({
    status: Auth.getFriendStatus(C.u, A.u),
    friends: (Auth.getUser(C.u).friends || []).includes(A.u),
    btnsGone: !document.querySelector('.sc-notif-fr-btn'),
  }), A, C);
  if (afterDeny.status !== 'none') { fail('etter Deny: status = ' + afterDeny.status); ok = false; }
  if (afterDeny.friends) { fail('etter Deny: C vart likevel venn'); ok = false; }
  if (!afterDeny.btnsGone) { fail('etter Deny: knappane forsvann ikkje'); ok = false; }
  if (ok) console.log('✓ Deny: ingen venn, knappar borte', JSON.stringify(afterDeny));

  const realErrs = errs.filter(e => !/Failed to load resource|net::ERR_|favicon|Translate|gstatic|CSP|Content Security|cookie/i.test(e));
  if (realErrs.length) { console.error('⚠️  JS-feil:', realErrs.slice(0, 5)); }

  await browser.close();
  console.log(ok && !realErrs.length ? '\n✅ ALLE SJEKKAR PASSERTE' : '\n❌ TEST FEILA');
  process.exit(ok && !realErrs.length ? 0 : 1);
})().catch(e => { console.error('KRASJ:', e); process.exit(1); });
