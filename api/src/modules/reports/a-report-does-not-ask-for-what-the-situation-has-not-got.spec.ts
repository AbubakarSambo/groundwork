import { displayName, namesVisibleTo } from './party-labels';
import { anAimIsOwedHere } from '../entry/a-check-in-with-no-aim-has-nothing-to-read-against';
import { PartyType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * FOUR THINGS READ OFF ONE LIVE REPORT, 19 SEPTEMBER 2026, ON A TEAM UPDATE WITH EVERYBODY IN.
 *
 *   "Amina Yusuf - Answered. Sahar Bello - Answered. Participant C - Answered."
 *   "01 What everybody said good looks like ... No standard is set."
 *   "the role was never clearly defined, so there is no boundary to measure work against"
 *   "Which of those conversations was with someone who can actually buy, budget and authority?"
 *
 * Three of the four are the same fault: a surface written for a situation that has an aim and a
 * remit, printing its own absence on one that has neither by design. The fourth is a typo in a
 * probe we wrote.
 */
const noName = { id: 'p3', partyType: PartyType.PARTICIPANT, user: { email: 'sam@work.test' } } as any;
const named = { id: 'p2', partyType: PartyType.PARTICIPANT, user: { firstName: 'Amina', lastName: 'Yusuf' } } as any;
const lead = { id: 'p1', partyType: PartyType.INITIATOR, user: { firstName: 'Hafsah' } } as any;

describe('a roster does not name half of itself', () => {
  /* Changed 28 Sep 2026, Hafsah: never an address as a name. The lead no longer gets the address in
     place of a name; with no name there is none here, and every surface says "a colleague" instead
     (plainWordsByPerson). Still never a letter. */
  it('gives the lead no address in place of a name, and never a letter', () => {
    const names = namesVisibleTo('p1', [lead, named, noName]);
    expect(names.get('Participant B')).toBeUndefined();
    expect([...names.values()]).toContain('Amina Yusuf');
  });

  it('and their own row reads as them, not as a letter', () => {
    expect(namesVisibleTo('p3', [lead, named, noName]).get('Participant B')).toBeUndefined();
  });

  /* Never peer to peer: an address is an identity, and the wall between colleagues holds. */
  it('and never hands one colleague another colleague address', () => {
    expect(namesVisibleTo('p2', [lead, named, noName]).get('Participant B')).toBeUndefined();
  });

  it('and a name somebody actually gave always wins', () => {
    expect(displayName(named, true)).toBe('Amina Yusuf');
    expect(displayName(noName, false)).toBeNull();
  });
});

describe('what the situation has not got', () => {
  const src = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

  /* The section asking what good looks like is left out where an aim is not owed and nobody set
     one, rather than filled with "No standard is set". */
  it('leaves out the standard section where a standard is not part of the situation', () => {
    const reports = src('reports/reports.service.ts');
    expect(reports).toContain('anAimBelongsHere');
    expect(reports).toMatch(/againstSuccess: !listeningOnce && \(anAimBelongsHere \|\| somebodyStatedOne\) \? againstSuccess : null/);
    expect(anAimIsOwedHere('TEAM_UPDATES')).toBe(false);
    expect(anAimIsOwedHere('GOAL_ALIGNMENT')).toBe(true);
  });

  it('and does not send somebody to define a role in a situation that has none', () => {
    const reads = src('board/reads.ts');
    expect(reads).toContain('situationHasRoles');
    expect(reads).toContain('This situation does not run against a role');
    expect(src('board/board.service.ts')).toContain('situationHasRoles: anAimIsOwedHere');
  });

  it('and the sales probe is a sentence', () => {
    /* Comments stripped: the line that says what was wrong quotes the wrong sentence. */
    const maps = src('board/role-maps.ts').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(maps).not.toContain('can actually buy, budget and authority');
    expect(maps).toContain('who can actually decide, with the budget and the authority');
  });
});
