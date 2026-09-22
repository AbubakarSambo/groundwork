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
  };

  it('knows a paste from an answer, by length and nothing cleverer', () => {
    expect(looksLikeADump('N180m for Q4.')).toBe(false);
    expect(looksLikeADump('x'.repeat(A_PASTE_IS_THIS_LONG))).toBe(true);
    expect(looksLikeADump('')).toBe(false);
  });

  it('lists everything it took, one line per person, carrying every number of theirs', () => {
    const said = whatWeTookFromThat(got)!;
    expect(said).toContain('What doing well looks like: "I want to know what each of them is really doing week to week');
    expect(said).toContain('- Q4 sales: 180m');
    expect(said).toContain('- credit as a share of sales: 35, not to be passed');
    expect(said).toContain('- Chika Nwosu: "I want her at N35m and at least 4 new dealers signed." (Q4 sales: 35m; new dealers signed: 4)');
    /* Her line once, not once per number. */
    expect(said.match(/Chika Nwosu/g)).toHaveLength(1);
    expect(said).toContain('marked as yours and not yet seen by them');
    expect(said).toContain('- quarter ends: 31 December');
    expect(said).toContain('One name is not on this check-in: Bola Yusuf.');
  });

  it('asks for a yes in the chat and states the receipt afterwards', () => {
    expect(whatWeTookFromThat(got, { asking: true })!.trimEnd().endsWith('Record all of this?')).toBe(true);
    expect(whatWeTookFromThat(got)!.trimEnd().endsWith('Nothing else from it is kept.')).toBe(true);
    expect(whatWeTookFromThat({ success: null, teamTargets: [], forPeople: [], dates: [], unmatched: [], waysOfWorking: [], openDecisions: [], notSettled: [], aboutPeople: [] })).toBeNull();
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
    expect(apply).toContain('looksLikeADump(dto.said) ? dto.said : thePasteThisYesIsFor(dto.said, dto.history as any)');
    expect(apply).toContain('await this.whatAPasteGives(groundId, thePaste)');
    expect(apply).toContain('await this.writeWhatThePasteGave(groundId, got)');
  });

  it('writes it the way the one-at-a-time path does, and tells the team', () => {
    const w = SRC.slice(SRC.indexOf('private async writeWhatThePasteGave('), SRC.indexOf('async addLeadContext('));
    /* A new version of what doing well looks like, never an edit. */
    expect(w).toContain('version: (latest?.version ?? 0) + 1');
    /* An expectation is the lead's, and unseen until the person it is about reads it. */
    expect(w).toContain('authoredBy: AUTHORED_AT_SETUP');
    expect(w).toContain('seenBySubject: false');
    /* Nothing already on the record is doubled by a paste restated later. */
    /* Held by owner and by measure, and the measure comparison moved to theSameMeasure on
       22 September 2026 - exact names let one paste read twice write two rows for one number. */
    expect(w).toContain("alreadyHeld(p.participantId, t.name)");
    expect(w).toContain("alreadyHeld('team', t.name)");
    /* And the team's own About box is written again from what the paste settled. */
    expect(w).toContain('await this.tellParticipantsAboutThis(groundId, fromTheContext');
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
    const writer = src.slice(src.indexOf('private async writeWhatThePasteGave('), src.indexOf('async addLeadContext('));
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
    success: null, teamTargets: [], forPeople: [], dates: [], unmatched: [],
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
    expect(said).toContain('How this team works, as you wrote it. Kept as your note on the check-in, never quoted as a rule anybody agreed');
    expect(said).toContain('- follow up 48 hours after a demo');
    expect(said).toContain('Still to decide, kept for you:');
    expect(said).toContain('Not settled, so nothing here is treated as a fact or a target:');
    expect(said).toContain('someone mentioned 15m for Q4, not approved');
    expect(said).toContain('Kept where only you read it, and never quoted to them or in a report');
    expect(said).toContain('- Amina: "relationships are good, does not ask for the deal"');
  });

  it('a paste that is only words is still worth taking', () => {
    expect(took({ success: null, teamTargets: [], forPeople: [], dates: [], unmatched: [], waysOfWorking: ['one owner per opportunity'], openDecisions: [], notSettled: [], aboutPeople: [] }))
      .toContain('one owner per opportunity');
  });

  it('every one of them is written private to the lead, and an observation is about a person', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'grounds.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const writer = src.slice(src.indexOf('private async writeWhatThePasteGave('), src.indexOf('async addLeadContext('));
    expect(writer).toContain('audience: ContextNoteAudience.LEAD_ONLY');
    expect(writer).not.toContain('ContextNoteAudience.EVERYONE');
    expect(writer).toContain('got.waysOfWorking.length');
    expect(writer).toContain('got.openDecisions.length');
    expect(writer).toContain('got.notSettled.length');
    expect(writer).toContain('for (const a of got.aboutPeople) await note(');
    /* One note per kind: a second read of one paste rewords its lists, so an exact-text match wrote
       a second version of each. Eighteen notes for nine things, said yes twice. */
    expect(writer).toContain("(h.text ?? '').trimStart().startsWith(opensWith)");
    expect(writer).toContain('await this.prisma.leadContextNote.update(');
  });
});
