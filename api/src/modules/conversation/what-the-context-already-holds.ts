/**
 * WHAT THE LEAD ALREADY WROTE DOWN, IN THE CONVERSATION THAT ASKS ABOUT IT.
 *
 * Hafsah, 22 September 2026, after watching a quarter's worth of context land on the Context page:
 * "make sure it is used as context in the conversations." Until now the only parts of it a check-in
 * could see were the targets and the person's own expectation. The actions people said they would
 * take, the questions the lead wanted asked, what sits between two people, what the lead has said
 * explicitly is not settled - all of it sat on a page nobody reads mid-conversation.
 *
 * FOUR RULES, AND THEY ARE THE POINT.
 *
 * 1. An action is asked about, never asserted. "You said you would send the Client B proposal" is
 *    fine; "you have not sent it" is not. Nothing here carries a status, because nothing knows one.
 * 2. What is not settled is a reason to ask, never a correction. Where somebody states as fact
 *    something the record says is unknown, the conversation asks how they know - it does not tell
 *    them they are wrong, and it does not quietly overwrite the record either.
 * 3. The lead's read of a person is not here at all. It used to reach that person's own session as
 *    "a place to look", kept from them only by an instruction. Decision 32, 27 September 2026: a
 *    lead's private notes about a person never reach the model in that person's own session, so
 *    the conversation service does not read them in the first place.
 * 4. A question the lead wants asked is asked word for word, once, when it fits - and only once the
 *    lead has confirmed that exact sentence. Decision 34, 28 September 2026: it used to be "asked in
 *    the interviewer's own words", which meant nobody had read what the person was actually asked.
 *    See grounds/a-question-asked-word-for-word.
 */

export interface ACommitmentOnRecord {
  /** The action, in the words it was written in. */
  text: string;
  /** The timing as it was said, never a parsed date. */
  when?: string | null;
  /** True where the person said it themselves; false where the lead said it needs doing. */
  explicit?: boolean;
  /** Whose it is, for the lead's own view of everybody else's. Absent in the person's own block. */
  who?: string | null;
}

/** What this person is down as doing, put to them as a question and never as a finding. */
export function whatTheySaidTheyWouldDo(rows: ACommitmentOnRecord[]): string {
  const theirs = (rows ?? []).filter((r) => r?.text?.trim());
  if (!theirs.length) return '';
  return [
    'WHAT THEY ARE DOWN AS DOING. Nobody has said whether any of it happened, and you do not know either.',
    ...theirs.map((r) => `- ${r.text.trim()}${r.when ? ` (said: ${r.when.trim()})` : ''}${r.explicit === false ? ' - the person running this check-in said this needs doing; they may never have agreed to it' : ''}`),
    'Ask what happened to the ones that matter this session, one at a time, in your own words. Never state that something is done, late or dropped - you do not know. Where they say it is done, ask what shows it.',
  ].join('\n');
}

/** Things nobody owns, for the lead's own check-in only: a question about ownership, not a chase. */
export function thingsNobodyOwns(actions: string[]): string {
  const rows = (actions ?? []).map((a) => (a ?? '').trim()).filter(Boolean);
  if (!rows.length) return '';
  return [
    `${rows.length === 1 ? 'ONE THING HAS' : `${rows.length} THINGS HAVE`} NO OWNER on this check-in:`,
    ...rows.slice(0, 8).map((r) => `- ${r}`),
    'These came from what the lead wrote and nobody\'s name was on them. Ask who owns one or two of them - the ones that look most likely to stall. Never assign them to anybody yourself.',
  ].join('\n');
}

/** What the lead has said is not settled, as a reason to ask rather than a correction. */
export function whatIsNotSettled(lines: string[]): string {
  const rows = (lines ?? []).map((l) => (l ?? '').trim()).filter(Boolean);
  if (!rows.length) return '';
  return [
    'WHAT IS NOT SETTLED. The person running this check-in wrote these down as unknown or disputed:',
    ...rows.slice(0, 12).map((r) => `- ${r}`),
    'If this person states one of them as settled fact, do not correct them and do not accept it either: ask how they know, or when it happened, or who confirmed it. If they hedge it ("I think", "probably", "not sure"), keep the hedge in what you say back. Never tell them the record says otherwise.',
  ].join('\n');
}

