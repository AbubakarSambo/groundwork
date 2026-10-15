/**
 * WHAT SOMEBODY SAID THEY WOULD DO, WRITTEN DOWN AS A ROW.
 *
 * `GroundCommitment` carries a `source` field whose own comment reads "PASTE, CHECK_IN, LEAD". Only
 * PASTE was ever written. So a lead who pasted a quarter in got a list of actions, and six live
 * check-ins produced none - the one place people actually promise things was the one place the
 * product did not write them down.
 *
 * Measured on the consultant run, 24 September 2026: twelve completed check-ins across three months,
 * a man who said he would arrange meetings with the ministry's technical team in fortnight one and
 * said it again in every fortnight after, and `GroundCommitment` held ZERO rows for that ground. The
 * conversation still caught him - it quoted his own sentence back at him from the transcript - but
 * nothing could be listed, counted, carried, or put in the report, because a promise was not a thing.
 *
 * THE READ SIDE ALREADY EXISTED. `conversation.service` fetches this person's UNKNOWN commitments
 * every session and builds a prompt block from them (`whatTheySaidTheyWouldDo`). It was reading a
 * table nothing wrote. This is the other half.
 *
 * WHAT IT WILL NOT DO. It does not decide anything was done or not done: status stays UNKNOWN, and
 * only a person moves it, which is the rule the paste writer already holds. It does not parse a date
 * - "next week" is stored as "next week", because a machine turning that into a Tuesday and then
 * holding somebody to the Tuesday is the failure this product exists to avoid. And it writes only
 * what THEY said they would do, never what the lead said they should, which is what `explicit` means.
 *
 * SAYING IT AGAIN IS NOT A SECOND COMMITMENT. A restatement lands on the row that is already there,
 * in `saidAgainIn`. That is what makes "the same commitment has been open since fortnight one and
 * was restated in four sessions" a fact on the record rather than a feeling the lead has.
 */

export interface ACommitmentTheyMade {
  /** Their action, in their own words, short. */
  action: string;
  /** What it is for, only where they said so. */
  outcome?: string | null;
  /** The timing in their own words. Never parsed. */
  when?: string | null;
}

export const READ_WHAT_THEY_PROMISED = [
  'You are given one person\'s own words from one check-in. Pull out only the things THIS PERSON said THEY would do next.',
  '',
  'TAKE:',
  '  - an action they said they will take ("I will call her on Friday", "I am going to write to the Permanent Secretary").',
  '  - an action they said they are in the middle of taking, where it is not finished ("I am setting up the meetings with the technical team").',
  '',
  'LEAVE:',
  '  - anything already done. That is a report, not a commitment.',
  '  - anything somebody else is to do, including what they are waiting for.',
  '  - anything the interviewer suggested that they did not take up in their own words.',
  '  - wishes and hopes with no action in them ("it would be good if the ministry moved faster").',
  '',
  'RULES:',
  '  - `action` is their words, trimmed to the action itself, at most twenty words. Never your paraphrase of what they ought to do.',
  '  - Keep their punctuation and their quotation marks exactly as they typed them. Never add marks, never take theirs away, and never change double marks to single ones or single to double.',
  '  - `when` is the timing exactly as they said it: "next week", "by Friday", "before the end of the month". Leave it out if they gave none. NEVER convert it to a date.',
  '  - `outcome` only where they said what it is for. Leave it out otherwise.',
  '  - Two sentences about the same action are ONE item.',
  '  - An empty list is the right answer for a session where somebody committed to nothing.',
].join('\n');

export const WHAT_THEY_PROMISED_SCHEMA = {
  name: 'what_they_said_they_would_do',
  description: 'The things this person said they themselves would do next, in their own words.',
  input_schema: {
    type: 'object',
    properties: {
      commitments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string', description: 'Their action, their words, at most twenty words.' },
            outcome: { type: 'string', description: 'What they said it is for. Omit if they did not say.' },
            when: { type: 'string', description: 'Their own words for the timing. Omit if they gave none. Never a date you worked out.' },
          },
          required: ['action'],
        },
      },
    },
    required: ['commitments'],
  },
} as const;

