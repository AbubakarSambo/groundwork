import { mayReadTheLine, thePerson } from '../conversation/who-may-read-a-line';
import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';

/**
 * A PROMISE THAT WAITS ON NEWS SOMEBODY ELSE ALREADY GAVE (Hafsah, 19 October: "FN-005: the summary says "Brian said on Wednesday 14
 * October that it was filed; Njeri hasn't been told." Njeri's next opening tells her it's filed.").
 *
 * Muchemi & Co., engine test. On Monday 12 October Njeri said in "Fee notes" "I will check with the relevant team to see if the reply for
 * FN-005 has been filed. I'll aim to do this today." On Wednesday 14 October Brian said in "Litigation team daily" "The reply in Kasarani
 * Foods v. Tumaini Traders was successfully filed today." Wanjiru's summary on Thursday said "In “Fee notes”, Njeri said “I will check
 * with the relevant team to see if the reply for FN-005 has been filed”. That was due by Monday 12 October and is three days late."
 * Njeri was not late: the news she was to check for had been given, in another check-in, and nobody had told her.
 *
 * READ FROM THE RECORD. A promise waits on news when it is to check, see, find out or be told whether a thing has been filed, set, signed,
 * paid or sent ("to see if the reply for FN-005 has been filed", "when I'm told the reply is filed"). The news is given by a line said
 * after the promise, by somebody else, in any of the organisation's check-ins that are not about one person, that names the thing (and,
 * for a fee note, its client or matter) and says it was done. Until the person who promised has had a check-in since, they have not been
 * told: the lead reads who said it and on which day, never "late". Their next opening tells them the fact, in one line, with no source.
 */
export interface TheNewsAPromiseWaitsOn {
  /** The thing's own words, each in one form ("reply"). */
  thing: string[];
  /** The word that says it happened ("filed"). */
  done: string;
  /** The client's or the matter's first proper name, for a fee note named by its number ("kasarani"). */
  names: string[];
  /** The thing as it can be said back ("the reply"). */
  said: string;
}

const DONE_WORDS = 'filed|lodged|served|submitted|set|fixed|scheduled|signed|approved|issued|paid|sent|delivered|received|confirmed|granted';
const CHECKS_WHETHER = new RegExp(`\\b(?:check|see|find out|confirm|ask|know|hear|learn|establish)\\b[^.]*?\\b(?:if|whether)\\s+(?:the\\s+|our\\s+|a\\s+)?(.+?)\\s+(?:has|have|had)\\s+been\\s+(?:now\\s+)?(${DONE_WORDS})\\b`, 'i');
const CHECKS_WHETHER_IS = new RegExp(`\\b(?:check|see|find out|confirm|ask|know|hear|learn|establish)\\b[^.]*?\\b(?:if|whether)\\s+(?:the\\s+|our\\s+|a\\s+)?(.+?)\\s+(?:is|was|were|are)\\s+(?:now\\s+)?(${DONE_WORDS})\\b`, 'i');
const WHEN_TOLD = new RegExp(`\\b(?:when|once|after)\\s+(?:i['’]?m|i am|we['’]?re|we are|i get|i am)\\s+(?:told|informed)\\s+(?:that\\s+)?(?:the\\s+|our\\s+)?(.+?)\\s+(?:is|was|has been|have been)\\s+(${DONE_WORDS})\\b`, 'i');
const A_FEE_NOTE = /\b[A-Z]{1,4}-\d{2,}\b/;
const SMALL = new Set(['the', 'for', 'and', 'our', 'their', 'that', 'this', 'with', 'from', 'about', 'any']);
const one = (w: string) => w.replace(/ies$/, 'y').replace(/([^s])s$/, '$1');
const wordsOf = (t: string) => String(t ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' -]+/g, ' ').split(/\s+/).map((w) => w.replace(/'s$/, '')).filter(Boolean);
const NOT_YET = /\b(?:not|never|no|yet|haven't|hasn't|hadn't|didn't|won't|will|going to|need to|needs to|hope|should|would|could|if|whether|until|unless)\b|n't\b/i;
const sentences = (t: string) => String(t ?? '').replace(/\[[^\]]*\]/g, '').replace(/[‘’]/g, "'").split(/(?<!\b(?:v|vs|V|Vs|Mr|Mrs|Ms|Dr)\.)(?<=[.;!?])\s+/).map((s) => s.trim()).filter(Boolean);

