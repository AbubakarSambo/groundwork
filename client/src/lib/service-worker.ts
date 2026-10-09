/**
 * REGISTERS THE OFFLINE-SHELL SERVICE WORKER (B-113) - but only for a production build.
 *
 * `isProd` defaults to `import.meta.env.PROD`, which Vite sets to `false` for the dev server and
 * `true` for a real build; passing it in explicitly is what lets a test exercise both branches
 * without needing to fake Vite's env.
 *
 * DEV NEVER REGISTERS IT. Local work and `npm run dev` must behave exactly as before this existed -
 * no intercepted requests, nothing cached - so outside a production build this function only cleans
 * up (see kill switch below) and returns.
 *
 * KILL SWITCH: if a later deploy removes public/sw.js, the browser's next fetch of it 404s and
 * `register()` rejects - at that point any worker a browser already installed from an earlier visit
 * is unregistered, so removing the file is enough to turn this whole thing off; nobody needs to
 * clear site data by hand. See docs/deploy-notes-screens.md for how to do that on purpose.
 */
export function registerServiceWorker(isProd: boolean = import.meta.env.PROD) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  const unregisterExisting = () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    })
  }

  if (!isProd) {
    // Also removes anything a previous production build on this same machine left behind.
    unregisterExisting()
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(unregisterExisting)
  })
}
