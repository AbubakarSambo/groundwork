/**
 * THE CONTEXT CHAT. G37 and G23, the last of the seven and the largest.
 *
 * From the plan: "It probes for what setup did not capture, and recommends the
 * materials rather than waiting for uploads. This is what stops a ground being
 * created off one sentence, which is a live defect: a real Ground 1 run produced a
 * ninety-day ground from a single answer with no duration, no rhythm and no sense of
 * who was involved."
 *
 * WHAT IT IS. A conversation on the Context tab, for whoever runs the ground, about
 * the ground rather than about a person. It asks for what is missing, in the order
 * that matters, and it names the document that would settle each thing instead of
 * waiting for somebody to guess what to upload.
 *
 * WHAT IT MUST NOT BECOME, and this is the whole design constraint:
 *
 * 1. **It is not a check-in.** Nothing said here is an account of anything. It never
 *    reaches a report, it is never compared against what anybody else said, and it
 *    cannot corroborate a person - the same rule as a document (G24).
 * 2. **It is not about a person.** The moment a lead starts telling this thing what
 *    they think of somebody, it has become a closed dossier with a chat interface.
 *    Anything about a named individual belongs in a closed context note, where the
 *    product already says who can read it.
 * 3. **It does not decide.** It asks and it recommends. What gets saved is what the
 *    lead confirms, which is G24's fourth rule - extraction is confirmed rather than
 *    adopted.
 *
 * WHY THE PROMPT LIVES IN ITS OWN FILE. The same reason as
 * `between-session-notes.ts`: the wording IS the mechanism, and it should be
 * testable as text rather than as the code that concatenates it.
 */

/** What a ground needs before its first session, in the order it is worth asking. */
export interface ContextGaps {
  /** No duration means the ground cannot say how many sessions it holds. */
  timelineDays: number | null;
  /** No rhythm means the same. */
  cadence: string | null;
  /** What doing well looks like. Without it the report cannot say "on track". */
  brief: string | null;
  /** How many people are on it. One is a record, not a comparison. */
  partyCount: number;
  /** Whether anybody has said what each person is individually trying to achieve. */
  perPersonObjectiveCount: number;
  /** Documents everybody in the ground can work from. */
  openDocumentCount: number;
}

/** The gap, and the document that would settle it. */
export interface ContextGap {
  key: string;
  /** Said to the lead, in the product's voice. */
  ask: string;
  /**
   * The material that answers it. Recommending beats waiting: "upload something"
   * gets nothing, "the brief you sent them" gets the brief.
   */
  suggests: string | null;
}

/**
 * WHAT IS MISSING, WORST FIRST.
 *
 * Ordered by what it costs to be without it, not by how easy it is to ask. A ground
 * with no duration cannot count its own sessions - that is worse than having no
 * documents, so it goes first even though "send me the brief" is the easier question.
 */
export function contextGaps(g: ContextGaps): ContextGap[] {
  const gaps: ContextGap[] = [];

  if (!g.timelineDays || g.timelineDays <= 0) {
    gaps.push({
      key: 'timeline',
      ask: 'How long should this run? Until a date, or for a set number of weeks - either is fine, but without it the ground cannot work out how many check-ins it holds.',
      suggests: null,
    });
  }

  if (!g.cadence) {
    gaps.push({
      key: 'cadence',
      ask: 'How often should people check in? Weekly, fortnightly, monthly, or once at the end.',
      suggests: null,
    });
  }

  if (!g.brief?.trim()) {
    gaps.push({
      key: 'success',
      ask: 'What does doing well look like here? Not a target for one person - what would make you say, at the end, that this went the way it should have.',
      suggests: 'the plan, brief or terms this work was agreed against',
    });
  }

  if (g.partyCount < 2) {
    gaps.push({
      key: 'parties',
      ask: 'Who else is in this? One account is a record; two or more is where the report can show you what people mean differently by the same work.',
      suggests: null,
    });
  }

  if (g.perPersonObjectiveCount < g.partyCount) {
    gaps.push({
      key: 'objectives',
      ask: 'What is each person actually trying to achieve? Without that, the report can only speak about the ground as a whole, not about how anybody is doing against their own thing.',
      suggests: 'their job description, objectives, or the message where the work was handed over',
    });
  }

  if (g.openDocumentCount === 0) {
    gaps.push({
      key: 'documents',
      ask: 'Is there anything in writing everybody should be working from? Whatever you put in as open context, every check-in has read before it asks anything.',
      suggests: 'the brief, the plan, the scope, the grant terms, or the message that started this',
    });
  }

  return gaps;
}

/**
 * The system prompt for the context chat.
 *
 * Written as a set of refusals as much as instructions, because the failure modes are
 * specific and every one of them is a version of "this stopped being about the work
 * and became about a person".
 */
export function contextChatPrompt(groundLabel: string, scenario: string, gaps: ContextGap[]): string {
  const gapList = gaps.length
    ? gaps.map((g) => `- ${g.key}: ${g.ask}${g.suggests ? ` (worth asking for: ${g.suggests})` : ''}`).join('\n')
    : '- nothing is missing that this conversation can fix.';

  return [
    `You are helping somebody set up a Groundwork ground called "${groundLabel}" (${scenario.replace(/_/g, ' ').toLowerCase()}).`,
    '',
    'A ground collects each person\'s own private account of a piece of work over several sessions, then shows where those accounts agree and differ. Your job here is the SETUP, not the accounts.',
    '',
    'WHAT IS STILL MISSING, in the order it matters:',
    gapList,
    '',
    'HOW TO ASK. One thing at a time, in your own words, shortest useful question first. Take what they give you and move on - if they answer a different question than you asked, that answer still counts. Never ask twice for something they have already told you.',
    '',
    'RECOMMEND THE MATERIAL, DO NOT WAIT FOR IT. When something in writing would settle a question, name the document you mean - "the brief you sent them", "the grant terms" - rather than asking them to upload something unspecified. People do not know what counts as context; they do know what they emailed somebody.',
    '',
    'THREE THINGS YOU MUST NOT DO.',
    '',
    '1. This is not a check-in. Nothing said here is anybody\'s account of anything. Do not treat it as evidence, do not weigh it against what anybody else has said, and do not tell them it will appear in the report - it will not.',
    '',
    '2. This is not about a person. If they start telling you what they think of somebody by name - that this person is difficult, or underperforming, or the problem - stop and say plainly that this conversation is about setting the ground up. Then point them at the ONE place that is for it, by name: the private context note further down this same Context page, under "About <that person>". Do not say it belongs in a check-in - a check-in is that person\'s own account of their own work, and telling a lead to put their opinion of somebody there is pointing them at the one place it must never go. Do not record it here and do not draw them out on it. The moment this becomes a place to say things about people, it is a file on somebody with a chat interface, and this product exists to be the opposite of that.',
    '',
    '3. You do not decide anything. You ask and you suggest. Nothing is saved until they confirm it, so put what you have understood back to them in their own words and let them correct it.',
    '',
    'When nothing important is missing, say so and stop. A setup conversation that will not end teaches people to skip setup.',
  ].join('\n');
}
