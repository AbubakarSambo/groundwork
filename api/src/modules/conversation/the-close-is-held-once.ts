import { insteadOfAFiller } from './the-same-sentence-five-times';
import { theOwedThingAskedPlainly } from './each-owed-thing-asked-plainly';
/**
 * THE CLOSE BAR.
 *
 * The prompt says: two pushbacks, then record what they said as a weak evidence definition. That is
 * a rule, and a rule was not enough, so the bar is attached to the mechanism. Before a close is
 * accepted, the last thing the person said is read for a number, a date, a document, or a file
 * they attached this session. If none of those is there, the close is held ONCE and the product
 * asks for the one concrete thing. They answer, and the close goes through whatever they said.
 *
 * The person sees a question. Never a form, never a rule read back to them.
 */

/* A DIGIT ANYWHERE. This used to be \b\d+\b, and "N38m", "$400k" and "N180m" have no word boundary before
   the digit, so a rep who said "I hit N38m" three times was told nothing he said carried a number (run 7,
   21 Sep 2026). Every number this product's people say has a currency letter on the front of it. */
const A_NUMBER = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|million|half|dozen)\b/i;
const A_DATE =
  /\b(mon|tues|wednes|thurs|fri|satur|sun)day\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b|\b(tomorrow|tonight|next (week|month|quarter|monday|tuesday|wednesday|thursday|friday)|end of (the )?(week|month|quarter|day)|by the \d+|this (week|month|quarter)|q[1-4])\b/i;
const A_DOCUMENT =
  /\b(doc|document|spreadsheet|sheet|deck|slide|report|brief|spec|proposal|plan|tracker|ticket|pr|pull request|commit|invoice|contract|email|thread|message|note|minutes|dashboard|link|file|attached|attachment|screenshot|recording|transcript)s?\b/i;

export type ConcreteThing = 'a number' | 'a date' | 'a document' | 'an attachment';

export function whatIsConcreteIn(lastTurn: string, attachedThisSession: boolean): ConcreteThing[] {
  const found: ConcreteThing[] = [];
  if (attachedThisSession) found.push('an attachment');
  if (A_NUMBER.test(lastTurn)) found.push('a number');
  if (A_DATE.test(lastTurn)) found.push('a date');
  if (A_DOCUMENT.test(lastTurn)) found.push('a document');
  return found;
}

/**
 * The one question. Product-written, the way the citation is: the model does not get to soften it
 * or turn it into three. It is short because it is the last thing they read before the report.
 */
/*
 * THE LINE IN FRONT OF THE PRODUCT'S ONE QUESTION AT A HELD CLOSE. It read "One more before this closes.",
 * a clipped phrase with no verb, which the wording rule does not allow (1 October 2026). A full sentence,
 * in one place, for every hold.
 */
export const ONE_MORE_QUESTION = 'I have one more question before we finish.';

export const THE_ONE_CONCRETE_THING =
  `${ONE_MORE_QUESTION} Put a date or a number on that, or name where it is written down.`;

/**
 * THE OTHER HOLD: the session is closing with something it was for never raised. Product-written,
 * in the owed list's own words ("how it is actually going", "what they need from other people"),
 * so it is one plain line and not a question about something else.
 */
/* The owed list is written about them ("what they are working on"); a line is said to them. First
   sentence only: the rest of an owed line is guidance for the model, not for the person. */
export const saidToThem = (what: string): string => {
  const first = ((what ?? '').trim().split(/(?<=[.?!])\s+/)[0] ?? '').replace(/[.?!]+$/, '');
  const toYou = first
    .replace(/\bthemselves\b/gi, 'yourself')
    .replace(/\btheirs\b/gi, 'yours')
    .replace(/\btheir\b/gi, 'your')
    .replace(/\bthey are\b/gi, 'you are')
    .replace(/\bthey\b/gi, 'you')
    .replace(/\bthem\b/gi, 'you');
  return toYou.length > 120 ? `${toYou.slice(0, 117).trimEnd()}...` : toYou;
};

/**
 * THE OWED THING, ASKED AS A QUESTION. "One more before this closes, because it is what this check-in is
 * for: what you are answerable for." read to Abubakar as a sentence with a colon where a question
 * should be (Hafsah, 21 Sep 2026: "the conversation had weird colons"). The owed list is written as
 * noun phrases about them - "what they need from other people" - and a person is asked, not handed a
 * label. The common shapes turn into plain questions; anything else is asked as "Tell me about ...".
 */
