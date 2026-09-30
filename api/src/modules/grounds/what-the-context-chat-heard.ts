import { worthRecording, withoutFraming, verbatimQuote } from './what-setup-agreed';
import { whoTheyMeant } from './who-they-meant';
/**
 * THE HALF THE CONTEXT CHAT WAS MISSING: what it heard, and what may be done with it. Stage 3.
 *
 * `the-context-chat.ts` works out what setup did not capture and asks about it, and its own rules say
 * "it does not decide. It asks and it recommends. What gets saved is what the lead confirms."
 *
 * Nothing was ever saved. `contextChat` called the model and returned the reply; not one write. So a
 * lead could be asked how long this runs, answer "about three months", and the ground would still
 * have no duration - and because the gap was still open, the next turn asked again. A conversation
 * that cannot close what it opens is the same defect G37 was written for, moved one screen along:
 * the ground made from one sentence stays a ground made from one sentence.
 *
 * WHY EXTRACTION IS ITS OWN FILE, and pure. The failure mode of "the AI updated your ground" is that
 * a stray sentence rewrites how long somebody's onboarding runs. So the model's only job is to read
 * a number or a phrase out of what the lead actually typed. Everything about whether that is
 * allowed to touch the ground is decided here, in code, against rules that can be tested without a
 * model in the loop.
 *
 * THE RULES.
 *
 * 1. NOTHING IS WRITTEN WITHOUT CONFIRMATION. The chat proposes ("I will set this to twelve weeks")
 *    and the lead presses the thing that says yes. G24's fourth rule: extraction is confirmed rather
 *    than adopted.
 * 2. ONLY THE FIELD THE QUESTION WAS ABOUT. An answer to "how long" cannot change the cadence, even
 *    if the lead mentioned it in passing. The open gap decides what is writable, so a model that
 *    over-reads cannot reach anything it was not asked about.
 * 3. IMPLAUSIBLE VALUES ARE REFUSED, NOT CLAMPED. A silent clamp to the nearest legal value is a
 *    ground quietly running for a length nobody chose. Out of range means ask again.
 * 4. NOTHING ABOUT A PERSON IS EVER WRITTEN HERE. The one field that takes prose is what doing well
 *    looks like, and it is about the work. Anything naming an individual belongs in a closed context
 *    note, where the product already says who can read it.
 */

/** The gap keys `contextGaps` produces. Only these can be closed, and only one at a time. */
export type ClosableGap = 'timeline' | 'cadence' | 'success';

/** The cadences the schema allows. Anything else is a refusal, never a nearest match. */
export const CADENCES = ['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ONE_TIME'] as const;
export type Cadence = (typeof CADENCES)[number];

/**
 * SAID IN PLAIN WORDS, SHARED BY THE PROPOSAL SENTENCE AND THE OPENING LINE.
 *
 * Exported rather than kept local to the cadence branch below: `the-context-chat.ts` needs the exact
 * same words to open on what this check-in already holds (FIX 3), and two copies of "once a week"
 * drift the moment one of them is reworded.
 */
export const CADENCE_WORDS: Record<Cadence, string> = {
  DAILY: 'every day', WEEKLY: 'once a week', FORTNIGHTLY: 'every two weeks',
  MONTHLY: 'once a month', ONE_TIME: 'once, at the end',
};

export interface Heard {
  /** Days, as the ground stores it. */
  timelineDays?: number | null;
  cadence?: string | null;
  /** What doing well looks like, in the lead's own words. */
  success?: string | null;
  /**
   * What the lead expects of one named person, in the lead's own words.
   *
   * One at a time and only where they named somebody. An expectation with no person attached is a
   * statement about the work, which is what `success` already holds.
   */
  expectationPerson?: string | null;
  expectationText?: string | null;
  /** The measures this work is counted by, where the lead named them or pointed at a document. */
  targets?: { name?: string | null; target?: number | null }[] | null;
}

