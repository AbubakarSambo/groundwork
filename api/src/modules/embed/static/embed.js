/**
 * THE LOADER. It does almost nothing, on purpose.
 *
 * This runs on every page of somebody else's application. It must never block their render, never
 * throw into their console, and never take their site down because ours is having a bad day - so
 * every failure path here ends in `return`, quietly, leaving their page exactly as it was.
 *
 * Three events out of the panel, two in. Nothing else crosses, and no part of a conversation
 * crosses in either direction. That is what their security reviewer will ask about, and a
 * three-event contract is a much better answer than a policy statement.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var API = script.getAttribute('data-api') || script.src.replace(/\/embed\.js.*$/, '');
  var MODE = script.getAttribute('data-mode') === 'anchor' ? 'anchor' : 'floating';
  var ANCHOR = script.getAttribute('data-anchor');

  /**
   * HOW THE HOST TELLS US WHO IS LOGGED IN.
   *
   * Their server mints the token; the page hands it over. A function is offered as well as an
   * attribute because a token is short-lived by design, and a page that lives longer than five
   * minutes needs to be able to mint another one rather than carry a stale one in its HTML.
   */
  function identityToken() {
    var attr = script.getAttribute('data-token');
    if (attr) return Promise.resolve(attr);
    var fn = window.groundworkIdentityToken;
    if (typeof fn === 'function') {
      try { return Promise.resolve(fn()); } catch (e) { return Promise.resolve(null); }
    }
    return Promise.resolve(null);
  }

  var panel = null;
  var launcher = null;
  var open = false;

  function post(msg) {
    if (panel && panel.contentWindow) panel.contentWindow.postMessage(msg, API);
  }

  function makePanel(session) {
    var f = document.createElement('iframe');
    /*
     * AN IFRAME, NOT INJECTED MARKUP. Injected DOM inherits the host application's CSS and breaks
     * unpredictably across customers - one of them has a global `button { }` rule and our panel
     * arrives looking like their checkout.
     */
    /* `org` picks the frame-ancestors policy; the token goes in the fragment, which is never sent
       to a server and never lands in an access log. */
    f.src = API + '/embed/panel?org=' + encodeURIComponent(session.organizationId || '') + '#' + encodeURIComponent(session.sessionToken);
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    f.setAttribute('title', 'Groundwork');
    f.style.cssText = MODE === 'anchor'
      ? 'width:100%;height:420px;border:0;border-radius:10px;'
      : 'position:fixed;bottom:84px;right:20px;width:380px;height:520px;max-width:calc(100vw - 40px);max-height:calc(100vh - 120px);border:0;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.18);z-index:2147483000;display:none;background:#fff;';
    return f;
  }

  function makeLauncher(badge) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Open Groundwork');
    b.style.cssText = 'position:fixed;bottom:20px;right:20px;width:52px;height:52px;border-radius:26px;border:0;background:#1C4E80;color:#fff;font-size:20px;cursor:pointer;z-index:2147483001;box-shadow:0 6px 20px rgba(0,0,0,.2);';
    b.textContent = '◔';
    if (badge && badge.count) {
      var dot = document.createElement('span');
      dot.style.cssText = 'position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:8px;background:#C0392B;color:#fff;font-size:10px;line-height:16px;';
      dot.textContent = String(badge.count);
      b.appendChild(dot);
    }
    b.addEventListener('click', function () {
      open = !open;
      panel.style.display = open ? 'block' : 'none';
      if (open) post({ type: 'open' });
    });
    return b;
  }

  function mount(session) {
    panel = makePanel(session);

    if (MODE === 'anchor') {
      var host = ANCHOR ? document.querySelector(ANCHOR) : null;
      /* No container means nothing renders. Falling back to floating would put a widget somewhere
         the customer did not choose, on every page, silently. */
      if (!host) return;
      host.appendChild(panel);
    } else {
      document.body.appendChild(panel);
      launcher = makeLauncher(session.badge);
      document.body.appendChild(launcher);
    }

    window.addEventListener('message', function (e) {
      /* Only from us, and only the three things the panel is allowed to say. */
      if (e.origin !== API || !e.data || e.source !== panel.contentWindow) return;
      if (e.data.type === 'ready') {
        post({ type: 'open' });
      } else if (e.data.type === 'resize' && MODE === 'anchor') {
        var h = Number(e.data.height);
        if (h > 0 && h < 2000) panel.style.height = h + 'px';
      } else if (e.data.type === 'closed' && MODE === 'floating') {
        open = false;
        panel.style.display = 'none';
      }
    });

    /**
     * `context` IS AN IDENTIFIER AND NEVER CONTENT.
     *
     * It lets the host say which screen somebody is on, so the conversation opens grounded rather
     * than cold. A host that put a document in here would be posting its own content into our
     * frame, so the shape refuses anything but ids.
     */
    window.groundwork = {
      context: function (ref) {
        if (!ref || typeof ref !== 'object') return;
        post({ type: 'context', subjectExternalId: String(ref.subjectExternalId || '').slice(0, 200) });
      },
      open: function () {
        if (MODE !== 'floating' || !panel) return;
        open = true;
        panel.style.display = 'block';
        post({ type: 'open' });
      },
    };
  }

  function start() {
    identityToken().then(function (token) {
      if (!token) return;
      return fetch(API + '/api/org/v1/embed/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token }),
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (session) {
          /*
           * `visible: false` RENDERS NOTHING. Not a disabled launcher, not a message - somebody out
           * of scope should not learn that there is something they are out of.
           */
          if (!session || !session.visible) return;
          mount(session);
        });
    }).catch(function (err) {
      /*
       * Groundwork being unreachable is not the customer's problem and must not look like one, so
       * this stays silent on their pages.
       *
       * BUT IT HID A BUG OF MINE FOR HALF AN HOUR. A renamed parameter left a ReferenceError inside
       * mount, the catch swallowed it, and the widget simply did not appear - no error, no clue,
       * nothing in the console to search for. Silence is right for a customer and wrong for whoever
       * is integrating, so `data-debug` opts in. Off by default, and off is what ships.
       */
      if (script.getAttribute('data-debug') !== null && window.console) {
        console.error('[groundwork] embed failed to start:', err);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
