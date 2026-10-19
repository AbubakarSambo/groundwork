import { readFileSync } from 'fs';
import { join } from 'path';
import { readReferencesAndResources, readTheEvidence, theCollectionsGroupOf, theBillItBelongsTo } from './references-and-resources';
import {
  MUCHEMI_ORG, MUCHEMI_PEOPLE, MUCHEMI_FEE_NOTES, MUCHEMI_EVIDENCE, MUCHEMI_MORE_EVIDENCE, MUCHEMI_DOCUMENTS,
} from './__fixtures__/muchemi-and-co';

/**
 * FEE NOTES IN REFERENCES AND RESOURCES (Release 2, pull request 3 of 3; the B6 fee-notes pictures, references-fee-notes-lead.txt and
 * -member.txt), proved at the server for Muchemi & Co (test)'s fee notes check-in:
 *  - where both Release 1B's tabs and Release 2 are on: How we work carries Groundwork's starting set for fee notes (Due, Promised,
 *    Paid, and the two risks), in the organisation's word for the bill; the engagement letter and the fee schedule are under
 *    Documents, each to whoever may open it; the slip and the client's email are under Evidence, filed on their fee note, grouped
 *    as the pictures group them;
 *  - Wanjiru reads every section; Aisha reads the documents open to her and only her own evidence;
 *  - with Release 2 off, the page reads exactly as Release 1B draws it, with no fee notes starting set.
 */
const NOW = new Date('2026-10-21T15:00:00.000Z');
const person = (k: keyof typeof MUCHEMI_PEOPLE) => {
  const p = MUCHEMI_PEOPLE[k];
  return {
    id: p.participantId, userId: p.userId, email: p.email, nameGiven: null, partyType: k === 'partner' ? 'INITIATOR' : 'PARTICIPANT',
    managingOnly: false, roleAsDescribed: null, user: { firstName: p.firstName, lastName: p.lastName, jobTitle: p.jobTitle },
  };
};

function theFeeNotesCheckIn(over: { release2On?: boolean } = {}) {
  const participants = (['partner', 'brian', 'aisha', 'njeri'] as const).map(person);
  const ground = {
    ...MUCHEMI_FEE_NOTES,
    checkInType: 'invoices or fee notes', checkInTypeConfirmedAt: new Date('2026-10-05T08:00:00.000Z'),
    createdByUserId: MUCHEMI_FEE_NOTES.initiatorId, status: 'ACTIVE', approvedById: null, endState: null,
    toldToParticipants: MUCHEMI_FEE_NOTES.brief,
    initiator: { firstName: 'Wanjiru', lastName: 'Muchemi' },
    organization: { name: MUCHEMI_ORG.name, timeZone: 'Africa/Nairobi' },
    participants,
  };
  const evidence = [...MUCHEMI_EVIDENCE, ...MUCHEMI_MORE_EVIDENCE];
  const users: Record<string, any> = Object.fromEntries(Object.values(MUCHEMI_PEOPLE).map((p) => [p.userId, { role: p.userId === 'u-wanjiru' ? 'LEAD' : 'MEMBER', organizationId: MUCHEMI_ORG.id, email: p.email, isActive: true }]));
  const matchesOr = (row: any, or: any[]) => or.some((c) => Object.entries(c).every(([k, v]) => row[k] === v));
  const prisma: any = {
    ground: { findFirst: jest.fn(async () => ground), findUnique: jest.fn(async () => ground) },
    organization: { findUnique: jest.fn(async () => ({ ...MUCHEMI_ORG, release2CollectionsOn: over.release2On !== false })) },
    user: { findUnique: jest.fn(async (a: any) => users[a.where.id] ?? null) },
    groundContextItem: { findMany: jest.fn(async () => []) },
    leadContextNote: { findMany: jest.fn(async () => []) },
    groundDocument: {
      findMany: jest.fn(async (a: any) => MUCHEMI_DOCUMENTS.filter((d) => {
        const w = a.where ?? {};
        if (w.id?.in) return w.id.in.includes(d.id);
        if (w.OR) return matchesOr(d, w.OR);
        if (w.participantId) return d.participantId === w.participantId;
        return true;
      }).sort((x, y) => +x.createdAt - +y.createdAt)),
    },
    itemEvidence: {
      findMany: jest.fn(async (a: any) => evidence.filter((e) => {
        const w = a.where ?? {};
        if (w.participantId && e.participantId !== w.participantId) return false;
        if (w.createdAt?.gte && e.createdAt < w.createdAt.gte) return false;
        return true;
      }).sort((x, y) => +y.createdAt - +x.createdAt)),
    },
    planProposal: { findMany: jest.fn(async () => []) },
  };
  return prisma;
}

const read = (prisma: any, userId: string) => readReferencesAndResources(prisma, { groundId: MUCHEMI_FEE_NOTES.id, userId, contextEnabled: true }, NOW) as Promise<any>;

