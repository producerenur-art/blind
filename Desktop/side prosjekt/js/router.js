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
    // Mark the front page so cosmos-only flourishes (the flying UFO) can stay on
    // the home screen but leave when you open a tab. The starfield is unaffected.
    document.body.classList.toggle('route-home', path === '/');
    const found = parse(hash);
    if (found) {
      currentRoute = hash;
      await found.handler(found.params);
      // A faster, newer navigation may have started while this async handler was
      // awaiting and left stale content in #app — re-render the current route so
      // the latest page always wins (prevents pages stacking/overwriting).
      if (myId !== dispatchSeq) dispatch();
    } else {
      // 404
      document.getElementById('app').innerHTML = `
        <div class="empty-state" style="padding:8rem">
          <div class="empty-icon">${Icon('search')}</div>
          <p style="font-size:1.1rem;font-weight:600;margin-bottom:0.5rem">Side ikke funnet</p>
          <p>Sjekk nettadressen og prøv igjen.</p>
          <a href="#/" class="btn btn-primary" style="margin-top:1.5rem;display:inline-flex">${Icon('arrow-left')} Hjem</a>
        </div>`;
    }
  }

  function init() {
    window.addEventListener('hashchange', dispatch);
    dispatch();
  }

  return { define, go, init, dispatch };
})();
