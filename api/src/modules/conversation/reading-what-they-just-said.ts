/**
 * READING WHAT THEY JUST SAID INTO WHAT WE HAVE.
 *
 * One extraction per answer, against the claims already held, so a later turn SHARPENS a claim
 * rather than adding a second one: "increase their incomes by 30%" then "sales records" is one
 * target that now has a verification, not two findings.
 *
 * WHY THIS IS NOT THE RECORD EXTRACTOR. `extractRecordEntries` runs once at the end of a session
 * and produces what the report quotes - typed lines, traceable to their words, for people to read.
 * This runs every turn and produces what the CONVERSATION reasons with: the same claim, carried
 * forward, with the fields that make it checkable filled in as they arrive. One is an artefact; the
 * other is working memory. Trying to serve both from one call is how the report ended up full of
 * fragments.
 *
 * WHY IT RUNS AFTER THE REPLY. It costs a model call, and a person waiting for an answer should not
 * pay for it. The state is therefore one turn behind when the next reply is composed, which is
 * exactly right: what it feeds is a challenge about accumulated claims, not a comment on the word
 * just typed. Same arrangement as the document reads - see readTheRestOfIt.
 *
 * WHAT IT IS FORBIDDEN TO DO. Invent a field. A number nobody gave, a date nobody gave, an owner
 * nobody named - each of those would become a challenge asserting something false, or worse, a hole
 * silently filled so nobody is ever asked about it. Omission is always the correct answer.
 */

export const READ_THIS_TURN = [
  'You are keeping working notes on one conversation about somebody\'s work. You are given the notes so far and the single thing the person just said.',
  '',
  'Return only what THIS answer adds, and put it in one of TWO places:',
  '  opens    - things they are telling you about for the first time. Each gets a new short id.',
  '  sharpens - fields added to a claim ALREADY in the notes, by its id. Never its words.',
  '',
  'Most answers do one or the other. Some do both. An answer that names a different subject from every claim in the notes belongs in `opens`, however short it is - "increase their incomes by 30%" is a target even when it arrives as the answer to a question about volumes.',
  'Nothing goes in `sharpens` unless the notes already hold that exact claim and this answer is about THAT claim. If you are unsure, it opens a new one: two claims that turn out to be one is a small problem, and one claim holding three different subjects is a ruined record.',
  '',
  'A claim is one thing they are telling you. Its kind is:',
  '  TARGET  - something they are trying to reach ("increase their incomes by 30%", "fifteen meetings a month")',
  '  PLAN    - something they intend to do ("open in Kano", "recruit forty agents")',
  '  FACT    - something that is or was the case ("we process 200 tonnes a day", "three aggregators defaulted")',
  '  OPINION - what they think ("the roads decide the business"). Never given fields. Never challenged.',
  '',
  'An owner is a person, a role or an organisation. "I" is not an owner - leave it out; the notes already know whose check-in this is.',
  '',
  'THE FIELDS, AND EVERY ONE OF THEM IS OPTIONAL:',
  '  measure       what goes up or down: income, signed sales, meetings, tonnes',
  '  number        the figure as they gave it: 30%, 30,000, 4,000MT',
  '  baseline      what it is a change FROM, only where they said it',
  '  verification  how they would know: sales records, the weighbridge, a survey',
  '  owner         who does it - a person, a role or an organisation',
  '  date          by when',
  '  place         a state, a market, a corridor',
  '',
  'NEVER INVENT A FIELD. If they did not say the baseline, leave it out - do not reason one from the number. If they did not name an owner, leave it out - do not assume it is them. An omitted field is a true answer and the conversation is built on knowing what is missing; a guessed one makes the notes say something nobody said.',
  '',
  'ALSO RETURN, only where this answer says it:',
  '  who           their name, their role, the organisation they answer for',
  '  contradiction two claim ids that cannot both hold, and why in one clause',
  '  fills         the ids of any FIELDS, from the list you are given, that this answer gives a real',
  '                value for - and separately the ids of any they were asked for and said they do',
  '                not know, do not do, or have no way to. That second one is an answer, not a blank:',
  '                somebody with no way to check a new supplier has told you the most useful thing',
  '                in the conversation.',
  '  covered       the ids of any subjects, from the list you are given, that this answer says',
  '                something about. Judge it by what the answer MEANS, not by whether it repeats the',
  '                subject\'s wording: "Niger and Kogi" covers the states they want to expand into,',
  '                and "about two thousand tonnes a quarter" covers the volumes they move. An answer',
  '                usually covers one subject and sometimes two. Where it covers none, return none -',
  '                a subject wrongly marked covered is a question nobody is ever asked.',
  '',
  'If this answer adds nothing - a greeting, a remark about the conversation, a refusal - return no claims at all.',
].join('\n');

