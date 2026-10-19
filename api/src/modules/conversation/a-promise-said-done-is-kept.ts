import { theReleaseOneSalesBoardIsOnFor } from '../board/release-one-sales-board';

/**
 * A PROMISE SAID DONE IS KEPT, AND IS NEVER LATE AFTER THAT (Drop Access run 1, item 13; release plan Part 1A: "A wait is cleared
 * when someone says it's done. It's never reported as late after that.").
 *
 * On 14 October Joseph said "No, I forgot them. I'll bring them on Thursday." On 15 October Mercy said "Joseph finally brought the
 * samples today." From 16 to 23 October Grace's morning summary said, under "These are overdue on your team", "Joseph said “I'll
 * bring them on Thursday”. That was due by Thursday 15 October and is eight days late." Only Joseph could mark his own promise done,
 * and only when the model read his own check-in so; the person it was owed to saying it was done changed nothing, and nor did the wait
 * on him for the same thing being cleared.
 *
 * READ FROM THE RECORD, NEVER GUESSED. An open promise is kept by a line said after it was made, where:
 *  - the line is what happened (a PROGRESS line), never a worry, a wish or another promise;
 *  - it is said by the one who made the promise, or by somebody it was for: the person it is owed to, a person it names, or a person
 *    who was waiting on its maker;
 *  - it names the thing, in the promise's own words or the words of what that person was waiting for ("samples"), counting a verb in
 *    any of its forms ("bring" and "brought");
 *  - said by somebody it was for, it names the one who made it; said by its maker, it names the one it was for (or the thing alone);
 *  - it says it happened, with nothing in the same sentence that says it has not or not yet.
 * Or: the wait on its maker, by the person it was for, was cleared after the promise was made.
 */

export interface AnOpenPromise {
  id: string;
  participantId: string;
  owedToParticipantId?: string | null;
  text: string;
  createdAt: Date | string;
}
export interface ALineOnRecord {
  id: string;
  participantId: string;
  type: string;
  text: string;
  createdAt: Date | string;
}
/** One answer a person gave in a check-in, with the question Groundwork had just asked them. Their own words, never shown: read only for whether a promise was kept. */
export interface AnAnswerOnRecord {
  participantId: string;
  checkInId: string;
  asked: string;
  said: string;
  at: Date | string;
}
export interface AWaitOnRecord {
  id: string;
  fromParticipantId: string;
  onParticipantId: string | null;
  what: string;
  status?: string | null;
  clearedAt?: Date | string | null;
}

/** A verb's forms, so "bring" in a promise and "brought" in the line are the same word. */
const FORMS: Record<string, string> = {
  brought: 'bring', bringing: 'bring', brings: 'bring', sent: 'send', sending: 'send', sends: 'send', gave: 'give', given: 'give', giving: 'give',
  got: 'get', gotten: 'get', getting: 'get', took: 'take', taken: 'take', taking: 'take', made: 'make', making: 'make', paid: 'pay', paying: 'pay',
  bought: 'buy', did: 'do', done: 'do', met: 'meet', told: 'tell', spoke: 'speak', spoken: 'speak', wrote: 'write', written: 'write', sold: 'sell',
  went: 'go', gone: 'go', left: 'leave', found: 'find', shown: 'show', showed: 'show', delivered: 'deliver', called: 'call', dropped: 'drop',
  shared: 'share', signed: 'sign', finished: 'finish', returned: 'return', handed: 'hand', emailed: 'email', fixed: 'fix', sorted: 'sort',
  /* Messages test, 19 October, finding 3: a court filing is said done as "filed", "lodged", "served" or "submitted". */
  filed: 'file', filing: 'file', files: 'file', lodged: 'lodge', served: 'serve', submitted: 'submit', issued: 'issue',
};
const NOT_THE_THING = new Set([
  'the', 'a', 'an', 'for', 'of', 'on', 'to', 'from', 'with', 'and', 'or', 'my', 'our', 'their', 'his', 'her', 'its', 'this', 'that', 'these', 'those',
  'some', 'any', 'about', 'in', 'at', 'by', 'it', 'them', 'they', 'him', 'she', 'he', 'we', 'you', 'me', 'us', 'i', 'will', 'shall', 'would', 'can',
  'could', 'need', 'needs', 'have', 'has', 'going', 'try', 'want', 'again', 'also', 'still', 'then', 'soon', 'later', 'today', 'tomorrow', 'tonight',
  'week', 'next', 'end', 'day', 'morning', 'afternoon', 'evening', 'first', 'thing', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
  'saturday', 'sunday', 'by', 'before', 'after', 'until', 'just', 'once', 'all', 'everything', 'sure', 'make',
]);
const one = (w: string) => w.replace(/ies$/, 'y').replace(/([^s])s$/, '$1');
const wordsOf = (t: string) => String(t ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/)
  .map((w) => w.replace(/'(?:ll|s|re|ve|d|m)$/, '').replace(/'/g, '')).filter(Boolean);