export type Proposal =
  | { kind: 'none'; why: string }
  | { kind: 'timeline'; days: number; say: string }
  | { kind: 'cadence'; cadence: Cadence; say: string }
  | { kind: 'success'; text: string; say: string }
  | { kind: 'expectation'; participantId: string; personLabel: string; text: string; say: string }
  | { kind: 'targets'; targets: { name: string; target: number | null }[]; say: string }
  /**
   * THE LEAD'S READ OF A NAMED PERSON, KEPT AS THEIR OWN PRIVATE NOTE. FIX 4, inventory items 10-11.
   *
   * What a lead says about somebody that is not something checkable to hold them to - "Ben should be
   * more proactive", "he is struggling and difficult to work with" - used to fall all the way to
   * `{kind:'none'}` here, and the model's OWN reply text still promised to record it as their read
   * (`contextChatPrompt` rule 2). Nothing was ever proposed, so nothing was ever saved, and the
   * promise was false. This is the proposal that makes it true: the same private note a lead can
   * write directly (`addLeadContext`, LEAD_ONLY, never quoted to the person it is about), reached from
   * the conversation and confirmed the same way as everything else here.
   */
  | { kind: 'lead_read'; participantId: string; personLabel: string; text: string; say: string };

/**
 * A day count somebody would actually choose. Below a week there is nothing to check in against;
 * above two years this is not a ground, it is a filing cabinet.
 */
const MIN_DAYS = 7;
const MAX_DAYS = 730;
/** Long enough to be a statement rather than a shrug, short enough not to be an essay. */
const MIN_SUCCESS = 12;
const MAX_SUCCESS = 600;

/**
 * What may be written, given the gap that was open and what the model read out of the answer.
 *
 * Returns a PROPOSAL, never a write. The caller shows `say` and does nothing until the lead confirms,
 * which is the difference between a product that helps and one that edits your record while you talk
 * to it.
 */
/**
 * THE MEASURES, WHEN A LEAD NAMES THEM OR POINTS AT THE DOCUMENT THAT HAS THEM.
 *
 * Asked directly: a document does not have to set the bar, but it can be read for evidence, and it
 * can set the bar if somebody tells it to. That second half is what this is. The context chat
 * already has the open documents in its prompt, so "use the targets in the delivery plan" is an
 * instruction it can already follow - what was missing is somewhere for the answer to land.
 *
 * IT IS STILL PROPOSED AND CONFIRMED, like every other thing this chat produces. A target read out
 * of a plan and written without anybody saying yes is a bar nobody set, appearing on a board people
 * are then read against. The lead says yes and it is theirs; nobody says yes and it is nothing.
 *
 * A TARGET WITHOUT A NUMBER IS KEPT, NOT REFUSED. `GroundObjective.target` is nullable and its own
 * comment says why: a qualitative objective is tracked and not counted. Refusing "get the new depot
 * running" for having no number would drop the thing the quarter is actually about.
 *
 * WHAT IS REFUSED is a number with nothing it counts, and a name so long it is a sentence - both of
 * which are the model handing back prose where a measure goes.
 */
function theMeasuresTheyNamed(heard: Heard): { name: string; target: number | null }[] {
  const rows = Array.isArray(heard.targets) ? heard.targets : [];
  const out: { name: string; target: number | null }[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const name = String(r?.name ?? '').trim();
    if (name.length < 2 || name.split(/\s+/).length > 12) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const n = r?.target;
    const target = Number.isFinite(n) && (n as number) >= 0 ? Math.round(n as number) : null;
    out.push({ name, target });
  }
  /* Eight is already more than a board reads at a glance, and a longer list is a plan pasted in. */
  return out.slice(0, 8);
}

