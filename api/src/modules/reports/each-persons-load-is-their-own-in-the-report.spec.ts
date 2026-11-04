import { withoutOtherPeoplesReads } from './own-reads-only';
import { labelsForParties } from './party-labels';
import * as RUN from '../board/__fixtures__/drop-access-short-run.json';

/**
 * EACH PERSON'S LOAD IS THEIR OWN, IN THE REPORT AS EACH READER IS SERVED IT (CLAUDE.md, "Private, always: ... each person's load
 * across check-ins"; Hafsah's quality pass of 18 October, R-7).
 *
 * Mercy's own report carried every colleague's row in engagement.parties (sessions, lines kept, documents) and
 * engagement.sessionCounts ("Kevin Omondi": 33, "Grace Achieng": 12). Read here on the short run's stored report (gw_sweep_drop3),
 * as each person reads it: Grace runs it and keeps every row; Mercy, Kevin and Joseph each keep their own row and count only.
 */
const R: any = RUN;
const people = R.participants.map((p: any) => ({ ...p, createdAt: new Date('2026-10-12T07:00:00Z'), email: `${p.user.firstName.toLowerCase()}@dropaccess.test` }));
const labels = labelsForParties(people as any);
const pid = (first: string) => R.participants.find((p: any) => p.user.firstName === first).id;
const asStored = () => JSON.parse(JSON.stringify({ engagement: R.report.engagement }));
/* The same report with the names already in, as it is after asItWasShared, read as Mercy. */
const named = (viewer: string) => {
  const e = asStored().engagement;
  const nameOf = (label: string) => {
    const id = [...labels.entries()].find(([, l]) => l === label)?.[0];
    if (!id) return label;
    if (id === pid(viewer)) return 'You';
    const p = R.participants.find((x: any) => x.id === id);
    return `${p.user.firstName} ${p.user.lastName}`;
  };
  e.parties = e.parties.map((p: any) => ({ ...p, label: nameOf(p.label) }));
  e.sessionCounts = Object.fromEntries(Object.entries(e.sessionCounts).map(([k, v]) => [nameOf(k), v]));
  return { engagement: e };
};
const read = (report: any, first: string, isLead: boolean) => withoutOtherPeoplesReads(report, { viewerLabel: labels.get(pid(first)) ?? null, viewerParticipantId: pid(first), viewerIsLead: isLead });

describe('each person\'s load is their own, in the report as each reader is served it', () => {
  it('the stored report holds a row and a count for each of the four, so the test reads something', () => {
    expect(R.report.engagement.parties).toHaveLength(4);
    expect(Object.keys(R.report.engagement.sessionCounts)).toHaveLength(4);
  });

  it('Grace, who runs it, keeps every person\'s row and count', () => {
    const g = read(asStored(), 'Grace', true) as any;
    expect(g.engagement.parties).toHaveLength(4);
    expect(Object.keys(g.engagement.sessionCounts)).toHaveLength(4);
  });

  for (const who of ['Mercy', 'Kevin', 'Joseph']) {
    it(`${who} keeps only their own row and count, as stored and with the names in`, () => {
      const stored = read(asStored(), who, false) as any;
      expect(stored.engagement.parties.map((p: any) => p.label)).toEqual([labels.get(pid(who))]);
      expect(Object.keys(stored.engagement.sessionCounts)).toEqual([labels.get(pid(who))]);
      const withNames = read(named(who), who, false) as any;
      expect(withNames.engagement.parties.map((p: any) => p.label)).toEqual(['You']);
      expect(Object.keys(withNames.engagement.sessionCounts)).toEqual(['You']);
      const others = R.participants.filter((p: any) => p.user.firstName !== who).map((p: any) => `${p.user.firstName} ${p.user.lastName}`);
      for (const name of others) expect(JSON.stringify(withNames.engagement)).not.toContain(name);
    });
  }
});
