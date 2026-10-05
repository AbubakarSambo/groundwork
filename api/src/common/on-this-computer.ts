/**
 * WHETHER AN ADDRESS IS THIS COMPUTER. A journey that talks to a running API refuses anything else before a request is
 * made. Kept in src so a spec can prove it without importing anything from outside src (the build would then compile
 * journey/ too, put the server at dist/src/main.js, and `node dist/main` would not start).
 */
export function onThisComputer(base: string): boolean {
  try {
    const u = new URL(base);
    return ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  } catch {
    return false;
  }
}
