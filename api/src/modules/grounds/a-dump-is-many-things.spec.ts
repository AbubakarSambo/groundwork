import { readFileSync } from 'fs';
import { join } from 'path';
import { looksLikeADump, whatWeTookFromThat, A_DUMP_PROMPT, A_PASTE_IS_THIS_LONG } from './a-dump-is-many-things';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SRC = strip(readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8'));

/**
 * Driven with a real brain dump on 22 September 2026, the context chat proposed one thing, offered
 * the same one three times, wrote none of the targets, dropped two of three people, and recorded the
 * lead's "yes, take the rest" as what doing well looks like. A paste is many things at once.
 */
describe('a dump is many things at once', () => {
  const got = {
    success: 'I want to know what each of them is really doing week to week, not the pipeline theatre.',
    teamTargets: [
      { name: 'Q4 sales', target: 180_000_000, notToExceed: false },
      { name: 'credit as a share of sales', target: 35, notToExceed: true },
    ],
    forPeople: [
      { who: 'Dayo Adebayo', participantId: 'p1', expectation: 'I want him at N45m for Q4 with credit under 35% of his own book.', targets: [{ name: 'Q4 sales', number: 45_000_000 }] },
      { who: 'Chika Nwosu', participantId: 'p2', expectation: 'I want her at N35m and at least 4 new dealers signed.', targets: [{ name: 'Q4 sales', number: 35_000_000 }, { name: 'new dealers signed', number: 4 }] },
    ],
    dates: [{ what: 'quarter ends', when: '31 December' }],
    unmatched: ['Bola Yusuf'],
    waysOfWorking: ['no proposal before qualification'],
    openDecisions: ['whether the target stays at 180m'],
    notSettled: ['180m may be signed or recognised, nobody has said which'],
    aboutPeople: [{ who: 'Dayo Adebayo', participantId: 'p1', observation: 'good with people, does not ask for the order' }],
    commitments: [],
    questionsForPeople: [],
    betweenPeople: [],
    strategy: [],
    notes: [],
  };

  it('knows a paste from an answer, by length and nothing cleverer', () => {
    expect(looksLikeADump('N180m for Q4.')).toBe(false);
    expect(looksLikeADump('x'.repeat(A_PASTE_IS_THIS_LONG))).toBe(true);
    expect(looksLikeADump('')).toBe(false);
  });

  it('lists everything it took, one line per person, carrying every number of theirs', () => {
    const said = whatWeTookFromThat(got)!;
    expect(said).toContain('What doing well looks like is "I want to know what each of them is really doing week to week');
    /* Decision 69: the receipt says only a direction the lead said yes to, and none was here. Asking,
       each number says which way it goes, so the yes confirms it. */
    expect(said).toContain('- Q4 sales: 180m\n');
    expect(said).toContain('- credit as a share of sales: 35\n');
    const asking = whatWeTookFromThat(got, { asking: true })!;
    expect(asking).toContain('- Q4 sales: 180m, an aim to reach');
    expect(asking).toContain('- credit as a share of sales: 35, a limit not to go over');
    expect(said).toContain('- Chika Nwosu: "I want her at N35m and at least 4 new dealers signed." (Q4 sales: 35m; new dealers signed: 4)');
    /* Her line once, not once per number. */
    expect(said.match(/Chika Nwosu/g)).toHaveLength(1);
    expect(said).toContain('It is marked as yours, and they have not seen it yet.');
    /* Changed 4 October 2026: dates are kept as notes everyone can read, one plain sentence each, not dropped. */
    expect(said).toContain('These are the dates you named. Everyone on this check-in will see these.\n- Quarter ends on 31 December.');
    /* Changed 4 October 2026: the old sentence promised "add them and I will put their part on too" and the
       paste was refused as already taken when sent again. It now says nothing is saved for them yet. */
    expect(said).toContain('One name is not on this check-in, so nothing is saved for them yet. If you add them and send this again, I will put their part on too.\n- Bola Yusuf');
  });

  it('asks for a yes in the chat and states the receipt afterwards', () => {
    expect(whatWeTookFromThat(got, { asking: true })!.trimEnd().endsWith('Record all of this?')).toBe(true);
    expect(whatWeTookFromThat(got)!.trimEnd().endsWith('Nothing else from it is kept.')).toBe(true);
    expect(whatWeTookFromThat({ success: null, teamTargets: [], forPeople: [], dates: [], unmatched: [], waysOfWorking: [], openDecisions: [], notSettled: [], aboutPeople: [], commitments: [], questionsForPeople: [], betweenPeople: [], strategy: [], notes: [] })).toBeNull();
  });

  it('names measures in words, takes every number a person was given, and leaves opinions out', () => {
    expect(A_DUMP_PROMPT).toContain('NAME EVERY MEASURE IN WORDS');
    expect(A_DUMP_PROMPT).toContain('"N for Q4" and "N180m" are not names of anything');
    expect(A_DUMP_PROMPT).toContain('"N35m and at least 4 new dealers signed" is two numbers, not one');
    expect(A_DUMP_PROMPT).toContain('an opinion about a person rather than a number or a job');
    expect(A_DUMP_PROMPT).toContain('not one they are arguing with');
  });

  it('is read in the chat, re-read on the confirmation, and never written before the yes', () => {
    /* The chat proposes from the paste instead of the open gap. */
    expect(SRC).toContain('const fromAPaste = lastFromLead && looksLikeADump(lastFromLead)');
    expect(SRC).toContain("if (say) proposal = { kind: 'everything', say } as any;");
    /* The confirmation re-derives from the lead's own words rather than taking a value from the screen. */
    const apply = SRC.slice(SRC.indexOf('async applyContextProposal('), SRC.indexOf('private async writeWhatThePasteGave('));
    /* The paste is their message, or the one a turn up that this yes is answering - see
       thePasteThisYesIsFor, 22 September 2026. */
    expect(apply).toContain('looksLikeADump(dto.said)');
    expect(apply).toContain('thePasteThisYesIsFor(dto.said, dto.history as any)');
    expect(apply).toContain('await this.whatAPasteGives(groundId, thePaste)');
    /* Decision 63: also carries who confirmed it, when it was an admin standing in for the lead. */
    expect(apply).toContain('await this.writeWhatThePasteGave(groundId, got, confirmedByAdminNote)');
  });

  it('writes it the way the one-at-a-time path does, and tells the team', () => {
    const w = SRC.slice(SRC.indexOf('private async writeWhatThePasteGave('), SRC.indexOf('async shareLeadContext('));
    /* A new version of what doing well looks like, never an edit. */
    expect(w).toContain('version: (latest?.version ?? 0) + 1');
    /* An expectation is the lead's, and unseen until the person it is about reads it. */
    expect(w).toContain('authoredBy: AUTHORED_AT_SETUP');
    expect(w).toContain('seenBySubject: false');
    /* Nothing already on the record is doubled by a paste restated later. */
    /* Held by owner and by measure, and the measure comparison moved to theSameMeasure on
       22 September 2026 - exact names let one paste read twice write two rows for one number. */
    /* Changed 4 October 2026: the same measure now also needs the same number, so that "Q4 sales" does not
       swallow "credit as a share of sales". The behaviour is in a-number-given-to-a-person-is-theirs.spec.ts. */
    expect(w).toContain("alreadyHeld(p.participantId, t.name, t.number)");
    expect(w).toContain("alreadyHeld('team', t.name, t.target)");
    /* CHANGED 30 September 2026 (request 92, point 3): the team's About box used to be rewritten
       silently on every yes. It is now written only with the sentence the list showed before the yes
       (got.toldToParticipants); this test pinned the silent rewrite. */
    expect(w).toContain('data: { toldToParticipants: got.toldToParticipants }');
    expect(w).not.toContain('tellParticipantsAboutThis');
  });
});

/**
 * A YES COMES A TURN AFTER THE PASTE, AND A SLOGAN IS NOT A YARDSTICK.
 *
 * Driven on an 8,400-character quarter dump, 22 September 2026: the chat read it whole, printed the
 * list, asked "Record all of this?" - and the confirmation read the four-word yes for a paste, found
 * none, and fell back to one-gap-at-a-time. Said yes eight times: nine rows for one of six people,
 * no team numbers, no success statement.
 */
describe('the paste a yes is for', () => {
  const { thePasteThisYesIsFor, aSuccessStatementHolds, THE_LIST_OPENS_WITH } = require('./a-dump-is-many-things');
  const paste = 'x'.repeat(500);
  const list = `${THE_LIST_OPENS_WITH}\n\nFor the whole check-in:\n- signed: 12m`;

  it('is the paste one turn up, when the list is what they are saying yes to', () => {
    expect(thePasteThisYesIsFor('yes, record all of that', [
      { role: 'user', content: paste },
      { role: 'assistant', content: list },
    ])).toBe(paste);
  });

  it('and nothing at all when the yes is answering an ordinary question', () => {
    expect(thePasteThisYesIsFor('yes', [
      { role: 'user', content: paste },
      { role: 'assistant', content: 'What does doing well look like here?' },
    ])).toBeNull();
  });

  it('a new instruction is not a yes, whatever follows the list', () => {
    expect(thePasteThisYesIsFor('actually make it 8m not 12m', [
      { role: 'user', content: paste },
      { role: 'assistant', content: list },
    ])).toBeNull();
  });

  it('and with no paste in the conversation there is nothing to apply', () => {
    expect(thePasteThisYesIsFor('yes', [{ role: 'assistant', content: list }])).toBeNull();
  });

  it('a rule or a slogan is not what doing well looks like', () => {
    expect(aSuccessStatementHolds('celebrate revenue not meetings')).toBeNull();
    expect(aSuccessStatementHolds('no proposal before qualification')).toBeNull();
    expect(aSuccessStatementHolds('Stop doing free pilots where there is no next step')).toBeNull();
    /* And a remark about this product, which a paste addressed to us is full of. */
    expect(aSuccessStatementHolds('everyone says they want accountability but then accountability becomes "did you do your task" rather than "did we achieve the thing"')).toBeNull();
    expect(aSuccessStatementHolds('I need Groundwork to catch when people report activity instead of outcomes')).toBeNull();
    /* And a slash list, which is how a note to self is written. */
    expect(aSuccessStatementHolds('sell knowing whats happening / fewer surprises / better decisions')).toBeNull();
    expect(aSuccessStatementHolds('')).toBeNull();
  });

  it('and a picture of a good quarter is', () => {
    expect(aSuccessStatementHolds('Every deal on the board has a budget owner and a date, and delivery has agreed the dates we promised'))
      .toContain('budget owner');
  });
});

describe('one paste read twice is one set of numbers', () => {
  const { theSameMeasure } = require('./a-dump-is-many-things');

  it('one name inside the other is the same measure', () => {
    expect(theSameMeasure('signed', 'signed sales')).toBe(true);
    expect(theSameMeasure('collected revenue', 'collected')).toBe(true);
    /* Stemmed, so the tense a second read chose is not a second measure. */
    expect(theSameMeasure('big demos to support', 'big demos supported')).toBe(true);
    expect(theSameMeasure('old accounts reconnected', 'reconnect old accounts')).toBe(true);
  });

  it('and different words are different measures', () => {
    expect(theSameMeasure('qualified pipeline', 'warm referrals')).toBe(false);
    expect(theSameMeasure('signed', 'collected')).toBe(false);
    expect(theSameMeasure('', 'signed')).toBe(false);
  });

  it('the writer asks it rather than comparing characters', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'grounds.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const writer = src.slice(src.indexOf('private async writeWhatThePasteGave('), src.indexOf('async shareLeadContext('));
    expect(writer).toContain('theSameMeasure(h.name, name)');
    expect(writer).toContain('theSameMeasure(o.text ?? \'\', p.expectation)');
  });
});

/**
 * A PASTE IS NOT ONLY NUMBERS.
 *
 * The 8,400-character quarter dump of 22 September 2026 carried twelve ways of working the team
 * "sort of agreed", four decisions nobody had made, an explicit list of things not to treat as fact
 * (two definitions of one target, a figure nobody approved, tasks nobody knew were finished), and a
 * read of each person that is an opinion rather than a measure. The numbers were kept and every word
 * of that was dropped, because none of it had a destination.
 */
describe('the parts of a paste that are words', () => {
  const { whatWeTookFromThat: took, A_DUMP_PROMPT: PROMPT, A_DUMP_SCHEMA: SCHEMA } = require('./a-dump-is-many-things');
  const got = {
    success: null, teamTargets: [], forPeople: [], dates: [], unmatched: [], commitments: [], questionsForPeople: [], betweenPeople: [], strategy: [], notes: [],
    waysOfWorking: ['no proposal before qualification', 'follow up 48 hours after a demo'],
    openDecisions: ['whether the target stays at 12m'],
    notSettled: ['12m may be signed or recognised, nobody has said which', 'someone mentioned 15m for Q4, not approved'],
    aboutPeople: [{ who: 'Amina', participantId: 'p1', observation: 'relationships are good, does not ask for the deal' }],
  };

  it('is asked for by the read', () => {
    expect(PROMPT).toContain('HOW THIS TEAM WORKS');
    expect(PROMPT).toContain('WHAT IS STILL TO DECIDE');
    expect(PROMPT).toContain('WHAT IS NOT SETTLED');
    expect(PROMPT).toContain('never a fact about the person');
    for (const k of ['waysOfWorking', 'openDecisions', 'notSettled', 'aboutPeople']) {
      expect(Object.keys((SCHEMA as any).input_schema.properties)).toContain(k);
    }
  });

  it('and listed back with what will be done with it', () => {
    const said = took(got);
    expect(said).toContain('How this team works, said as yours rather than as anything agreed. Everyone on this check-in will see these.');
    expect(said).toContain('- follow up 48 hours after a demo');
    /* Was 'Still to decide, kept for you:', over lines saved for everyone (request 92). */
    expect(said).toContain('Still to decide. Everyone on this check-in will see these.');
    expect(said).toContain('Not settled, so nothing here is treated as a fact or a target. Everyone on this check-in will see these.');
    expect(said).toContain('someone mentioned 15m for Q4, not approved');
    expect(said).toContain('Only you will see these. They are never quoted to the person or in a report');
    expect(said).toContain('- Amina: "relationships are good, does not ask for the deal"');
  });

  it('a paste that is only words is still worth taking', () => {
    expect(took({ success: null, teamTargets: [], forPeople: [], dates: [], unmatched: [], waysOfWorking: ['one owner per opportunity'], openDecisions: [], notSettled: [], aboutPeople: [], commitments: [], questionsForPeople: [], betweenPeople: [], strategy: [], notes: [] }))
      .toContain('one owner per opportunity');
  });

  /*
   * REWRITTEN 22 SEPTEMBER 2026, when the four blobs became lines in buckets. What it holds to
   * account is unchanged in substance and stricter in form: the work buckets are the team's, a line
   * about a person is the lead's, and the writer decides that from the KIND rather than from a
   * caller's argument.
   */
  it('the work buckets are the team\'s and a line about a person is the lead\'s, decided by kind', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'grounds.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const writer = src.slice(src.indexOf('private async writeWhatThePasteGave('), src.indexOf('async changeContextLine('));
    /* And, since the privacy fix (#410, 4 November 2026), what a paste in setup gave stays the lead's too, except how the team works. */
    expect(writer).toContain('audience: ABOUT_SOMEBODY.has(kind) || (got.keptForTheLead && kind !== ContextItemKind.WAY_OF_WORKING) ? ContextNoteAudience.LEAD_ONLY : ContextNoteAudience.EVERYONE');
    for (const kind of ['STRATEGY', 'WAY_OF_WORKING', 'DECISION', 'UNSETTLED', 'NOTE', 'ABOUT_A_PERSON', 'QUESTION_FOR_PERSON', 'BETWEEN_PEOPLE']) {
      expect(writer).toContain(`ContextItemKind.${kind}`);
    }
    /* One line, not one blob, and the same line said at a different length is not a second line. */
    expect(writer).toContain("theSameMeasure(h.text ?? '', clean)");
  });
});

/**
 * WHAT IS TO BE DONE, A QUESTION FOR SOMEBODY, AND A THING BETWEEN TWO PEOPLE.
 *
 * Her list, 22 September 2026: the thirteen outstanding items and six personal commitments had
 * nowhere to go; the six coaching questions had nowhere to go; the pairs were buried in one long
 * note. And: say what the paste did not settle.
 */
describe('actions, questions and pairs', () => {
  const { whatWeTookFromThat: took, A_DUMP_PROMPT: PROMPT, A_DUMP_SCHEMA: SCHEMA, whatTheYesLeavesOut, whatThatLeavesOut, withoutWhatTheyLeftOut } = require('./a-dump-is-many-things');
  const base = { success: null, teamTargets: [], forPeople: [], dates: [], unmatched: [], waysOfWorking: [], openDecisions: [], notSettled: [], aboutPeople: [], commitments: [], questionsForPeople: [], betweenPeople: [], strategy: [], notes: [] };

  it('the read asks for all three, and for the owner only where it is given', () => {
    expect(PROMPT).toContain('WHAT IS TO BE DONE');
    expect(PROMPT).toContain('leaving the owner out is the correct answer, never the nearest name');
    expect(PROMPT).toContain('QUESTIONS THE LEAD WANTS ASKED');
    expect(PROMPT).toContain('WHAT IS BETWEEN TWO PEOPLE');
    for (const k of ['commitments', 'questionsForPeople', 'betweenPeople']) {
      expect(Object.keys((SCHEMA as any).input_schema.properties)).toContain(k);
    }
  });

  it('lists what has an owner and what has none, without moving anything onto anybody', () => {
    const said = took({
      ...base,
      commitments: [
        { who: 'Amina', participantId: 'p1', action: 'ask Client D who signs the budget', outcome: null, when: 'this week', theySaidIt: true },
        { who: null, participantId: null, action: 'Client C escalation', outcome: null, when: null, theySaidIt: false },
        { who: null, participantId: null, action: 'CRM cleanup', outcome: null, when: null, theySaidIt: false },
      ],
    });
    expect(said).toContain('Nobody is marked as having done or not done any of it until they say');
    expect(said).toContain('- Amina: ask Client D who signs the budget (this week)');
    expect(said).toContain('2 things have no owner');
    expect(said).toContain("Some things are still not settled.");
    expect(said).toContain("2 things to do have nobody's name on them.");
  });

  it('says when nothing sets the yardstick, and who has a job with no number', () => {
    const said = took({
      ...base,
      forPeople: [
        { who: 'Hassan', participantId: 'p4', expectation: 'own the implementation handover', targets: [] },
        { who: 'Amina', participantId: 'p1', expectation: 'close 4m', targets: [{ name: 'sales', number: 4_000_000 }] },
      ],
    });
    expect(said).toContain('Nothing in it says what doing well looks like');
    expect(said).toContain('Hassan has something expected of them and no number to measure it by');
    expect(said).not.toContain('Amina has something expected');
  });

  it('a yes with one thing taken out of it', () => {
    expect(whatTheYesLeavesOut('yes, but not the 12m')).toEqual({ notThis: '12m' });
    /* "yes but the 12m is not agreed" is a yes with an exception too, and the exception still has to
       be matched to something in the list before anything is left out. */
    expect(whatTheYesLeavesOut('yes but the 12m is not agreed')).toEqual({ notThis: '12m is not agreed' });
    expect(whatTheYesLeavesOut('yes except Sarah')).toEqual({ notThis: 'Sarah' });
    expect(whatTheYesLeavesOut('yes, record all of that')).toBeNull();
  });

  it('and the exception is matched against the list they are answering', () => {
    const got = {
      ...base,
      teamTargets: [{ name: 'signed', target: 12_000_000, notToExceed: false }, { name: 'collected', target: 8_000_000, notToExceed: false }],
      forPeople: [{ who: 'Sarah', participantId: 'p2', expectation: '3m qualified pipeline', targets: [{ name: 'qualified pipeline', number: 3_000_000 }] }],
    };
    const leaves = whatThatLeavesOut(got, '12m');
    expect(leaves.teamTargets).toEqual(['signed']);
    const left = withoutWhatTheyLeftOut(got, leaves);
    expect(left.teamTargets.map((t: any) => t.name)).toEqual(['collected']);
    expect(left.forPeople).toHaveLength(1);
    /* And an exception that matches nothing matches nothing - the caller refuses rather than guesses. */
    expect(whatThatLeavesOut(got, 'the pipeline meeting thing')).toEqual({ teamTargets: [], people: [], commitments: [] });
  });

  it('the confirmation refuses a yes whose exception it cannot place', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'grounds.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(src).toContain('I cannot tell which part "${exception.notThis}" is');
    expect(src).toContain('withoutWhatTheyLeftOut(got, leaves)');
  });

  it('and an action is a row whose status nobody has set', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'grounds.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const writer = src.slice(src.indexOf('private async writeWhatThePasteGave('), src.indexOf('async shareLeadContext('));
    expect(writer).toContain("status: 'UNKNOWN'");
    expect(writer).toContain('participantId: c.participantId');
    expect(writer).toContain('explicit: c.theySaidIt');
  });
});

/**
 * A PASTE IS TAKEN ONCE, MATCHED ON THE PASTE ITSELF.
 *
 * Said yes, then said yes again a minute later because nothing on screen said it had landed. The
 * second read of the same text renamed half of it - "document the top 10 questions" came back as
 * "create a list of the top 10 questions" - and word-matching cannot see those are one thing.
 */
describe('a paste is taken once', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, 'grounds.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const apply = src.slice(src.indexOf('async applyContextProposal('), src.indexOf('private async whatAPasteGives(') > 0 ? undefined : undefined);

  it('is matched by hash, not by how the model read it', () => {
    /* Changed 4 October 2026: the hash is of the words and of who is on the check-in, so that adding
       a person the paste named and sending it again is not refused as "already on the record". */
    expect(src).toContain("createHash('sha256').update(`${thePaste.trim()}\\n${(ground.participants as any[]).map((p) => p.id).sort().join(',')}`).digest('hex')");
    expect(src).toContain('this.prisma.groundPaste?.findFirst?.({ where: { groundId, hash }');
  });

  it('says so instead of writing again, and does not even re-read it', () => {
    const at = src.indexOf('const takenBefore');
    const branch = src.slice(at, at + 500);
    expect(branch).toContain('if (takenBefore && !exception)');
    expect(branch).toContain('That is already on the record, exactly as you sent it');
    /* The re-read comes after the early return, so a repeat yes costs nothing. */
    expect(branch.indexOf('whatAPasteGives')).toBeGreaterThan(branch.indexOf('already on the record'));
  });

  it('and a partial yes is never recorded as the whole paste', () => {
    /* Otherwise the thing they left out could never be taken later. */
    const partial = src.slice(src.indexOf('if (got && exception)'), src.indexOf('if (got) {'));
    expect(partial).not.toContain('groundPaste');
  });
});
