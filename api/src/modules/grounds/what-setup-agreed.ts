/**
 * NOTHING TURNED SETUP INTO SOMETHING THE FIRST CHECK-IN COULD MEASURE AGAINST.
 *
 * Only two things in this codebase create a `PersonObjective`, and both run INSIDE a check-in
 * conversation. So whatever a lead agreed in the entry chat, wrote in the brief, or settled in the
 * context chat existed as prose and nothing else - and the first check-in opened with no objective
 * for anybody, which is most of why it feels long and shapeless. It has to establish from scratch
 * what the setup already decided.
 *
 * WHAT THIS IS, AND WHAT IT CAREFULLY IS NOT.
 *
 * It records what the LEAD said they expect of each person, as the lead's expectation, marked
 * unseen. That last part is the whole safety of it: `seenBySubject: false` is what the six
 * explanations read to refuse pressing anybody about a thing nobody showed them, and it is true
 * here by construction - the person has not read it, because they have not arrived yet.
 *
 * It is NOT agreement. Nobody has agreed to anything at setup except the lead, with themselves. The
 * first check-in is where the other person gets to say what they understood, and the value of the
 * whole product is in the gap between the two. Recording the lead's version as though it were
 * shared would close that gap by fiat and produce a report that agrees with itself.
 *
 * AUTHORED BY THE LEAD, NEVER BY US. `authoredBy` says who wrote it so the record can tell an
 * expectation somebody set from one the product inferred. This writes 'lead-setup', which is
 * neither the person it is about nor an integration.
 */

export const AUTHORED_AT_SETUP = 'lead-setup';

export interface AgreedAtSetup {
  /** Which participant it is about. */
  participantId: string;
  /** What the lead expects of them, in the lead's words. Never rewritten. */
  text: string;
}

/**
 * WHAT MAKES AN EXPECTATION WORTH RECORDING.
 *
 * A sentence with nothing checkable in it - "do a good job", "be more proactive" - is worse than no
 * objective at all: it looks like a standard, cannot be met or missed, and the first check-in will
 * measure somebody against it anyway. The interview is better at drawing these out than a setup
 * chat is, so the bar to write one here is deliberately high and silence is the ordinary answer.
 */
const TOO_THIN = [
  'do a good job', 'work hard', 'be proactive', 'be more proactive', 'do well', 'help out',
  'be a team player', 'communicate well', 'take ownership', 'hit the ground running',
  'add value', 'make an impact', 'be reliable', 'step up', 'deliver results',
];

/**
 * The lead's framing stripped off, so the same thin sentence is caught however it is introduced.
 * "I want them to be more proactive" and "be more proactive" are one expectation.
 */
const FRAMING = /^(i (would |just )?(want|need|expect|would like)( them)?( to)?|they (should|need to|must|will)|to)\s+/i;

function theExpectationItself(text: string): string {
  return (text ?? '')
    .trim()
    .replace(FRAMING, '')
    .replace(/[.!?]+$/, '')
    .trim()
    .toLowerCase();
}

/**
 * THE LEAD'S FRAMING, STRIPPED, CASE KEPT. FIX 5, inventory item 11's say-back.
 *
 * `theExpectationItself` above exists only to compare against `TOO_THIN`, and lowercases everything
 * for that. This is the same strip, kept in the lead's own case, for the text that is actually QUOTED
 * back and SAVED - so "I want the update in by every Friday" reads as "the update in by every Friday"
 * wherever it is used, rather than depending on the model to have already dropped "I want" itself,
 * which it does inconsistently between one model call and the next (propose and confirm are two
 * separate calls - see applyContextProposal's own comment on why). Driven live: propose's own sentence
 * quoted "want the update in by every Friday" - a fragment clipped mid-clause, missing the "I " that
 * would have made "want" read as part of a full sentence - while confirm's independent extraction
 * came back "the update in by every Friday". Stripping the same framing deterministically, in code,
 * on both sides, means both calls converge on the same clean text far more often than leaving each
 * one to decide on its own where the lead's sentence actually starts.
 */
export function withoutFraming(text: string): string {
  return (text ?? '').trim().replace(FRAMING, '').trim();
}

/**
 * WHAT IS SAVED IS THE SAME TEXT THE LEAD WAS SHOWN, CHARACTER FOR CHARACTER. FIX (found live, the
 * four live checks, 30 September 2026).
 *
 * `propose` and `confirm` are two separate model calls reading the same sentence the lead typed (see
 * `applyContextProposal`'s own comment on why it re-derives rather than trusting a payload), and each
 * call is free to punctuate and capitalise its own quote however it likes. Driven live, on the same
 * turn:
 *
 *   said back: "the update in by every Friday"        saved: "the update in by every Friday." (a full
 *     stop the lead never typed, added by the confirm call alone)
 *   said back: "Every pipeline stage has an owner ..." saved: "every pipeline stage ..." (the confirm
 *     call lower-cased the first letter the propose call had capitalised)
 *
 * Neither call's own wording is trustworthy as the record, because either one can drift from the
 * other. What IS trustworthy is the sentence the lead actually typed - `said` here - so the quote is
 * located in there, case-insensitively and ignoring a trailing full stop, and the LITERAL characters
 * of `said` at that span are what is quoted back and saved, on both sides of the confirmation, every
 * time. Whichever model call finds it, the answer is the same string, because it is read off the
 * lead's own sentence and not off either call's paraphrase of it.
 *
 * A paraphrase that is not a substring of what they typed - the model tidied a few words - falls back
 * to the trimmed candidate exactly as before: this is a refinement of what is already shown, never a
 * new way to refuse it.
 */