/** The news a promise waits on, or null. `bills` give a fee note's client and matter by its number. */
export function theNewsAPromiseWaitsOn(text: string, bills: readonly { number?: string | null; client?: string | null; matter?: string | null }[] = []): TheNewsAPromiseWaitsOn | null {
  const t = String(text ?? '');
  const m = CHECKS_WHETHER.exec(t) ?? CHECKS_WHETHER_IS.exec(t) ?? WHEN_TOLD.exec(t);
  if (!m) return null;
  const phrase = m[1].trim();
  const code = A_FEE_NOTE.exec(phrase)?.[0] ?? null;
  const head = phrase.replace(/\b(?:for|of|on|in)\s+(?:the\s+)?(?:[A-Z]{1,4}-\d{2,}|[A-Z][\w.]*(?:\s+[A-Z][\w.]*)*(?:\s+v\.?\s+[A-Z][\w.]*(?:\s+[A-Z][\w.]*)*)?)\s*$/, '').trim();
  const thing = wordsOf(head).filter((w) => w.length >= 3 && !SMALL.has(w) && !A_FEE_NOTE.test(w.toUpperCase())).map(one);
  if (!thing.length) return null;
  const bill = code ? bills.find((b) => String(b.number ?? '').toUpperCase() === code.toUpperCase()) : undefined;
  const proper = (s: string) => (String(s ?? '').match(/\b[A-Z][a-z]{2,}\b/g) ?? []).map((x) => one(x.toLowerCase()));
  const names = bill ? proper(bill.matter || bill.client || '').slice(0, 1) : proper(phrase.slice(head.length)).slice(0, 1);
  if (code && !names.length) return null;
  return { thing, done: m[2].toLowerCase(), names, said: `the ${phrase.replace(/^(?:the|our|a)\s+/i, '')}` };
}

/** Whether a line gives the news. */
export function aLineGivesTheNews(text: string, news: TheNewsAPromiseWaitsOn): boolean {
  return sentences(text).some((s) => {
    const said = new Set(wordsOf(s).map(one));
    if (!news.thing.every((w) => said.has(w))) return false;
    if (news.names.length && !said.has(news.names[0])) return false;
    if (!new RegExp(`\\b${news.done}\\b`, 'i').test(s)) return false;
    return !NOT_YET.test(s.replace(/\bnot\s+(?:due|before)\b/gi, ''));
  });
}

export interface TheNewsGiven {
  /** The participant row of whoever gave it, and their check-in. */
  byParticipantId: string;
  byUserId: string | null;
  byName: string | null;
  groundId: string;
  at: Date;
  /** "was filed". */
  happened: string;
  /** The thing, said back ("the reply"). */
  thing: string;
  /** Whether the person who promised has had a check-in in that check-in since: their opening told them. */
  told: boolean;
  /** Whether the person who promised is in the check-in it was said in. Their opening never names who said it either way (21 October). */
  theyAreInIt: boolean;
}

