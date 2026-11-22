/**
 * OPEN ISSUES, EACH ONE MOVING TOWARDS A DECISION (board-as-lead.txt: "Open issues", "Each one moving
 * towards a decision. You always choose"; screen match, 16 October).
 *
 * The board used to say only that nothing on record follows an issue through its stages. Four things on
 * record already do, each at its own stage of the picture's six (Unclear, Understood, Options, Decided,
 * Being done, Checked):
 *
 *   - two people in this check-in, one of them the lead, said different things about the same thing and
 *     it has not been settled: UNCLEAR, and it needs a conversation;
 *   - a question the lead wrote down as still to decide, with the organisation's own memory of deciding
 *     it before: UNDERSTOOD, decide using what happened last time;
 *   - the same question with no such memory: OPTIONS, and nobody has decided or owns it;
 *   - something the lead said they would do, a week or more ago, not yet said to be done: BEING DONE,
 *     check that it happened.
 *
 * Nothing is inferred beyond those rows, and nothing here names a judgement about a person: every
 * sentence says what is on record and what would move it. Served to whoever runs the check-in only.
 */
import { isAWholeSentence, peopleSaidDifferentThingsAbout } from '../reports/what-people-said-differently-about';
import { REFERENCES_AND_RESOURCES } from '../../common/the-tab-names';

export const ISSUE_STEPS = ['Unclear', 'Understood', 'Options', 'Decided', 'Being done', 'Checked'] as const;
export type AnIssueStep = (typeof ISSUE_STEPS)[number];

export interface AnIssueAction {
  label: string;
  says: string;
  goesTo: 'check-in' | 'context' | null;
  choices?: { label: string; route: { method: 'PATCH' | 'POST'; path: string; body: Record<string, unknown> } | null }[];
}

export interface AnOpenIssue {
  id: string;
  title: string;
  step: AnIssueStep;
  /** "have the conversation with Brian.", the end of "Next: ..." */
  next: string;
  says: string | null;
  /** Only for an issue at "Unclear": the box that says it needs a conversation, and a way to start it. */
  conversation?: { heading: string; says: string; wayToStart: string };
  /** The main button and, where there is one, the quiet one ("Not now", "Not yet"). */
  action: AnIssueAction | null;
  quiet?: { label: string; says: string } | null;
}

export interface WhatTheIssuesAreReadFrom {
  groundId: string;
  now: Date;
  /** A difference between the lead and one other person, by first name, with the topic in their words. */
  differences: { key: string; topic: string; withFirstName: string; since: Date | null }[];
  /** The lead's own questions still to decide, with how many check-ins raised the same words. */
  stillToDecide: { id: string; text: string; createdAt: Date; raisedIn: number }[];
  /** What the organisation kept from deciding something before. */
  memories: { text: string }[];
  /** What the lead said they would do. */
  leadPromises: { id: string; text: string; createdAt: Date }[];
}

