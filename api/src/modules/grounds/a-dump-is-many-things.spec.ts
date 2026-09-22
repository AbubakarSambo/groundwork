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
    expect(whatWeTookFromThat({ success: null, teamTargets: [], forPeople: [], dates: [], unmatched: [] })).toBeNull();
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
    expect(apply).toContain('if (looksLikeADump(dto.said)) {');
    expect(apply).toContain('await this.whatAPasteGives(groundId, dto.said)');
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
    expect(w).toContain("held.has(`${p.participantId}::${t.name.toLowerCase()}`)");
    expect(w).toContain("held.has(`team::${t.name.toLowerCase()}`)");
    /* And the team's own About box is written again from what the paste settled. */
    expect(w).toContain('await this.tellParticipantsAboutThis(groundId, fromTheContext');
  });
});