const aForm = (w: string) => FORMS[w] ?? one(w);
const theThingIn = (t: string): string[] => wordsOf(t).filter((w) => w.length >= 3 && !NOT_THE_THING.has(w) && !/^\d/.test(w)).map(aForm);

const IT_HAPPENED = /\b(?:brought|delivered|sent|gave|given|handed|dropped|shared|arrived|received|got|came|paid|returned|signed|approved|answered|replied|done|sorted|cleared|finished|completed|called|met|spoke|showed|took|made|did|kept|filed|lodged|served|submitted|issued)\b/i;
const NOT_YET = /\b(?:not|never|no|yet|haven't|hasn't|hadn't|didn't|don't|doesn't|won't|will|going to|need to|needs to|wish|hope|should|would|could|if|until|unless|forgot)\b|n't\b|\bI'll\b|\bhe'll\b|\bshe'll\b|\bthey'll\b/i;
/* "Kasarani Foods v. Tumaini Traders" is one sentence: a full stop after "v", "vs", "Mr", "Mrs", "Ms" or "Dr" does not end one
   (messages test, 19 October, finding 3: "The reply in Kasarani Foods v." and "Tumaini Traders was filed today." were read apart). */
const sentences = (t: string) => String(t ?? '').replace(/\[[^\]]*\]/g, '').replace(/[‘’]/g, "'").split(/(?<!\b(?:v|vs|V|Vs|Mr|Mrs|Ms|Dr)\.)(?<=[.;!?])\s+/).map((s) => s.trim()).filter(Boolean);

/** Who a promise was for: the person it is owed to, anybody it names, and anybody who was waiting on its maker. */
export function whoItWasFor(p: AnOpenPromise, waits: AWaitOnRecord[], namesOf: (participantId: string) => string[], everybody: string[]): string[] {
  const out = new Set<string>();
  if (p.owedToParticipantId) out.add(p.owedToParticipantId);
  const said = new Set(wordsOf(p.text));
  for (const id of everybody) if (id !== p.participantId && namesOf(id).some((n) => wordsOf(n).some((w) => w.length >= 3 && said.has(w)))) out.add(id);
  for (const w of waits) if (w.onParticipantId === p.participantId && w.fromParticipantId !== p.participantId) out.add(w.fromParticipantId);
  return [...out];
}

/*
 * A FOLLOW-UP SAID DONE IN OTHER WORDS (messages test, 19 October, finding 1). Mercy promised "I'll follow up with Joseph about the
 * samples today." On Wednesday 14 October at 09:30 she said "I called Joseph yesterday about the samples.", and at 11:00 Grace's
 * summary still said "Mercy committed to “follow up with Joseph about the samples today”. That was due by Monday 12 October and is
 * two days late." Her line was kept as a worry (the samples had still not come), so it was never read. A promise to follow somebody
 * up is kept by its maker saying they called, rang, wrote to or spoke to that person about the thing, whichever way the line was
 * kept, as long as nothing in the sentence says it has not happened.
 */
const A_FOLLOW_UP = /\b(?:follow(?:ing)?[\s-]+up|chase|call|phone|ring|contact|speak|talk|check\s+in|email|message|text|remind)\b/i;
const FOLLOWED_UP = /\b(?:followed[\s-]+up|chased|called|phoned|rang|contacted|spoke|talked|checked\s+in|emailed|messaged|texted|reminded|reached)\b/i;

/*
 * A PROMISE THAT SAYS "IT" IS ABOUT WHAT ITS MAKER HAD JUST SAID (messages test, 19 October, finding 3, still there after the first
 * fix). Brian said on Monday 12 October "The reply was drafted." and, in the same answer, "I will send it to Wanjiru tomorrow for her
 * review." On Tuesday he said "The reply in Kasarani Foods v. Tumaini Traders was filed today." The promise named no thing of its own,
 * so the filing did not keep it, and Wanjiru's summary called it late on three mornings. A promise whose thing is "it", "them", "this"
 * or "that" is about what its maker had just said was done, in the same answer: the thing that line is about ("the reply"). Only the
 * maker's own lines of the quarter of an hour before the promise, and only a line that says what happened to a named thing.
 */
