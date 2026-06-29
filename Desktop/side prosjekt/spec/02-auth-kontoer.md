# 02 — Autentisering og kontoer

**Formål:** Egenutviklet brukersystem (localStorage-database), kontolivssyklus, presence,
følge/venne-system og roller/abonnement. Modul: `auth.js` (global `Auth`).
Ruter rendres i app.js — se [[01-skall-nav-sok]].

## Funksjoner (brukervendt)

- **Registrering** (`#/register`): brukernavn, e-post, passord (krav om spesialtegn),
  visningsnavn. Ny konto må **aktiveres** via e-postlenke (token).
- **Innlogging** (`#/login`): med brukernavn **eller** e-post + passord. «Glemt passord»-lenke.
- **Aktivering** (`#/activate/:token`): bekrefter konto. **Reaktivering**: send aktiverings-
  e-post på nytt.
- **Glemt/reset passord** (`#/forgot`, `#/reset/:token`): token-basert, **1 times utløp**.
- **Logg ut** + **online-status** (heartbeat; «online» = ping innen ~2 min).
- **Følg/avfølg** andre brukere (followers/following).
- **Venne-system:** send/avbryt forespørsel, godta/avslå, fjern venn; status er én av
  `friends | pending_sent | pending_received | none`. Gjensidige venner.
- **Roller:** `lytter`, `dj`, `produsent`, `plateselskap` (visnings-badges i UI).
- **Abonnement:** `free` | `pro` (Pro-fordeler, se [[10-studio-video-marked-betaling]]).
- **Profil-synlighet:** `public` | `private`.
- **QR import/eksport:** del/flytt konto mellom enheter via QR.
- **Kontosletting** (`Auth.deleteUser`) med opprydding.

## Nøkkelmetoder (`Auth`)

`register(username, password, displayName, email)` · `login(usernameOrEmail, password)` ·
`logout()` · `current()` · `activate(token)` · `forgotPassword(email)` ·
`resetPassword(token, newPassword)` · `updateUser(username, data)` · `getUser(username)` ·
`deleteUser(username)` · `setOnline/clearOnline/isOnline(username)` ·
`sendFriendRequest/acceptFriendRequest/rejectFriendRequest/removeFriend` ·
`getFriendStatus(me, target)` · `getFriends(username)` · `toggleFollow(actor, target)` ·
`isFollowing(actor, target)` · `getAllPublicUsers()` · `defaultTheme()` · `importQRUser(data)` ·
`getPendingRequestsCount()`.

## Datamodell (i dag)

- **localStorage:** `pv_users` (kart `username → brukerobjekt`), `pv_session`
  `{username, ts}`, `pv_online_<username>` (heartbeat-tidsstempel).
- **Brukerobjekt (felt):** `username, displayName, password` (hashet — djb2, kun demo),
  `email, createdAt, activated, activationToken, resetToken, resetExpiry`; `theme`
  (farger/typografi/bakgrunn), `bio, links`; `mediaIds, musicIds, mixIds, avatarMediaId,
  bannerMediaId`; `followers, following, friends, friendRequests, sentRequests, events`;
  `subscription (free|pro), proPlan, stripeSubId, role, profileVisibility`; festival-/DAW-/
  streaming-valg, `mySites`, `customPage.blocks`, `favoriteRadio`. Profil-detaljer: [[03-profil]].
- **Token-generering:** `crypto.getRandomValues()`.

## Kanttilfeller / regler

- Uaktivert konto kan ikke logge inn før aktivering (reaktivering tilgjengelig).
- Reset-token er ugyldig etter 1 time.
- Passord krever spesialtegn ved registrering.
- Hashing er **kun demo** (ikke produksjonssikker) — ved gjenoppbygging bør ekte hashing/
  server-auth vurderes, men oppførselen (lokal konto, aktivering, reset, venner) bevares.

## Integrasjonspunkter

Brukes av nær sagt alt: [[03-profil]], [[08-sosialt-og-chat]] (venner/presence),
[[01-skall-nav-sok]] (nav/inbox/innstillinger), [[09-ai-voice-bughelp]] (kontekst),
[[10-studio-video-marked-betaling]] (abonnement). E-post sendes via `Email`
(se [[11-bakgrunn-pwa-deploy]] + [[12-api-backend]]).
