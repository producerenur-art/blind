/* ═══════════════════════════════════════════
   Newsletter — "Updates" dock widget email signup, for guests AND logged-in
   users. Same weekly "What's coming up" email that registered accounts get
   (api/live-reminder.js), stored in public.newsletter_subscribers
   (see supabase/migrations/0021_newsletter_subscribers.sql).
   ═══════════════════════════════════════════ */
(function () {
  function init() {
    const input = document.getElementById('dock-updates-email');
    const go    = document.getElementById('dock-updates-go');
    if (!input || !go) return;

    // Forhåndsutfyll med kontoens e-post hvis innlogget — hen kan fortsatt
    // endre den før innsending.
    try {
      if (typeof Auth !== 'undefined' && Auth.current) {
        const u = Auth.current();
        if (u && u.email && !input.value) input.value = u.email;
      }
    } catch (_) {}

    async function submit() {
      const email = String(input.value || '').trim();
      if (!email || !email.includes('@')) {
        if (typeof toast === 'function') toast('Enter a valid email address.', 'error');
        return;
      }
      go.disabled = true;
      try {
        const res = await fetch('/api/auth?action=subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          if (typeof toast === 'function') toast("You're subscribed ✓", 'success');
        } else if (data.notProvisioned) {
          if (typeof toast === 'function') toast('Updates are not set up yet — try again later.', 'error');
        } else {
          if (typeof toast === 'function') toast(data.error || 'Could not subscribe right now.', 'error');
        }
      } catch (_) {
        if (typeof toast === 'function') toast('Network error — try again.', 'error');
      } finally {
        go.disabled = false;
      }
    }

    go.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