export function asAQuestion(what: string): string {
  /* Written out once for every owed line: one plain question each. See each-owed-thing-asked-plainly. */
  const plainly = theOwedThingAskedPlainly(what);
  if (plainly) return plainly;
  const t = saidToThem(what).trim().replace(/[.?!]+$/, '');
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  /* Two clauses joined with ", and" are two questions in one: each is turned, then rejoined. */
  const twoClauses = /^(.+?),\s+and\s+((?:what|how|who|where|which)\s+.+)$/i.exec(t);
  if (twoClauses) {
    const first = asAQuestion(twoClauses[1]).replace(/\?$/, '');
    const second = asAQuestion(twoClauses[2]).replace(/\?$/, '');
    return `${first}, and ${second.charAt(0).toLowerCase()}${second.slice(1)}?`;
  }
  let m: RegExpExecArray | null;
  /* "what is getting in the way", "what has moved since last time", "how it is actually going" */
  if ((m = /^(what|how|who|where|which)\s+(is|are|has|have|was|were|does|do|did|will|would|should|can)\s+(.+)$/i.exec(t))) {
    return `${cap(m[1])} ${m[2]} ${m[3]}?`;
  }
  /* "how it is actually going" -> "How is it actually going?" */
  if ((m = /^(what|how)\s+(it|this|that|they)\s+(is|are|was|were|has|have)\s+(.+)$/i.exec(t))) {
    return `${cap(m[1])} ${m[3]} ${m[2]} ${m[4]}?`;
  }
  /* "what you are answerable for" -> "What are you answerable for?"; "how you are making your number" */
  if ((m = /^(what|how|who|where|which)\s+you\s+(are|were|have|had|will|would|should|can|could)\s+(.+)$/i.exec(t))) {
    return `${cap(m[1])} ${m[2]} you ${m[3]}?`;
  }
  /* "what you understood you were meant to do" -> "What did you understand you were meant to do?" */
  if ((m = /^(what|how|who|which)\s+you\s+(understood|meant|expected|decided|thought|saw|did|said)\s+(.*)$/i.exec(t))) {
    const base: Record<string, string> = { understood: 'understand', meant: 'mean', expected: 'expect', decided: 'decide', thought: 'think', saw: 'see', did: 'do', said: 'say' };
    return `${cap(m[1])} did you ${base[m[2].toLowerCase()] ?? m[2]}${m[3] ? ` ${m[3]}` : ''}?`;
  }
  /* "what you need from other people" -> "What do you need from other people?" */
  if ((m = /^(what|how|who|where|which)\s+you\s+(.+)$/i.exec(t))) {
    return `${cap(m[1])} do you ${m[2]}?`;
  }
  /* "what is clear and what is not" is already a question in shape; "whether your goal still makes sense" is not. */
  if (/^whether\s+/i.test(t)) return `Does ${t.replace(/^whether\s+/i, '').replace(/\bstill makes sense\b/, 'still make sense')}?`;
  /* "Tell me what stayed off track."; "Tell me about the part of the plan that is yours to do." */
  return /^(what|how|who|where|which)\b/i.test(t) ? `Tell me ${t}.` : `Tell me about ${t}.`;
}

/**
 * WHEN THE MODEL WILL NOT LET A QUESTION GO, THE PRODUCT MOVES THE CONVERSATION ON. Smoke run, 20 Sep
 * 2026: "how many acres" was asked five times in five wordings, the third-ask guard fired, the retry
 * asked it again, and the fallback shipped it because there was nothing else in the reply. This is
 * what ships instead: the answer taken as given, and the next thing the check-in is for.
 */
export const takenAsSaidAndOn = (next: string | null): string =>
  next ? `That goes down as you put it. ${asAQuestion(next)}` : 'That goes down as you put it.';

/**
 * THE LAST THING THEY SAID, NOT THE LAST THING THEY TYPED. A closing turn is usually "no, we are good"
 * or "yes that's everything", which carries no date because it is not an answer to anything. The bar
 * reads back past those to the last turn with something in it.
 */
const AN_ACKNOWLEDGEMENT = /^\s*(?:(?:no|yes|yeah|yep|ok|okay|sure|fine|good|great|perfect|done|understood|noted|alright|right|that'?s (?:it|all|everything)|we are good|we're good|i'?m good|nothing (?:else|more)|no,? (?:we are|we're|that'?s) (?:good|it|all|fine)|nope|all good|ready|let'?s close(?: it)?|thank you|thanks)[\s.!,]*){1,3}$/i;
/* A thank-you or a goodbye in a few more words is one too (polish round 3: "Thanks! Have a good one everyone." was answered "That did not come out right"). */
const A_THANK_YOU_OR_GOODBYE = /^\s*(?:thank(?:s| you)|cheers|bye|goodbye|ok(?:ay)?,? thanks?)\b[^?]{0,80}$/i;
export const isAnAcknowledgement = (turn: string): boolean => AN_ACKNOWLEDGEMENT.test((turn ?? '').trim()) || A_THANK_YOU_OR_GOODBYE.test((turn ?? '').trim());

