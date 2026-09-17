// LiveBroadcastSync — RPC-lag mot supabase/migrations/0025_live_broadcasts.sql.
// Same mønster som js/communitysync.js: _enabled()/_client()-guard via SC_Storage,
// feiler stille (false/[]/null) i staden for å kaste, så js/liveGuest.js,
// js/liveGuestAdmin.js og js/liveArchive.js aldri treng try/catch rundt kvart kall.
const LiveBroadcastSync = (() => {
  function _enabled() {
    return (typeof SC_Storage !== 'undefined')
      && SC_Storage.isConfigured()
      && typeof SC_Storage.client === 'function';
  }
  function _client() { return SC_Storage.client(); }

  function _id() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return 'lb_' + crypto.randomUUID().replace(/-/g, '');
    return 'lb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // Eigar-hemmelegheita er DEN SAME som js/livemix.js sin globale «gå live»-
  // status alt bruker (0022_live_broadcast.sql) — ingen ny hemmelegheit å halda styr på.
  function _ownerSecret() {
    return (typeof CONFIG !== 'undefined' && CONFIG.LIVE_BROADCAST_SECRET) || '';
  }

  // ── Artist: send inn / endre / kanseller eiga forespørsel ─────────────────────
  async function submitRequest({ username, email, displayName, message, requestedStart, requestedHours }) {
    if (!_enabled()) return null;
    const id = _id();
    try {
      const { error } = await _client().rpc('submit_broadcast_request', {
        p_id: id, p_username: username, p_email: email || '', p_display_name: displayName || username,
        p_message: message || '', p_requested_start: requestedStart || null, p_requested_hours: requestedHours || 1,
      });
      if (error) { console.warn('[LiveBroadcastSync] submitRequest:', error.message); return null; }
      return id;
    } catch (e) { console.warn('[LiveBroadcastSync] submitRequest:', e.message || e); return null; }
  }

  async function updateMyRequest(id, { username, displayName, message, requestedStart, requestedHours }) {
    if (!_enabled() || !id) return false;
    try {
      const { error } = await _client().rpc('update_my_broadcast_request', {
        p_id: id, p_username: username, p_display_name: displayName || null, p_message: message || null,
        p_requested_start: requestedStart || null, p_requested_hours: requestedHours || null,
      });
      if (error) { console.warn('[LiveBroadcastSync] updateMyRequest:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[LiveBroadcastSync] updateMyRequest:', e.message || e); return false; }
  }

  async function cancelMyRequest(id, username) {
    if (!_enabled() || !id || !username) return false;
    try {
      const { error } = await _client().rpc('cancel_my_broadcast_request', { p_id: id, p_username: username });
      if (error) { console.warn('[LiveBroadcastSync] cancelMyRequest:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[LiveBroadcastSync] cancelMyRequest:', e.message || e); return false; }
  }

  async function setThumbnailOwned(id, username, thumbnailUrl) {
    if (!_enabled() || !id || !username) return false;
    try {
      const { error } = await _client().rpc('set_broadcast_thumbnail_owned', { p_id: id, p_username: username, p_thumbnail_url: thumbnailUrl || '' });
      if (error) { console.warn('[LiveBroadcastSync] setThumbnailOwned:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[LiveBroadcastSync] setThumbnailOwned:', e.message || e); return false; }
  }

  async function markStarted(id, username) {
    if (!_enabled() || !id || !username) return false;
    try {
      const { error } = await _client().rpc('mark_broadcast_started', { p_id: id, p_username: username });
      if (error) { console.warn('[LiveBroadcastSync] markStarted:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[LiveBroadcastSync] markStarted:', e.message || e); return false; }
  }

  async function markEnded(id, username) {
    if (!_enabled() || !id || !username) return false;
    try {
      const { error } = await _client().rpc('mark_broadcast_ended', { p_id: id, p_username: username });
      if (error) { console.warn('[LiveBroadcastSync] markEnded:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[LiveBroadcastSync] markEnded:', e.message || e); return false; }
  }

  async function listMine(username) {
    if (!_enabled() || !username) return [];
    try {
      const { data, error } = await _client().rpc('list_my_broadcast_requests', { p_username: username });
      if (error || !Array.isArray(data)) return [];
      return data;
    } catch (e) { return []; }
  }

  // ── Offentleg: «Live nå» + arkiv (ingen innlogging krevst) ─────────────────────
  async function listLiveNow() {
    if (!_enabled()) return [];
    try {
      const { data, error } = await _client().rpc('get_live_broadcasts_now');
      if (error || !Array.isArray(data)) return [];
      return data;
    } catch (e) { return []; }
  }

  async function listArchive(limit = 60) {
    if (!_enabled()) return [];
    try {
      const { data, error } = await _client().rpc('list_broadcast_archive', { p_limit: limit });
      if (error || !Array.isArray(data)) return [];
      return data;
    } catch (e) { return []; }
  }

  async function getArchiveItem(id) {
    if (!_enabled() || !id) return null;
    try {
      const { data, error } = await _client().rpc('get_broadcast_archive_item', { p_id: id });
      if (error || !Array.isArray(data) || !data.length) return null;
      return data[0];
    } catch (e) { return null; }
  }

  // ── Eigar: godkjenningskø ───────────────────────────────────────────────────────
  async function listPending() {
    if (!_enabled()) return [];
    try {
      const { data, error } = await _client().rpc('list_broadcast_requests_admin', { p_secret: _ownerSecret() });
      if (error || !Array.isArray(data)) { if (error) console.warn('[LiveBroadcastSync] listPending:', error.message); return []; }
      return data;
    } catch (e) { return []; }
  }

  async function review(id, status, reviewer, rejectReason) {
    if (!_enabled() || !id) return false;
    try {
      const { error } = await _client().rpc('review_broadcast_request', {
        p_id: id, p_secret: _ownerSecret(), p_status: status, p_reviewer: reviewer || 'eier', p_reject_reason: rejectReason || '',
      });
      if (error) { console.warn('[LiveBroadcastSync] review:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[LiveBroadcastSync] review:', e.message || e); return false; }
  }

  // ── Admin: rediger ein arkivpost (namn/bilete/melding) ────────────────────────
  // Same p_secret-grense som listPending/review — klientsida gater «Rediger»-
  // knappen bak CONFIG.ADMIN_EMAILS (js/liveArchive.js), men det er DENNE
  // hemmelegheita som faktisk handhevast server-side (0026_admin_edit_broadcast_archive.sql).
  async function adminUpdateArchiveItem(id, { displayName, thumbnailUrl, message } = {}) {
    if (!_enabled() || !id) return false;
    try {
      const { error } = await _client().rpc('admin_update_broadcast_archive', {
        p_id: id, p_secret: _ownerSecret(),
        p_display_name: displayName ?? null, p_thumbnail_url: thumbnailUrl ?? null, p_message: message ?? null,
      });
      if (error) { console.warn('[LiveBroadcastSync] adminUpdateArchiveItem:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[LiveBroadcastSync] adminUpdateArchiveItem:', e.message || e); return false; }
  }

  return {
    submitRequest, updateMyRequest, cancelMyRequest, setThumbnailOwned, markStarted, markEnded,
    listMine, listLiveNow, listArchive, getArchiveItem, listPending, review, adminUpdateArchiveItem, _enabled,
  };
})();

if (typeof window !== 'undefined') window.LiveBroadcastSync = LiveBroadcastSync;
