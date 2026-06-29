# SoundCore Gun-relay

Sanntid (vennechat, varsel, community-vegg) går over Gun.js. Dei offentlege relayane
synkar IKKJE mellom nettlesarar lenger (verifisert 2026-06-28: WS koplar, men relayen
lukkar sokkelen). **Ein eigen relay fiksar det** — verifisert lokalt: browser↔browser PASS
begge vegar mot `relay.js`.

## Val A — Deno Deploy (du valde denne)

1. Gå til **https://dash.deno.com** → logg inn med GitHub.
2. **New Playground** (eller New Project → Playground).
3. Lim inn heile innhaldet i [`deno-relay.ts`](deno-relay.ts).
4. **Save & Deploy**. Du får ein URL: `https://<namn>.deno.dev`.
5. Relay-endepunktet er **`https://<namn>.deno.dev/gun`**.
6. **Send meg URL-en.** Eg:
   - verifiserer browser↔browser-synk mot han (puppeteer, to isolerte nettlesarar),
   - og om den passerer: wirer han først i `GUN_PEERS` i [`../../js/realtime.js`](../../js/realtime.js)
     og [`../../js/chat.js`](../../js/chat.js), deployar og stadfestar live.

> Merk: Deno Deploy er flyktig (varmt isolat). Live-synk mellom tilkopla brukarar er
> hovudbruken og verkar. Om eit isolat kjølnar, kan lagra innlegg forsvinne. For varig
> lagring, sjå Val B.

## Val B — Render (Node, garantert + varig) — fallback

1. **https://render.com** → New → **Web Service** → kople GitHub-repoet.
2. Root: `tools/gun-relay`. Build: `npm i`. Start: `node relay.js`.
3. Relay-URL: `https://<service>.onrender.com/gun` → send meg han.

(`relay.js` er nøyaktig relayen som er verifisert lokalt. Sett `radisk:true` for varig disk.)

## Etter at relayen er oppe

GUN_PEERS-lista (i `realtime.js` + `chat.js`) får din relay **først**, så
`relay.peer.ooo` + `gun.defucc.me` som backup. Då fungerer:
- 1:1 vennechat + gruppe-lounge (live + ding),
- varsel ved opplasting/kommentar/innlegg,
- community-vegg + Innlegg-fane på tvers av brukarar.