export function proposalFrom(
  gap: string | null,
  heard: Heard,
  /** Who is on this ground, so a name in an answer can be matched to somebody real. */
  parties: { id: string; email: string; name?: string | null }[] = [],
  /**
   * The lead's own sentence this turn, so a quoted text is the LITERAL characters they typed rather
   * than either extraction call's own paraphrase of them - see `verbatimQuote`. Optional and empty by
   * default so every existing caller and every unit test that builds a `Heard` by hand still works;
   * where it is missing, the candidate text is used trimmed, exactly as before.
   */
  said: string = '',
): Proposal {
  if (!gap) return { kind: 'none', why: 'There is no open question for this to answer.' };

  if (gap === 'targets') {
    const targets = theMeasuresTheyNamed(heard);
    if (!targets.length) {
      return { kind: 'none', why: 'Nothing in that answer reads as a measure, so nothing was set.' };
    }
    const counted = targets.filter((t) => t.target != null).length;
    return {
      kind: 'targets',
      targets,
      say: counted
        ? `Set ${targets.length === 1 ? 'one measure' : `${targets.length} measures`}, ${counted} of them with a number to count against. You can change any of them on the board.`
        : `Set ${targets.length === 1 ? 'one measure' : `${targets.length} measures`}, tracked rather than counted, because no number was named for them.`,
    };
  }

  if (gap === 'timeline') {
    const days = heard.timelineDays;
    if (days == null || !Number.isFinite(days)) {
      return { kind: 'none', why: 'No length in that answer.' };
    }
    const whole = Math.round(days);
    if (whole < MIN_DAYS || whole > MAX_DAYS) {
      /** Refused rather than clamped: rule 3. */
      return {
        kind: 'none',
        why: `${whole} days is outside what a ground can run for, so nothing was changed. Anything from a week to about two years works.`,
      };
    }
    const weeks = Math.round(whole / 7);
    return {
      kind: 'timeline',
      days: whole,
      say: weeks >= 4 && whole % 7 === 0
        ? `I will set this to run for ${weeks} weeks.`
        : `I will set this to run for ${whole} days.`,
    };
  }

  if (gap === 'cadence') {
    const c = (heard.cadence ?? '').toUpperCase().trim();
    if (!CADENCES.includes(c as Cadence)) {
      return { kind: 'none', why: 'No rhythm in that answer that maps to how often people can check in.' };
    }
    return { kind: 'cadence', cadence: c as Cadence, say: `I will set people to check in ${CADENCE_WORDS[c as Cadence]}.` };
  }

  if (gap === 'success') {
    const raw = (heard.success ?? '').trim();
    if (raw.length < MIN_SUCCESS) return { kind: 'none', why: 'That is too short to stand as what doing well looks like.' };
    if (raw.length > MAX_SUCCESS) {
      return { kind: 'none', why: 'That is longer than this field holds. The short version is the useful one.' };
    }
    /* The lead's own words, not this call's own paraphrase of them - see verbatimQuote. */
    const text = verbatimQuote(raw, said);
    return { kind: 'success', text, say: `I will record that as what doing well looks like: "${text}"` };
  }

  /**
   * OBJECTIVES ARE WRITTEN FROM HERE NOW, AND THE COMMENT THAT SAID OTHERWISE WAS WRONG.
   *
   * It read: "setting somebody's objective... already has its own screen". It does not. The
   * expectations panel is explicitly read-only - "nobody edits anything here" - and the only two
   * things in the codebase that create a `PersonObjective` run INSIDE a check-in conversation. So
   * an expectation could not exist until the lead had finished their own check-in, and the first
   * check-in opened with nothing to measure anybody against. That is most of why it feels shapeless.
   *
   * The objection in that comment was to a chat QUIETLY writing to somebody's record, and it was
   * right. This is not quiet: it returns a proposal like every other gap, the lead sees the sentence
   * and confirms it, and nothing is written until they do.
   *
   * IT IS RECORDED AS THE LEAD'S EXPECTATION AND MARKED UNSEEN, which is true by construction - the
   * person it is about has not arrived yet. That flag is what the whole record reads to refuse
   * pressing anybody about something nobody showed them.
   */
  if (gap === 'objectives') {
    const person = (heard.expectationPerson ?? '').trim();
    /*
     * FIX 5, inventory item 11's say-back: the framing stripped DETERMINISTICALLY, in code, rather
     * than left to whatever each separate model call happens to have already trimmed. Driven live:
     * propose's own quote read "want the update in by every Friday" - a fragment clipped mid-clause -
     * while confirm's independent extraction (a second model call, on the same words) read "the
     * update in by every Friday". Both calls run this same strip now, so both converge on the same
     * text far more often than leaving the model to decide on its own where the sentence starts.
     */
    /* The lead's own words: framing stripped deterministically, then locked to the literal
       characters they typed rather than either call's own paraphrase - see verbatimQuote. */
    const text = verbatimQuote(withoutFraming((heard.expectationText ?? '').trim()), said);
    if (!person || !text) {
      return { kind: 'none', why: 'No expectation of a named person in that answer.' };
    }
    const match = whoTheyMeant(person, parties);
    if (!match) {
      return { kind: 'none', why: `Nobody on this check-in matches "${person}".` };
    }
    /*
     * FIX 4, inventory items 10-11: WHAT IS NOT CHECKABLE ENOUGH TO HOLD SOMEBODY TO IS NOT NOTHING -
     * it is the lead's own read of that person, kept private. This used to stop at `{kind: 'none'}`
     * here, silent, while the model's own reply (rule 2 of `contextChatPrompt`) told the lead it was
     * being recorded as their read regardless - a promise nothing behind it made true. Matched to a
     * real person FIRST, so the note lands on the right row.
     */
    if (!worthRecording(text)) {
      return {
        kind: 'lead_read',
        participantId: match.id,
        personLabel: match.label,
        text,
        say: `Shall I keep "${text}" as a private note about ${match.label} that only you can see? `
          + `It guides how this check-in is run and is never quoted to ${match.label} or put into their own check-in.`,
      };
    }
    return {
      kind: 'expectation',
      participantId: match.id,
      personLabel: match.label,
      text,
      say: `I will record that as what you expect of ${match.label}: "${text}". It goes down as YOUR expectation, `
        + 'not as agreed, and marked as not yet seen by them.',
    };
  }

  /**
   * `parties` and `documents` are asked about and deliberately not written from here. Adding a
   * person and sharing a document each have their own screen and their own consequences - an invite
   * email, a file everybody can read - and a chat doing either on its own is the version of this
   * feature nobody asked for.
   */
  return { kind: 'none', why: 'That one is not something this conversation changes on its own.' };
}

