import { readFileSync } from 'fs';
import { join } from 'path';
import { proposalFrom, extractionToolFor, CADENCES } from './what-the-context-chat-heard';

/**
 * THE CONTEXT CHAT COULD NOT CLOSE ANYTHING IT OPENED. Stage 3.
 *
 * G37/G23 was on the remaining list as "genuinely not built". It was built - service, route, API
 * client, component, mounted on the Context tab behind CONTEXT_ENABLED. I had read the plan's own
 * sentence saying it was not, and not the code. Sixth time in this file's history that something
 * listed as missing turned out to exist.
 *
 * What was actually missing is the half that makes it work. `contextChat` asked "how long should this
 * run?", the lead answered, and NOTHING WAS WRITTEN - not one prisma call in the whole path. The gap
 * stayed open, so the next turn asked again. The component even told them "nothing is saved until you
 * say so" and gave them no way to say so.
 *
 * Which is the original defect moved one screen along: the ground made from one sentence stays a
 * ground made from one sentence, only now it has been asked about.
 */
const SERVICE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
const CODE = SERVICE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('what it heard', () => {
  it('a length it can use becomes a proposal', () => {
    const p = proposalFrom('timeline', { timelineDays: 84 });
    expect(p.kind).toBe('timeline');
    expect(p.kind === 'timeline' && p.days).toBe(84);
    expect(p.kind === 'timeline' && p.say).toBe('I will set this to run for 12 weeks.');
  });

  it('a length nobody would choose is refused, not clamped', () => {
    /**
     * THE RULE THAT MATTERS MOST HERE. A silent clamp to the nearest legal value is a ground quietly
     * running for a length nobody chose - and the lead would have no way to know, because the chat
     * would have said yes.
     */
    for (const days of [0, 3, 5000]) {
      const p = proposalFrom('timeline', { timelineDays: days });
      expect(p.kind).toBe('none');
      expect(p.kind === 'none' && p.why).toMatch(/outside what a ground can run for|No length/);
    }
  });

  it('a cadence outside the schema is refused rather than guessed at', () => {
    expect(proposalFrom('cadence', { cadence: 'twice a week' }).kind).toBe('none');
    expect(proposalFrom('cadence', { cadence: 'weekly' }).kind).toBe('cadence');
  });

  it('every cadence the schema allows is accepted', () => {
    // Otherwise a legal value gets refused and the lead is stuck answering a question forever.
    for (const c of CADENCES) expect(proposalFrom('cadence', { cadence: c }).kind).toBe('cadence');
  });

  it('a shrug is not a statement of what doing well looks like', () => {
    expect(proposalFrom('success', { success: 'good' }).kind).toBe('none');
    expect(proposalFrom('success', { success: 'He can take a messy client problem end to end without me' }).kind).toBe('success');
  });

  it('nothing is proposed when no question is open', () => {
    expect(proposalFrom(null, { timelineDays: 84 }).kind).toBe('none');
  });

  it('and the gaps that have their own screen are not written from a chat', () => {
    /**
     * Adding a person, setting an objective and sharing a document each have consequences the chat
     * cannot own: an invite email, a visible objective, a file everybody can read. They are asked
     * about and deliberately not writable here.
     */
    for (const gap of ['parties', 'objectives', 'documents']) {
      expect(proposalFrom(gap, { timelineDays: 84, cadence: 'WEEKLY', success: 'a long enough statement here' }).kind).toBe('none');
    }
  });
});

describe('what the model can reach', () => {
  it('only the field the question was about', () => {
    // An answer to "how long" must not be able to change the cadence, even if they mention it.
    expect(Object.keys(extractionToolFor('timeline').input_schema.properties)).toEqual(['runsUntilEnded', 'timelineDays']); // request 37: "until I end it" is also an answer to how long
    expect(Object.keys(extractionToolFor('cadence').input_schema.properties)).toEqual(['cadence']);
    expect(Object.keys(extractionToolFor('success').input_schema.properties)).toEqual(['success']);
  });

  it('and it is told not to fill in a sensible default', () => {
    // The failure mode of extraction is a helpful model inventing the answer it expected.
    expect(extractionToolFor('timeline').description).toMatch(/Never infer, never fill in a sensible default/);
  });
});