/**
 * The questions the lead confirmed for this person, each as the exact sentence to ask. Only confirmed
 * sentences are ever passed here - the caller reads nothing else - and one already asked in this
 * check-in is left out by the caller too, so it is never asked twice.
 */
export function theQuestionsTheLeadWants(confirmed: string[]): string {
  const rows = (confirmed ?? []).map((q) => (q ?? '').trim()).filter(Boolean);
  if (!rows.length) return '';
  return [
    `${rows.length === 1 ? 'A QUESTION' : 'QUESTIONS'} TO ASK THIS PERSON, WORD FOR WORD. Each one was confirmed exactly as it is written here:`,
    ...rows.slice(0, 5).map((r) => `- "${r}"`),
    'Ask each one exactly as it is written, word for word, as a sentence of its own, once, at the point where it fits what is being discussed. Do not change its words and do not add to it. Never say who wants it asked, and never read them out as a list.',
  ].join('\n');
}

/** Something between this person and somebody else. A place to look, never a claim about either. */
export function whatSitsBetweenPeople(lines: string[]): string {
  const rows = (lines ?? []).map((l) => (l ?? '').trim()).filter(Boolean);
  if (!rows.length) return '';
  return [
    'SOMETHING THAT SITS BETWEEN TWO PEOPLE, as the person running this check-in reads it. It is one person\'s account of a thing involving two, so it is not a fact about either of them:',
    ...rows.slice(0, 6).map((r) => `- ${r}`),
    'Use it to ask about the work: what was promised, what was agreed, what each side understood. Never quote it, never say who wrote it, and never put it to this person as something they did wrong.',
  ].join('\n');
}

/*
 * A HEDGE STAYS A HEDGE.
 *
 * Read live, 22 September 2026. The record said Amina's proposal for Client B was "not sure if sent".
 * She said "The proposal, I think it went out last week." The next line of the conversation was "The
 * proposal is out, but that is not yet a closed sale" - a thing nobody knows, said back to her as
 * settled, one turn after she said she was not sure.
 *
 * Both directions are wrong. Telling her she is wrong would be worse. What is right is to keep the
 * words she chose, and to ask what would settle it.
 */
const A_HEDGE = /\b(i think|i believe|pretty sure|not (?:totally |entirely |100% )?sure|unsure|maybe|probably|possibly|i guess|i assume|as far as i know|afaik|might have|may have|should have|i hope|apparently|supposedly|i was told|somebody said|last i (?:heard|checked)|i have not checked|i think so)\b/i;

/** The sentences of their message that are hedged, in their own words. */
export function whatTheyHedged(message: string | null | undefined): string[] {
  const text = (message ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+|(?:,\s*(?=but\b))/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8 && A_HEDGE.test(s))
    .slice(0, 3);
}

/** Sent only on the turn they hedge, after everything else. */
export function keepTheirHedge(hedged: string[]): string {
  const rows = (hedged ?? []).filter((h) => h?.trim());
  if (!rows.length) return '';
  return [
    'AND RIGHT NOW: they hedged. These are their words, and they are not sure of them:',
    ...rows.map((r) => `- "${r}"`),
    'Do not repeat any of it back as settled. Keep their hedge in your own sentence ("you think it went out"), or ask the one thing that would settle it - who would know, what would show it, when they could check. Never tell them what the record says instead.',
  ].join('\n');
}

/**
 * HOW THIS TEAM SAYS IT SELLS AND WORKS, in the session that is asking about the work.
 *
 * The strategy and the rules are the two buckets a person answering benefits from most: somebody
 * explaining a stalled deal should be asked about it against "no proposal before qualification", not
 * in the abstract. Shared by design - these are about the work, not about anybody.
 */
export function howThisTeamWorks(lines: string[]): string {
  const rows = (lines ?? []).map((l) => (l ?? '').trim()).filter(Boolean);
  if (!rows.length) return '';
  return [
    'HOW THIS TEAM SAYS IT SELLS AND WORKS. The person running this check-in wrote these down, and everybody here can read them:',
    ...rows.slice(0, 14).map((r) => `- ${r}`),
    'Use them to ask about the work as this team actually does it. They are what the lead wrote, not something everybody has agreed, so never tell somebody they broke a rule - ask what happened.',
  ].join('\n');
}