const A_PRONOUN_PROMISE = /\b(?:send|bring|give|share|file|submit|deliver|hand|email|forward|show|finish|return|take|get|pay|sign|lodge|serve|issue)\s+(?:it|them|this|that|those|these)\b/i;
const WHAT_A_LINE_IS_ABOUT = /^(?:the|my|our|this|that|his|her|their)\s+([a-z][a-z\s-]*?)\s+(?:was|were|is|are|has\s+been|have\s+been|got)\s+[a-z]+ed\b/i;
const A_QUARTER_HOUR = 15 * 60 * 1000;
export function whatAPromiseCalledItIsAbout(p: AnOpenPromise, lines: ALineOnRecord[]): string[] {
  if (!A_PRONOUN_PROMISE.test(p.text)) return [];
  const made = new Date(p.createdAt).getTime();
  const before = lines
    .filter((l) => l.participantId === p.participantId && String(l.type).toUpperCase() === 'PROGRESS')
    .filter((l) => { const at = new Date(l.createdAt).getTime(); return at <= made && made - at <= A_QUARTER_HOUR; })
    .map((l) => WHAT_A_LINE_IS_ABOUT.exec(String(l.text ?? '').trim())?.[1])
    .filter((x): x is string => !!x);
  /* Only where the answer was about one thing: two things said done, and "it" could be either. */
  const things = [...new Set(before.map((x) => x.trim().toLowerCase()))];
  return things.length === 1 ? theThingIn(things[0]) : [];
}

/*
 * A FOLLOW-UP SAID DONE, AND WHAT THE OTHER PERSON SAID BACK (messages test, third run, item 4). On Wednesday 14 October Mercy said "I
 * called Joseph yesterday about the samples, and he said he'll have them ready by Thursday." Her week on Thursday still listed "Follow
 * up with Joseph again" as open: the "he'll" in what Joseph said back was read as hers. A follow-up is read in its own part of the
 * sentence, up to ", and he ..." where the other person's answer begins. "I called Joseph but he hasn't answered" is still not done.
 */
const THE_OTHER_PERSONS_ANSWER_BEGINS = /,?\s+and\s+(?=(?:he|she|they|it|we)\b)/i;
const theFollowUpPart = (s: string) => s.split(THE_OTHER_PERSONS_ANSWER_BEGINS)[0];

/*
 * "DID YOU LET HER KNOW?" "YES, I DID." (messages test, third run, item 8). Brian promised on Tuesday 13 October "I will let Njeri know
 * today." On Wednesday Groundwork asked him "Last time you said you needed to tell Njeri in accounts about the Kasarani Foods filing. Did
 * you let her know?" and he answered "Yes, I did." Wanjiru's summaries on Thursday and Friday still said "That was due by Tuesday 13
 * October and is two days late." A promise is kept when, after it was made, its maker was asked whether it happened, in a question that
 * names it, and said yes, with nothing in that first sentence that says it has not or not yet.
 */
const A_DID_YOU_QUESTION = /^(?:so\s+|and\s+)?(?:did|have|has|had|were|was)\s+you\b[^?]*\?$/i;
const A_YES = /^(?:yes|yeah|yep|yup|i did|i have|i had|done|it is done|it's done|that's done|that is done|all done|sure did)\b/i;
function theLastQuestionIn(t: string): string {
  const qs = sentences(t).filter((x) => /\?$/.test(x));
  return qs[qs.length - 1] ?? '';
}
export function aYesToTheQuestionAboutIt(a: AnAnswerOnRecord, p: AnOpenPromise): boolean {
  if (a.participantId !== p.participantId) return false;
  const q = theLastQuestionIn(a.asked);
  if (!A_DID_YOU_QUESTION.test(q)) return false;
  const thing = new Set(theThingIn(p.text));
  if (!thing.size) return false;
  /* The question names it: the promise's own words, in the question or the sentence it asks about. */
  const asked = new Set(wordsOf(a.asked).map(aForm));
  const shared = [...thing].filter((w) => asked.has(w)).length;
  if (shared < Math.min(2, thing.size)) return false;
  const first = (sentences(a.said)[0] ?? '').trim();
  if (!A_YES.test(first)) return false;
  return !NOT_YET.test(first.replace(A_YES, ''));
}