/**
 * A DECISION ABOUT A PERSON IS NOT A COMMITMENT, AND MUST NOT BECOME A ROW.
 *
 * Caught on the second run of the consultant scenario, 24 September 2026, in the first hour this
 * writer existed. The chief executive said in her own private check-in: "I need to decide if I'm
 * going to replace him." True, hers, and exactly the kind of sentence a person says out loud to a
 * machine they trust. It came back as a commitment row on the check-in, with a status somebody was
 * expected to move, sitting in a list called what people said they would do.
 *
 * It is the rule `addContextLine` already holds - a line ABOUT somebody is refused rather than
 * accepted and hidden - and it applies here for the same reason. Whether somebody keeps their job
 * is not an action item, and a product that files it as one has started keeping a list of people
 * to be dealt with. The thought stays in her own words in her own session, where she said it.
 */
const ABOUT_WHETHER_SOMEBODY_STAYS =
  /\b(replace|replacing|let (him|her|them|someone|somebody) go|fire|firing|sack|sacking|terminate|terminating|remove (him|her|them)|off-?board|offboard|end (his|her|their) (contract|engagement)|renew (his|her|their) contract|put (him|her|them) on)\b/i;

/** Short enough to be one action, long enough to be one, and not about a person. */
export function worthWritingDown(c: ACommitmentTheyMade): boolean {
  const text = (c?.action ?? '').trim();
  if (text.length < 8) return false;
  if (text.split(/\s+/).length > 30) return false;
  if (ABOUT_WHETHER_SOMEBODY_STAYS.test(text)) return false;
  /* A decision to decide is not an action either. It is the same week, restated as a task. */
  if (/^i (need to|have to|must|should) (decide|think about|work out|consider)\b/i.test(text)) return false;
  /* A sentence with no verb in it is a topic, not an action. */
  return /\b(will|going to|am|is|are|call|write|send|meet|ask|arrange|set|get|follow|chase|draft|prepare|speak|visit|submit|confirm|book|escalate|check|review|finish|deliver|share|introduce)\b/i.test(text);
}

export const HOW_MANY_FROM_ONE_SESSION = 6;

/** The rows to write, deduped inside the session and capped, in the order they said them. */
export function theOnesToKeep(commitments: ACommitmentTheyMade[]): ACommitmentTheyMade[] {
  const kept: ACommitmentTheyMade[] = [];
  for (const c of commitments ?? []) {
    if (!worthWritingDown(c)) continue;
    const key = (c.action ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (kept.some((k) => (k.action ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim() === key)) continue;
    kept.push({ action: c.action.trim(), outcome: c.outcome?.trim() || null, when: c.when?.trim() || null });
    if (kept.length >= HOW_MANY_FROM_ONE_SESSION) break;
  }
  return kept;
}

/**
 * HOW LONG A COMMITMENT HAS BEEN OPEN, IN SESSIONS THEY WERE IN.
 *
 * Not weeks. Somebody who has had two check-ins since they said it has had two chances to move it,
 * whatever the calendar says, and that is the number the lead can fairly ask about.
 */
export function openSince(
  c: { statedInSession: number; saidAgainIn: number[] },
  sessionNow: number,
): { sessionsOpen: number; restated: number; say: string } {
  const sessionsOpen = Math.max(0, sessionNow - c.statedInSession);
  const restated = (c.saidAgainIn ?? []).length;
  if (sessionsOpen === 0) return { sessionsOpen, restated, say: 'said this session' };
  const sessions = `${sessionsOpen} ${sessionsOpen === 1 ? 'session' : 'sessions'}`;
  if (restated === 0) return { sessionsOpen, restated, say: `open ${sessions}, not mentioned again` };
  return { sessionsOpen, restated, say: `open ${sessions}, said again in ${restated} of them` };
}