/** The tool the model fills in. One gap's worth of fields, nothing else reachable. */
export function extractionToolFor(gap: string) {
  const props: Record<string, any> = {};
  if (gap === 'timeline') {
    props.timelineDays = {
      type: 'number',
      description: 'How many DAYS the person said this should run for. Convert weeks and months yourself: three months is 90, six weeks is 42. Omit if they did not say.',
    };
  }
  if (gap === 'cadence') {
    props.cadence = {
      type: 'string',
      enum: [...CADENCES],
      description: 'How often people should check in, from what they said. ONE_TIME means a single session at the end. Omit if they did not say.',
    };
  }
  if (gap === 'objectives') {
    props.expectationPerson = {
      type: 'string',
      description: 'The NAME or email of the one person this expectation is about, exactly as they said it. Omit unless they named somebody.',
    };
    props.expectationText = {
      type: 'string',
      description: 'What they expect of that person, in THEIR words, trimmed to the expectation itself. Omit if they did not say, and never invent a sensible one.',
    };
  }

  if (gap === 'targets') {
    props.targets = {
      type: 'array',
      description: 'The measures this work is counted by. Take them from what the person said, INCLUDING when they point at a document you can read - "use the targets in the delivery plan" means read them out of it. Omit entirely if they named none and pointed at nothing.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'What is being counted, in their words or the document\'s. Short: "shops onboarded", "first response under four hours". Never a sentence.' },
          target: { type: 'number', description: 'The number to reach, when one is stated. OMIT it rather than guessing - plenty of real measures have no number and are tracked rather than counted.' },
        },
        required: ['name'],
      },
    };
  }

  if (gap === 'success') {
    props.success = {
      type: 'string',
      description: 'What doing well looks like, in THEIR words, trimmed to the statement itself. About the work, never about a named person. Omit if they did not say.',
    };
  }
  return {
    name: 'record_what_they_said',
    description: 'Record only what the person just said about the one thing they were asked. Omit anything they did not say. Never infer, never fill in a sensible default.',
    input_schema: { type: 'object', properties: props },
  };
}