/*
 * WHO "HER" IS, AND WHAT SHE SAID WHEN HE FOLLOWED UP (messages test, third run, item 2). On Monday 12 October Joseph said "Mama Pima is
 * still deciding on the 10 units. She wants a KES 12,000 discount." and, asked what he would do about it, "I'll try to persuade her on
 * the price. I'll follow up with her tomorrow." On Wednesday he said "Mama Pima isn't ready to buy yet." Grace's summaries on Thursday
 * and Friday said "Joseph said “I'll follow up with her tomorrow”. That was due by Tuesday 13 October and is two days late.": the
 * follow-up had happened, and the line never said who "her" was.
 *  - Who: the one name in the question the promise answered and the maker's answer just before it, read from those two turns only.
 *  - Kept: a later answer or line of the maker's that names that customer and says what they said or decided ("isn't ready", "wants",
 *    "agreed", "said"), and nothing in it that says they could not be reached.
 */
const A_PRONOUN_OBJECT = /\b(?:with|to|call|phone|ring|visit|remind|ask|tell|email|text|message|see|persuade|chase)\s+(her|him|them)\b/i;
const NOT_A_NAME = new Set(['I', 'It', 'What', 'When', 'Who', 'Why', 'How', 'Where', 'Which', 'That', 'This', 'The', 'She', 'He', 'They', 'We', 'You', 'My', 'Our', 'Your', 'Her', 'His', 'Their', 'Yes', 'No', 'Okay', 'Ok', 'So', 'And', 'But', 'Last', 'Today', 'Tomorrow', 'Yesterday', 'Groundwork',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
/** The names in a turn: two or more capitalised words together ("Mama Pima"), or one that does not open its sentence ("with Joseph"). */
export function theNamesIn(t: string): string[] {
  const out: string[] = [];
  for (const s of sentences(t)) {
    const words = s.replace(/[^A-Za-z0-9'’ -]/g, ' ').split(/\s+/).filter(Boolean);
    let run: string[] = [];
    let runStartsTheSentence = false;
    const flush = () => {
      const kept = run.filter((w) => !NOT_A_NAME.has(w));
      if (kept.length >= 2 || (kept.length === 1 && !(runStartsTheSentence && run.length === 1))) out.push(kept.join(' '));
      run = [];
    };
    words.forEach((w, i) => {
      const capital = /^[A-Z][a-z'’]+$/.test(w) && !NOT_A_NAME.has(w);
      if (capital) { if (!run.length) runStartsTheSentence = i === 0; run.push(w); } else flush();
    });
    flush();
  }
  return [...new Set(out)];
}
export function whoAPromiseIsAbout(p: AnOpenPromise, answers: AnAnswerOnRecord[], namesOf: (participantId: string) => string[] = () => []): string | null {
  if (!A_PRONOUN_OBJECT.test(p.text)) return null;
  const mine = answers.filter((a) => a.participantId === p.participantId).sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const promised = wordsOf(p.text).join(' ');
  const at = mine.findIndex((a) => ` ${wordsOf(a.said).join(' ')} `.includes(` ${promised} `));
  if (at === -1) return null;
  const theirOwn = new Set(namesOf(p.participantId).map((n) => n.toLowerCase()));
  const named = (t: string) => theNamesIn(t).filter((n) => !theirOwn.has(n.toLowerCase()));
  const inTheAnswer = named(mine[at].said);
  if (inTheAnswer.length) return null; /* It names somebody itself: "her" may be another. */
  const inTheQuestion = named(mine[at].asked);
  const before = at > 0 && mine[at - 1].checkInId === mine[at].checkInId ? named(mine[at - 1].said) : [];
  const both = inTheQuestion.filter((n) => before.includes(n));
  const candidates = both.length ? both : [...new Set([...inTheQuestion, ...before])];
  return candidates.length === 1 ? candidates[0] : null;
}
const THEY_ANSWERED = /\b(?:is|isn't|is not|was|wasn't|was not|are|aren't)\s+(?:still\s+)?(?:not\s+)?(?:ready|interested|keen|happy|sure|deciding|thinking)\b|\b(?:said|says|told me|wants|wanted|agreed|declined|decided|refused|accepted|rejected|confirmed|signed|paid|ordered|bought|asked for)\b/i;
const THEY_COULD_NOT_BE_REACHED = /\b(?:hasn't|has not|haven't|have not|didn't|did not|not)\s+(?:replied|answered|responded|picked up|returned|got back|called back)|\bno (?:reply|answer|response)\b|\bcould(?:n't| not) (?:reach|get hold of|get through)\b|\bunreachable\b|\bvoicemail\b|\bnot answering\b/i;
export function theyFollowedUpAndWereAnswered(text: string, who: string): boolean {
  const name = wordsOf(who);
  if (!name.length) return false;
  return sentences(text).some((s) => {
    const said = ` ${wordsOf(s).join(' ')} `;
    return said.includes(` ${name.join(' ')} `) && THEY_ANSWERED.test(s) && !THEY_COULD_NOT_BE_REACHED.test(s);
  });
}

/** Whether one line says this promise is done. */
export function aLineSaysThePromiseIsDone(line: ALineOnRecord, p: AnOpenPromise, ctx: { forWhom: string[]; waits: AWaitOnRecord[]; namesOf: (participantId: string) => string[]; itMeans?: string[] }): boolean {
  const byTheMaker = line.participantId === p.participantId;
  const aFollowUpDone = byTheMaker && A_FOLLOW_UP.test(p.text);
  if (String(line.type).toUpperCase() !== 'PROGRESS' && !aFollowUpDone) return false;
  const byWhomItWasFor = ctx.forWhom.includes(line.participantId);
  if (!byTheMaker && !byWhomItWasFor) return false;
  /* The thing, in the promise's words and in the words of what the people it was for were waiting on its maker for. */
  const waitedFor = ctx.waits.filter((w) => w.onParticipantId === p.participantId && ctx.forWhom.includes(w.fromParticipantId)).flatMap((w) => theThingIn(w.what));
  const thing = new Set([...theThingIn(p.text), ...waitedFor, ...(ctx.itMeans ?? [])]);
  if (!thing.size) return false;
  const otherSide = byTheMaker ? ctx.forWhom.flatMap((id) => ctx.namesOf(id)) : ctx.namesOf(p.participantId);
  const otherWords = otherSide.flatMap((n) => wordsOf(n)).filter((w) => w.length >= 2);
  const aProgressLine = String(line.type).toUpperCase() === 'PROGRESS';
  return sentences(line.text).some((s) => {
    const said = new Set(wordsOf(s).map(aForm));
    if (![...thing].some((w) => said.has(w))) return false;
    const namesTheOtherSide = otherWords.some((w) => said.has(w) || said.has(one(w)));
    if (!byTheMaker && !namesTheOtherSide) return false;
    if (aProgressLine && IT_HAPPENED.test(s) && !NOT_YET.test(s)) return true;
    /* The follow-up itself, in other words: by its maker, to the person it was for, about the thing, and nothing saying it has not happened. */
    const part = theFollowUpPart(s);
    return aFollowUpDone && namesTheOtherSide && FOLLOWED_UP.test(part) && !NOT_YET.test(part);
  });
}

/** Each open promise the record says is done, with the day it was said. Pure, from rows the record holds. */
export function thePromisesSaidDone(
  promises: AnOpenPromise[],
  lines: ALineOnRecord[],
  waits: AWaitOnRecord[],
  namesOf: (participantId: string) => string[],
  everybody: string[],
  answers: AnAnswerOnRecord[] = [],
): { id: string; keptAt: Date; because: string }[] {
  const out: { id: string; keptAt: Date; because: string }[] = [];
  for (const p of promises) {
    const made = new Date(p.createdAt).getTime();
    const forWhom = whoItWasFor(p, waits, namesOf, everybody);
    const itMeans = whatAPromiseCalledItIsAbout(p, lines);
    /* Their own answers count as lines for a follow-up said done, from the check-ins after the one it was made in. */
    const madeIn = answers.find((a) => a.participantId === p.participantId && ` ${wordsOf(a.said).join(' ')} `.includes(` ${wordsOf(p.text).join(' ')} `))?.checkInId;
    const later = answers.filter((a) => new Date(a.at).getTime() > made && a.checkInId !== madeIn);
    const asLines: ALineOnRecord[] = later.filter((a) => a.participantId === p.participantId).map((a, i) => ({ id: `answer:${a.checkInId}:${i}`, participantId: a.participantId, type: 'ANSWER', text: a.said, createdAt: a.at }));
    const said = [...lines, ...asLines]
      .filter((l) => new Date(l.createdAt).getTime() > made)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .find((l) => aLineSaysThePromiseIsDone(l, p, { forWhom, waits, namesOf, itMeans }));
    if (said) { out.push({ id: p.id, keptAt: new Date(said.createdAt), because: said.id }); continue; }
    /* Asked whether it happened, and they said yes. */
    const yes = later.find((a) => aYesToTheQuestionAboutIt(a, p));
    if (yes) { out.push({ id: p.id, keptAt: new Date(yes.at), because: `answer:${yes.checkInId}` }); continue; }
    /* A follow-up with "her", and what she said when he did. */
    const who = whoAPromiseIsAbout(p, answers, namesOf);
    if (who && A_FOLLOW_UP.test(p.text)) {
      const answered = [...asLines, ...lines.filter((l) => l.participantId === p.participantId && new Date(l.createdAt).getTime() > made)]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .find((l) => theyFollowedUpAndWereAnswered(l.text, who));
      if (answered) { out.push({ id: p.id, keptAt: new Date(answered.createdAt), because: answered.id }); continue; }
    }
    /* The wait on its maker, by somebody it was for, cleared after it was made: the same thing, done. */
    const itsThing = theThingIn(p.text);
    const theSameThing = (w: AWaitOnRecord) => (p.owedToParticipantId
      ? p.owedToParticipantId === w.fromParticipantId
      /* Said with no thing of its own ("I'll bring them on Thursday"), it is about what they were waiting on him for. */
      : itsThing.some((x) => theThingIn(w.what).includes(x)) || itsThing.every((x) => Object.values(FORMS).includes(x)));
    const cleared = waits.find((w) => w.onParticipantId === p.participantId && forWhom.includes(w.fromParticipantId)
      && !!w.clearedAt && new Date(w.clearedAt).getTime() > made && theSameThing(w));
    if (cleared) out.push({ id: p.id, keptAt: new Date(cleared.clearedAt as any), because: cleared.id });
  }
  return out;
}

/** The record a check-in's promises are read against: its lines, its waits, and who is in it. */
/** Each person's answers in these check-ins, each with the question it answered. Read for promises only, never served. */
export function theAnswersIn(checkIns: { id: string; participantId: string | null; turns?: { role: string; content: string | null; createdAt: Date | string }[] }[]): AnAnswerOnRecord[] {
  const out: AnAnswerOnRecord[] = [];
  for (const c of checkIns ?? []) {
    if (!c?.participantId) continue;
    let asked = '';
    for (const t of c.turns ?? []) {
      const text = String(t.content ?? '').trim();
      if (!text) continue;
      if (String(t.role) === 'PERSON') { out.push({ participantId: c.participantId, checkInId: c.id, asked, said: text, at: t.createdAt }); asked = ''; }
      else asked = text;
    }
  }
  return out;
}

export async function theRecordForPromises(prisma: any, groundIds: string[]): Promise<{ lines: ALineOnRecord[]; waits: AWaitOnRecord[]; people: { id: string; groundId: string; names: string[] }[]; answers: AnAnswerOnRecord[] }> {
  if (!groundIds.length) return { lines: [], waits: [], people: [], answers: [] };
  const [lines, waits, people, checkIns] = await Promise.all([
    /* A worry too: a follow-up said done is sometimes kept as one (finding 1); aLineSaysThePromiseIsDone reads it only for that. */
    Promise.resolve(prisma.recordEntry?.findMany?.({ where: { disputedAt: null, type: { in: ['PROGRESS', 'WORRY'] }, participant: { groundId: { in: groundIds } } }, select: { id: true, participantId: true, type: true, text: true, createdAt: true } }) ?? []).catch(() => []),
    Promise.resolve(prisma.groundDependency?.findMany?.({ where: { groundId: { in: groundIds } }, select: { id: true, fromParticipantId: true, onParticipantId: true, what: true, status: true, clearedAt: true } }) ?? []).catch(() => []),
    Promise.resolve(prisma.groundParticipant?.findMany?.({ where: { groundId: { in: groundIds } }, select: { id: true, groundId: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } }) ?? []).catch(() => []),
    /* What they were asked and what they answered, so "Did you let her know?" "Yes, I did." keeps the promise (item 8). */
    Promise.resolve(prisma.checkIn?.findMany?.({ where: { groundId: { in: groundIds }, startedAt: { not: null } }, select: { id: true, participantId: true, turns: { orderBy: { createdAt: 'asc' }, select: { role: true, content: true, createdAt: true } } } }) ?? []).catch(() => []),
  ]);
  return {
    answers: theAnswersIn(Array.isArray(checkIns) ? checkIns : []),
    lines: Array.isArray(lines) ? lines : [],
    waits: Array.isArray(waits) ? waits : [],
    people: (Array.isArray(people) ? people : []).map((p: any) => ({ id: p.id, groundId: p.groundId, names: [p.user?.firstName, p.user?.lastName, p.nameGiven].filter((n: any) => !!n && !!String(n).trim()) })),
  };
}

/** The ids of these open promises the record says are done. */
export async function whichOfThesePromisesAreDone(prisma: any, promises: (AnOpenPromise & { groundId: string })[]): Promise<Set<string>> {
  return new Set((await whenThesePromisesWereKept(prisma, promises)).keys());
}

/** The open promises the record says are done, each with the moment it was said. */
export async function whenThesePromisesWereKept(prisma: any, promises: (AnOpenPromise & { groundId: string })[]): Promise<Map<string, Date>> {
  const groundIds = [...new Set(promises.map((p) => p.groundId).filter(Boolean))];
  if (!promises.length || !groundIds.length) return new Map();
  const r = await theRecordForPromises(prisma, groundIds);
  const namesOf = (id: string) => r.people.find((p) => p.id === id)?.names ?? [];
  const done = new Map<string, Date>();
  for (const g of groundIds) {
    const inIt = new Set(r.people.filter((p) => p.groundId === g).map((p) => p.id));
    const said = thePromisesSaidDone(
      promises.filter((p) => p.groundId === g),
      r.lines.filter((l) => inIt.has(l.participantId)),
      r.waits.filter((w) => inIt.has(w.fromParticipantId)),
      namesOf,
      [...inIt],
      r.answers.filter((a) => inIt.has(a.participantId)),
    );
    said.forEach((s) => done.set(s.id, s.keptAt));
  }
  return done;
}

/** Who each of these promises means by "her", "him" or "them", where the check-in it was said in says (item 2). */
export async function whoThesePromisesAreAbout(prisma: any, promises: (AnOpenPromise & { groundId: string })[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const which = promises.filter((p) => p.groundId && A_PRONOUN_OBJECT.test(p.text ?? ''));
  if (!which.length) return out;
  const r = await theRecordForPromises(prisma, [...new Set(which.map((p) => p.groundId))]);
  const namesOf = (id: string) => r.people.find((p) => p.id === id)?.names ?? [];
  for (const p of which) {
    const who = whoAPromiseIsAbout(p, r.answers, namesOf);
    if (who) out.set(p.id, who);
  }
  return out;
}

/**
 * Marks kept, on one check-in, every open promise the record says is done, on the day it was said. Returns how many. A writer that
 * changes what a promise reads as on the board and in the reports, so only where Release 1's sales board is on for the check-in's
 * organisation (release-one-sales-board), as clearing a wait said done is (a-wait-said-done-is-cleared). Off, nothing is written,
 * and the lead's morning summary still never tells a promise the record says is done as late (whichOfThesePromisesAreDone).
 */
export async function keepThePromisesSaidDone(prisma: any, groundId: string): Promise<number> {
  if (!(await theReleaseOneSalesBoardIsOnFor(prisma, groundId).catch(() => false))) return 0;
  const open: any[] = await Promise.resolve(prisma.personObjective?.findMany?.({
    where: { groundId, status: 'OPEN', kind: { in: ['COMMITMENT', 'TODO'] } },
    select: { id: true, groundId: true, participantId: true, owedToParticipantId: true, text: true, createdAt: true },
  }) ?? []).catch(() => []);
  if (!open?.length) return 0;
  const r = await theRecordForPromises(prisma, [groundId]);
  const said = thePromisesSaidDone(open, r.lines, r.waits, (id) => r.people.find((p) => p.id === id)?.names ?? [], r.people.map((p) => p.id), r.answers);
  for (const s of said) {
    await prisma.personObjective.updateMany({ where: { id: s.id, status: 'OPEN' }, data: { status: 'MET', statusChangedAt: s.keptAt } });
  }
  return said.length;
}
