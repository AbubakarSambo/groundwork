/**
 * WHAT THE LEAD READS ABOUT EACH PERSON, AND WHO ELSE READS IT (F2, Hafsah, 2 November 2026). The lead reads layer 2 from each
 * person's newest assessment, in plain sentences with the days and words it rests on; a participant, a colleague and an admin who
 * does not run the check-in read none of it; and nothing at all where the organisation keeps judgements of a person off.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { whatTheRecordShowsTheLead } from './what-the-record-shows-the-lead';
import { theRecordAcrossTime, type AnAssessmentSeen } from './patterns-across-the-assessments';
import { theInterventionsAfter } from './the-next-step-for-each-pattern';

const FIXTURE = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'round-23-assessments.json'), 'utf8')) as { people: Record<string, { participantId: string; seen: AnAssessmentSeen[] }> };

/** The newest stored assessment of each person, with layer 2 and its steps written as assessTheConversation writes them. */
function theGround(names: string[], judgementsOn = true) {
  const rows = names.map((n) => {
    const p = JSON.parse(JSON.stringify(FIXTURE.people[n]));
    let steps: any[] = [];
    let last: any = null;
    for (let i = 1; i <= p.seen.length; i += 1) {
      const upTo = p.seen.slice(0, i);
      last = upTo[upTo.length - 1];
      const record = theRecordAcrossTime(p.participantId, upTo);
      steps = theInterventionsAfter(steps, record.patterns, { checkInId: last.checkInId, sessionNumber: last.sessionNumber });
      last.assessment.acrossTime = record;
      last.assessment.interventions = steps;
    }
    return { participantId: p.participantId, sessionNumber: last.sessionNumber, sessionReport: { kind: 'assessment', version: 1, ...last.assessment } };
  });
  return {
    checkIn: { findMany: async () => rows },
    ground: { findUnique: async () => ({ organizationId: 'o' }) },
    organization: { findUnique: async () => ({ personJudgementsOn: judgementsOn }) },
  };
}

const LEAD = { participantId: 'p-lead', runsIt: true };

describe('what the record shows the lead', () => {
  it('Wanjiru reads Brian\'s promised days and David\'s proof, each with its days and words, and nothing against Aisha', async () => {
    const lines = await whatTheRecordShowsTheLead(theGround(['Brian', 'David', 'Aisha']), 'g', LEAD);
    const brian = lines.filter((l) => l.participantId === FIXTURE.people.Brian.participantId);
    const david = lines.filter((l) => l.participantId === FIXTURE.people.David.participantId);
    const aisha = lines.filter((l) => l.participantId === FIXTURE.people.Aisha.participantId);
    expect(brian.find((l) => l.heading === 'Brian has let 4 promised days pass without the work done.')).toMatchObject({
      kind: 'attention', yours: false, canAnswer: false,
      whatHappened: expect.stringContaining('On 16 November, the words were "The Kasarani Foods submissions draft is still not sent."'),
      howOften: 'This rests on 4 separate things from 2 check-ins.',
    });
    expect(david.map((l) => [l.kind, l.heading])).toEqual([['good', 'David has shown proof for 4 pieces of work.']]);
    expect(aisha.filter((l) => l.kind === 'attention')).toEqual([]);
    /* No label on a person, in anything the lead reads. */
    expect(JSON.stringify(lines)).not.toMatch(/\b(PIP|exit|at risk|underperform|lazy)\b/i);
  });

  it('a participant, or an admin who does not run the check-in, reads none of it', async () => {
    const ground = theGround(['Brian', 'David']);
    expect(await whatTheRecordShowsTheLead(ground, 'g', { participantId: FIXTURE.people.Brian.participantId, runsIt: false })).toEqual([]);
    expect(await whatTheRecordShowsTheLead(ground, 'g', { participantId: null, runsIt: false })).toEqual([]);
  });

  it('nothing at all where the organisation keeps judgements of a person off', async () => {
    expect(await whatTheRecordShowsTheLead(theGround(['Brian'], false), 'g', LEAD)).toEqual([]);
  });
});
