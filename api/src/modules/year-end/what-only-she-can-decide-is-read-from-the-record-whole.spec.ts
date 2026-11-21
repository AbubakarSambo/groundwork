import { aYearEndWorld } from './a-world-for-the-year-end';
import { loadTheRecord } from './the-year-end-versions';
import { buildTheContentWithTheNarrative, type TheNarrator } from './the-year-end-narrative';
import { reportBlocks, slidesOf } from './the-year-end-files';
import { thePagesOfHerRecord } from './her-year-end-record';
import { whatNeedsTheDecisionSaid } from '../outstanding/the-register-in-plain-words';
import { buildTheRegister } from '../outstanding/the-outstanding-register';

/**
 * BATCH F, F1 (Dangote rerun N7 and D14). The team wrote "That one is stuck", "mediation is on 3 December" and "Treasury cannot find the transfer", and nothing put
 * a decision to Fatima: the only writer read one reply at a time. The record is now read whole when the draft is built. What only she can settle is written where the
 * register reads a decision, so Today, Ask, the report and the deck say the same thing, with the matter, who has it, the day and what it waits on. A said claim and
 * the proven line of the same person that settles it become one matter.
 */
const NOW = new Date('2026-11-21T12:00:00Z');

function aTeamOnRecord() {
  const w = aYearEndWorld(NOW);
  w.t.person.rows.push(
    { id: 'pid-funmi', organizationId: w.ORG, externalId: 'p-funmi', displayName: 'Funmi Adebayo', active: true },
    { id: 'pid-ifeoma', organizationId: w.ORG, externalId: 'p-ifeoma', displayName: 'Ifeoma Chukwu', active: true },
    { id: 'pid-amina-y', organizationId: w.ORG, externalId: 'p-amina-y', displayName: 'Amina Yusuf', active: true },
  );
  w.t.outreachContact = w.aTable([
    { id: 'oc-funmi', principalUserId: 'u-fatima', organizationId: w.ORG, name: 'Funmi Adebayo', personId: 'pid-funmi', state: 'introduced', kind: 'team', contactKey: 'funmi@example.com' },
    { id: 'oc-ifeoma', principalUserId: 'u-fatima', organizationId: w.ORG, name: 'Ifeoma Chukwu', personId: 'pid-ifeoma', state: 'introduced', kind: 'team', contactKey: 'ifeoma@example.com' },
    { id: 'oc-amina', principalUserId: 'u-fatima', organizationId: w.ORG, name: 'Amina Yusuf', personId: 'pid-amina-y', state: 'introduced', kind: 'team', contactKey: 'amina.y@example.com' },
  ], 'oc');
  w.t.commitment = w.aTable([
    { id: 'tc-nmdpra', organizationId: w.ORG, personExternalId: 'p-funmi', source: 'team_reply', text: 'NMDPRA licence variation still has no inspection date. That one is stuck.', state: 'OPEN', waitingOn: 'NMDPRA', dueSaid: null, dueAt: null, statedAt: new Date('2026-11-20T13:00:00Z') },
    { id: 'tc-sorted', organizationId: w.ORG, personExternalId: 'p-amina-y', source: 'team_reply', text: 'that thing we discussed with the commissioner has been sorted', state: 'KEPT', provenBy: null, statedAt: new Date('2026-04-09T08:10:00Z'), resolvedAt: new Date('2026-04-09T08:10:00Z') },
    { id: 'tc-permit', organizationId: w.ORG, personExternalId: 'p-amina-y', source: 'team_reply', text: 'Get the Obajana depot permit granted', state: 'KEPT', provenBy: 'material:pm-permit', statedAt: new Date('2026-03-24T15:40:00Z'), resolvedAt: new Date('2026-05-25T09:00:00Z') },
  ], 'tc');
  w.t.principalMaterial = w.aTable([
    { id: 'pm-ifeoma', organizationId: w.ORG, principalUserId: 'u-fatima', batchId: 'b-if', fromUserId: 'contact:oc-ifeoma', fromAddress: 'ifeoma@example.com', channel: 'email', kind: 'message', fileName: 'message:if', subject: 'Re: 2026 recap, Legal', text: 'Confirming that we have no signed approval letter yet. On BuildRight, mediation is on 3 December; please keep our position confidential.', state: 'kept', receivedAt: new Date('2026-11-20T12:00:00Z') },
    { id: 'pm-voice', organizationId: w.ORG, principalUserId: 'u-fatima', batchId: 'b-v', fromUserId: 'u-fatima', fromAddress: '+234', channel: 'whatsapp', kind: 'voice', fileName: 'voice:1', text: 'I need the full year, what is outstanding, and what I need Dangote to decide.', state: 'kept', receivedAt: new Date('2026-11-20T06:47:00Z') },
  ], 'pm');
  return w;
}