/**
 * WHO "HER" IS, WHICH ONE SENTENCE CANNOT SAY.
 *
 * Read live. The lead named Amina, was asked whether to set her a target, and answered "Yes, give
 * her 3,000 units by December." The extractor was handed that sentence alone, returned "her" as
 * the person, and the matcher answered honestly that nobody on the check-in is called her - so the
 * one target the product had just asked her for went nowhere, and the reply cheerfully said it had
 * been recorded.
 *
 * The earlier turns go in as CONTEXT, and the instruction is explicit that only the last sentence
 * is being read. It is the difference between reading a sentence and reading a conversation, and
 * every pronoun anybody uses needs the second.
 */
export const WHO_AND_WHAT_THEY_EXPECT =
  'The last message is the only one you are reading. The earlier messages are there for one purpose: '
  + 'to say who a name or a word like "her", "him" or "them" in that last message refers to. '
  + 'If the last message names a person on this check-in and what they are expected to DO or REACH - a number, a date, a piece of work to own - return it, with the person\'s actual name rather than the pronoun. '
  + 'If it does not, return nothing. Never infer a sensible default. '
  + 'What somebody IS - struggling, difficult, doing well - is never an expectation; return nothing for it.';

/** The conversation as context, with the sentence being read last and on its own. */
export function asContextThenTheSentence(
  history: { role: 'user' | 'assistant'; content: string }[] | undefined,
  said: string,
): { role: 'user' | 'assistant'; content: string }[] {
  const recent = (history ?? []).slice(-6).filter((h) => (h.content ?? '').trim());
  const already = recent.length && recent[recent.length - 1]?.content?.trim() === said.trim();
  return [...(already ? recent.slice(0, -1) : recent), { role: 'user' as const, content: said }];
}

/**
 * WHAT THE LEAD IS TOLD ONCE IT IS DONE, NOT THE QUESTION THEY JUST ANSWERED. FIX (found live, the
 * four live checks, 30 September 2026).
 *
 * `proposal.say` is worded to ASK - "Shall I keep ... as a private note ...?", "I will record that
 * ..." - because that is what it is used for everywhere it is first shown, with a Yes underneath it.
 * `applyContextProposal` used to return that very same sentence again, unchanged, once the lead had
 * already said yes and the row was written. For `lead_read` that read back as the chat re-asking its
 * own question after being answered - live:
 *
 *   Shall I keep "should be more proactive" as a private note about Ben Okafor that only you can
 *   see? It guides how this check-in is run and is never quoted to Ben Okafor or put into their own
 *   check-in.
 *
 * said AGAIN, after the yes that was already given. This is the sentence for after: a plain,
 * past-tense statement that the thing was done, for every kind that writes something, so no confirm
 * path is left saying "I will ..." or asking a question about something that already happened.
 */
export function confirmedSay(proposal: Proposal): string {
  switch (proposal.kind) {
    case 'timeline': {
      const weeks = Math.round(proposal.days / 7);
      return weeks >= 4 && proposal.days % 7 === 0
        ? `I have set this to run for ${weeks} weeks.`
        : `I have set this to run for ${proposal.days} days.`;
    }
    case 'cadence':
      return `I have set people to check in ${CADENCE_WORDS[proposal.cadence]}.`;
    case 'success':
      /*
       * FOUND LIVE AGAIN, 30 September 2026, on the four live checks: a colon joining two clauses
       * together rather than a sentence - "I have recorded that as what doing well looks like:
       * '...'" See `nothing-proposed-that-nobody-said.ts` and the confirmations for every other kind
       * here, none of which are colon-joined: the quote sits inside the sentence as its own clause.
       */
      return `I have recorded "${proposal.text}" as what doing well looks like.`;
    case 'expectation':
      return `I have recorded "${proposal.text}" as what you expect of ${proposal.personLabel}. `
        + 'It goes down as YOUR expectation, not as agreed, and is not yet seen by them.';
    case 'lead_read':
      return `I have kept "${proposal.text}" as a private note about ${proposal.personLabel} that only you can see. `
        + `It guides how this check-in is run and is never quoted to ${proposal.personLabel} or put into their own check-in.`;
    case 'targets':
      /* Already a done statement ("Set N measures ..."), with nothing to ask - returned as it is. */
      return proposal.say;
    case 'none':
      /* Never reaches a confirm write at all; kept only so this switch is exhaustive. */
      return proposal.why;
  }
}
