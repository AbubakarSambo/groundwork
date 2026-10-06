import * as fs from 'fs';
import * as path from 'path';
import { whatTheyMeant, whatWillChange, whichOneDoYouMean, changeAnswersThisTurn, A_CHANGE_PROMPT, A_CHANGE_SCHEMA, type AThingOnRecord } from './what-the-lead-wants-changed';
import { theLinesFor, ABOUT_SOMEBODY, mayBeShared, THE_BUCKETS } from './what-this-check-in-knows';

/**
 * "THE CHAT DOESNT SEEM TO FLOW LIKE A CONVERSATION TO HELP YOU WITH THESE THINGS."
 *
 * Hafsah, 22 September 2026, looking at a Context page she wanted to change. The chat only ever
 * worked out what was MISSING, so a lead who disagreed with a line on the page was answered with the
 * next gap question.
 */
describe('what the lead wants changed', () => {
  const things: AThingOnRecord[] = [
    { id: 'l1', what: 'line', text: 'No reply in 30 days means the deal is dead unless there is a reason' },
    { id: 'l2', what: 'line', text: 'Follow up 48 hours after a demo' },
    { id: 't1', what: 'target', text: 'signed sales', number: 12_000_000 },
    { id: 't2', what: 'target', text: 'qualified pipeline', number: 3_000_000 },
    { id: 'a1', what: 'action', text: 'Someone senior to call Client C', who: null },
  ];

  it('finds the line by the words they used for it', () => {
    expect(whatTheyMeant('the 30 days rule', things).map((t) => t.id)).toEqual(['l1']);
    expect(whatTheyMeant('the 48 hour follow up', things)[0]?.id).toBe('l2');
  });

  it('and a target by its number as a person writes it', () => {
    expect(whatTheyMeant('the 12m', things)[0]?.id).toBe('t1');
  });

  it('a one-word target, named the way a person names it', () => {
    /* "the margin target" is the row called "margin": the bucket word says which kind, and counting
       it as part of the name matched nothing at all. */
    const rows: AThingOnRecord[] = [
      { id: 'm1', what: 'target', text: 'margin', number: 55 },
      { id: 'n1', what: 'line', kind: 'NOTE', text: 'Morale is okay but there are concerns about Q4' },
    ];
    expect(whatTheyMeant('the margin target', rows, 'we are dropping the margin target').map((t) => t.id)).toEqual(['m1']);
  });

  it('finds an action by what it is about', () => {
    expect(whatTheyMeant('Client C', things)[0]?.id).toBe('a1');
  });

  it('and finds nothing rather than the nearest thing', () => {
    expect(whatTheyMeant('the thing about Kaduna', things)).toEqual([]);
    expect(whatTheyMeant('', things)).toEqual([]);
  });

  it('a near-quotation is not an ambiguity', () => {
    const rows: AThingOnRecord[] = [
      { id: 'l1', what: 'line', kind: 'WAY_OF_WORKING', text: 'An opportunity is dead after 30 days with no reply' },
      { id: 'd1', what: 'line', kind: 'DECISION', text: "Whether the 30-day 'no reply' rule is official" },
    ];
    expect(whatTheyMeant('drop the line that says an opportunity is dead after 30 days with no reply', rows).map((t) => t.id)).toEqual(['l1']);
    /*
     * And the bucket they name picks between two rows about the same rule - from their whole
     * sentence, because the phrase the read pulls out is short and drops the word: "mark the
     * decision about the 30-day rule" arrives here as "the 30-day rule".
     */
    expect(whatTheyMeant('the 30-day rule', rows, 'mark the decision about the 30-day rule as settled').map((t) => t.id)).toEqual(['d1']);
    expect(whatTheyMeant('the 30-day rule', rows, 'drop the rule about opportunities being dead after 30 days').map((t) => t.id)).toEqual(['l1']);
    /* The word "rule" in the phrase itself does the same job, with or without the sentence. */
    expect(whatTheyMeant('the 30-day rule', rows).map((t) => t.id)).toEqual(['l1']);
    /* And where they name no bucket at all, two rows about one thing is still a question. */
    expect(whatTheyMeant('the 30 days thing', rows).length).toBe(2);
  });

  it('two matches is a question, not a coin toss', () => {
    const both = whatTheyMeant('pipeline', [
      { id: 'x', what: 'target', text: 'qualified pipeline', number: 3_000_000 },
      { id: 'y', what: 'line', text: 'A pipeline meeting is for decisions, not for reading a spreadsheet' },
    ]);
    expect(both.length).toBe(2);
    const asked = whichOneDoYouMean('pipeline', both);
    expect(asked).toContain('Which one?');
    expect(asked).toContain('qualified pipeline');
  });

  it('says what it cannot find, rather than doing nothing', () => {
    expect(whichOneDoYouMean('the Kaduna rule', [])).toContain('I cannot find "the Kaduna rule" on this check-in');
  });

  it('says exactly what will change before anything changes', () => {
    expect(whatWillChange('drop', things[0])).toContain('take "No reply in 30 days');
    expect(whatWillChange('drop', things[0])).toContain('stays on the record');
    expect(whatWillChange('settle', things[0])).toContain('as settled');
    expect(whatWillChange('reword', things[2], { newText: 'signed revenue' })).toContain('to "signed revenue"');
    expect(whatWillChange('assign', things[4], { toPerson: 'Hassan' })).toContain('down as Hassan');
    for (const intent of ['drop', 'settle', 'reword', 'assign'] as const) {
      expect(whatWillChange(intent, things[0], { newText: 'x', toPerson: 'y' })).toMatch(/Do that\?$/);
    }
  });

  it('the read is told that adding something new is not a change', () => {
    expect(A_CHANGE_PROMPT).toContain('A new rule, a new target or a new job is not a change');
    expect((A_CHANGE_SCHEMA as any).input_schema.properties.intent.enum).toEqual(['drop', 'reword', 'assign', 'settle', 'none']);
  });

  it('and the chat proposes it while only the confirmation writes it', () => {
    const src = fs.readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const chat = src.slice(src.indexOf('async contextChat('), src.indexOf('private async whatThisCheckInAlreadyHolds('));
    expect(chat).toContain('await this.whatTheyWantChanged(groundId, lastFromLead)');
    expect(chat).not.toContain('makeTheChange');
    const apply = src.slice(src.indexOf('async applyContextProposal('), src.indexOf('private async writeWhatThePasteGave('));
    /* Decision 63: also carries who confirmed it, when it was an admin standing in for the lead. */
    expect(apply).toContain('await this.makeTheChange(theirChange.apply, confirmedByAdminNote)');
    /* And a yes to what was proposed a turn ago, because that is how a lead answers a question. */
    expect(apply).toContain('const yesToAChange');
  });
});

