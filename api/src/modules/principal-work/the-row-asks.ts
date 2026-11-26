/**
 * THE OWNER IS ASKED FIRST (change 4: "a gap or a delay becomes a specific question to a named owner, grounded in what was seen, before it
 * becomes an alert to her").
 *
 * Every flag the rules raise on a report's rows (the-row-rules.ts) that is past the office's threshold is put, once, to the person who can answer
 * it, with the row it rests on: "the refund application APP-14 (Refunds 2026.xlsx, sheet 2026, row 3) was approved 28 days ago and the register
 * does not show it paid. What is happening with it now, and what is the next step?" Whoever is asked is the owner the row names, where that person
 * is on her team with an address, else whoever sent the report, never the principal herself and never a person who acts for her.
 *
 * Asked means the message went (information_gaps: queued, then asked when the one mail door really sends it, and given back when it does not), so
 * the register says "I asked Bola on 12 November and have had no answer" only when that is true. Whatever the person sends after it is their answer
 * (closeWhatTheyAnswered), and the register carries it to her with the flag. Considerate like every nudge: one message a person a day at most,
 * a flag asked once, never at night (the mail door holds it).
 */
import { anAskKey, giveTheAskBack, queueTheAsk, theQuestionsOnRecordFor } from '../executive-onboarding/information-gaps';
import { theTeamSheNamed } from '../executive-onboarding/the-material-for-work';
import { writeItOnce } from '../year-end/the-year-end-log';
import { rowKeyId } from './the-rows-in-a-report';
import { theFlags, theThresholds, type AFlag } from './the-row-rules';

export interface TheRowAskPorts {
  askByEmail(a: { organizationId: string; to: string; name: string; subject: string; text: string; askKey?: string }): Promise<'sent' | 'held' | 'suppressed'>;
}
export const THE_ROW_ASK_HEADING = 'A question about the office reports';
const MOST_IN_ONE_MESSAGE = 6;

const tokens = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(' ').filter(Boolean);
/**
 * The team member the row names, by their name as the row writes it ("Bola Ade", "Bola", "B. Ade"): every word of it that is not an initial is a
 * word of their name. Only when exactly one person on her team fits, so an owner is never guessed between two people.
 */
export function theNamedOwner(owner: string | null, team: { name: string; email: string | null }[]): { name: string; email: string } | null {
  const words = tokens(owner ?? '').filter((w) => w.length > 1);
  if (!words.length) return null;
  const fits = team.filter((t) => t.email && words.every((w) => tokens(t.name).includes(w)));
  return fits.length === 1 ? { name: fits[0].name, email: fits[0].email! } : null;
}

export const theQuestionFor = (f: AFlag): string => `${f.item} (${f.where}). ${f.says} What is happening with it now, and what is the next step?`;

/** Puts each flag past its threshold, once, to whoever can answer it. Once a day for each principal. Returns how many messages went. */
export async function askAboutTheReports(prisma: any, ports: TheRowAskPorts, a: { organizationId: string; principalUserId: string; principalFirst: string; preferences: any; now: Date; day: string }): Promise<number> {
  const rows: any[] = (await Promise.resolve(prisma.reportRow?.findMany?.({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId } })).catch(() => [])) ?? [];
  if (!rows.length) return 0;
  if (!(await writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'told', subject: `row-asks:${a.day}`, at: a.now }))) return 0;
  const flags = theFlags(rows, { now: a.now, thresholds: theThresholds(a.preferences) }).filter((f) => f.due);
  if (!flags.length) return 0;
  const team = await theTeamSheNamed(prisma, a.organizationId, a.principalUserId);
  const principal: any = await prisma.user.findUnique({ where: { id: a.principalUserId }, select: { email: true } }).catch(() => null);
  const grants: any[] = (await Promise.resolve(prisma.delegate?.findMany?.({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId, revokedAt: null } })).catch(() => [])) ?? [];
  const notThem = new Set([String(principal?.email ?? '').toLowerCase(), ...grants.map((g) => String(g.delegateEmail).toLowerCase())].filter(Boolean));
  const latestOf = new Map<string, any>();
  for (const r of rows) if (!latestOf.has(r.rowKey) || new Date(r.receivedAt) > new Date(latestOf.get(r.rowKey).receivedAt)) latestOf.set(r.rowKey, r);

  /* Whoever can answer each flag: the owner the row names on her team, else whoever sent the report. Nobody, when neither is somebody to write to. */
  const byPerson = new Map<string, { name: string; flags: AFlag[] }>();
  for (const f of flags) {
    const sentFrom = String(latestOf.get(f.rowKey)?.sentFrom ?? '').toLowerCase();
    const named = theNamedOwner(f.owner, team);
    const sender = /@/.test(sentFrom) && !notThem.has(sentFrom) ? { name: team.find((t) => t.email === sentFrom)?.name ?? sentFrom.split('@')[0], email: sentFrom } : null;
    const who = named && !notThem.has(named.email) ? named : sender;
    if (!who) continue;
    const p = byPerson.get(who.email) ?? { name: who.name, flags: [] };
    p.flags.push(f);
    byPerson.set(who.email, p);
  }

  let went = 0;
  for (const [email, p] of byPerson) {
    const onRecord = await theQuestionsOnRecordFor(prisma, { principalUserId: a.principalUserId, askedOfEmail: email });
    const fresh = p.flags.filter((f) => ![...onRecord].some((k) => k === `row:${rowKeyId(f.rowKey)}:${f.kind}`));
    const give: AFlag[] = [];
    for (const f of fresh.slice(0, MOST_IN_ONE_MESSAGE)) {
      if (await queueTheAsk(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, gapKey: `row:${rowKeyId(f.rowKey)}:${f.kind}`, what: theQuestionFor(f), askedOfEmail: email, askedOfName: p.name })) give.push(f);
    }
    if (!give.length) continue;
    const first = p.name.split(' ')[0];
    const intro = give.length === 1
      ? `${first}, I keep track of the office reports for ${a.principalFirst}, and one item in them needs an answer from you.`
      : `${first}, I keep track of the office reports for ${a.principalFirst}, and ${give.length} items in them need an answer from you.`;
    const text = [intro, ...give.map((f, i) => `${give.length === 1 ? '' : `${i + 1}. `}${theQuestionFor(f)}`), 'Please reply to this message. What you say goes to her with the item, in your words.'].join('\n\n');
    const askKey = anAskKey(a.principalUserId, 'rows', email);
    const outcome = await ports.askByEmail({ organizationId: a.organizationId, to: email, name: p.name, subject: THE_ROW_ASK_HEADING, text, askKey }).catch(() => 'suppressed' as const);
    if (outcome === 'suppressed') { await giveTheAskBack(prisma, askKey); continue; }
    went++;
  }
  return went;
}
