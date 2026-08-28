// Hash-based SPA router — keeps music player alive across route changes
const Router = (() => {
  const routes = {};
  let currentRoute = null;
  let dispatchSeq  = 0;   // guards against stale async renders overwriting newer ones

  function define(path, handler) {
    routes[path] = handler;
  }

  function go(path) {
    window.location.hash = path.startsWith('/') ? path : '/' + path;
  }

  function parse(hash) {
    const path = (hash || '').replace(/^#/, '') || '/';
    // Match dynamic segments: /u/:username, /activate/:token, /reset/:token
    for (const pattern of Object.keys(routes)) {
      const paramNames = [];
      const regexStr   = pattern.replace(/:([^/]+)/g, (_, name) => { paramNames.push(name); return '([^/]+)'; });
      const match      = path.match(new RegExp(`^${regexStr}$`));
      if (match) {
        const params = {};
        paramNames.forEach((name, i) => params[name] = decodeURIComponent(match[i + 1]));
        return { handler: routes[pattern], params };
      }
    }
    return null;
  }

  async function dispatch() {
    const myId  = ++dispatchSeq;
    const hash  = window.location.hash;
    const path  = (hash || '').replace(/^#/, '') || '/';
    // Mark the front page so home-only flourishes (e.g. the whiter starfield)
    // can key off it and leave when you open a tab.
    document.body.classList.toggle('route-home', path === '/');
    const found = parse(hash);
    if (found) {
      currentRoute = hash;
      await found.handler(found.params);
      // A faster, newer navigation may have started while this async handler was
      // awaiting and left stale content in #app — re-render if the location changed
      // while we were awaiting, so the latest page always wins. NB: compare the actual
      // hash (not dispatchSeq) — a seq compare leap-frogs forever when two async
      // dispatches overlap (each completion spawns a permanently-"stale" re-dispatch).
      if (window.location.hash !== hash) dispatch();
    } else {
      // 404
      document.getElementById('app').innerHTML = `
        <div class="empty-state" style="padding:8rem">
          <div class="empty-icon">${Icon('search')}</div>
          <p style="font-size:1.1rem;font-weight:600;margin-bottom:0.5rem">Page not found</p>
          <p>Check the URL and try again.</p>
          <a href="#/" class="btn btn-primary" style="margin-top:1.5rem;display:inline-flex">${Icon('arrow-left')} Home</a>
        </div>`;
    }
  }

  function init() {
    window.addEventListener('hashchange', dispatch);
    dispatch();
  }

  return { define, go, init, dispatch };
})();
// Eksporter til window — mange moduler vaktar på `if (window.Router)` før dei
// navigerer (Groups «Opprett gruppe», innloggings-redirect i Social/Friends/Share,
// Payment.dispatch). Utan denne er Router eit leksikalsk const og window.Router
// undefined, så alle desse navigeringane feila stille. Sjå window-global-gotcha.
window.Router = Router;
