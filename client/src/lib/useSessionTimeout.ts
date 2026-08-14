/**
 * THE REASON YOU KEPT HAVING TO SIGN IN AGAIN.
 *
 * This signed people out after **30 minutes of no mouse or keyboard**, with a warning at 29. The token
 * itself lasts seven days and the store persists it, so the server was perfectly happy - it was the
 * client throwing people out. Step away from a check-in to go and find the document it just asked you
 * for, come back, sign in again.
 *
 * Her instruction: "you can stay signed-in on the same device for a while without having to sign-in
 * again."
 *
 * WHAT THIS TRADES, SAID PLAINLY. An unattended session now stays open until the token expires or the
 * person signs out. On a shared machine that is a real exposure, and it is why the timer existed. Two
 * things make it a reasonable call rather than a careless one: signing out is now available from the
 * rail on every page rather than only the grounds list, and the seven-day token remains the outer
 * bound. If the exposure matters more than the friction later, the timer belongs on the server as a
 * shorter token plus a refresh, not as a browser timer that fires while the API still trusts you.
 *
 * The hook is kept as a no-op rather than deleted so `SessionGuard` stays the one place session
 * behaviour is decided, and so this note sits where the next person will look for it.
 */
export function useSessionTimeout() {
  /* Nothing. See above: idle sign-out was removed deliberately, not lost. */
}
