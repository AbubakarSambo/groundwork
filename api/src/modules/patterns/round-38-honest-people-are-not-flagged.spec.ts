/**
 * ROUND 38, AS THE ONE PATTERN LAYER READS IT NOW (fix plan, group 4: "honest people wrongly flagged is 0 on every control").
 *
 * The fixture is every answered assessment of the nine team members of round 38's three organisations (gw_loop_round38, read only,
 * the fields layer 2 reads). The planted answer key is ~/Desktop/assessment-test/harness/cast.json: Aisha, Peter and Joseph are the
 * honest controls; Mercy's planted patterns are overload, role and focus, and she was also flagged for claims not proved.
 *
 * Round 38 flagged Aisha, Joseph and Mercy for "claims rarely proved": each gave the proof with the claim (the email with the aged
 * debt list, the signed Paicho attendance sheet, the signed Kenya Breweries delivery note), and a document then settled only a claim
 * of the check-in before. Proof anywhere on the record settles a claim now.
 */
import { theRecordAcrossTime, type APatternAcrossAssessments } from './patterns-across-the-assessments';

const ROWS: any[] = require('./fixtures/round-38-assessments.json');

function theRecordOf(person: string) {
  const xs = ROWS.filter((r) => r.person === person).sort((a, b) => a.sessionNumber - b.sessionNumber);
  return theRecordAcrossTime(xs[0].participantId, xs.map((r) => ({ checkInId: r.checkInId, sessionNumber: r.sessionNumber, on: r.on, assessment: r.assessment })));
}
const against = (ps: APatternAcrossAssessments[]) => ps.filter((p) => p.kind !== 'strength').map((p) => `${p.key} (${p.state})`);

describe('the honest controls of round 38 have nothing against them, forming or holding', () => {
  it.each(['aisha', 'peter', 'joseph'])('%s', (who) => {
    const r = theRecordOf(who);
    expect(against(r.patterns)).toEqual([]);
  });

  it('and each reads as the strength the record shows, with the proof they gave', () => {
    for (const who of ['aisha', 'peter', 'joseph']) {
      const strength = theRecordOf(who).patterns.find((p) => p.key === 'quiet-excellence');
      expect(strength).toMatchObject({ state: 'holds', kind: 'strength' });
    }
    expect(theRecordOf('joseph').patterns.find((p) => p.key === 'quiet-excellence')!.saying).toBe('Joseph has kept 2 promises and shown proof for 6 pieces of work.');
  });
});

describe('Mercy', () => {
  it('is no longer recorded as saying work was done without proof: the delivery note came with the claim', () => {
    expect(theRecordOf('mercy').patterns.map((p) => p.key)).not.toContain('claims-rarely-proved');
  });

  it('her one pattern against her rests on two promises she made in her own words, each named', () => {
    const slipping = theRecordOf('mercy').patterns.find((p) => p.key === 'slipping-promises')!;
    expect(slipping.instances.map((i) => i.item)).toEqual(['follow up with a product demonstration', 'send a detailed proposal for Safaricom House']);
  });
});

describe('the planted patterns the layer caught before are still caught', () => {
  it('Brian lets promised days pass', () => {
    expect(theRecordOf('brian').patterns.find((p) => p.key === 'slipping-promises')?.state).toBe('holds');
  });
  it('Kevin lets promised days pass, and says work is done without the proof that was asked for', () => {
    const k = theRecordOf('kevin').patterns.filter((p) => p.state === 'holds').map((p) => p.key);
    expect(k).toEqual(expect.arrayContaining(['slipping-promises', 'claims-rarely-proved']));
  });
});