describe('Wanjiru, the partner, reads the fee notes starting set, every document and every piece of evidence', () => {
  it('How we work: Due, Promised and Paid as Groundwork\'s starting set for fee notes, and the two risks', async () => {
    const r = await read(theFeeNotesCheckIn(), 'u-wanjiru');
    expect(r.view).toBe('lead');
    expect(r.itemWord).toBe('fee note');
    expect(r.howWeWork.stageNeeds).toEqual([
      { id: 'template-stage-0', text: 'Due: the date or event in the engagement letter has passed.', fromTheTemplate: true },
      { id: 'template-stage-1', text: 'Promised: the client gave a date.', fromTheTemplate: true },
      { id: 'template-stage-2', text: 'Paid: with a slip, M-Pesa message or receipt.', fromTheTemplate: true },
    ]);
    expect(r.howWeWork.risks.map((l: any) => l.text)).toEqual(['A court event that makes a fee note due, with no fee note raised.', 'A promised date that passes without payment.']);
    expect(r.howWeWork.startingSetSays).toBe('Lines marked as Groundwork’s are the starting set for fee notes.');
  });

  it('Documents: the engagement letter and the fee schedule, each with who can see it; the slip and the email are evidence, not documents', async () => {
    const r = await read(theFeeNotesCheckIn(), 'u-wanjiru');
    expect(r.documents.items.map((d: any) => [d.name, d.added, d.summary, d.whoCanSee])).toEqual([
      ['Fee schedule 2026.pdf', 'You, 1 September', 'Rates and terms: payment within 30 days.', 'Everyone'],
      ['Billing guidelines.docx', 'Njeri, 1 September', 'When to raise, remind, call and escalate.', 'Everyone'],
      ['Engagement letter, Kasarani Foods.pdf', 'You, 3 September', 'Three fee notes of KES 250,000: on instruction, on filing the reply, on the hearing date.', 'Only you'],
    ]);
  });

  it('Evidence: the slip and the client\'s email, each filed on its fee note, grouped as the pictures group them', async () => {
    const r = await read(theFeeNotesCheckIn(), 'u-wanjiru');
    expect(r.evidence.items.map((e: any) => [e.readAs, e.shows, e.belongsTo, e.addedBy, e.addedOn, e.group, e.countsAsProof])).toEqual([
      ['A payment', 'Equity Bank remittance advice: KES 250,000 received from Kasarani Foods for FN-004.', 'Fee note FN-004', 'Njeri', '20 October', 'Payments', true],
      ['A client email', 'Will pay once head office releases the funds.', 'Fee note FN-007', 'Aisha', '12 October', 'Client letters', false],
    ]);
    expect(r.evidenceGroups).toEqual(['Court filings', 'Payments', 'Client letters', 'Other documents']);
    const payments: any = await readTheEvidence(theFeeNotesCheckIn(), { groundId: MUCHEMI_FEE_NOTES.id, userId: 'u-wanjiru' }, { group: 'Client letters' }, NOW);
    expect(payments.items.map((e: any) => e.belongsTo)).toEqual(['Fee note FN-007']);
  });
});

describe('Aisha, an associate, reads the same How we work, the documents open to her, and only her own evidence', () => {
  it('no engagement letter (closed to the partner), no slip Njeri added, and her own email as "You"', async () => {
    const r = await read(theFeeNotesCheckIn(), 'u-aisha');
    expect(r.view).toBe('member');
    expect(r.topLine).toBe('Your team’s reference for this work, kept by Wanjiru.');
    expect(r.howWeWork.stageNeeds.map((l: any) => l.text)).toEqual(['Due: the date or event in the engagement letter has passed.', 'Promised: the client gave a date.', 'Paid: with a slip, M-Pesa message or receipt.']);
    expect(r.documents.items.map((d: any) => d.name)).toEqual(['Fee schedule 2026.pdf', 'Billing guidelines.docx']);
    expect(r.evidence.items.map((e: any) => [e.readAs, e.belongsTo, e.addedBy])).toEqual([['A client email', 'Fee note FN-007', 'You']]);
    expect(r.evidenceSays).toBe('Proof you added in your check-ins. Each also shows on the board.');
    expect(r.people).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain('Equity Bank');
    expect(JSON.stringify(r)).not.toContain('Engagement letter');
  });
});

describe('with Release 2 off, References and resources reads exactly as Release 1B draws it', () => {
  it('no fee notes starting set, the usual evidence groups, and evidence belongs to its item by name', async () => {
    const r = await read(theFeeNotesCheckIn({ release2On: false }), 'u-wanjiru');
    expect(r.howWeWork.stageNeeds).toEqual([]);
    expect(r.howWeWork.risks).toEqual([]);
    expect(r.howWeWork.startingSetSays).toBeNull();
    expect(r.itemWord).toBe('piece of work');
    expect(r.evidenceGroups).toBeUndefined();
    expect(r.evidence.items.map((e: any) => [e.belongsTo, e.group])).toEqual([['FN-004', 'Payments'], ['FN-007', 'Other documents']]);
  });
});

describe('the words used', () => {
  it('a fee note with a number is "Fee note FN-004"; one with only a client is "Kasarani Foods, fee note"', () => {
    expect(theBillItBelongsTo('FN-004', 'fee note')).toBe('Fee note FN-004');
    expect(theBillItBelongsTo('Kasarani Foods', 'fee note')).toBe('Kasarani Foods, fee note');
    expect(theCollectionsGroupOf('A stamped reply, filed in court')).toBe('Court filings');
    expect(theCollectionsGroupOf('A payment')).toBe('Payments');
  });
});

describe('the screens draw what the server serves', () => {
  it('the JSON the fee notes page is tested with is exactly what the server serves Wanjiru and Aisha', async () => {
    const kept = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'grounds', '__fixtures__', 'fee-notes-references-served.json'), 'utf8'));
    const served = { wanjiru: await read(theFeeNotesCheckIn(), 'u-wanjiru'), aisha: await read(theFeeNotesCheckIn(), 'u-aisha') };
    expect(JSON.parse(JSON.stringify(served))).toEqual(kept);
  });
});