export function verbatimQuote(candidate: string, said: string): string {
  const trimmed = (candidate ?? '').trim().replace(/[.!?]+$/, '').trim();
  if (!trimmed) return (candidate ?? '').trim();
  const source = said ?? '';
  const idx = source.toLowerCase().indexOf(trimmed.toLowerCase());
  if (idx === -1) return trimmed;
  return source.slice(idx, idx + trimmed.length);
}

/**
 * THE QUOTE IS A SUBSTRING OF WHAT THE LEAD TYPED, AND IT STARTS AFTER THEIR FRAMING. REGRESSION,
 * found live again, 30 September 2026, on the four live checks, run through both doors on the same
 * sentence: "I want the update in by every Friday." The old route said back and saved "want the
 * update in by every Friday" - "I " gone, "want" left standing as though it were the first word of
 * the expectation. Ask Groundwork, the same sentence, said back "the update in by every Friday".
 *
 * `withoutFraming` (above) strips the framing off the CANDIDATE the model returned, which only works
 * when the model's own candidate still has the framing attached whole ("I want the update..."). Read
 * live, one model call had already half-trimmed its own candidate to "want the update in by every
 * Friday" - the "I " gone but "want" kept - so `withoutFraming`'s pattern, which requires the "i" at
 * the front, never matched, and `verbatimQuote` correctly, faithfully, located that exact fragment
 * inside `said` and returned it: correct in isolation, wrong once you look at the sentence, because
 * "want" is still the lead's framing, one word short of what `withoutFraming` would have removed had
 * the model handed it over whole.
 *
 * THE FIX DOES NOT TRUST THE MODEL'S OWN BOUNDARY AT ALL. It locates the candidate inside `said` the
 * same way `verbatimQuote` always has, then checks that start against where `said` ITSELF - the one
 * sentence both calls are reading, not either call's paraphrase of it - stops being framing. A match
 * that starts inside that framing is pulled forward to just past it, keeping its end fixed, so "want
 * the update in by every Friday" (found starting two characters after "I ") becomes exactly "the
 * update in by every Friday" - the same words a match that started in the right place all along would
 * have produced. A candidate that already starts after the framing is untouched.
 */
export function verbatimExpectation(candidate: string, said: string): string {
  const stripped = withoutFraming((candidate ?? '').trim());
  const quoted = verbatimQuote(stripped, said);
  const source = said ?? '';
  const framingMatch = source.match(FRAMING);
  if (!framingMatch) return quoted;
  const framingEnd = framingMatch[0].length;
  const idx = source.toLowerCase().indexOf(quoted.toLowerCase());
  if (idx === -1 || idx >= framingEnd) return quoted;
  const end = idx + quoted.length;
  if (end <= framingEnd) return quoted;
  return source.slice(framingEnd, end);
}

/**
 * WHAT MAKES AN EXPECTATION WORTH RECORDING.
 *
 * A sentence with nothing checkable in it - "do a good job", "be more proactive" - is worse than no
 * objective at all: it looks like a standard, cannot be met or missed, and the first check-in will
 * measure somebody against it anyway.
 *
 * DELIBERATELY CRUDE, AND HONEST ABOUT IT. This cannot judge whether an expectation is any good;
 * the interview is far better at that and will push on a vague one for two attempts. Its only job
 * is to stop the obvious junk reaching the record dressed as a standard. Silence is the ordinary
 * answer and costs nothing, because the check-in draws the expectation out anyway.
 *
 * THE THIN-PHRASE LIST EARNS ITS PLACE ONLY BECAUSE OF THE STRIPPING. My first version matched the
 * whole string against it, and every phrase in the list was already too short or too few words to
 * pass the checks below - so the list was decoration, and two deliberate breakages of it changed
 * nothing. It matches the expectation with the lead's framing removed, which is what people
 * actually type.
 */