/**
 * THE TWO RULES ABOUT WHO SEES A LINE, IN ONE PLACE.
 *
 * "The 'only you see this bit' shouldnt exist" - the band went, and what it held did not: a line
 * about a person is still the lead's alone, and the work buckets are still the team's.
 */
describe('what this check-in knows', () => {
  const lines = [
    { id: '1', kind: 'STRATEGY' as any, text: 'Expansion before new logos', audience: 'EVERYONE' as const },
    { id: '2', kind: 'WAY_OF_WORKING' as any, text: 'No proposal before qualification', audience: 'LEAD_ONLY' as const },
    { id: '3', kind: 'ABOUT_A_PERSON' as any, text: 'Does not ask for the deal', audience: 'LEAD_ONLY' as const, aboutParticipantId: 'p1' },
    { id: '4', kind: 'QUESTION_FOR_PERSON' as any, text: 'Which accounts have a buying process?', audience: 'LEAD_ONLY' as const, aboutParticipantId: 'p1' },
    { id: '5', kind: 'BETWEEN_PEOPLE' as any, text: 'Amina and David: a feature was promised', audience: 'LEAD_ONLY' as const },
    { id: '6', kind: 'NOTE' as any, text: 'Retired last week', audience: 'EVERYONE' as const, closedAt: new Date() },
  ];

  it('the lead sees everything live', () => {
    expect(theLinesFor(lines as any, { isTheLead: true }).map((l) => l.id)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('everybody else sees the work lines that were shared, and nothing about anybody', () => {
    expect(theLinesFor(lines as any, { isTheLead: false }).map((l) => l.id)).toEqual(['1']);
  });

  it('and a line about a person can never be shared, whoever asks', () => {
    expect(mayBeShared('STRATEGY' as any)).toBe(true);
    for (const k of ['ABOUT_A_PERSON', 'QUESTION_FOR_PERSON', 'BETWEEN_PEOPLE']) {
      expect(ABOUT_SOMEBODY.has(k as any)).toBe(true);
      expect(mayBeShared(k as any)).toBe(false);
    }
  });

  it('the five buckets the page draws are the five the server names', () => {
    expect(THE_BUCKETS.map((b) => b.kind)).toEqual(['STRATEGY', 'WAY_OF_WORKING', 'DECISION', 'UNSETTLED', 'NOTE']);
    const page = fs.readFileSync(path.join(__dirname, '../../../../client/src/components/gw/ContextPage.tsx'), 'utf8');
    for (const b of THE_BUCKETS) expect(page).toContain(`kind: '${b.kind}'`);
  });
});

/**
 * WHAT IT SAYS BEFORE AND AFTER.
 *
 * Read live, 22 September 2026: "Done. I will put "Have a senior person call Client C" down as
 * hassan@harvestline.test.." - the wrong tense, a question mark turned into a full stop, two of them,
 * and somebody's address where their name would do. And the disambiguation arrived as one run-on
 * sentence, because the boundary the reply passes through flattens a bulleted list.
 */
describe('the sentences a change is made with', () => {
  const { whatChanged, whichOneDoYouMean: which } = require('./what-the-lead-wants-changed');
  const thing = { id: 'a1', what: 'action' as const, text: 'Have a senior person call Client C', who: null };

  it('say what happened, in the past tense, once', () => {
    const said = whatChanged({ intent: 'assign', thing, toPerson: 'Hassan' });
    expect(said).toBe('"Have a senior person call Client C" is Hassan now, and it comes up in their next check-in.');
    expect(said).not.toContain('I will');
    expect(said).not.toContain('..');
  });

  it('and each kind says what it did with it', () => {
    expect(whatChanged({ intent: 'drop', thing })).toContain('stays on the record as something that was there');
    expect(whatChanged({ intent: 'settle', thing })).toContain('no longer one of the open ones');
    expect(whatChanged({ intent: 'reword', thing, newText: 'A senior person calls Client C.' })).toBe('That line now reads "A senior person calls Client C".');
  });

  it('the disambiguation is one numbered line, because the boundary flattens a list', () => {
    const asked = which('the 30 day rule', [
      { id: '1', what: 'line' as const, text: "Whether the 30-day 'no reply' rule is official." },
      { id: '2', what: 'line' as const, text: 'An opportunity is dead after 30 days with no reply.' },
    ])
    expect(asked).toContain('(1)');
    expect(asked).toContain('(2)');
    expect(asked).not.toContain('\n');
    expect(asked.endsWith('Which one?')).toBe(true);
  });

  it('and an ambiguous change leaves nothing to say yes to', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'grounds.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(src).toContain("kind: 'none', why: 'Waiting to hear which one they mean.'");
  });
});

/*
 * FIX 2, 30 September 2026. Driven live: "He has missed the last two pipeline updates. I spoke to
 * him once. I want the update in by every Friday." was answering the open `objectives` question, and
 * the change reader read it as an attempt to change something called "the update" - found nothing,
 * and answered "I cannot find 'the update' on this check-in", swallowing the answer entirely.
 */
describe('changeAnswersThisTurn: a confident change wins under any open question; an ambiguous one does not swallow an answer', () => {
  it('a confident match (apply set) wins even while a gap is open - "drop the 30-day rule" under an open question', () => {
    expect(changeAnswersThisTurn({ apply: { intent: 'drop' } }, 'objectives')).toBe(true);
  });

  it('an ambiguous match (apply null) does not win while a gap is open - the open gap gets the turn instead', () => {
    expect(changeAnswersThisTurn({ apply: null }, 'objectives')).toBe(false);
  });

  it('an ambiguous match still answers when nothing else is open to answer instead', () => {
    expect(changeAnswersThisTurn({ apply: null }, null)).toBe(true);
  });

  it('nothing read as a change at all never wins', () => {
    expect(changeAnswersThisTurn(null, 'objectives')).toBe(false);
    expect(changeAnswersThisTurn(null, null)).toBe(false);
  });
});
