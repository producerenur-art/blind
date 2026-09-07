// GroupSync — speiler grupper + gruppeinnlegg (js/groups.js) via
// api/groups.js, same rolle som DmSync har for privatmeldingar. Gun (SC.NS.
// groups/gposts) er framleis sanntids-forsøket, men leverer IKKJE pålitelig
// mellom to ULIKE nettlesarar (sjå minne soundcore-gun-relay-browser-sync).
//
// Grupper kan vere 'closed' (private) — autorisering handhevast server-side
// i api/groups.js (sessionToken + medlemskap), sjå
// supabase/migrations/0019_groups.sql. 'list'/'posts_list' krev IKKJE token
// (opne grupper er synlege for gjester også, akkurat som Gun-åtferda) —
// token sendast likevel når det finst, så lukka grupper du er medlem av
// også kjem med.
//
// Degraderer pent: manglar Supabase-konfig er ALT her no-ops, og grupper
// fungerer som før (kun Gun/lokalt).
const GroupSync = (() => {
  function _token() {
    const me = (typeof Auth !== 'undefined') ? Auth.current() : null;
    return me && me.sessionToken ? me.sessionToken : null;
  }
  function _enabled() {
    return (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();
  }

  async function _call(action, payload) {
    if (!_enabled()) return null;
    try {
      const res = await fetch('/api/groups', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, sessionToken: _token(), ...payload }),
      });
      if (res.status === 404 || res.status === 503) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { console.warn('[GroupSync]', action, data.error || res.status); return null; }
      return data;
    } catch (e) { console.warn('[GroupSync]', action, e.message || e); return null; }
  }

  async function listGroups() {
    const data = await _call('list', {});
    return (data && Array.isArray(data.groups)) ? data.groups : [];
  }
  // Fire-and-forget: feil logges, kaster aldri.
  async function upsertGroup(group) {
    const data = await _call('upsert_group', { group });
    return !!(data && data.success);
  }
  async function updateMembers(groupId, op, target) {
    const data = await _call('update_members', { groupId, op, target });
    return (data && data.success) ? data.members : null;
  }
  async function deleteGroup(groupId) {
    const data = await _call('delete_group', { groupId });
    return !!(data && data.success);
  }
  async function listPosts(groupId) {
    const data = await _call('posts_list', { groupId });
    return (data && Array.isArray(data.posts)) ? data.posts : [];
  }
  async function createPost(post) {
    const data = await _call('post_create', {
      id: post.id, groupId: post.groupId, text: post.text,
      authorDisplay: post.authorDisplay, ts: post.ts,
    });
    return !!(data && data.success);
  }
  async function deletePost(id) {
    const data = await _call('post_delete', { id });
    return !!(data && data.success);
  }

  return { _enabled, listGroups, upsertGroup, updateMembers, deleteGroup, listPosts, createPost, deletePost };
})();

if (typeof window !== 'undefined') window.GroupSync = GroupSync;
