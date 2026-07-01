// Test for js/unsubscribe.js — avmeldingssiden for reklame-e-post (#/unsubscribe).
// Laster modulen i en vm-sandbox med minimale stubs (window/document/localStorage/Auth)
// og verifiserer opt-out/opt-in, e-post-normalisering, visninger og bruker-flagget.
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } };

// ── Stubs ────────────────────────────────────────────────────────────────
function makeStore() {
  const m = {};
  return {
    getItem: k => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; },
  };
}

function makeApp() {
  // Minimal #app-node som fanger innhold; ukjente id-er → null (wiring blir no-op).
  const appNode = { innerHTML: '' };
  const document = { getElementById: id => (id === 'app' ? appNode : null) };
  return { appNode, document };
}

function load(extra) {
  const { appNode, document } = makeApp();
  const window = {};
  let lastUpdate = null;
  const serverCalls = [];
  const sandbox = {
    window, document, console,
    localStorage: makeStore(),
    Icon: () => '',                 // ikoner irrelevante i test
    toast: () => {},
    Auth: extra && extra.Auth ? extra.Auth(u => { lastUpdate = u; }) : undefined,
    // AccountServer-stub kun når testen ber om det (ellers skal _serverSync no-ope).
    AccountServer: extra && extra.server ? {
      unsubscribe: e => { serverCalls.push(['unsubscribe', e]); return Promise.resolve({ success: true }); },
      resubscribe: e => { serverCalls.push(['resubscribe', e]); return Promise.resolve({ success: true }); },
    } : undefined,
  };
  sandbox.globalThis = sandbox;
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'unsubscribe.js'), 'utf8');
  vm.runInNewContext(code, sandbox);
  return { U: window.Unsubscribe, appNode, getUpdate: () => lastUpdate, serverCalls };
}

// ── 1) opt-out via e-post i lenka ────────────────────────────────────────
{
  const { U, appNode } = load();
  U.render('Test@Epost.no');
  ok(U.isOptedOut('test@epost.no'), 'opt-out registreres (normalisert til lowercase)');
  ok(U.isOptedOut('  TEST@epost.no  '), 'isOptedOut trimmer + ignorerer store/små bokstaver');
  ok(/Du er avmeldt/.test(appNode.innerHTML), 'bekreftelsesvisning sier «Du er avmeldt»');
  ok(appNode.innerHTML.includes('test@epost.no'), 'e-posten vises i bekreftelsen');
}

// ── 2) opt-in (meld på igjen) reverserer ─────────────────────────────────
{
  const { U } = load();
  U.optOut('a@b.com');
  ok(U.isOptedOut('a@b.com'), 'opt-out satt');
  U.optIn('a@b.com');
  ok(!U.isOptedOut('a@b.com'), 'opt-in fjerner opt-out');
}

// ── 3) uten e-post men innlogget → bruker brukerens e-post + setter flagg ─
{
  const AuthFactory = (onUpdate) => ({
    current: () => ({ username: 'dj_emanuel', email: 'emanuel@sound.no' }),
    updateUser: (username, data) => onUpdate({ username, data }),
  });
  const { U, appNode, getUpdate } = load({ Auth: AuthFactory });
  U.render();   // ingen e-post-arg
  ok(U.isOptedOut('emanuel@sound.no'), 'faller tilbake til innlogget brukers e-post');
  ok(appNode.innerHTML.includes('emanuel@sound.no'), 'brukerens e-post vises i bekreftelsen');
  const up = getUpdate();
  ok(up && up.username === 'dj_emanuel' && up.data.marketingOptOut === true,
     'setter marketingOptOut=true på den innloggede brukeren');
}

// ── 4) uten e-post og ikke innlogget → skjema-visning ────────────────────
{
  const { U, appNode } = load();   // ingen Auth
  U.render();
  ok(/Avmeld reklame/.test(appNode.innerHTML), 'viser skjema-tittel «Avmeld reklame»');
  ok(/id="unsub-email"/.test(appNode.innerHTML), 'skjema har e-post-felt');
  ok(!/Du er avmeldt/.test(appNode.innerHTML), 'ingen bekreftelse uten e-post');
}

// ── 5) tom/ugyldig e-post melder ikke av ─────────────────────────────────
{
  const { U } = load();
  ok(U.optOut('') === false, 'optOut("") avvises');
  ok(U.isOptedOut('') === false, 'tom e-post er aldri opted-out');
}

// ── 6) HTML i e-post escapes i bekreftelsen (ingen injection) ────────────
{
  const { U, appNode } = load();
  U.render('x"<b>@y.com');
  ok(!appNode.innerHTML.includes('<b>'), 'rå HTML i e-post escapes i visningen');
}

// ── 7) opt-out/opt-in speiles til serveren (best-effort) ─────────────────
{
  const { U, serverCalls } = load({ server: true });
  U.optOut('sync@test.com');
  ok(serverCalls.some(c => c[0] === 'unsubscribe' && c[1] === 'sync@test.com'),
     'optOut kaller AccountServer.unsubscribe med e-posten');
  U.optIn('sync@test.com');
  ok(serverCalls.some(c => c[0] === 'resubscribe' && c[1] === 'sync@test.com'),
     'optIn kaller AccountServer.resubscribe med e-posten');
}

// ── 8) uten AccountServer no-oper _serverSync (kaster ikke) ───────────────
{
  const { U } = load();   // ingen server-stub
  let threw = false;
  try { U.optOut('nostub@test.com'); } catch { threw = true; }
  ok(!threw, 'opt-out uten AccountServer kaster ikke (best-effort, lokal fasit)');
}

console.log(`\nunsubscribe: ${pass} passerte, ${fail} feilet`);
process.exit(fail ? 1 : 0);
