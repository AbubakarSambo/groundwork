/**
 * WHAT SETUP NEVER ASKED FOR. (G37, G23)
 *
 * Setup asks a fixed set of questions, and a fixed set of questions has a fixed
 * blind spot. Whatever the lead was not asked, the ground never learns - not
 * because anybody withheld it, but because there was no field and no moment.
 *
 * On Ground 1 the missing thing was which of two measures counted. Nobody hid it.
 * It took seven weeks to surface because the only place it could have been said
 * was a free-text box nobody thought to use for that.
 *
 * SO THIS IS A CHAT, NOT A FORM. A form with more fields has a bigger blind spot,
 * not a smaller one, and every field added to setup is one more thing standing
 * between a lead and starting. What this does instead is look at what the ground
 * ALREADY has and ask about the specific hole, once, in words that name the hole.
 *
 * G23 IS THE HALF PEOPLE ACTUALLY USE. "Attach anything relevant" produces
 * nothing, because the lead does not know what counts as relevant and the cost of
 * guessing wrong is looking foolish. Naming the document - "the brief you sent
 * them", "the doc where the number was agreed" - is the difference between an
 * empty documents tab and a useful one. So every prompt below names a thing that
 * exists somewhere rather than asking for a category.
 *
 * AND THE LINE IT MUST NOT CROSS. This asks about the WORK. It never asks the
 * lead for their read on a person, their concerns about somebody, or what they
 * expect this ground to show. Those are the questions a form like this drifts
 * towards, they are the ones a lead would happily answer, and each one turns
 * setup into a place where a case gets built before anybody has said anything.
 */

export interface GroundShape {
  /** Whether anybody has said what success looks like, per person. */
  objectivesSet: number;
  people: number;
  /** Conditions named at setup, G15's field. */
  conditionsNamed: number;
  /** Whether a baseline was captured at all. */
  hasBaseline: boolean;
  documents: number;
  /** Whether the ground says what happens after the report. */
  hasOutcome: boolean;
  /** How the ground was described, so a prompt can quote it back. */
  purpose?: string | null;
}

export interface Ask {
  /** Stable id, so the same hole is not asked about twice. */
  id: 'objectives' | 'conditions' | 'baseline' | 'materials' | 'outcome';
  /** The question, naming the hole rather than the category. */
  question: string;
  /**
   * G23. The document that would answer it, named as a thing that exists.
   * Null where no document would help, which is honest and stops the chat
   * asking for paperwork to fill a silence.
   */
  material: string | null;
}

/**
 * The holes this ground has, most useful first.
 *
 * Ordered by what it costs to be missing rather than by how easy it is to ask.
 * An objective nobody stated is the single most expensive absence in this product
 * - it is the finding Ground 1 produced eleven weeks late - so it goes first even
 * though it is the hardest question to answer.
 */
export function whatIsMissing(g: GroundShape): Ask[] {
  const asks: Ask[] = [];
  const about = g.purpose ? ` for "${g.purpose.trim()}"` : '';

  if (g.objectivesSet < g.people) {
    const n = g.people - g.objectivesSet;
    asks.push({
      id: 'objectives',
      question: `Nobody has said what a good outcome looks like for ${n === 1 ? 'one of the people' : `${n} of the people`} in this ground${about}. What would you want to be able to say about their work at the end of it?`,
      material: 'A job description, an offer letter, or the message where the role was explained.',
    });
  }

  if (!g.conditionsNamed) {
    asks.push({
      id: 'conditions',
      question: 'What has to be true for this to work that is nobody in this ground\'s doing? An account they need, a decision from somewhere else, access somebody has to grant.',
      // Deliberately null. Conditions live in people's heads, and asking for a
      // document here produces an apology instead of an answer.
      material: null,
    });
  }

  if (!g.hasBaseline) {
    asks.push({
      id: 'baseline',
      question: 'Where does this stand today, in one or two sentences? Written now, before anything happens, so there is something to compare against later.',
      material: null,
    });
  }

  if (!g.documents) {
    asks.push({
      id: 'materials',
      // G23 IN ONE SENTENCE. Naming the documents rather than asking for
      // "anything relevant", which produces nothing every time.
      question: 'Is there a brief, a plan, or a message where this was agreed? Not for the file - so that when two people describe the same thing differently, there is something to check it against.',
      material: 'The brief you sent them, the plan you are working from, or the thread where the number was agreed.',
    });
  }

  if (!g.hasOutcome) {
    asks.push({
      id: 'outcome',
      question: 'What happens after the report? A conversation, a decision, or nothing in particular are all real answers, and the people checking in are entitled to know which one it is.',
      material: null,
    });
  }

  return asks;
}

/**
 * One at a time, and only where there is a hole.
 *
 * Five questions in a row is a form with a chat's manners. The lead answers the
 * first two properly, the third briefly, and abandons the rest - and the ones
 * they abandoned were ordered last because they matter least, so the loss is
 * survivable. Five at once loses the first one too.
 */
export function nextAsk(g: GroundShape, alreadyAsked: string[] = []): Ask | null {
  return whatIsMissing(g).find((a) => !alreadyAsked.includes(a.id)) ?? null;
}

/**
 * The questions this chat is never allowed to ask.
 *
 * Exported as data, and asserted against, because the drift is not hypothetical:
 * a lead would answer every one of these willingly and at length, they would make
 * the first report look sharper, and each one turns setup into a place where a
 * case is built about somebody before they have said a word.
 */
export const NEVER_ASK = [
  'how somebody is doing',
  'what the lead expects this ground to show',
  'who the lead is worried about',
  'what the lead thinks the problem is with a person',
  'anything the lead would not say in front of the person it is about',
];

const OFF_LIMITS = [
  /\bhow is (?:\w+ )?(?:doing|performing|getting on)\b/i,
  /\b(?:concerns?|worried|worry) about\b/i,
  /\bwhat do you (?:think|expect) (?:is )?(?:the )?(?:problem|issue)\b/i,
  /\bunderperform/i,
  /\bexpect this (?:ground|report) to show\b/i,
  /\bweakness(?:es)?\b/i,
];

/**
 * Whether a question is one of the forbidden ones. Used on anything generated
 * rather than written here, because the fixed list above is the easy half and the
 * model writing its own follow-up is where this actually breaks.
 */
export function isOffLimits(question: string): string | null {
  for (const p of OFF_LIMITS) {
    const hit = question.match(p);
    if (hit) return hit[0];
  }
  return null;
}
