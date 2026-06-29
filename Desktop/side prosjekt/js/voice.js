/* ═══════════════════════════════════════════════
   Voice — delt stemme-lag for AI-panela (Core + A1).
   • Snakk inn  → Web Speech API (SpeechRecognition) på valt språk
   • AI svarar  → talesyntese (speechSynthesis) på same språk
   • Ta opp     → lagrar tekst-logg + ekte lydopptak (MediaRecorder), av/på
   Mikrofon-knapp: GRØN når den lyttar, raud/nøytral når av.
   Opptak-knapp:   GRØN når den tek opp, raud når av.
   Alt gratis, ingen eksterne avhengnader. Brukt av aiAssistant.js og a1.js.
   ═══════════════════════════════════════════════ */
const Voice = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const hasTTS = 'speechSynthesis' in window;
  const hasRec = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  // ── Språk-kode → BCP-47 for tale (tilbakefall: koden sjølv) ───────────
  const BCP = {
    no:'nb-NO', nb:'nb-NO', nn:'nn-NO', en:'en-US', sv:'sv-SE', da:'da-DK',
    fr:'fr-FR', de:'de-DE', es:'es-ES', it:'it-IT', pt:'pt-PT', nl:'nl-NL',
    ru:'ru-RU', pl:'pl-PL', tr:'tr-TR', ar:'ar-SA', hi:'hi-IN', ja:'ja-JP',
    ko:'ko-KR', 'zh-CN':'zh-CN', 'zh-TW':'zh-TW', fi:'fi-FI', el:'el-GR',
    cs:'cs-CZ', sk:'sk-SK', ro:'ro-RO', hu:'hu-HU', uk:'uk-UA', id:'id-ID',
    th:'th-TH', vi:'vi-VN', he:'he-IL', iw:'he-IL', fa:'fa-IR', bn:'bn-BD',
    ta:'ta-IN', te:'te-IN', ml:'ml-IN', mr:'mr-IN', gu:'gu-IN', kn:'kn-IN',
    ur:'ur-PK', ms:'ms-MY', fil:'fil-PH', tl:'fil-PH', hr:'hr-HR', sr:'sr-RS',
    bg:'bg-BG', sl:'sl-SI', lt:'lt-LT', lv:'lv-LV', et:'et-EE', ca:'ca-ES',
    is:'is-IS', af:'af-ZA', sw:'sw-KE', zu:'zu-ZA', am:'am-ET',
  };
  function bcp47(code) { return BCP[code] || code || 'en-US'; }

  // ── Språkliste (delt med lang.js) ────────────────────────────────────
  function langList() { return (typeof LANGUAGES !== 'undefined' && LANGUAGES.length) ? LANGUAGES : [{ code:'no', name:'Norwegian — Norsk', flag:'🇳🇴' }]; }
  function langNameFor(code) { const l = langList().find(x => x.code === code); return l ? l.name.split(' — ')[0].trim() : 'Norwegian'; }
  function langOptions(sel) { return langList().map(l => `<option value="${l.code}" ${l.code === sel ? 'selected' : ''}>${l.flag} ${l.name}</option>`).join(''); }

  // ── Talesyntese-stemmer (lastar ofte asynkront) ──────────────────────
  let _voices = [];
  function refreshVoices() { try { _voices = hasTTS ? (window.speechSynthesis.getVoices() || []) : []; } catch { _voices = []; } }
  if (hasTTS) { refreshVoices(); try { window.speechSynthesis.onvoiceschanged = refreshVoices; } catch {} }
  function pickVoice(lang) {
    if (!_voices.length) refreshVoices();
    const low = String(lang).toLowerCase(), base = low.split('-')[0];
    return _voices.find(v => v.lang && v.lang.toLowerCase() === low)
        || _voices.find(v => v.lang && v.lang.toLowerCase().startsWith(base))
        || null;
  }

  // ── Hjelparar ────────────────────────────────────────────────────────
  function stamp() { const d = new Date(); const p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; }
  function download(blob, name) {
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 400);
  }
  function ic(n) { return (typeof Icon === 'function') ? Icon(n) : ''; }

  // ════════════════════════════════════════════════════════════════════
  //  create(config) → ein stemme-kontroller per panel
  //  config: { ns, withLang, getLangCode, onText, defaultLang }
  // ════════════════════════════════════════════════════════════════════
  function create(config) {
    const ns = config.ns || 'voice';
    const LOG_KEY  = 'voice_log_'  + ns;
    const REC_KEY  = 'voice_rec_'  + ns;   // av/på huska
    const SPK_KEY  = 'voice_spk_'  + ns;   // tale av/på
    const LANG_KEY = 'voice_lang_' + ns;

    const ctrl = {
      listening: false, recording: false,
      _log: [], _rec: null, _stream: null, _chunks: [], _audioBlob: null, _sr: null,
    };
    try { ctrl._log = JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch { ctrl._log = []; }
    let speakerOn = localStorage.getItem(SPK_KEY) !== '0';   // tale på som standard

    // ── Toolbar-element ──────────────────────────────────────────────
    const el = document.createElement('div');
    el.className = 'voice-tb';
    const langSelHtml = config.withLang
      ? `<select class="voice-lang" title="Språk / Language">${langOptions(initialLang())}</select>` : '';
    el.innerHTML = `
      ${langSelHtml}
      <button type="button" class="voice-btn voice-mic" title="Snakk – trykk og snakk (alle språk)">${ic('mic')}</button>
      <button type="button" class="voice-btn voice-spk${speakerOn ? ' is-on' : ''}" title="AI les opp svara">${ic(speakerOn ? 'volume' : 'volume-x')}</button>
      <button type="button" class="voice-btn voice-rec" title="Ta opp samtale (tekst + lyd)">${ic('circle-dot')}</button>
      <button type="button" class="voice-btn voice-dl voice-dl-txt hidden" title="Last ned tekst-logg">${ic('download')}</button>
      <button type="button" class="voice-btn voice-dl voice-dl-aud hidden" title="Last ned lydopptak">${ic('music')}</button>
      <span class="voice-status" aria-live="polite"></span>`;

    const micBtn  = el.querySelector('.voice-mic');
    const spkBtn  = el.querySelector('.voice-spk');
    const recBtn  = el.querySelector('.voice-rec');
    const dlTxt   = el.querySelector('.voice-dl-txt');
    const dlAud   = el.querySelector('.voice-dl-aud');
    const statusEl= el.querySelector('.voice-status');
    const langSel = el.querySelector('.voice-lang');

    if (!SR) micBtn.classList.add('hidden');       // ingen tale-input i nettlesaren
    if (!hasTTS) spkBtn.classList.add('hidden');   // ingen talesyntese

    function initialLang() {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved) return saved;
      return (config.defaultLang && config.defaultLang()) || localStorage.getItem('stellar-lang') || 'no';
    }
    function langCode() {
      if (langSel) return langSel.value;
      return (config.getLangCode && config.getLangCode()) || 'no';
    }
    if (langSel) langSel.addEventListener('change', () => { try { localStorage.setItem(LANG_KEY, langSel.value); } catch {} });

    function setStatus(t) { if (statusEl) statusEl.textContent = t || ''; }

    // ── Talesyntese ──────────────────────────────────────────────────
    function speak(text) {
      if (!speakerOn || !hasTTS || !text) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(String(text));
        u.lang = bcp47(langCode());
        const v = pickVoice(u.lang); if (v) u.voice = v;
        u.rate = 1; u.pitch = 1; u.volume = 1;
        window.speechSynthesis.speak(u);
      } catch {}
    }
    spkBtn.addEventListener('click', () => {
      speakerOn = !speakerOn;
      try { localStorage.setItem(SPK_KEY, speakerOn ? '1' : '0'); } catch {}
      spkBtn.classList.toggle('is-on', speakerOn);
      spkBtn.innerHTML = ic(speakerOn ? 'volume' : 'volume-x');
      if (!speakerOn) { try { window.speechSynthesis.cancel(); } catch {} }
    });

    // ── Tale-input (snakk inn) ───────────────────────────────────────
    function setListening(on) {
      ctrl.listening = on;
      micBtn.classList.toggle('is-listening', on);
      setStatus(on ? 'Lyttar…' : (ctrl.recording ? 'Tek opp' : ''));
    }
    function startListening() {
      if (!SR || ctrl.listening) return;
      try { if (hasTTS) window.speechSynthesis.cancel(); } catch {}   // unngå at AI-stemma blir høyrt
      let finalText = '';
      const rec = new SR();
      ctrl._sr = rec;
      rec.lang = bcp47(langCode());
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      rec.onresult = e => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
        }
        setStatus('“' + (finalText + interim).trim().slice(0, 40) + '”');
      };
      rec.onerror = ev => { setListening(false); if (ev && ev.error === 'not-allowed') setStatus('Mikrofon blokkert'); };
      rec.onend = () => {
        setListening(false); ctrl._sr = null;
        const t = finalText.trim();
        if (t && config.onText) config.onText(t);
      };
      try { rec.start(); setListening(true); } catch { setListening(false); }
    }
    function stopListening() { try { if (ctrl._sr) ctrl._sr.stop(); } catch {} }
    micBtn.addEventListener('click', () => { ctrl.listening ? stopListening() : startListening(); });

    // ── Opptak: tekst-logg + lyd ─────────────────────────────────────
    function saveLog() { try { localStorage.setItem(LOG_KEY, JSON.stringify(ctrl._log.slice(-400))); } catch {} }
    function log(role, text) {
      if (!text) return;
      ctrl._log.push({ role, text: String(text), t: Date.now() });
      if (ctrl.recording) { saveLog(); updateExports(); }
    }
    function updateExports() {
      dlTxt.classList.toggle('hidden', !ctrl._log.length);
      dlAud.classList.toggle('hidden', !ctrl._audioBlob);
    }
    async function startAudio() {
      if (!hasRec) return;
      try {
        ctrl._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mime = (window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm')) ? 'audio/webm' : '';
        ctrl._rec = mime ? new MediaRecorder(ctrl._stream, { mimeType: mime }) : new MediaRecorder(ctrl._stream);
        ctrl._chunks = [];
        ctrl._rec.ondataavailable = e => { if (e.data && e.data.size) ctrl._chunks.push(e.data); };
        ctrl._rec.onstop = () => {
          try { ctrl._audioBlob = new Blob(ctrl._chunks, { type: (ctrl._rec && ctrl._rec.mimeType) || 'audio/webm' }); } catch {}
          if (ctrl._stream) { ctrl._stream.getTracks().forEach(t => t.stop()); ctrl._stream = null; }
          updateExports();
        };
        ctrl._rec.start();
      } catch { /* mikrofon nekta → tekst-logg verkar framleis */ }
    }
    function stopAudio() { try { if (ctrl._rec && ctrl._rec.state !== 'inactive') ctrl._rec.stop(); } catch {} }
    function setRecording(on) {
      ctrl.recording = on;
      recBtn.classList.toggle('is-on', on);
      if (on) { saveLog(); startAudio(); setStatus('Tek opp'); }
      else { stopAudio(); setStatus(''); }
      updateExports();
    }
    recBtn.addEventListener('click', () => setRecording(!ctrl.recording));

    dlTxt.addEventListener('click', () => {
      if (!ctrl._log.length) return;
      const lines = ctrl._log.map(m => `${m.role === 'user' ? '🧑 Du' : '🤖 AI'}: ${m.text}`);
      download(new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' }), `samtale-${ns}-${stamp()}.txt`);
    });
    dlAud.addEventListener('click', () => { if (ctrl._audioBlob) download(ctrl._audioBlob, `samtale-${ns}-${stamp()}.webm`); });

    updateExports();

    // Offentleg API for verts-panelet
    return {
      el, speak, log, langCode,
      langName: () => langNameFor(langCode()),
      stopListening,
      isRecording: () => ctrl.recording,
    };
  }

  return { create, langNameFor, langOptions, bcp47, supported: { stt: !!SR, tts: hasTTS, record: hasRec } };
})();
