/**
 * A HIDDEN CHECK-IN IS ON NO LIST (Hafsah, 22 November 2026).
 *
 * A check-in people have already answered cannot be deleted, because the record stays: what people said, the reports and the
 * contribution record ("delete the way in, not the record"). Its lead or an admin can take it off everyone's lists instead,
 * which sets `grounds.hidden_at`.
 *
 * Lists of check-ins are read in close to a hundred places: the check-in list, the Desk, My work, boards, Ask, reminders and
 * the daily letters. Adding the same filter to each would leave the next one open. So it is done here, where every one of them
 * ends, beside the other rules on the database client:
 *
 * - every list or count of check-ins (`ground.findMany`, `count`, `groupBy`, `aggregate`) skips hidden ones, and so does a
 *   `ground.findFirst` that is not by id (the first of a list is still a list);
 * - every list, count or first-of of sessions or of people across check-ins (`checkIn.*`, `groundParticipant.*` with no
 *   `groundId`, `id`, `participantId` or `inviteToken` at the top of its filter) skips those of hidden check-ins. "My check-ins",
 *   Today, the reminders and the WhatsApp replies read people and sessions across check-ins, not grounds (release test 22 November,
 *   bug N6), so the rule covers them too. A read inside one known check-in or of one known person on it is left alone, so the record
 *   itself still reads whole.
 *
 * A read that names `hiddenAt` itself (the hide route, or anything that wants hidden ones on purpose) is left alone too.
 */
const LISTS = ['findMany', 'count', 'groupBy', 'aggregate', 'findFirst', 'findFirstOrThrow'];
/** A filter with one of these at its top reads inside one known check-in, or one known person on it. */
const INSIDE_ONE = ['groundId', 'id', 'participantId', 'inviteToken'];

function names(where: unknown, key: string): boolean {
  return !!where && typeof where === 'object' && JSON.stringify(where).includes(`"${key}"`);
}

function withAlso(where: unknown, also: Record<string, unknown>): Record<string, unknown> {
  return where && typeof where === 'object' && Object.keys(where as object).length ? { AND: [where, also] } : also;
}

export function aHiddenCheckInIsOnNoList<P extends { model?: string; action: string; args?: any }>(params: P): P {
  if (!LISTS.includes(params.action)) return params;
  const where = params.args?.where;
  if (names(where, 'hiddenAt')) return params;
  const top = where && typeof where === 'object' ? Object.keys(where) : [];
  if (params.model === 'Ground') {
    if (params.action.startsWith('findFirst') && top.includes('id')) return params;
    return { ...params, args: { ...(params.args ?? {}), where: withAlso(where, { hiddenAt: null }) } };
  }
  if (params.model === 'CheckIn' || params.model === 'GroundParticipant') {
    if (top.some((k) => INSIDE_ONE.includes(k))) return params;
    return { ...params, args: { ...(params.args ?? {}), where: withAlso(where, { ground: { hiddenAt: null } }) } };
  }
  return params;
}
