/* ═══════════════════════════════════════════════════════════
   sfmWord.js — ordmerket «SiriusFM» i banner-fargane
   ───────────────────────────────────────────────────────────
   Går gjennom teksten på sida og pakkar kvar førekomst av
   ordet «SiriusFM» i <span class="sfm">, slik at CSS-en kan gje
   det gradienten kvit → isblå → lavendel (sjå --sfmG i styles.css).
   Køyrer på oppstart, ved ruteskifte og når DOM-en blir bygd om.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var WORD = /Sirius\s?FM/g;                       // «SiriusFM» og «Sirius FM»
  var SKIP_TAGS = {
    SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1,
    OPTION: 1, TITLE: 1, NOSCRIPT: 1, SVG: 1
  };

  function skipNode(node) {
    var el = node.parentElement;
    while (el && el !== document.body) {
      if (SKIP_TAGS[el.tagName]) return true;
      if (el.classList && el.classList.contains('sfm')) return true;   // alt pakka
      if (el.isContentEditable) return true;
      el = el.parentElement;
    }
    return false;
  }

  function wrapIn(root) {
    if (!root || !root.ownerDocument) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var hits = [], n;
    while ((n = walker.nextNode())) {
      WORD.lastIndex = 0;
      if (!WORD.test(n.nodeValue)) continue;
      if (skipNode(n)) continue;
      hits.push(n);
    }
    hits.forEach(function (node) {
      var text = node.nodeValue, frag = document.createDocumentFragment();
      var last = 0, m;
      WORD.lastIndex = 0;
      while ((m = WORD.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var span = document.createElement('span');
        span.className = 'sfm';
        span.textContent = m[0];
        frag.appendChild(span);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
    });
  }

  var observer = null, pending = null;

  function run() {
    if (observer) observer.disconnect();          // ikkje reager på våre eigne endringar
    try { wrapIn(document.body); } catch (e) { /* aldri blokker sida */ }
    if (observer) observer.observe(document.body, { childList: true, subtree: true });
  }

  function schedule() {
    if (pending) return;
    pending = setTimeout(function () { pending = null; run(); }, 120);
  }

  function start() {
    if (!document.body) return;
    if (window.MutationObserver) {
      observer = new MutationObserver(schedule);
    }
    run();
    window.addEventListener('hashchange', schedule);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.SfmWord = { refresh: schedule };
})();