export const READ_THIS_TURN_SCHEMA = {
  name: 'note_what_they_said',
  description: 'What this one answer adds to the working notes on this conversation.',
  input_schema: {
    type: 'object',
    properties: {
      opens: {
        type: 'array',
        description: 'Claims this answer states for the first time. New id each. Empty where it adds nothing new.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The id from the notes where this sharpens one, otherwise a short new one.' },
            kind: { type: 'string', enum: ['TARGET', 'PLAN', 'FACT', 'OPINION'] },
            said: { type: 'string', description: 'Their words for it, trimmed. Never your paraphrase.' },
            measure: { type: 'string' },
            number: { type: 'string' },
            baseline: { type: 'string' },
            verification: { type: 'string' },
            owner: { type: 'string' },
            date: { type: 'string' },
            place: { type: 'string' },
          },
          required: ['id', 'kind', 'said'],
        },
      },
      sharpens: {
        type: 'array',
        description: 'Fields added to claims the notes already hold. The id must be one from the notes. Never include `said`.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'An id from the notes, exactly as written there.' },
            measure: { type: 'string' },
            number: { type: 'string' },
            baseline: { type: 'string' },
            verification: { type: 'string' },
            owner: { type: 'string' },
            date: { type: 'string' },
            place: { type: 'string' },
          },
          required: ['id'],
        },
      },
      who: {
        type: 'object',
        description: 'Only where this answer says it.',
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          organisation: { type: 'string' },
        },
      },
      fills: {
        type: 'array',
        description: 'Field ids this answer gives a real value for.',
        items: { type: 'string' },
      },
      cannotSay: {
        type: 'array',
        description: 'Field ids they were asked for and said they cannot answer. An answer, not a blank.',
        items: { type: 'string' },
      },
      covered: {
        type: 'array',
        description: 'Ids of the subjects this answer says something about, from the list given. Empty where it says nothing about any of them.',
        items: { type: 'string' },
      },
      contradiction: {
        type: 'object',
        description: 'Only where two claims cannot both hold.',
        properties: {
          between: { type: 'array', items: { type: 'string' }, description: 'Exactly two claim ids.' },
          why: { type: 'string' },
        },
        required: ['between', 'why'],
      },
    },
    required: ['opens'],
  },
} as const;

/** The notes as the model is shown them: compact, and only the fields that are filled. */
export function theNotesSoFar(state: { claims: any[]; who?: any }): string {
  if (!state.claims.length && !state.who) return 'The notes are empty. This is the first thing they have said.';
  const lines = state.claims.map((c) => {
    const has = (['measure', 'number', 'baseline', 'verification', 'owner', 'date', 'place'] as const)
      .filter((k) => c[k]).map((k) => `${k}=${c[k]}`);
    return `- ${c.id} (${c.kind}) "${c.said}"${has.length ? ` [${has.join(', ')}]` : ''}`;
  });
  const who = state.who && (state.who.name || state.who.role || state.who.organisation)
    ? `\nWho they are: ${[state.who.name, state.who.role, state.who.organisation].filter(Boolean).join(' · ')}`
    : '';
  return `THE NOTES SO FAR:\n${lines.join('\n')}${who}`;
}

/**
 * THE SUBJECTS AS THE MODEL IS SHOWN THEM, so it can say which one an answer covered.
 *
 * There is a deterministic coverage check too - the subject's own words against their answers - and
 * it is not enough on its own: she was asked which states, answered "Niger and Kogi", and was asked
 * which states again four turns later, because an answer names the place rather than the category.
 * Reading it is the model's job; what the reading is allowed to DO is the product's. See
 * the-ground-the-brief-asks-us-to-cover.
 */
/**
 * THE FIELDS AS THE MODEL IS SHOWN THEM, so it can say which one an answer filled.
 *
 * With the ones already given marked, because the read is about what THIS answer adds - and because
 * a model handed a list of ten fields and no idea which are done will helpfully re-report all of
 * them, which would mark a conversation complete on its second turn.
 */
export function theFieldsToJudgeAgainst(
  fields: { id: string; asks: string; oneOf?: string[] }[] | null | undefined,
  already: { filled?: string[]; cannotSay?: string[] } | null | undefined,
): string {
  const list = (fields ?? []).filter((f) => f?.id && f?.asks);
  if (!list.length) return '';
  const filled = new Set(already?.filled ?? []);
  const ruledOut = new Set(already?.cannotSay ?? []);
  return [
    'THE FIELDS EVERY ANSWER TO THIS CHECK-IN HAS TO HOLD, and their ids for `fills` and `cannotSay`:',
    ...list.map((f) => {
      const state = filled.has(f.id) ? ' [already given]' : ruledOut.has(f.id) ? ' [they said they cannot]' : '';
      return `- ${f.id}: ${f.asks}${state}`;
    }),
    'Report a field only where THIS answer is what gives it. Do not repeat one already marked given.',
  ].join('\n');
}

export function theSubjectsToJudgeAgainst(subjects: { id: string; subject: string }[] | null | undefined): string {
  const list = (subjects ?? []).filter((s) => s?.id && s?.subject);
  if (!list.length) return '';
  return [
    'THE SUBJECTS THIS CHECK-IN IS FOR, and their ids for `covered`:',
    ...list.map((s) => `- ${s.id}: ${s.subject}`),
  ].join('\n');
}
