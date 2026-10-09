# Deploy notes, screens workspace

## The offline shell (B-113)

A real browser navigation while offline cannot reach the server at all, so without anything cached
the tab went to a blank white page - no mark, no sentence, no way back. `client/public/sw.js` is a
minimal service worker that fixes only that: it handles page navigations alone, tries the network
first, and on failure hands back the precached `client/public/offline.html` instead of the
browser's own blank failure page. It never touches the app's JS, CSS or API responses, so it can
never serve a stale build or stale data after a deploy.

Registered from `client/src/main.tsx` via `client/src/lib/service-worker.ts`, and only for a
production build (`import.meta.env.PROD`) - the dev server (`npm run dev`) never registers it, so
local work is unaffected.

### Where the files go

`client/public/` is copied as-is into `client/dist/` by `vite build`, so both `offline.html` and
`sw.js` are served at the site's root (`/offline.html`, `/sw.js`) exactly as they sit in `public/`
today. `client/vercel.json`'s rewrite (`"source": "/(.*)", "destination": "/index.html"`) does not
override an existing static file - Vercel serves a file that exists in the output directory before
it falls back to a rewrite - so `/sw.js` and `/offline.html` are reachable without any change to
`vercel.json`. Checked by building locally (`npm run build`) and confirming both files land in
`dist/` unchanged, and by serving that build with `vite preview` and requesting `/sw.js` directly.

### A header Hafsah may want to add (not made here)

`vercel.json` sets no explicit `Cache-Control` for `/sw.js`. Browsers already refuse to cache a
service worker script for longer than 24 hours regardless of server headers, so a stale worker
cannot persist indefinitely even with no header at all - but a CDN or browser could still serve a
slightly-stale copy for up to a day after a deploy that changes it. If that gap matters, a
`headers` entry in `client/vercel.json` such as:

```json
{
  "headers": [
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ]
}
```

would remove it entirely. Not added here: "change nothing about deploys" was the instruction for
this task, and this is a deploy-config change, however small. Flagging it for Hafsah to decide.

### The kill switch - how to turn this off

If a later deploy needs the worker gone entirely:

1. Delete `client/public/sw.js` (or have the server answer `404` for that path).
2. Keep `client/src/lib/service-worker.ts`'s registration call in `main.tsx` for at least one
   more deploy cycle - it is what turns the worker off. On the next visit, the browser's fetch of
   `/sw.js` 404s, `register()` rejects, and the `.catch` there calls
   `navigator.serviceWorker.getRegistrations()` and unregisters every one it finds. No manual
   "clear site data" is needed for anyone who visits after the file is removed.
3. Once enough time has passed that essentially nobody still has the old worker installed, the
   `registerServiceWorker()` call itself can be removed from `main.tsx`.

To turn it off immediately for every visitor without waiting on step 2's natural unregister, ship a
version of `sw.js` that calls `self.registration.unregister()` in its `activate` handler and takes
no other action - that forces every existing installation to remove itself on its next activation,
rather than relying on a later visit finding the file missing.