const DAY = 86_400_000;
const LITTLE = new Set('the a an and or of to for in on at by is are be it as this that what whether decide does do we our us you your with from count counts counted'.split(' '));
const keyWords = (t: string) => new Set((t ?? '').toLowerCase().replace(/[‘’']/g, '').match(/[\p{L}\p{N}]+/gu)?.filter((w) => w.length > 2 && !LITTLE.has(w)) ?? []);
export function sharesTheWords(a: string, b: string): boolean {
  const ka = keyWords(a);
  const shared = [...keyWords(b)].filter((w) => ka.has(w)).length;
  return shared >= 2;
}

const theDay = (d: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' }).format(d);
const capital = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const noStop = (t: string) => (t ?? '').trim().replace(/[.!?]+$/, '');

/** "I will move the customer records to Brian." becomes "Move the customer records to Brian". */
export function aPromiseAsATitle(text: string): string {
  return capital(noStop(text).replace(/^(?:i\s+will|i'll|i\s+am\s+going\s+to|i\s+need\s+to|we\s+will|we'll)\s+/i, ''));
}

/** "Decide whether a price range counts as a budget" becomes "Does a price range count as a budget?" */
export function aDecisionAsAQuestion(text: string): string {
  const t = noStop(text).replace(/^decide\s+/i, '');
  const toDo = t.match(/^whether\s+to\s+(.+)$/i);
  if (toDo) return `${capital(toDo[1])}?`;
  const m = t.match(/^whether\s+(.+?)\s+(counts|needs|works|goes|applies|matters|holds|fits|is)\s+(.+)$/i);
  if (m) {
    const verb = m[2].toLowerCase();
    if (verb === 'is') return `Is ${m[1]} ${m[3]}?`;
    return `Does ${m[1]} ${verb.replace(/s$/, '')} ${m[3]}?`;
  }
  return capital(t.replace(/^whether\s+/i, ''));
}

export function theOpenIssues(from: WhatTheIssuesAreReadFrom): AnOpenIssue[] {
  const out: AnOpenIssue[] = [];

  for (const d of from.differences) {
    const topic = noStop(d.topic);
    if (!topic || !d.withFirstName) continue;
    const weeks = d.since ? Math.floor((from.now.getTime() - d.since.getTime()) / (7 * DAY)) : 0;
    const forHowLong = weeks >= 2 ? ` for ${weeks} weeks` : '';
    /*
     * A TOPIC THAT IS A WHOLE SENTENCE IS NOT PUT INSIDE ANOTHER ONE (Drop Access, 16 October). Grace read "Joseph and you see You
     * expect each team member to generate 10 new leads weekly, but participants' records do not show this ... differently". A
     * short thing ("Mama Fresh", "what counts as money ready") reads inside the sentence as before; a sentence is said on its own.
     */
    const aSentence = isAWholeSentence(topic);
    /* A question asked as a thing ("how progress ... is described") goes after "differently", as the one sentence for a difference says it. */
    const seeIt = (who: string) => (aSentence ? `${who} see this differently` : peopleSaidDifferentThingsAbout(topic, who).replace(/\.$/, ''));
    out.push({
      id: `difference-${d.key}`,
      title: seeIt(`${d.withFirstName} and you`),
      step: 'Unclear',
      next: `have the conversation with ${d.withFirstName}.`,
      says: null,
      conversation: {
        heading: 'This needs a conversation',
        says: `${aSentence ? `${capital(topic)}. ` : ''}You and ${d.withFirstName} have seen this differently${forHowLong}, and it has not been talked about.`,
        /* The lead's own words to the person, in her voice: no "we" standing in for Groundwork (staging check S15). */
        wayToStart: `“${d.withFirstName}, ${seeIt('you and I')}. Can you talk it through with me?”`,
      },
      action: { label: 'Prepare the conversation', says: 'Your check-in helps you prepare what to say, and what to ask.', goesTo: 'check-in' },
      quiet: { label: 'Not now', says: 'It stays here, at Unclear, until one of you says something new about it.' },
    });
  }

  for (const q of from.stillToDecide) {
    const before = from.memories.find((m) => sharesTheWords(m.text, q.text));
    const title = aDecisionAsAQuestion(q.text);
    if (before) {
      out.push({
        id: `decide-${q.id}`,
        title,
        step: 'Understood',
        next: 'decide, using what happened last time.',
        says: `Last time we decided this: ${noStop(before.text)}.`,
        action: null,
      });
      continue;
    }
    out.push({
      id: `decide-${q.id}`,
      title,
      step: 'Options',
      next: 'name who decides, and by when.',
      says: q.raisedIn >= 2
        ? `This has come up in ${q.raisedIn} check-ins. Nobody has decided, and nobody owns it.`
        : 'Nobody has decided, and nobody owns it.',
      action: { label: 'Name who decides, and by when', says: `Say under ${REFERENCES_AND_RESOURCES} who decides this, and by when.`, goesTo: 'context' },
    });
  }

  for (const p of from.leadPromises) {
    const days = Math.floor((from.now.getTime() - p.createdAt.getTime()) / DAY);
    if (days < 7) continue;
    out.push({
      id: `doing-${p.id}`,
      title: aPromiseAsATitle(p.text),
      step: 'Being done',
      next: 'check that it happened.',
      says: `Decided on ${theDay(p.createdAt)}, ${days} days ago. Has it happened?`,
      action: {
        label: 'Has it happened?',
        says: 'Say whether it has happened. Until you do, it stays here, at Being done.',
        goesTo: null,
        choices: [
          { label: 'Yes, it’s done', route: { method: 'PATCH', path: `/grounds/${from.groundId}/commitments/${p.id}`, body: { status: 'DONE' } } },
          { label: 'Not yet', route: null },
        ],
      },
    });
  }

  return out;
}