/** A reader that does what the model is asked to do, by the words of the record it is handed. */
function aReader(seen: any[] = []): TheNarrator {
  return {
    write: async () => null,
    readTheRecordWhole: async ({ record }: any) => {
      seen.push(record);
      const row = (words: string) => record.open.find((r: any) => r.text.includes(words))?.id;
      const msg = (words: string) => record.messages.find((m: any) => m.text.includes(words))?.id;
      const proof = record.proven.find((r: any) => r.text.includes('Obajana depot permit'))?.id;
      return {
        promptVersionId: null,
        raw: {
          decisions: [
            { row: row('NMDPRA licence variation'), matter: 'NMDPRA licence variation', question: 'Should leadership raise the inspection delay with the NMDPRA chief executive?', by: '31 December', blocker: 'NMDPRA' },
            { message: msg('BuildRight'), matter: 'On BuildRight, mediation is on 3 December', question: 'What settlement range may Legal offer BuildRight at the mediation?', by: '3 December', blocker: '' },
            /* Not on the record: an id it was not given, and words the message does not hold. Both are dropped. */
            { row: 'R99', matter: 'Something', question: 'Should we buy a new office building?' },
            { message: msg('BuildRight'), matter: 'Pay BuildRight in full', question: 'Should we pay BuildRight the whole claim now?' },
          ],
          ties: [{ claim: row('commissioner has been sorted'), proof }],
        },
      };
    },
  };
}

const theDraftOf = (c: any) => ({ id: 'yd-1', organizationId: 'org-1', principalUserId: 'u-fatima', year: 2026, version: 3, status: 'revised' as const, content: c, parentId: null, approvedAt: null, createdAt: NOW });

describe('what only she can decide is read from the record whole', () => {
  it('reaches Today, Ask, the report and the deck in the same words, with the matter, who has it, the day and what it waits on', async () => {
    const w = aTeamOnRecord();
    const seen: any[] = [];
    const narrator = aReader(seen);
    const record = await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW, narrator });
    /* Her own words are read, as the year-end writer may; what she forwarded is not among them. */
    expect(seen[0].herOwnWords.map((x: any) => x.text)).toEqual(['I need the full year, what is outstanding, and what I need Dangote to decide.']);

    const today = whatNeedsTheDecisionSaid(await buildTheRegister(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW, forADelegate: false }), { now: NOW } as any);
    console.log(`TODAY, WHAT NEEDS YOUR DECISION\n${today}`);
    expect(today).toContain('2 things need your decision.');
    expect(today).toContain('Should leadership raise the inspection delay with the NMDPRA chief executive?');
    expect(today).toContain('What settlement range may Legal offer BuildRight at the mediation? It is wanted by');
    expect(today).not.toMatch(/new office building|whole claim/);

    const c = await buildTheContentWithTheNarrative(record, [], { narrator });
    const report = reportBlocks(c, { version: 3, status: 'revised' }).map((b) => b.text).join('\n');
    const decide = slidesOf(c, { version: 3, status: 'revised' }).slice(-1)[0];
    console.log(`THE REPORT, WAITING FOR A DECISION\n${report.split('\n').filter((l) => /decide|settlement|inspection/i.test(l)).join('\n')}\n\nTHE SLIDE\n${decide.title}\n${decide.lines.join('\n')}`);
    expect(report).toContain('Should leadership raise the inspection delay with the NMDPRA chief executive? NMDPRA licence variation still has no inspection date. That one is stuck. Funmi Adebayo has it.');
    expect(report).toContain('It is waiting on NMDPRA.');
    expect(report).toContain('What settlement range may Legal offer BuildRight at the mediation? On BuildRight, mediation is on 3 December. Ifeoma Chukwu has it. It is needed by 3 December 2026.');
    expect(decide.title).toBe('What needs a decision');
    expect(decide.lines.join(' ')).toContain('What settlement range may Legal offer BuildRight at the mediation?');

    const ask = thePagesOfHerRecord(theDraftOf(c), 'own').map((p) => p.content).join('\n');
    expect(ask).toContain('What settlement range may Legal offer BuildRight at the mediation?');

    /* The April claim and the permit are one matter now: it is no longer only said. */
    expect(report).not.toMatch(/that thing we discussed with the commissioner has been sorted\. Amina Yusuf said it was done/i);
    const permit = report.split('\n').find((l) => l.startsWith('Get the Obajana depot permit granted.'));
    console.log(`THE PERMIT LINE\n${permit}`);
    expect(permit).toContain('Amina Yusuf had it, and it was settled on the record on 25 May 2026.');
    expect(permit).toContain('9 April 2026');
  });

  it('a decision the record no longer shows is cleared, and with no model nothing is changed', async () => {
    const w = aTeamOnRecord();
    w.t.registerNote.rows.push({ id: 'rn-old', organizationId: w.ORG, principalUserId: 'u-fatima', sourceKind: 'commitment', sourceId: 'tc-permit', awaiting: 'decision', decisionQuestion: 'Should we accept the permit?', decisionOptions: [], notTheSameAs: [] });
    await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW, narrator: null });
    expect(w.t.registerNote.rows.find((n: any) => n.id === 'rn-old').awaiting).toBe('decision');
    await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW, narrator: aReader() });
    expect(w.t.registerNote.rows.find((n: any) => n.id === 'rn-old').awaiting).toBeNull();
    expect(w.t.registerNote.rows.filter((n: any) => n.awaiting === 'decision')).toHaveLength(2);
  });
});
