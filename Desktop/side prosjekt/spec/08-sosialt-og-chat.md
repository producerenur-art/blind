# 08 — Sosialt lag og chat (Gun.js sanntid)

**Formål:** Alt sanntids-sosialt: radio-chat, venner/presence, vennechat, kommentarer/
reaksjoner, community-vegg, varsler, og 1:1 privatmelding. Foundationen er `realtime.js`
(`SC`). Se Gun-noder/relays i [[00-arkitektur]].

## Felles fundament — `realtime.js` (`SC`)

Delt Gun-instans + presence + lyd-ding (Web Audio, ingen fil) + HTML-escape.
- `SC.gun()` (lazy), `SC.NS` (navnerom), `SC.channelKey(a,b)` (stabil 1:1-nøkkel),
  `SC.sub(ref, cb)` (dedup-abonnement), `SC.playDing('message'|'notif')`,
  `SC.soundOn/setSound/toggleSound`, `SC.startPresence(username)`, `SC.isOnline(username)`
  (< ~70s heartbeat), `SC.esc()`. Lyd på/av i `pv_sound_on`.

## Radio-chat (`chat.js`, `Chat`, `#/chat` + flytende vindu)

Sanntids global radio-chat: nick + fargevelger, emoji-reaksjoner (16 forhåndsvalg), auto-
lenking av URL-er, historikk (maks 120), online/offline-status med localStorage-fallback.
**Radio-fane** (40+ stasjoner, søk, nå-spilles-footer) og **YouTube-fane** (bygg inn live-
stream via URL). Flytende, drabar, minimer/maksimer; tilstand i `pv_chat_float`.
- Gun: `gun.get('profilverse_radio_chat_v1').get('messages')`. localStorage: `pv_chat_nick`,
  `pv_chat_color`, `pv_yt_stream`, `pv_chat_float`, `pv_chat_fallback`.
- Metoder: `render/renderFloat/sendMessage/insertEmoji/showNickEdit/saveNick/clearMessages/
  showTab/playRadioStation/toggleRadioPlay/onRadioSearch/playSearchRadio/quickColor/
  loadYoutube/clearYoutube/toggleMinimize/toggleFloat`.

## Venner (`friends.js`, `Friends`, `#/friends`)

To faner: **Online nå** (presence, venner først) og **Mine venner**. Rød/grønn venneprikk på
kort. Handlinger: legg til / avbryt / godta / avslå / fjern / send DM (kun venner). Test-admin
`@soundcore_admin` kan seedes/fjernes (auto-godtar) for testing.
- Metoder: `render/init/setTab/friendAction/openChat/seed/unseed`.

## Vennechat (`friendchat.js`, `FriendChat`)

Flytende dock (nede til høyre), 1:1-samtaler + gruppe-lounge, uleste-badges, lyd-toggle.
Maks 600 tegn, Enter sender. Auto-montering hvis ≥1 venn.
- Gun: `sc_dm_v1.get(channelKey(a,b))`, `sc_group_v1.get('messages')`. localStorage:
  `sc_fc_read`, `sc_fc_min`. Metoder: `init/refresh/toggle/toggleMin/toggleSound/openConv/
  openGroup/back/send`.

## Kommentarer + reaksjoner + venne-knapp (`social.js`, `Social`)

Felles kommentar-/reaksjonssystem brukt på profilvegg og community-poster. Komponist (maks
500 tegn) + emoji-velger; slett egne/eier sletter; reaksjoner 👍/👎 (toggle + tellinger);
«tid siden»; auto-oppdatering av alle venne-knapper ved handling.
- Gun: `sc_comments_v1.get(targetKey)` (targetKey = `post:<id>` | `profile:<user>` |
  `c:<commentId>`), `sc_reactions_v1.get(targetKey).get(username)`. localStorage:
  `sc_wall_seen_<user>`. Metoder: `commentsBlockHtml/postComment/deleteComment/toggleEmoji/
  insertEmoji/reactionBar/react/friendBtn/friendAction/refreshFriendBtns/init/wallUnread/
  markWallSeen/setNotifyTarget`.

## Community-vegg (`community.js`, `Community`, `#/community` + profil-fane «Innlegg»)

Kronologisk feed av poster fra alle. Komponist (maks 1000 tegn) + synlighet (offentlig/
venner) + auto-del-avkrysning. Filtre: alle/musikk/video/blend/tekst. Posttyper: tekst, audio
(`<audio>`), video (`<video>`), YouTube (iframe), blend (bilde), lenke. Auto-deling ved
opplasting av musikk/video; venne-only lagrer allow-liste-snapshot; lyd-ding ved ny audio-post;
slett egne.
- Gun: `sc_posts_v1.get('posts')`. localStorage: `sc_autoshare`. Metoder: `render/
  renderProfilePosts/post/shareMedia/unshareMedia/isShared/setAutoShare/autoShareOn/
  setWallVisibility/deletePost/setFilter`.

## Varsler (`notify.js`, `Notify`)

Bjelle i nav med uleste-teller + dropdown (maks 60). Typer: venneforespørsel, godtatt, kommentar,
post, opplasting, melding. Klikk → naviger; lyd + toast ved nye.
- Gun: `sc_notif_v1.get(username)`. localStorage: `sc_notif_local_<user>`, `sc_notif_seen_<user>`.
  Metoder: `init/emit/notifyFriends/unreadCount/updateBell/togglePanel/openPanel/closePanel`.

## 1:1 privatmelding (`dj.js`, `DJ`)

**Merk:** `dj.js` er privatmelding (ikke DJ-miks). Tråd-visning, nettleservarsel + lyd, uleste-
sporing per samtale, total uleste til nav-badge.
- localStorage: `sr_pm_<a>_<b>` (sortert), `sr_pm_read_<user>`. Metoder: `renderPrivateChat/
  sendPM/getTotalUnreadPMs/requestNotificationPermission`. Ruter: `#/messages/:username` +
  inbox i [[01-skall-nav-sok]].

## Integrasjonspunkter

`Auth` (brukere/venner/presence), `Email` (forespørsel-/melding-e-post → [[12-api-backend]]),
`Profile`/`Community` (vegg/innlegg), `App` (toast/nav-badge), `Router`, `Icon`.