/** For each of these promises that waits on news somebody else already gave, the news. */
export async function theNewsThesePromisesWaitOn(
  prisma: any,
  organizationId: string,
  promises: readonly { id: string; text: string; participantId: string; groundId: string; createdAt: Date | string; userId?: string | null }[],
): Promise<Map<string, TheNewsGiven>> {
  const out = new Map<string, TheNewsGiven>();
  const which = promises.map((p) => ({ p, text: String(p.text ?? '') })).filter((x) => CHECKS_WHETHER.test(x.text) || CHECKS_WHETHER_IS.test(x.text) || WHEN_TOLD.test(x.text));
  if (!which.length) return out;
  const grounds: any[] = ((await Promise.resolve(prisma.ground?.findMany?.({ where: { organizationId }, select: { id: true, scenario: true } })).catch(() => [])) ?? []) as any[];
  const ids = (Array.isArray(grounds) ? grounds : []).filter((g) => !isEvaluationCheckIn(g.scenario)).map((g) => g.id);
  if (!ids.length) return out;
  const bills: any[] = ((await Promise.resolve(prisma.workItem?.findMany?.({ where: { groundId: { in: ids }, kind: 'bill' }, select: { fields: true } })).catch(() => [])) ?? []) as any[];
  const billFacts = (Array.isArray(bills) ? bills : []).map((b) => ({ number: b.fields?.Number ?? null, client: b.fields?.Client ?? null, matter: b.fields?.Matter ?? null }));
  const lines: any[] = ((await Promise.resolve(prisma.recordEntry?.findMany?.({
    where: { disputedAt: null, type: 'PROGRESS', participant: { groundId: { in: ids } } },
    select: { participantId: true, text: true, createdAt: true, aboutParticipantId: true, standing: true, participant: { select: { groundId: true, userId: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } } },
  })).catch(() => [])) ?? []) as any[];
  for (const { p, text } of which) {
    const news = theNewsAPromiseWaitsOn(text, billFacts);
    if (!news) continue;
    const made = new Date(p.createdAt).getTime();
    const given = (Array.isArray(lines) ? lines : [])
      .filter((l) => l.participantId !== p.participantId && (!p.userId || l.participant?.userId !== p.userId) && new Date(l.createdAt).getTime() > made && mayReadTheLine(l, thePerson(p.participantId)))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .find((l) => aLineGivesTheNews(String(l.text ?? ''), news));
    if (!given) continue;
    const at = new Date(given.createdAt);
    const since = await Promise.resolve(prisma.checkIn?.findFirst?.({ where: { participantId: p.participantId, startedAt: { gt: at } }, select: { id: true } })).catch(() => null);
    const groundId = given.participant?.groundId ?? '';
    const inIt = p.userId ? !!(await Promise.resolve(prisma.groundParticipant?.findFirst?.({ where: { groundId, userId: p.userId }, select: { id: true } })).catch(() => null)) : groundId === p.groundId;
    const first = String(given.participant?.user?.firstName ?? given.participant?.nameGiven ?? '').trim() || null;
    out.set(p.id, { byParticipantId: given.participantId, byUserId: given.participant?.userId ?? null, byName: first, groundId, at, happened: `was ${news.done}`, thing: news.said, told: !!since, theyAreInIt: inIt || groundId === p.groundId });
  }
  return out;
}

/*
 * THE ONE LINE THEIR NEXT OPENING TELLS THEM (Hafsah's answers of 21 October): the fact, with no source. "The FN-005 reply was filed on
 * Wednesday 14 October." The thing, what happened to it, and the day: never the name of the person who said it, and never "somebody in
 * another check-in". Who said it stays for the lead's summary only.
 */
export function theNewsInOneLine(n: TheNewsGiven, day: string): string {
  return `${theThingToSayFirst(n.thing)} ${n.happened} on ${day}.`;
}

/** "the reply for FN-005" said first in a sentence: "The FN-005 reply". Anything else keeps its own words, with a capital. */
function theThingToSayFirst(thing: string): string {
  const t = String(thing ?? '').trim().replace(/^(?:the|our|a)\s+/i, '');
  const byNumber = /^(.+?)\s+(?:for|of|on|in)\s+(?:the\s+)?([A-Z]{1,4}-\d{2,})$/.exec(t);
  const said = byNumber ? `${byNumber[2]} ${byNumber[1]}` : t;
  return `The ${said}`;
}