/**
 * AND A DESCRIPTION OF A PERSON IS NOT AN EXPECTATION OF THEM, WHICH THE LENGTH TEST CANNOT SEE.
 *
 * Run live the moment the context chat was allowed to hear a target whatever question was open.
 * The lead's first sentence was "Amina is struggling with the wholesale accounts and I have not
 * told her a number yet", and the proposal came back:
 *
 *   "I will record that as what you expect of Amina Yusuf: 'is struggling with the wholesale
 *    accounts'."
 *
 * Six words, checkable-looking, and it passed. It is a judgement about somebody about to be filed
 * as a standard they will then be measured against - the exact thing the private note exists for
 * and the exact thing the rule in the prompt refuses. The instruction to the extractor said not to
 * return one and it returned one anyway, which is the usual result.
 *
 * An expectation says what somebody is to DO or REACH. These say what somebody IS.
 */
/**
 * A READABLE PHRASE, NOT A CLIPPED VERB LEFT WITHOUT ITS SUBJECT. FIX (found live, the four live
 * checks, 30 September 2026, item 10): the lead typed "Ben is struggling and honestly he is
 * difficult to work with", and the private note that was kept and said back read "is struggling" -
 * a verb with nothing in front of it, meaningless read on its own days later, when what the lead
 * actually said was "Ben is struggling".
 *
 * `verbatimExpectation` correctly locates the candidate inside `said` and returns it verbatim, but a
 * candidate that starts on a bare verb ("is ...", "was ...", "should ...") is one word short of the
 * phrase the lead actually said, the same way "want the update ..." was one word short of "I want
 * the update ..." (see `verbatimExpectation`'s own comment). Where the lead's own sentence names the
 * person immediately before that verb, with nothing but whitespace between, the quote is pulled back
 * to start on their name - so the note reads "Ben is struggling", not "is struggling" - and the
 * result stays a literal substring of `said`, exactly like every other quote this file produces.
 *
 * A name that is NOT immediately before the verb (the lead named Ben earlier in a different
 * sentence, then said "he is struggling") leaves the text as it was: there is nothing here to pull
 * back to that is still a contiguous substring of what they said.
 */
const CLIPPED_VERB = /^(is|are|was|were|seems?|appears?|has been|have been|keeps|kept|should|must|will|does not|doesn't|do not|don't)\b/i;

export function readablePhrase(text: string, said: string, name: string): string {
  const trimmed = (text ?? '').trim();
  const nameLower = (name ?? '').trim().toLowerCase();
  if (!trimmed || !nameLower || !CLIPPED_VERB.test(trimmed)) return trimmed;
  const source = said ?? '';
  const idx = source.toLowerCase().indexOf(trimmed.toLowerCase());
  if (idx === -1) return trimmed;
  const before = source.slice(0, idx);
  const beforeTrimmed = before.replace(/\s+$/, '');
  if (!beforeTrimmed.toLowerCase().endsWith(nameLower)) return trimmed;
  const nameStart = beforeTrimmed.length - nameLower.length;
  /* Only the name and whitespace sit between the quote's new start and its old one - never reach
     back across an earlier word that happens to end the same way. */
  if (before.slice(nameStart + nameLower.length).trim() !== '') return trimmed;
  return source.slice(nameStart, idx + trimmed.length);
}

export function readsAsAJudgement(text: string): boolean {
  const t = ` ${(text ?? '').toLowerCase().trim()} `;
  return /\b(is|are|seems?|appears?|has been|have been|keeps|kept|was|were)\s+(really\s+|quite\s+|very\s+|a bit\s+|not\s+|never\s+)*(struggling|slipping|failing|underperforming|difficult|the problem|a problem|weak|lazy|slow|behind|disengaged|checked out|not (coping|delivering|performing|pulling)|doing (well|badly|fine|poorly)|great|excellent|strong|unreliable|reliable)\b/.test(t)
    || /\b(i (am )?(worried|concerned) about|my concern (with|about)|the issue with|the problem with|not a good fit|attitude problem)\b/.test(t);
}

export function worthRecording(text: string): boolean {
  const t = (text ?? '').trim();
  if (t.length < 15) return false;
  /* What somebody IS never becomes what somebody is held to. See readsAsAJudgement. */
  if (readsAsAJudgement(t)) return false;

  const itself = theExpectationItself(t);
  if (TOO_THIN.some((p) => itself === p)) return false;

  /* Something checkable: a number, or enough words to have named a thing. */
  return /\d/.test(t) || t.split(/\s+/).length >= 5;
}

/**
 * WHAT THE LEAD IS TOLD BEFORE ANY OF IT IS WRITTEN DOWN.
 *
 * Recording an expectation about somebody without telling the person who set it what that means is
 * how a product ends up holding a standard nobody knew they had set. It is one sentence and it goes
 * in the chat, not in a tooltip.
 */
export const WHAT_RECORDING_IT_MEANS =
  'Anything you name here is recorded as YOUR expectation, not as something agreed. It is marked as '
  + 'not yet seen by them, so nothing in the record will hold them to it until they have read it - '
  + 'and their first check-in asks what they understood, in their own words, before it shows them '
  + 'yours. Where the two differ, that difference is the finding.';