export function lastSubstantiveTurn(personSaid: string[]): string {
  for (let i = personSaid.length - 1; i >= 0; i--) {
    const t = (personSaid[i] ?? '').trim();
    if (!t) continue;
    if (AN_ACKNOWLEDGEMENT.test(t)) continue;
    if (t.split(/\s+/).length <= 3 && !/\d/.test(t)) continue;
    return t;
  }
  return personSaid[personSaid.length - 1] ?? '';
}

/**
 * A GOODBYE THAT WAS REFUSED HAS TO COME OUT.
 *
 * Live, the last thing a lead read in session 2 was both endings at once:
 *
 *   "Your report is ready now, and nothing in it needs acting on today. Speak soon.
 *
 *    One more before this closes. Put a date or a number on that, or name where it is written down."
 *
 * The product held the close and appended its question to a reply that had already said goodbye,
 * handed the report over and wished her well. It reads as the product changing its mind mid
 * sentence, and it is worse than either half alone: somebody who reads the first paragraph and
 * stops has been told the session is over when it is not.
 *
 * The hold was right. The goodbye is what is wrong, and it is wrong because the model wrote it
 * before the product had ruled - the model cannot know, and should not have to. So the farewell
 * comes out here, at the moment the close is refused, and only then. What the goodbye was wrapped
 * around - anything they actually said - is left where it is.
 */
/*
 * "THIS CHECK-IN WILL CONTINUE IN TWO WEEKS" IS A GOODBYE TOO. Week 2 live run, 28 Sep 2026: the close
 * was held and the product's "One more before this closes" went under it, so Tobi read that the
 * check-in would continue in two weeks and, in the same turn, that it had one more question. Only
 * the check-in, the session or the conversation continuing counts - never "you will continue",
 * which is the person's own commitment and stays.
 */
