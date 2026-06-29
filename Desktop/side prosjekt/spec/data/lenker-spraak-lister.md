# Data — lenker, plattformer, profil-lister og språk

Samler kuraterte lenke-/listedata fra `index.html`, `js/profile.js` og `js/lang.js`. Hører til
[[01-skall-nav-sok]], [[03-profil]], [[11-bakgrunn-pwa-deploy]].

## Sosiale/label-lenker (dock «Lenker», `index.html`)

Standard sosiale (åpner i ny fane): Facebook (facebook.com), X (x.com), SoundCloud
(soundcloud.com), YouTube (youtube.com), iTunes (apple.com/itunes), Spotify
(open.spotify.com), Bandcamp (bandcamp.com).

Label-/community-logoer (bilde-lenker): FeedFreq (feedfreq.com), Cryo Chamber
(cryochamber.bandcamp.com), Ultimae Records (ultimae.com), Cosmicleaf
(cosmicleaf.bandcamp.com), Gagarin Project (soundcloud.com/gagarinproject), Steps to Knowledge
(stepstoknowledge.com), DiceRadio (diceradio.gr), BIGFREQ Community
(app.bigfreq.com/communities/groups/bigfreq-public/home).

About-tab CTA-er: «Join Now» → bigfreq-public; «Watch Dates» → `#/shows`; «View Videos» →
youtube.com. Kontakt: producerenur@gmail.com.

## Plattformbytter (`CONFIG.PLATFORM_*`)
Mobil / Mac-laptop / App Store — URL-er fra `config.js` (fallback gjeldende URL / «kommer snart»).

## Profil: FESTIVALS (18) — `{id,emoji,name,country,url,ticket}`
ozora (Ozora Festival, Ungarn) · boom (Boom Festival, Portugal) · sensation_w (Sensation White,
Global) · sensation_b (Sensation Black, Global) · fullmoon (Full Moon Party, Thailand) ·
universo (Universo Paralello, Brasil) · psy_fi (Psy-Fi Festival, Nederland) · modem (Modem
Festival, Kroatia) · shankra (Shankra Festival, Sveits) · rainbow (Rainbow Serpent, Australia) ·
antaris (Antaris Project, Tyskland) · sun (SUN Festival, Ungarn) · cosmic (Cosmic Convergence,
Guatemala) · burning (Burning Man, USA) · earthcore (Earthcore, Australia) · tomorrowland
(Tomorrowland, Belgia) · solipse (Solipse, Global) · vuuv (VuuV Festival, Tyskland). URL-er +
«ticket»-etikett i profile.js.

## Profil: DAWS (15) — `{id,emoji,name}`
ableton (Ableton Live) · fl-studio (FL Studio) · logic (Logic Pro X) · protools (Pro Tools) ·
garageband (GarageBand) · reason (Reason) · cubase (Cubase) · bitwig (Bitwig Studio) · reaper
(Reaper) · studio-one (Studio One) · traktor (Traktor) · rekordbox (Rekordbox) · serato
(Serato DJ) · virtual-dj (Virtual DJ) · djay-pro (djay Pro).

## Profil: STREAMING_PLATFORMS (10) — `{id,emoji,name}`
spotify · apple-music · soundcloud · bandcamp · tidal · youtube-music · beatport · juno
(Juno Download) · traxsource · amazon-music.

## Profil: EVENT_TYPES — `{id,emoji,label}`
dj-set (DJ Set) · concert (Konsert) · show (Show) · workshop (Workshop) · festival (Festival)
· other (Annet).

## Språk (`js/lang.js` — `LANGUAGES`)
Full Google Translate-språkliste (~100 språk), felt `{code, name, flag}` der `name` ofte er
«Engelsk navn — endonym» (f.eks. `fr` «French — Français» 🇫🇷, `zh-CN` «Chinese (Simplified) —
简体中文» 🇨🇳). Søk er aksent-ufølsomt; valg lagres i `stellar-lang`; driver Google Translate-
widgeten (må være `notranslate`). Hele lista er standard og lang — **kopier verbatim fra
`js/lang.js` (`LANGUAGES`)** ved gjenoppbygging i stedet for å gjengi her.
