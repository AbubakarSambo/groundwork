import { PartyType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { theRoom, theJudgementOverARoom, whatOtherPeoplesWordsCallThem, type SomebodyInTheRoom } from './the-judgement-over-the-answers';
import { displayName, labelsForParties } from './party-labels';
import { whatMoreThanOnePersonNamed } from './what-more-than-one-person-named';

/**
 * THE LEAD'S JUDGEMENT IS TOLD WHO EACH NAME IN PEOPLE'S WORDS BELONGS TO.
 *
 * Run fix6-1, drift. Zainab moved to sales "as requested by Nadia"; the judgement knew "the
 * initiator" and never that she is Nadia, and told the lead to "tell the initiator that Nadia has
 * redirected" Zainab. Nobody's words are changed for this. The judgement, which only the lead
 * reads, is told which name belongs to which label, and asked to use the label.
 */

const parties = [
  { id: 'p-nadia', partyType: PartyType.INITIATOR, createdAt: new Date('2026-03-01'), email: 'nadia@x.test', user: { firstName: 'Nadia', lastName: 'Haddad', email: 'nadia@x.test' } },
  { id: 'p-zainab', partyType: PartyType.PARTICIPANT, createdAt: new Date('2026-03-02'), email: 'zainab@x.test', user: { firstName: 'Zainab', lastName: 'Okafor', email: 'zainab@x.test' } },
  { id: 'p-grace1', partyType: PartyType.PARTICIPANT, createdAt: new Date('2026-03-03'), email: 'grace.a@x.test', user: { firstName: 'Grace', lastName: 'Adeyemi' } },
  { id: 'p-grace2', partyType: PartyType.PARTICIPANT, createdAt: new Date('2026-03-04'), email: 'grace.b@x.test', nameGiven: 'Grace Bello', organisationGiven: 'Bello Farms' },
  /* Never gave a name: only an address, and an address is never a name here. */
  { id: 'p-nameless', partyType: PartyType.PARTICIPANT, createdAt: new Date('2026-03-05'), email: 'someone@x.test' },
] as any[];
const labels = labelsForParties(parties);
/* Built the way reports.service builds it. */
const called = whatOtherPeoplesWordsCallThem(parties.map((p) => ({ id: p.id, name: displayName({ ...p, organisationGiven: null }, false) })));

const people: SomebodyInTheRoom[] = parties.map((p) => ({
  who: labels.get(p.id)!,
  isLead: p.partyType === PartyType.INITIATOR,
  role: null,
  finding: p.id === 'p-zainab'
    ? 'Participant A has been spending 80% of Participant A\'s time on inbound sales support since March 11th, at Nadia\'s request.'
    : null,
  patterns: [],
  openCommitments: [],
  namesInOtherPeoplesWords: called.get(p.id) ?? [],
}));
const material = theRoom(people, [], 2);
const blockOf = (label: string) => material.split('\n\n').find((b) => b.startsWith(`--- ${label}`)) ?? '';

describe("the lead's judgement is told who each name in people's words belongs to", () => {
  it('each person with a first name nobody else has gets their full name and their first name', () => {
    expect(blockOf('the initiator')).toContain("    other people's words call them: Nadia Haddad, or Nadia");
    expect(blockOf('Participant A')).toContain("    other people's words call them: Zainab Okafor, or Zainab");
  });

  it('a first name two people share is left out, and the full name stays', () => {
    const g1 = blockOf('Participant B');
    const g2 = blockOf('Participant C');
    expect(g1).toMatch(/other people's words call them: Grace Adeyemi$/m);
    expect(g2).toMatch(/other people's words call them: Grace Bello$/m);
    expect(material).not.toMatch(/, or Grace\b/);
  });

  it('the organisation is not part of the name, and an address is never a name', () => {
    expect(material).not.toContain('Bello Farms');
    expect(material).not.toMatch(/@/);
    expect(blockOf('Participant D')).not.toContain("other people's words call them");
  });

  it('the finding the lead reads from is unchanged: nobody\'s words are rewritten', () => {
    expect(blockOf('Participant A')).toContain("at Nadia's request.");
  });

  it('the instruction says a name in somebody\'s words is that person, told by their label', () => {
    const instruction = theJudgementOverARoom('whoever called this check-in', 'what to do next', 'the initiator');
    expect(instruction).toContain(
      "When somebody's words name a person in this room by their name, it is that person: say it about them, using their label exactly as given, and never treat them as somebody outside the room.",
    );
  });

  it('a person in the room is never counted as a thing two people named, by first name or full name', () => {
    const shared = whatMoreThanOnePersonNamed(
      [
        { who: 'Participant A', texts: ['As requested by Nadia, I moved to sales. Studio Lune is booked.'] },
        { who: 'Participant B', texts: ['Nadia Haddad told me to wait. We use Studio Lune too.'] },
      ],
      [...people.map((p) => p.who), ...people.flatMap((p) => p.namesInOtherPeoplesWords ?? [])],
    );
    expect(shared.map((s) => s.name)).toEqual(['Studio Lune']);
  });

  it('reports.service hands the names to the room and to the named-by-more-than-one ban', () => {
    const src = fs.readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8');
    expect(src).toContain('namesInOtherPeoplesWords: namesInOtherPeoplesWords.get(p.id) ?? [],');
    expect(src).toContain('...room!.people.flatMap((p) => p.namesInOtherPeoplesWords ?? [])');
    expect(src).toContain('namesInOtherPeoplesWords: p.namesInOtherPeoplesWords ?? [],');
    expect(src).toContain("displayName({ ...p, organisationGiven: null }, false)");
  });
});
