/**
 * THE SAME REQUEST SENT AT THE SAME MOMENT IS ONE REQUEST (B-147). Three presses at once each looked for a waiting request, found none, and each made one.
 * While one is being made, an identical one waits for it and is given the same answer. (A later identical request is folded in by the services, which look for a
 * waiting one first.)
 */
const inTheMaking = new Map<string, Promise<unknown>>();

export function oneAtATime<T>(key: string, make: () => Promise<T>): Promise<T> {
  const running = inTheMaking.get(key) as Promise<T> | undefined;
  if (running) return running;
  const started = make().finally(() => { inTheMaking.delete(key); });
  inTheMaking.set(key, started);
  return started;
}
