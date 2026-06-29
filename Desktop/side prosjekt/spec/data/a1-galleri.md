# Data — A1-galleri (ordrett fra `js/a1.js`)

Eierkuratert, samme for alle brukere. Roterer ukentlig (`weeklyIndex` på epoch-uker). Hører
til [[09-ai-voice-bughelp]] (A1-fane).

## LINKS (8) — «Ukas nettsteder» `{name, url}`
1. Steps to Knowledge — https://stepstoknowledge.com/
2. The Greater Community (IMDb) — https://www.imdb.com/title/tt37605896/
3. Marshall Vian Summers — https://marshallsummers.com/
4. New Knowledge Library — https://newknowledgelibrary.org/
5. Book Yoga Retreats — https://www.bookyogaretreats.com/
6. The New Message — https://www.newmessage.org/book-intro/the-worldwide-community-of-the-new-message-from-god-introduction/
7. The Great Waves of Change — https://www.greatwavesofchange.org/
8. Allies of Humanity — https://www.alliesofhumanity.org/

Vises som logo-kort (favicon via google.com/s2/favicons). Ukas utvalgte = `rotate(LINKS)`.

## VIDEOS (6) — «Ukas videoer» `{title, url}`
Alle ID-er verifisert embeddable via YouTube oEmbed (offisielle kanaler).
1. The Story of the Messenger — Marshall Vian Summers — youtube.com/watch?v=GTlV3-UOe94
2. A Prayer for the World — Marshall Vian Summers — youtube.com/watch?v=mXPfCg1HKVU
3. The Allies of Humanity — presentert av Marshall Vian Summers — youtube.com/watch?v=g4EjxvGcOUQ
4. The Extraterrestrial Presence in the World Today — Allies, Book One — youtube.com/watch?v=OWXp0INcv9Q
5. 12-Point Summary of the Allies of Humanity Briefings — youtube.com/watch?v=YX7yxk85woM
6. Allies of Humanity — Book Four — youtube.com/watch?v=UJ8iNy95U9k

Innebygges via `youtube-nocookie.com/embed/<id>`. Brukerlagrede videoer kommer i tillegg
(localStorage `a1_user_videos`, kun innlogget). Ukas video = `rotate(allVideos())`.

## ENGINES (5) — universalsøk `{key, name, url(q)}`
google (google.com/search?q=) · duckduckgo (duckduckgo.com/?q=) · youtube
(youtube.com/results?search_query=) · wikipedia (en.wikipedia.org/w/index.php?search=) ·
brave (search.brave.com/search?q=). «Spør A1» sender i stedet spørringen til `AI.assistantChat`.
