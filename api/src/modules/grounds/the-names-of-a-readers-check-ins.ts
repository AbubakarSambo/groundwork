import { PrismaService } from '../prisma/prisma.service';
import { namesTheyCanTellApart } from '../../common/check-ins-you-can-tell-apart';
import { A_GROUND_NO_MESSAGE_IS_ABOUT } from './a-ground-that-has-ended';

/**
 * THE NAMES OF ONE READER'S CHECK-INS, TOLD APART WHERE TWO SHARE A NAME.
 *
 * A message names a check-in to somebody. If that somebody is in or runs two check-ins of the same
 * name, the message has to say which one (check-ins-you-can-tell-apart.ts). This reads that person's
 * live check-ins once and answers for any of them. Make one per sweep: it remembers each reader, so a
 * morning of ten thousand messages reads each person once.
 *
 * Only the words in the message change. A check-in whose name is unique reads exactly as it did.
 */
export function theNamesOfReadersCheckIns(prisma: PrismaService) {
  const remembered = new Map<string, Promise<Map<string, string>>>();
  const read = async (who: { userId?: string | null; email?: string | null }): Promise<Map<string, string>> => {
    const userId = who.userId ?? null;
    const email = who.email?.trim().toLowerCase() || null;
    if (!userId && !email) return new Map();
    const key = `${userId ?? ''}|${email ?? ''}`;
    const had = remembered.get(key);
    if (had) return had;
    const made = (async () => {
      const mine = [
        ...(userId ? [{ userId }] : []),
        ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : []),
      ];
      let grounds: any[] = [];
      try {
        grounds = await (prisma as any).ground.findMany({
        where: {
          status: { notIn: A_GROUND_NO_MESSAGE_IS_ABOUT },
          OR: [
            ...(userId ? [{ initiatorId: userId }] : []),
            { participants: { some: { OR: mine } } },
          ],
        },
        select: { id: true, label: true, createdAt: true, initiator: { select: { firstName: true } } },
        });
      } catch { /* A name that cannot be told apart is the name as stored, never a failed message. */ }
      return namesTheyCanTellApart((grounds ?? []).map((g) => ({ id: g.id, label: g.label, startedAt: g.createdAt, leadName: g.initiator?.firstName })));
    })();
    remembered.set(key, made);
    return made;
  };
  /** The check-in's name for this reader: told apart where they have two of the same name, else as stored. */
  return async (who: { userId?: string | null; email?: string | null }, groundId: string, label: string): Promise<string> => {
    const names = await read(who);
    return names.get(groundId) ?? label;
  };
}
