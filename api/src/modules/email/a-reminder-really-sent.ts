/**
 * "I HAVE ALREADY SENT REMINDERS TO BRIAN THIS WEEK." NONE WAS SENT (final evaluation, profile 1, problem 2; decision 139, must-fix 3).
 *
 * The lead's Friday letter said it from the participant row's `lastNudgedAt`. That column is stamped by more than a reminder to check in: the
 * "your report is ready" mail stamps it too (grounds.cron.ts, the reveal reminder, which uses it as its own throttle). That week Brian was
 * sent two "your report is ready" mails and no reminder at all, and had no check-in open, so the letter told Wairimu something Groundwork
 * never did.
 *
 * THE RULE. Groundwork says it reminded somebody only where the record of messages (`Notification`, written by the mailer for every mail
 * it really sends) holds a reminder to check in, sent to that person's address in that window. A reminder held for quiet hours counts when
 * it goes, not when it is held. Not being able to read the record is not leave to say it: then nobody is said to have been reminded.
 */
export const CHECK_IN_REMINDER_SENDERS = ['sendNudge', 'sendNudgeFromAPress', 'sendLeadFirstCheckIn'] as const;

/** For each address given that was really sent a reminder to check in between `since` and `now`, the last time one went. Lower-case keys. */
export async function whenEachWasLastRemindedToCheckIn(
  prisma: { notification?: { findMany?: (args: any) => Promise<{ toAddress: string; createdAt?: Date | string | null }[]> } },
  addresses: readonly string[],
  since: Date,
  now: Date,
): Promise<Map<string, Date>> {
  const wanted = [...new Set(addresses.map((a) => String(a ?? '').trim()).filter(Boolean))];
  const out = new Map<string, Date>();
  if (!wanted.length || !prisma?.notification?.findMany) return out;
  try {
    const rows = await prisma.notification.findMany({
      where: {
        channel: 'email',
        outcome: 'sent',
        sender: { in: [...CHECK_IN_REMINDER_SENDERS] },
        createdAt: { gte: since, lte: now },
        OR: wanted.map((a) => ({ toAddress: { equals: a, mode: 'insensitive' } })),
      },
      select: { toAddress: true, createdAt: true },
    });
    for (const r of rows ?? []) {
      const key = String(r?.toAddress ?? '').trim().toLowerCase();
      if (!key) continue;
      const at = r?.createdAt ? new Date(r.createdAt as any) : now;
      const before = out.get(key);
      if (!before || at.getTime() > before.getTime()) out.set(key, at);
    }
    return out;
  } catch {
    return new Map();
  }
}

/** The addresses, of those given, that were really sent a reminder to check in between `since` and `now`. Lower case. */
export async function whoWasReallyRemindedToCheckIn(
  prisma: { notification?: { findMany?: (args: any) => Promise<{ toAddress: string }[]> } },
  addresses: readonly string[],
  since: Date,
  now: Date,
): Promise<Set<string>> {
  return new Set((await whenEachWasLastRemindedToCheckIn(prisma as any, addresses, since, now)).keys());
}