describe('and the service writes only after a yes', () => {
  it('the chat returns a proposal rather than changing anything', () => {
    /* To the first helper rather than to the next public method: the helpers between them include
       the one write a confirmed change makes, which is called from the confirmation and never here. */
    const chat = CODE.slice(CODE.indexOf('async contextChat('), CODE.indexOf('private async whatThisCheckInAlreadyHolds('));
    expect(chat).toMatch(/proposal: proposal\.kind === 'none' \? null :/);
    // The whole bug: not one write in this path. It must stay that way.
    expect(chat).not.toMatch(/prisma\.\w+\.(update|create)/);
  });

  it('the confirmation re-derives the change from the lead\'s own words', () => {
    /**
     * An endpoint that accepts `timelineDays` from the client is an edit endpoint with a
     * confirmation-shaped name. It takes what they said and reads it again.
     */
    /* To the end of the method, not a character count: the method grew past 3,000 characters on
       22 September 2026 and the pin silently stopped covering the line it names. */
    const apply = CODE.slice(CODE.indexOf('async applyContextProposal('), CODE.indexOf('private async writeWhatThePasteGave('));
    /* `history` joined `said` so a pronoun can be resolved - "give her 3,000 units" names nobody on
       its own, and the target was being lost. What the rule is really about is unchanged and is
       what is checked: sentences go in, no id and no value. */
    /* Week 20: `offerId` (which question was put to the lead, never a value) and `leave` (a flag: the
       days are read again from `said`) joined them. Still no value from the client, which the next line pins. */
    expect(apply).toMatch(/dto: \{ said: string; history\?: \{ role: 'user' \| 'assistant'; content: string \}\[\]; offerId\?: string; leave\?: boolean \}/);
    expect(apply).not.toMatch(/dto\.(timelineDays|cadence|participantId|target)\b/);
    expect(apply).toMatch(/extractionToolFor\(openGap\)/);
    /*
     * The parties are passed as well now, so a name in an answer can be matched to a real person,
     * and `dto.said` is passed too - not a value the client asked to be saved, but the lead's own
     * sentence, so a quoted proposal can be locked to its literal characters rather than to either
     * extraction call's own paraphrase of them (see `verbatimQuote`, found live: the same sentence
     * read twice - once to propose, once to confirm - came back with a full stop added on one call
     * and a capital letter dropped on the other, so what was saved did not match what was shown).
     * The invariant this asserts is unchanged: the proposal is re-derived from the words, never
     * taken from a payload.
     */
    expect(apply).toMatch(/proposalFrom\(openGap, heard \?\? \{\}, parties, dto\.said\)/);
    expect(apply).toMatch(/const parties = await this\.partiesForMatching\(groundId\)/);
  });

  /**
   * DECISION 63, 30 September 2026: still checked again on the write, not only on the read - now
   * through `mayConfirmSetupOn`, which lets the lead through on `checkIn.initiatorId === requestingUserId`
   * (the same comparison this used to make directly) and, only once the lead has left the
   * organisation, an admin standing in for them.
   */
  it('and it is the lead\'s, checked again on the write and not only on the read', () => {
    const apply = CODE.slice(CODE.indexOf('async applyContextProposal('), CODE.indexOf('async applyContextProposal(') + 1400);
    expect(apply).toMatch(/this\.mayConfirmSetupOn\(ground, requestingUserId\)/);
  });

  it('the timeline change goes through updateTimeline, not straight at the column', () => {
    /**
     * `updateTimeline` owns the rules about changing a running ground's length and appends to the
     * audit log every party can now read (W14-3). A second path to the same column is a second set
     * of rules, and the audit trail would have a hole exactly where a chat changed something.
     */
    const apply = CODE.slice(CODE.indexOf('async applyContextProposal('));
    expect(apply).toMatch(/this\.updateTimeline\(groundId, requestingUserId, \{ timelineDays:/);
    expect(apply).toMatch(/this\.updateTimeline\(groundId, requestingUserId, \{ cadence:/);
  });
});

describe('and the panel has the yes it always promised', () => {
  const PANEL = readFileSync(
    join(__dirname, '../../../../client/src/components/gw/ContextChat.tsx'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('still says nothing is written until you say so', () => {
    /*
     * The sentence was there before the mechanism, and it is still true. What went with it on
     * 22 September 2026 was the half that was not: "nothing here reaches a report". Everything in
     * this conversation guides the check-ins and the coaching, which is what it is for.
     */
    expect(PANEL).toMatch(/[Nn]othing is written until you say so/);
    expect(PANEL).not.toMatch(/Nothing here reaches a report/);
    expect(PANEL).toMatch(/guides the check-ins/);
  });

  it('and now there is a way to say it', () => {
    expect(PANEL).toMatch(/Yes, set it/);
    expect(PANEL).toMatch(/confirm\.mutate\(\)/);
  });

  it('which says what will change before it changes', () => {
    // A confirm button whose effect you have to guess is not a confirmation.
    expect(PANEL).toMatch(/\{proposal\.say\}/);
  });

  it('and sends their words, not a value', () => {
    /* The conversation goes too, so the server can resolve a pronoun - "give her 3,000 units by
       December" names nobody on its own and the target was being dropped. Sentences only: no id
       and no value crosses. */
    expect(PANEL).toMatch(/confirmContext\(groundId, proposal!\.said, history\)/);
  });

  it('with a way to say no that is not just closing the panel', () => {
    expect(PANEL).toMatch(/Not that/);
  });
});

describe('the question this whole feature exists to ask', () => {
  /**
   * IT HAD NEVER BEEN ASKED ONCE. Found while trying to test the refusal path: I went to null a
   * ground's `timeline_days` to open the duration gap, and the database refused - the column is
   * NOT NULL, and `cadence` has a default of FORTNIGHTLY.
   *
   * So every ground has both from the moment it exists: chosen by the lead if they said, and set by
   * `DEFAULT_TIMELINE_DAYS[scenario]` if they did not. `contextGaps` asks about duration when
   * `timelineDays` is ABSENT. It is never absent.
   *
   * G37's defect, in its own words: "a real Ground 1 run produced a ninety-day ground from a single
   * answer with no duration, no rhythm and no sense of who was involved." The duration was not
   * missing. It was GUESSED. And the feature built to catch that was watching for a null the schema
   * does not permit, so the two gaps the defect was actually about could never fire.
   */
  it('the ground records whether the lead chose the pacing or we did', () => {
    const SCHEMA = readFileSync(join(__dirname, '../../../prisma/schema.prisma'), 'utf8');
    /**
     * WHITESPACE-TOLERANT, because it was not before and a formatter broke it.
     *
     * These patterns matched the exact spacing the fields happened to have, including a literal
     * double space in the second one. `prisma format` aligns the columns of a block whenever any
     * field in it changes name length - so adding an unrelated field elsewhere in the model
     * re-indents these two and this test fails, having found nothing wrong.
     *
     * What it is actually for is that the two flags exist and default to false, so that is what it
     * now asserts.
     */
    expect(SCHEMA).toMatch(/timelineStated\s+Boolean\s+@default\(false\)/);
    expect(SCHEMA).toMatch(/cadenceStated\s+Boolean\s+@default\(false\)/);
  });

  it('and both create paths record which it was', () => {
    // `dto.timelineDays != null` is the whole distinction: they said, or we filled it in.
    /* U.6 review: the length now goes through howLongItRuns(dto), which still takes what they said
       first, then the end they chose, then the default; and a chosen end also counts as stated. */
    const creates = CODE.split('timelineDays: howLongItRuns(dto),');
    expect(creates.length).toBe(3); // two call sites, so two splits
    for (const after of creates.slice(1)) {
      expect(after.slice(0, 420)).toMatch(/timelineStated: dto\.runsUntilEnded === true \|\| dto\.timelineDays != null/); // request 37: until-ended also counts as stated
      expect(after.slice(0, 420)).toMatch(/cadenceStated: dto\.cadence != null/);
    }
  });

  it('the gap reader is given "nobody chose this" rather than the raw value', () => {
    /**
     * THE FIX ITSELF. Passing `ground.timelineDays` made the question unaskable; passing null when
     * it was never stated is what makes it askable.
     */
    expect(CODE).toMatch(/timelineDays: ground\.timelineStated \? ground\.timelineDays : null/);
    expect(CODE).toMatch(/cadence: ground\.cadenceStated \? ground\.cadence : null/);
  });

  it('and stating it through updateTimeline marks it stated', () => {
    // Otherwise the chat would keep offering to set a length the lead had just set.
    expect(CODE).toMatch(/timelineDays: requestedDays,\s*\n\s*timelineWeeks: goesOnUntilEnded \? null : Math\.max\(1, Math\.round\(requestedDays \/ 7\)\),\s*\n\s*runsUntilEnded: goesOnUntilEnded,\s*\n\s*timelineStated: true/);
    expect(CODE).toMatch(/cadence: dto\.cadence as Cadence, cadenceStated: true/);
  });

  it('existing grounds default to not stated, which is the honest reading', () => {
    /**
     * Every row written before this column was running on a default it never chose. Defaulting to
     * false means the chat offers to fix exactly those, rather than assuming a guess was a decision.
     */
    const MIGRATION = readFileSync(
      join(__dirname, '../../../prisma/migrations/20260813120000_lead_stated_the_pacing/migration.sql'),
      'utf8',
    );
    expect(MIGRATION).toMatch(/"timeline_stated" BOOLEAN NOT NULL DEFAULT false/);
    expect(MIGRATION).toMatch(/"cadence_stated" BOOLEAN NOT NULL DEFAULT false/);
  });
});
