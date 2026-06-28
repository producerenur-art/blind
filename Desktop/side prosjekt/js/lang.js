/* ═══════════════════════════════════════════
   Language Picker — bottom-right floating widget
   ═══════════════════════════════════════════ */

const LANGUAGES = [
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'sq', name: 'Albanian — Shqip', flag: '🇦🇱' },
  { code: 'am', name: 'Amharic — አማርኛ', flag: '🇪🇹' },
  { code: 'ar', name: 'Arabic — العربية', flag: '🇸🇦' },
  { code: 'hy', name: 'Armenian — Հայերեն', flag: '🇦🇲' },
  { code: 'az', name: 'Azerbaijani — Azərbaycan', flag: '🇦🇿' },
  { code: 'eu', name: 'Basque — Euskara', flag: '🇪🇸' },
  { code: 'be', name: 'Belarusian — Беларуская', flag: '🇧🇾' },
  { code: 'bn', name: 'Bengali — বাংলা', flag: '🇧🇩' },
  { code: 'bs', name: 'Bosnian — Bosanski', flag: '🇧🇦' },
  { code: 'bg', name: 'Bulgarian — Български', flag: '🇧🇬' },
  { code: 'ca', name: 'Catalan — Català', flag: '🇪🇸' },
  { code: 'ceb', name: 'Cebuano', flag: '🇵🇭' },
  { code: 'ny', name: 'Chichewa', flag: '🇲🇼' },
  { code: 'zh-CN', name: 'Chinese (Simplified) — 简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Traditional) — 繁體中文', flag: '🇹🇼' },
  { code: 'co', name: 'Corsican — Corsu', flag: '🇫🇷' },
  { code: 'hr', name: 'Croatian — Hrvatski', flag: '🇭🇷' },
  { code: 'cs', name: 'Czech — Čeština', flag: '🇨🇿' },
  { code: 'da', name: 'Danish — Dansk', flag: '🇩🇰' },
  { code: 'nl', name: 'Dutch — Nederlands', flag: '🇳🇱' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'eo', name: 'Esperanto', flag: '🌍' },
  { code: 'et', name: 'Estonian — Eesti', flag: '🇪🇪' },
  { code: 'tl', name: 'Filipino — Tagalog', flag: '🇵🇭' },
  { code: 'fi', name: 'Finnish — Suomi', flag: '🇫🇮' },
  { code: 'fr', name: 'French — Français', flag: '🇫🇷' },
  { code: 'fy', name: 'Frisian — Frysk', flag: '🇳🇱' },
  { code: 'gl', name: 'Galician — Galego', flag: '🇪🇸' },
  { code: 'ka', name: 'Georgian — ქართული', flag: '🇬🇪' },
  { code: 'de', name: 'German — Deutsch', flag: '🇩🇪' },
  { code: 'el', name: 'Greek — Ελληνικά', flag: '🇬🇷' },
  { code: 'gu', name: 'Gujarati — ગુજરાતી', flag: '🇮🇳' },
  { code: 'ht', name: 'Haitian Creole — Kreyòl', flag: '🇭🇹' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'haw', name: 'Hawaiian — ʻŌlelo Hawaiʻi', flag: '🇺🇸' },
  { code: 'iw', name: 'Hebrew — עברית', flag: '🇮🇱' },
  { code: 'hi', name: 'Hindi — हिन्दी', flag: '🇮🇳' },
  { code: 'hmn', name: 'Hmong', flag: '🇱🇦' },
  { code: 'hu', name: 'Hungarian — Magyar', flag: '🇭🇺' },
  { code: 'is', name: 'Icelandic — Íslenska', flag: '🇮🇸' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
  { code: 'id', name: 'Indonesian — Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ga', name: 'Irish — Gaeilge', flag: '🇮🇪' },
  { code: 'it', name: 'Italian — Italiano', flag: '🇮🇹' },
  { code: 'ja', name: 'Japanese — 日本語', flag: '🇯🇵' },
  { code: 'jw', name: 'Javanese — Basa Jawa', flag: '🇮🇩' },
  { code: 'kn', name: 'Kannada — ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'kk', name: 'Kazakh — Қазақ', flag: '🇰🇿' },
  { code: 'km', name: 'Khmer — ខ្មែរ', flag: '🇰🇭' },
  { code: 'ko', name: 'Korean — 한국어', flag: '🇰🇷' },
  { code: 'ku', name: 'Kurdish — Kurdî', flag: '🇮🇶' },
  { code: 'ky', name: 'Kyrgyz — Кыргызча', flag: '🇰🇬' },
  { code: 'lo', name: 'Lao — ລາວ', flag: '🇱🇦' },
  { code: 'la', name: 'Latin — Latina', flag: '🇻🇦' },
  { code: 'lv', name: 'Latvian — Latviešu', flag: '🇱🇻' },
  { code: 'lt', name: 'Lithuanian — Lietuvių', flag: '🇱🇹' },
  { code: 'lb', name: 'Luxembourgish — Lëtzebuergesch', flag: '🇱🇺' },
  { code: 'mk', name: 'Macedonian — Македонски', flag: '🇲🇰' },
  { code: 'mg', name: 'Malagasy', flag: '🇲🇬' },
  { code: 'ms', name: 'Malay — Bahasa Melayu', flag: '🇲🇾' },
  { code: 'ml', name: 'Malayalam — മലയാളം', flag: '🇮🇳' },
  { code: 'mt', name: 'Maltese — Malti', flag: '🇲🇹' },
  { code: 'mi', name: 'Maori — Te Reo Māori', flag: '🇳🇿' },
  { code: 'mr', name: 'Marathi — मराठी', flag: '🇮🇳' },
  { code: 'mn', name: 'Mongolian — Монгол', flag: '🇲🇳' },
  { code: 'my', name: 'Myanmar (Burmese) — မြန်မာ', flag: '🇲🇲' },
  { code: 'ne', name: 'Nepali — नेपाली', flag: '🇳🇵' },
  { code: 'no', name: 'Norwegian — Norsk', flag: '🇳🇴' },
  { code: 'ps', name: 'Pashto — پښتو', flag: '🇦🇫' },
  { code: 'fa', name: 'Persian — فارسی', flag: '🇮🇷' },
  { code: 'pl', name: 'Polish — Polski', flag: '🇵🇱' },
  { code: 'pt', name: 'Portuguese — Português', flag: '🇵🇹' },
  { code: 'pa', name: 'Punjabi — ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'ro', name: 'Romanian — Română', flag: '🇷🇴' },
  { code: 'ru', name: 'Russian — Русский', flag: '🇷🇺' },
  { code: 'sm', name: 'Samoan — Gagana Samoa', flag: '🇼🇸' },
  { code: 'gd', name: 'Scots Gaelic — Gàidhlig', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { code: 'sr', name: 'Serbian — Српски', flag: '🇷🇸' },
  { code: 'st', name: 'Sesotho', flag: '🇱🇸' },
  { code: 'sn', name: 'Shona', flag: '🇿🇼' },
  { code: 'sd', name: 'Sindhi — سنڌي', flag: '🇵🇰' },
  { code: 'si', name: 'Sinhala — සිංහල', flag: '🇱🇰' },
  { code: 'sk', name: 'Slovak — Slovenčina', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenian — Slovenščina', flag: '🇸🇮' },
  { code: 'so', name: 'Somali — Soomaali', flag: '🇸🇴' },
  { code: 'es', name: 'Spanish — Español', flag: '🇪🇸' },
  { code: 'su', name: 'Sundanese — Basa Sunda', flag: '🇮🇩' },
  { code: 'sw', name: 'Swahili — Kiswahili', flag: '🇰🇪' },
  { code: 'sv', name: 'Swedish — Svenska', flag: '🇸🇪' },
  { code: 'tg', name: 'Tajik — Тоҷикӣ', flag: '🇹🇯' },
  { code: 'ta', name: 'Tamil — தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu — తెలుగు', flag: '🇮🇳' },
  { code: 'th', name: 'Thai — ภาษาไทย', flag: '🇹🇭' },
  { code: 'tr', name: 'Turkish — Türkçe', flag: '🇹🇷' },
  { code: 'uk', name: 'Ukrainian — Українська', flag: '🇺🇦' },
  { code: 'ur', name: 'Urdu — اردو', flag: '🇵🇰' },
  { code: 'uz', name: 'Uzbek — Oʻzbekcha', flag: '🇺🇿' },
  { code: 'vi', name: 'Vietnamese — Tiếng Việt', flag: '🇻🇳' },
  { code: 'cy', name: 'Welsh — Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { code: 'xh', name: 'Xhosa — isiXhosa', flag: '🇿🇦' },
  { code: 'yi', name: 'Yiddish — ייִדיש', flag: '🇮🇱' },
  { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
  { code: 'zu', name: 'Zulu — isiZulu', flag: '🇿🇦' },
];

(function () {
  const toggle = document.getElementById('lang-toggle');
  const panel  = document.getElementById('lang-panel');
  const list   = document.getElementById('lang-list');
  const search = document.getElementById('lang-search');
  const label  = document.getElementById('lang-current-label');
  const chevron = document.getElementById('lang-chevron');

  let open = false;

  // Lowercase + strip diacritics so "francais" matches "Français",
  // "espanol" matches "Español", etc.
  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function renderList(filter = '') {
    const q = norm(filter.trim());
    list.innerHTML = '';
    const matches = LANGUAGES.filter(
      l => !q || norm(l.name).includes(q) || l.code.toLowerCase().includes(q)
    );

    if (!matches.length) {
      const li = document.createElement('li');
      li.className = 'lang-empty';
      li.textContent = 'No language found';
      list.appendChild(li);
      return;
    }

    matches.forEach(lang => {
      const li = document.createElement('li');
      li.className = 'lang-item';
      li.dataset.code = lang.code;
      li.innerHTML = `<span class="lang-flag">${lang.flag}</span><span class="lang-name">${lang.name}</span>`;
      li.addEventListener('click', () => selectLang(lang));
      list.appendChild(li);
    });
  }

  function selectLang(lang) {
    label.textContent = lang.flag + ' ' + lang.code.toUpperCase();
    localStorage.setItem('stellar-lang', lang.code);

    // Trigger Google Translate
    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = lang.code;
      select.dispatchEvent(new Event('change'));
    }

    closePanel();
  }

  function openPanel() {
    open = true;
    panel.classList.add('open');
    chevron.innerHTML = Icon('chevron-down');
    search.value = '';
    renderList();
    setTimeout(() => search.focus(), 80);
  }

  function closePanel() {
    open = false;
    panel.classList.remove('open');
    chevron.innerHTML = Icon('chevron-up');
  }

  toggle.addEventListener('click', () => open ? closePanel() : openPanel());

  search.addEventListener('input', () => renderList(search.value));

  document.addEventListener('click', e => {
    if (open && !document.getElementById('lang-widget').contains(e.target)) {
      closePanel();
    }
  });

  // Restore saved language after Google Translate loads
  const saved = localStorage.getItem('stellar-lang');
  if (saved) {
    const lang = LANGUAGES.find(l => l.code === saved);
    if (lang) {
      label.textContent = lang.flag + ' ' + lang.code.toUpperCase();
      const tryApply = setInterval(() => {
        const select = document.querySelector('.goog-te-combo');
        if (select) {
          select.value = saved;
          select.dispatchEvent(new Event('change'));
          clearInterval(tryApply);
        }
      }, 400);
      setTimeout(() => clearInterval(tryApply), 8000);
    }
  }

  renderList();
})();
