import { AsyncLocalStorage } from 'async_hooks';

/**
 * ASK GROUNDWORK ON WHATSAPP NEVER ANSWERS FROM A CHECK-IN KEPT IN THE APP (decision 82, item 7).
 *
 * The lead can keep a check-in off the phone (`Ground.overWhatsApp = false`, see
 * whatsapp/a-check-in-kept-off-the-phone.ts): a performance plan, say. Its notices, reminders, report
 * and answers already stay off WhatsApp. Ask Groundwork did not know which door a question came
 * through, so on WhatsApp it could still recall that check-in's report, quote what somebody said in
 * it, name a commitment made in it, or hand its words to the model.
 *
 * Now a question asked on WhatsApp runs inside `onWhatsApp`, and every place Ask Groundwork reads
 * the record asks `keptInTheApp` for the check-ins it must leave out, and leaves them out in the read
 * itself: a query that never selects them, or a report read that refuses them. Nothing is hidden in
 * the wording afterwards. In the app the set is always empty, so Ask Groundwork there is unchanged.
 */

interface TheDoor {
  whatsapp: true;
  /** The organisation's check-ins kept in the app, read once per question. */
  kept?: Map<string, Promise<Set<string>>>;
}

const door = new AsyncLocalStorage<TheDoor>();

/** Run one Ask Groundwork question as asked on WhatsApp. */
export function onWhatsApp<T>(fn: () => Promise<T>): Promise<T> {
  return door.run({ whatsapp: true, kept: new Map() }, fn);
}

/** Whether the question being answered came in on WhatsApp. */
export function askedOnWhatsApp(): boolean {
  return !!door.getStore()?.whatsapp;
}

type GroundReader = { ground: { findMany(args: any): Promise<{ id: string }[]> } };

/**
 * The ids of this organisation's check-ins kept in the app, when the question came in on WhatsApp.
 * Empty in the app. Read from the check-ins themselves, never from what a screen hid.
 */
export async function keptInTheApp(prisma: GroundReader, organizationId: string): Promise<Set<string>> {
  const store = door.getStore();
  if (!store?.whatsapp) return new Set();
  const cache = store.kept ?? (store.kept = new Map());
  let found = cache.get(organizationId);
  if (!found) {
    found = prisma.ground
      .findMany({ where: { organizationId, overWhatsApp: false }, select: { id: true } })
      .then((rows) => new Set((rows ?? []).map((r) => r.id)))
      /* Not knowing is not permission: if the read fails on WhatsApp, every check-in is treated as kept. */
      .catch(() => new Set(['*']));
    cache.set(organizationId, found);
  }
  return found;
}

/** Whether a row from this check-in may be read for this question. */
export function mayBeRead(kept: Set<string>, groundId: string | null | undefined): boolean {
  if (!kept.size) return true;
  if (kept.has('*')) return !groundId;
  return !groundId || !kept.has(groundId);
}

/** A where clause for rows that carry a check-in's id in `field`: those kept in the app are never selected. */
export function notFromAKeptCheckIn(kept: Set<string>, field: string): Record<string, unknown> {
  if (!kept.size) return {};
  if (kept.has('*')) return { AND: [{ [field]: null }] };
  return { AND: [{ OR: [{ [field]: null }, { [field]: { notIn: [...kept] } }] }] };
}

/** A where clause on a check-in's own id (a `ground` relation, or a required `groundId`): those kept in the app are never selected. */
export function notAKeptCheckIn(kept: Set<string>): { id?: { notIn: string[] } | { in: string[] } } {
  if (!kept.size) return {};
  if (kept.has('*')) return { id: { in: [] } };
  return { id: { notIn: [...kept] } };
}
