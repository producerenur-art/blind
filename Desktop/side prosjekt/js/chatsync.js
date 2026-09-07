// ChatSync — speiler radio-livechatten (js/chat.js) til Supabase, same rolle
// som CommentSync/ReactionSync har for Community. Gun (SC.NS/GUN_PEERS) er
// framleis sanntids-forsøket, men dei offentlege releane leverer IKKJE
// pålitelig meldingar mellom to ULIKE nettlesarar (verifisert 2026-06-28, sjå
// minne soundcore-gun-relay-browser-sync) — denne pollinga er difor den
// faktisk pålitelige transporten på tvers av brukarar, ikkje berre eit
// tilleggslag. Chatten er open/anonym (ingen innlogging krevst, sjølvvalt
// kallenamn), så ingen eigarskaps-hemmelegheit trengst — sjå
// supabase/migrations/0015_radio_chat.sql.
//
// Degraderer pent: er ikkje Supabase konfigurert er ALT her no-ops, og
// chatten fungerer som før (kun Gun/lokalt).
const ChatSync = (() => {
  function _enabled() {
    return (typeof SC_Storage !== 'undefined')
      && SC_Storage.isConfigured()
      && typeof SC_Storage.client === 'function';
  }
  function _client() { return SC_Storage.client(); }

  // Send éi melding. Fire-and-forget: feil logges, kaster aldri — chatten
  // skal aldri stoppe opp fordi sky-spegling feiler.
  async function push(msg) {
    if (!_enabled() || !msg || !msg.id || !msg.text) return false;
    try {
      const { error } = await _client().rpc('insert_radio_chat', {
        p_id:    msg.id,
        p_nick:  msg.nick || 'Anon',
        p_color: msg.color || '',
        p_text:  msg.text,
        p_ts:    Number(msg.ts) || Date.now(),
        p_type:  msg.type || 'msg',
      });
      if (error) { console.warn('[ChatSync] push:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[ChatSync] push:', e.message || e); return false; }
  }

  // Hent siste meldingar frå sky. Tom liste ved feil/ikkje-konfigurert.
  async function list(limit = 120) {
    if (!_enabled()) return [];
    try {
      const { data, error } = await _client().rpc('list_radio_chat', { p_limit: limit });
      if (error || !Array.isArray(data)) return [];
      return data;
    } catch (e) { return []; }
  }

  return { push, list, _enabled };
})();

if (typeof window !== 'undefined') window.ChatSync = ChatSync;
