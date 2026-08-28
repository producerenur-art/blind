/* SafeSearch — innhaldsfilter for søkefeltet og A1-chatten.
   Blokkerer porno, overgrepsmateriale og openbert ulovlege søk (narkotikakjøp,
   våpen/bomber, hacking/svindel, falske dokument, piratkopiering), og møter
   sjølvskade-søk med hjelpetelefonar i staden for ei blokkering.

   Køyrer to stader:
   - i nettlesaren (window.SafeSearch)   → rask tilbakemelding i UI
   - på serveren (require i api/chat.js) → kan ikkje omgåast med devtools

   Matching skjer på ein normalisert tekst (små bokstavar, æøå og aksentar flata
   ut, leetspeak som 0→o og 3→e slått tilbake, teiknsetjing → mellomrom).
   To lister per kategori:
   - word-termar krev ordgrenser → «sex» treffer ikkje «Essex»
   - tight-termar er lange/eintydige og blir også søkte utan mellomrom, slik at
     «p o r n», «p.o.r.n» og «p0rn» blir tatt.
*/
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.SafeSearch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ── Normalisering ────────────────────────────────────────────────────
  const CHAR_MAP = {
    'ø': 'o', 'æ': 'ae', 'å': 'a', 'ö': 'o', 'ä': 'a',
    'ü': 'u', 'ß': 'ss',
    '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a',
    '5': 's', '$': 's', '7': 't', '9': 'g', '+': 't', '€': 'e', '£': 'l',
  };

  function normalize(s) {
    let t = String(s == null ? '' : s).toLowerCase();
    t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');   // aksentar vekk (a-ring → a)
    t = t.replace(/./g, (c) => (CHAR_MAP[c] !== undefined ? CHAR_MAP[c] : c));
    t = t.replace(/[^a-z0-9]+/g, ' ');                        // teiknsetjing → mellomrom
    t = t.replace(/([a-z])\1{2,}/g, '$1');                    // «poooorn» → «porn»
    return t.replace(/\s+/g, ' ').trim();
  }

  const compact = (normed) => normed.replace(/ /g, '');

  // ── Ordlister (blir normaliserte automatisk, så skriv dei naturleg) ──
  // Overgrepsmateriale — alltid blokkert, aldri overstyrt av unntakslista.
  const CSAM = {
    word: [
      'child porn', 'child pornography', 'child sex', 'children porn', 'kid porn', 'kids porn',
      'underage porn', 'underage sex', 'underage nude', 'minor porn', 'nude child', 'child nude',
      'naked child', 'naked kids', 'jailbait', 'lolita porn', 'loli porn', 'loli hentai', 'shota',
      'pedo porn', 'pedofil porno', 'barneporno', 'barnesex', 'barn naken', 'naken barn',
      'nakne barn', 'sex med barn', 'sex med mindreårig', 'mindreårig porno', 'mindreårig sex',
      'overgrepsbilder', 'overgrepsvideo', 'overgrepsmateriale', 'seksuelle bilder av barn',
    ],
    tight: [
      'child porn', 'child pornography', 'child sex', 'kid porn', 'underage porn',
      'underage sex', 'barneporno', 'barnesex', 'pedo porn', 'jailbait', 'lolita porn',
      'preteen sex',
    ],
  };

  // Porno / eksplisitt vakseninnhald.
  const ADULT = {
    word: [
      'sex', 'sexy', 'porn', 'porno', 'pornos', 'pornografi', 'pornography', 'pornographic',
      'xxx', 'nsfw', 'hentai', 'rule34', 'milf', 'dildo', 'bdsm fetish', 'fetish porn',
      'blowjob', 'blowjobs', 'deepthroat', 'cumshot', 'creampie', 'gangbang', 'bukkake',
      'anal sex', 'oral sex video', 'hardcore sex', 'sex video', 'sex videos', 'sex tape',
      'sex film', 'sexfilm', 'sexfilmer', 'sexvideo', 'sexbilder', 'sex chat', 'sexchat',
      'sex date', 'sexdate', 'sextreff', 'sex treff', 'live sex', 'cam sex', 'camsex',
      'camgirl', 'camgirls', 'webcam girls', 'nakenbilder', 'nakenvideo', 'nude pics',
      'nude photos', 'nude video', 'nudes leak', 'leaked nudes', 'naked girls', 'naked women',
      'nakne jenter', 'nakne damer', 'onlyfans leak', 'onlyfans leaks', 'escort', 'eskorte',
      'prostitute', 'prostituert', 'prostitusjon', 'bordell', 'brothel', 'horehus',
      'pule', 'knulle', 'knuller', 'fitte', 'fitta', 'kuk', 'runke', 'runking', 'onanere',
      'sugejobb', 'big tits', 'boobs porn', 'pussy porn', 'big cock', 'suck cock',
      'pornhub', 'xvideos', 'xnxx', 'xhamster', 'redtube', 'youporn', 'brazzers',
      'stripchat', 'chaturbate', 'onlyfans', 'fansly', 'spankbang', 'motherless', 'erome',
    ],
    tight: [
      'porn', 'porno', 'pornhub', 'xvideos', 'xhamster', 'redtube', 'youporn', 'brazzers',
      'chaturbate', 'stripchat', 'spankbang', 'sex video', 'sex film', 'nakenbilder',
      'blowjob', 'gangbang', 'hardcore sex', 'anal sex', 'cam sex', 'sex chat', 'sextreff',
    ],
  };

  // Openbert ulovleg: kjøp/produksjon/utføring — ikkje det å lese om eit tema.
  const ILLEGAL = {
    word: [
      // narkotika (kjøps-/salsintensjon)
      'buy cocaine', 'buy heroin', 'buy meth', 'buy mdma', 'buy lsd', 'buy fentanyl',
      'buy weed online', 'buy drugs online', 'drugs for sale', 'order drugs online',
      'kjøpe kokain', 'kjøp kokain', 'kjøpe heroin', 'kjøpe amfetamin', 'kjøpe narkotika',
      'kjøp narkotika', 'bestille narkotika', 'narkotika til salgs', 'selge narkotika',
      'darknet market', 'dark web market', 'darkweb marked', 'silk road drugs',
      // våpen og sprengstoff
      'how to make a bomb', 'make a bomb', 'build a bomb', 'make explosives', 'pipe bomb',
      'lage bombe', 'bombeoppskrift', 'lage sprengstoff', 'lage nervegift',
      'buy illegal gun', 'buy gun illegally', 'ghost gun', 'untraceable gun',
      'kjøpe våpen ulovlig', 'ulovlige våpen til salgs', 'kjøpe pistol svart',
      // vald
      'hire a hitman', 'hitman for hire', 'hire hitman', 'leiemorder', 'leie leiemorder',
      'how to kill someone', 'how to murder', 'hvordan drepe noen', 'drepe noen',
      'poison someone', 'forgifte noen', 'kidnappe noen', 'how to kidnap',
      // svindel og hacking
      'stolen credit card', 'stolen credit cards', 'stjålne kredittkort', 'carding forum',
      'cc dumps', 'buy cvv', 'buy fullz', 'hack facebook account', 'hack instagram account',
      'hack snapchat account', 'hacke facebook', 'hacke instagram', 'hacke snapchat',
      'hack someone phone', 'hacke telefonen til', 'ddos for hire', 'booter stresser',
      'ransomware builder', 'keylogger download', 'spy on my girlfriend phone',
      'stalkerware', 'hvitvasking av penger', 'launder money',
      // falske dokument og varer
      'fake passport', 'buy passport online', 'falskt pass', 'kjøpe falskt pass',
      'fake id card', 'falsk id', 'forged documents', 'falske dokumenter',
      'counterfeit money', 'falske penger', 'falske sedler', 'fake drivers license',
      'falskt førerkort', 'kjøpe vitnemål', 'fake diploma',
      // menneskehandel / organ
      'human trafficking buy', 'buy a slave', 'kjøpe slave', 'sex trafficking',
      'menneskehandel kjøp', 'sell my kidney', 'buy a kidney', 'kjøpe organ', 'selge nyre',
    ],
    tight: [
      'kjøpe kokain', 'kjøpe heroin', 'kjøpe narkotika', 'buy cocaine', 'buy heroin',
      'buy meth', 'bombeoppskrift', 'lage bombe', 'how to make a bomb', 'leiemorder',
      'hitman for hire', 'stolen credit card', 'stjålne kredittkort', 'falskt pass',
      'fake passport', 'counterfeit money', 'falske sedler', 'ransomware builder',
    ],
  };

  // Piratkopiering.
  const PIRACY = {
    word: [
      'piratebay', 'the pirate bay', 'thepiratebay', '1337x', 'yts movies download',
      'fmovies', 'putlocker', '123movies', 'nyafilmer', 'streame film gratis ulovlig',
      'cracked software download', 'keygen download', 'nulled script', 'warez',
    ],
    tight: ['piratebay', 'the pirate bay', 'fmovies', 'putlocker', 'keygen download', 'warez'],
  };

  // Sjølvskade / sjølvmord — skal møtast med hjelp, ikkje ei tørr blokkering.
  const SELFHARM = {
    word: [
      'how to kill myself', 'kill myself', 'commit suicide', 'suicide methods',
      'painless suicide', 'best way to die', 'how to hang myself', 'overdose to die',
      'ta mitt eget liv', 'ta livet av meg', 'hvordan ta livet av seg', 'begå selvmord',
      'selvmordsmetoder', 'smertefritt selvmord', 'kutte meg selv',
      'self harm methods', 'ways to self harm',
    ],
    tight: [
      'kill myself', 'commit suicide', 'suicide methods', 'selvmordsmetoder',
      'ta livet av meg',
    ],
  };

  // Fagleg/daglegdags bruk som ikkje skal falla for ADULT-lista.
  // (Overstyrer aldri CSAM, ILLEGAL eller SELFHARM.)
  const ADULT_ALLOW = [
    'sex education', 'sexual education', 'sexual health', 'sexual orientation',
    'sexual harassment', 'sexual assault help', 'safe sex', 'sexually transmitted',
    'sex differences', 'sex chromosome', 'sex ratio', 'same sex marriage', 'opposite sex',
    'seksualundervisning', 'seksuell helse', 'seksuell trakassering', 'seksuell legning',
    'sikker sex', 'kjønnssykdom', 'kjønnssykdommer', 'prevensjon',
    'sex and the city', 'sex pistols', 'ford escort', 'pussy cat', 'pussycat',
    'middlesex', 'essex', 'sussex', 'wessex',
  ];

  // ── Kompilering ──────────────────────────────────────────────────────
  function wordRegex(term) {
    const n = normalize(term);
    if (!n) return null;
    const parts = n.split(' ').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp('(?:^|[^a-z0-9])' + parts.join('[^a-z0-9]{0,3}') + '(?:[^a-z0-9]|$)');
  }

  function compile(list) {
    return {
      word: (list.word || []).map((t) => ({ term: t, re: wordRegex(t) })).filter((x) => x.re),
      // Tight-treff er substring-søk utan ordgrenser, så termen må vera lang nok
      // og eintydig — «porn» er trygt, «sex» ville tatt «Essex».
      tight: (list.tight || [])
        .map((t) => ({ term: t, key: compact(normalize(t)) }))
        .filter((x) => x.key.length >= 4),
    };
  }

  // Rekkjefølgja avgjer kva melding brukaren får når fleire lister treffer.
  const RULES = [
    { category: 'csam', rules: compile(CSAM) },
    { category: 'illegal', rules: compile(ILLEGAL) },
    { category: 'selfharm', rules: compile(SELFHARM) },
    { category: 'adult', rules: compile(ADULT) },
    { category: 'piracy', rules: compile(PIRACY) },
  ];

  const ALLOW_RE = ADULT_ALLOW.map(wordRegex).filter(Boolean);

  const MESSAGES = {
    csam: 'This search is blocked. Anything involving minors is illegal — it will never be searched or answered here.',
    illegal: 'This search looks like it is about something illegal, so it is blocked on SiriusFM.',
    adult: 'SiriusFM is safe for everyone — adult and pornographic searches are blocked here. Try something else.',
    piracy: 'Searches for pirated films, music or software are blocked on SiriusFM.',
    selfharm: 'It sounds like you are carrying something heavy — you are not alone. In Norway: Mental Helse 116 123 (free, 24/7) or Kirkens SOS 22 40 00 40. Emergency: 113. Elsewhere: findahelpline.com. A1 is here if you just want to talk.',
  };

  const TOASTS = {
    csam: 'Search blocked — illegal content',
    illegal: 'Search blocked — illegal content',
    adult: 'Search blocked — adult content',
    piracy: 'Search blocked — pirated content',
    selfharm: 'Help is available — see the message',
  };

  // ── Offentleg API ────────────────────────────────────────────────────
  // check(text) → { ok:true } | { ok:false, category, term, message, toast }
  function check(text) {
    const n = normalize(text);
    if (!n) return { ok: true };
    const padded = ' ' + n + ' ';
    const tight = compact(n);
    const allowed = ALLOW_RE.some((re) => re.test(padded));

    for (const { category, rules } of RULES) {
      if (category === 'adult' && allowed) continue;
      const hitWord = rules.word.find((r) => r.re.test(padded));
      const hitTight = hitWord ? null : rules.tight.find((r) => tight.includes(r.key));
      const hit = hitWord || hitTight;
      if (hit) {
        return {
          ok: false,
          category,
          term: hit.term,
          message: MESSAGES[category],
          toast: TOASTS[category],
        };
      }
    }
    return { ok: true };
  }

  // Slår på søkemotorane sine eigne familiefilter, så sjølve resultatsida
  // heller ikkje viser vakseninnhald.
  function safeParams(engineKey) {
    switch (engineKey) {
      case 'google': return 'safe=active';
      case 'duckduckgo': return 'kp=1';
      case 'brave': return 'safesearch=strict';
      case 'youtube': return 'safe=active';   // best effort — YouTube styrer mest via konto
      default: return '';
    }
  }

  function withSafeParams(url, engineKey) {
    const p = safeParams(engineKey);
    if (!p) return url;
    return url + (url.includes('?') ? '&' : '?') + p;
  }

  return { check, normalize, withSafeParams, safeParams, MESSAGES };
});