const A_FAREWELL =
  /(\b(?:this|the|our) (?:check-in|session|conversation) (?:will |is going to )?(?:continue|resume|pick up|carry on)s? (?:in|next|on|after)\b|\bwe(?:'ll| will) (?:speak|talk) again\b|\bspeak soon\b|\bsee you (in|next|soon|then)\b|\btalk soon\b|\buntil next time\b|\byour report is (ready|yours|now yours)\b|\bthe report is yours\b|\bnothing in it needs acting on\b|\bnothing to act on\b|\bthat is everything for (today|now)\b|\bwe are done here\b|\bthanks for your time\b)/i;

/**
 * A GOODBYE WITHOUT THE MARKER IS STILL A CLOSE. Smoke run, 20 Sep 2026: "Your report is ready now,
 * and nothing in it needs acting on today. Speak soon." shipped as an ordinary turn because the model
 * left the marker off, so the product never ruled on the close, the person said "Ok, thank you", and
 * got "That did not come out right" with a hold underneath. The farewell IS the signal.
 */
/** Any goodbye in it at all, question or not. For a turn the product has decided is not the last. */
export const hasAGoodbye = (reply: string): boolean => A_FAREWELL.test(reply ?? '');

export const saysGoodbye = (reply: string): boolean => A_FAREWELL.test(reply ?? '') && !/\?\s*$/.test((reply ?? '').trim());

/**
 * A HELD CLOSE DOES NOT RECITE THE RECAP AGAIN. On a live check-in (21 Sep 2026) the close was held
 * twice and the person read "You said you will do some research online to find these people, and
 * that will be done by October 31, 2026" three times in a row, once per attempt. What survives a
 * refused close is what has not been said before this session: a sentence already in an earlier
 * turn, word for word, comes out with the goodbye.
 */
export function withoutWhatWasAlreadySaid(reply: string, earlierAiTurns: string[]): string {
  /* "You will do X" and "You said you will do X" are one recital. */
  const core = (x: string) => x.trim().toLowerCase().replace(/^(?:so |and |that is |you said (?:that )?|you told me (?:that )?)+/, '').replace(/[.!?\s]+$/, '');
  const said = new Set((earlierAiTurns ?? []).flatMap((t) => (t ?? '').match(/[^.!?\n]+[.!?]*/g) ?? []).map(core).filter((x) => x.length > 20));
  const kept = (reply.match(/[^.!?\n]+[.!?]*|\n+/g) ?? []).filter((piece) => !said.has(core(piece)));
  return kept.join('').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function withoutTheGoodbye(reply: string): string {
  const kept = (reply.match(/[^.!?\n]+[.!?]*|\n+/g) ?? [])
    .filter((piece) => !A_FAREWELL.test(piece));
  const out = kept.join('').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  /* Never hand back nothing. A reply that was ALL farewell is a close that the product refused, and
     the question it is about to append stands on its own better than an empty turn does. */
  return out;
}

/**
 * NOBODY IN A ONE-TIME SESSION OWES HOMEWORK. The engine's close rule - "what will you do about
 * this, and by when?" - reached the convener of a discovery session in run 4 (20 Sep 2026) after her
 * plan's questions were done, and the judge scored her session 1 for it: a strategy conversation that
 * ended on a personal to-do. The pack says not to ask it; the sentence is cut in code.
 */
/* "One thing before we close:" goes with the question it introduces. Left behind, the lead read "One
   thing From everything you have said, what have you decided?" (pip, run 8). */
const HOMEWORK = /\b(what will you do about (?:this|that|it),? and by when|what is the (?:first|next|one) thing you will do(?: about (?:this|that|it))?,? and (?:by )?when|(?:one (?:more |last )?thing,? )?before we close:? what will you do)\b[^.!?]*[.!?]?/gi;

/** Does this turn ask the homework question at all? */
export const asksForHomework = (text: string): boolean => {
  HOMEWORK.lastIndex = 0;
  const yes = HOMEWORK.test(text ?? '');
  HOMEWORK.lastIndex = 0;
  return yes;
};

/**
 * THE LEAD'S CLOSE IS A DECISION, IN CODE. The lead block says it and the model asked Funmi "what will
 * you do about this, and by when?" anyway, in every session of run 7 (21 Sep 2026). The homework
 * sentence to a lead becomes the decision question, once a session; after that it is cut.
 */
/* "on this record" came out of it for the same reason as the filler: it is our word for what the
   product does, and she read it five times in one conversation. The question is the same question. */
export const THE_LEADS_DECISION = 'From everything you have said, what have you decided?';

/**
 * A HOMEWORK BUDGET. The pack allows the question once and "once more for their own part"; Halima
 * had it four times in one closing session. The third time, the sentence comes out and the rest of the
 * turn stands; where nothing else was in it, the record line goes instead.
 */
/*
 * WHERE THE CUT EMPTIES THE REPLY, IT NO LONGER ANNOUNCES A FILING.
 *
 * "That goes on this record as you put it." was substituted here, and read five times in one live
 * check-in - twice as the answer to a direct question and once as the answer to "please end the
 * session". See the-same-sentence-five-times for what is wrong with it and what replaces it.
 */
export function withinTheHomeworkBudget(reply: string, earlierAiTurns: string[], isLead: boolean): { text: string; changed: 'kept' | 'cut' | 'decision' } {
  const text = reply ?? '';
  if (!asksForHomework(text)) return { text, changed: 'kept' };
  const earlier = (earlierAiTurns ?? []).filter((t) => asksForHomework(t)).length;
  if (isLead) {
    const decisionAsked = (earlierAiTurns ?? []).some((t) => (t ?? '').includes(THE_LEADS_DECISION));
    HOMEWORK.lastIndex = 0;
    const swapped = decisionAsked ? withoutTheHomework(text).text : text.replace(HOMEWORK, THE_LEADS_DECISION).replace(/[ \t]{2,}/g, ' ').trim();
    HOMEWORK.lastIndex = 0;
    if (decisionAsked && swapped === text) return { text: insteadOfAFiller((earlierAiTurns ?? []).length, earlierAiTurns ?? []), changed: 'cut' };
    return { text: swapped, changed: decisionAsked ? 'cut' : 'decision' };
  }
  if (earlier < 2) return { text, changed: 'kept' };
  const without = withoutTheHomework(text);
  if (!without.cut) return { text: insteadOfAFiller((earlierAiTurns ?? []).length, earlierAiTurns ?? []), changed: 'cut' };
  return { text: without.text, changed: 'cut' };
}

export function withoutTheHomework(reply: string): { text: string; cut: boolean } {
  const text = (reply ?? '');
  if (!HOMEWORK.test(text)) return { text, cut: false };
  HOMEWORK.lastIndex = 0;
  const kept = text.replace(HOMEWORK, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return { text: kept || text, cut: !!kept };
}
