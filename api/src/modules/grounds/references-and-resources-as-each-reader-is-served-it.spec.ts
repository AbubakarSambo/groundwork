import { ForbiddenException } from '@nestjs/common';
import { GroundsService } from './grounds.service';
import { readReferencesAndResources, readTheEvidence, whoCanSeeIt, aKeyFactFrom } from './references-and-resources';
import { theLinesFor } from './what-this-check-in-knows';

/**
 * REFERENCES AND RESOURCES, AS EACH READER IS SERVED IT (Release 1B, pull request 2 of 3). Proved at the server, on the sales
 * check-in of the B6 pictures: Grace Achieng runs "Sales team, Q4" at Drop Access; Kevin, Mercy and Joseph check in.
 *
 *  - with the switch off, every reader is served { on: false }, nothing is written, and the old Context page's own read of the
 *    lines is unchanged by the new kinds;
 *  - the lead reads every section, People and her suggestions included;
 *  - a team member never receives People, the lead's notes on anybody, what to help them with, a line she kept to herself,
 *    her suggestions, a document they may not open, or anybody else's evidence: not hidden, absent from the payload;
 *  - an admin who does not run it reads the shared sections and every piece of evidence, never People and no documents;
 *  - today's Context content lands in its new section at the read, with nothing stored changed;
 *  - only the lead adds to it: a team member and an admin are refused at the server.
 */
const NOW = new Date('2026-10-19T09:00:00Z');
const NOTE_ON_KEVIN = 'Closes well. Doesn’t write down next steps.';
const HELP_KEVIN = 'A next step and a day on every deal.';
const OLD_READ_OF_KEVIN = 'Kevin may leave after Q4 because of the commute.';
const PRIVATE_RULE = 'Never go below 4,200 a unit without asking me.';

function theSalesCheckIn(over: { switchOn?: boolean; brief?: string } = {}) {
  const person = (id: string, userId: string, first: string, last: string, jobTitle: string | null) => ({
    id, userId, email: `${first.toLowerCase()}@dropaccess.test`, nameGiven: null, partyType: id === 'p-grace' ? 'INITIATOR' : 'PARTICIPANT',
    managingOnly: false, roleAsDescribed: null, user: { firstName: first, lastName: last, jobTitle },
  });
  const participants = [
    person('p-grace', 'u-grace', 'Grace', 'Achieng', 'Sales lead'),
    person('p-kevin', 'u-kevin', 'Kevin', 'Omondi', 'Rep, Nairobi hardware'),
    person('p-mercy', 'u-mercy', 'Mercy', 'Wairimu', 'Rep, Kiambu and schools'),
    person('p-joseph', 'u-joseph', 'Joseph', 'Kariuki', null),
  ];
  const ground = {
    id: 'g-sales', label: 'Sales team, Q4', organizationId: 'org-drop', initiatorId: 'u-grace', createdByUserId: 'u-grace', scenario: 'OKR_ALIGNMENT',
    status: 'ACTIVE', approvedById: null, endState: null, kindOfWork: 'sales team',
    brief: over.brief ?? 'Sell 120 water dispensers this quarter, mostly to hardware shops and schools in Nairobi and Kiambu.',
    toldToParticipants: 'Sell 120 water dispensers this quarter, mostly to hardware shops and schools in Nairobi and Kiambu.',
    initiator: { firstName: 'Grace', lastName: 'Achieng' },
    organization: { name: 'Drop Access', timeZone: 'Africa/Nairobi' },
    participants,
  };
  const at = (d: string) => new Date(`2026-10-${d}T08:00:00Z`);
  const lines: any[] = [
    { id: 'l-rule', kind: 'WAY_OF_WORKING', text: 'Drop a lead after three calls with no reply.', audience: 'EVERYONE', aboutParticipantId: null, closedAt: null, createdAt: at('01') },
    { id: 'l-strategy', kind: 'STRATEGY', text: 'Hardware shops first, schools before the January term.', audience: 'EVERYONE', aboutParticipantId: null, closedAt: null, createdAt: at('01') },
    { id: 'l-private-rule', kind: 'WAY_OF_WORKING', text: PRIVATE_RULE, audience: 'LEAD_ONLY', aboutParticipantId: null, closedAt: null, createdAt: at('02') },
    { id: 'l-note', kind: 'NOTE', text: 'Schools buy in January.', audience: 'EVERYONE', aboutParticipantId: null, closedAt: null, createdAt: at('02') },
    { id: 'l-decision', kind: 'DECISION', text: 'Whether a price range counts as a budget.', audience: 'EVERYONE', aboutParticipantId: null, closedAt: null, createdAt: at('02') },
    { id: 'l-unsettled', kind: 'UNSETTLED', text: 'Whether the 120 counts deposits.', audience: 'EVERYONE', aboutParticipantId: null, closedAt: null, createdAt: at('02') },
    { id: 'l-stage', kind: 'STAGE_NEEDS', text: 'Pitched: the decision maker has seen the price.', audience: 'EVERYONE', aboutParticipantId: null, closedAt: null, createdAt: at('03') },
    { id: 'l-coach', kind: 'COACHING', text: 'Find the decision maker before quoting.', audience: 'EVERYONE', aboutParticipantId: null, closedAt: null, createdAt: at('03') },
    { id: 'l-risk', kind: 'RISK', text: 'A price below KES 4,200.', audience: 'EVERYONE', aboutParticipantId: null, closedAt: null, createdAt: at('03') },
    { id: 'l-fact', kind: 'KEY_FACT', text: 'Customers\nHardware shops and schools, Nairobi and Kiambu', audience: 'EVERYONE', aboutParticipantId: null, closedAt: null, createdAt: at('03') },
    { id: 'l-note-kevin', kind: 'PERSON_NOTE', text: NOTE_ON_KEVIN, audience: 'LEAD_ONLY', aboutParticipantId: 'p-kevin', closedAt: null, createdAt: at('04') },
    { id: 'l-help-kevin', kind: 'HELP_WITH', text: HELP_KEVIN, audience: 'LEAD_ONLY', aboutParticipantId: 'p-kevin', closedAt: null, createdAt: at('04') },
    { id: 'l-read-kevin', kind: 'ABOUT_A_PERSON', text: OLD_READ_OF_KEVIN, audience: 'LEAD_ONLY', aboutParticipantId: 'p-kevin', closedAt: null, createdAt: at('04') },
  ];
  const leadNotes = [
    { id: 'n-shared', participantId: null, text: 'This quarter decides the January stock order.', audience: 'EVERYONE' },
    { id: 'n-about-mercy', participantId: 'p-mercy', text: 'Wants to grow into school accounts.', audience: 'LEAD_ONLY' },
  ];
  const documents = [
    { id: 'd-strategy', fileName: 'Q4 sales strategy.pdf', mimeType: 'application/pdf', createdAt: at('01'), visibility: 'OPEN', participantId: 'p-grace', uploaderNote: null, isConversation: false, assessment: { suggests: ['Hardware shops first, schools before the January term.'] } },
    { id: 'd-juja', fileName: 'Juja Hardware price request.pdf', mimeType: 'application/pdf', createdAt: at('15'), visibility: 'CLOSED', participantId: 'p-joseph', uploaderNote: 'The price they want', isConversation: false, assessment: { suggests: ['Asks for 20 units at KES 3,900; includes a competitor’s quote.'] } },
    { id: 'd-mercy-own', fileName: 'Mercy notes.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', createdAt: at('14'), visibility: 'OWN', participantId: 'p-mercy', uploaderNote: 'My own list', isConversation: false, assessment: null },
    { id: 'd-order', fileName: 'IMG_2231.jpg', mimeType: 'image/jpeg', createdAt: at('16'), visibility: 'OPEN', participantId: 'p-mercy', uploaderNote: null, isConversation: false, assessment: null },
    { id: 'd-payment', fileName: 'mpesa.png', mimeType: 'image/png', createdAt: at('12'), visibility: 'OPEN', participantId: 'p-kevin', uploaderNote: null, isConversation: false, assessment: null },
  ];
  const evidence = [
    { id: 'e-order', groundId: 'g-sales', documentId: 'd-order', participantId: 'p-mercy', workItemId: 'w-greenfield', itemName: 'Greenfield Hardware', readAs: 'A signed order', countsAsProof: true, shows: '25 units, signed 13 October.', createdAt: at('16') },
    { id: 'e-payment', groundId: 'g-sales', documentId: 'd-payment', participantId: 'p-kevin', workItemId: 'w-kilele', itemName: 'Kilele Supplies', readAs: 'A payment', countsAsProof: true, shows: 'KES 180,000, 12 October.', createdAt: at('12') },
  ];
  const proposals = [
    { id: 'pp-1', kind: 'RULE', says: 'Discounts above 5% need Grace’s yes.', fromThePlan: 'Any discount over 5% comes to me.', fromDocument: 'Q4 plan.pdf', createdAt: at('14'), status: 'PENDING' },
  ];
  const users: Record<string, any> = {
    'u-grace': { role: 'LEAD', organizationId: 'org-drop', email: 'grace@dropaccess.test', isActive: true, firstName: 'Grace', lastName: 'Achieng' },
    'u-kevin': { role: 'MEMBER', organizationId: 'org-drop', email: 'kevin@dropaccess.test', isActive: true, firstName: 'Kevin', lastName: 'Omondi' },
    'u-mercy': { role: 'MEMBER', organizationId: 'org-drop', email: 'mercy@dropaccess.test', isActive: true, firstName: 'Mercy', lastName: 'Wairimu' },
    'u-naomi': { role: 'ADMIN', organizationId: 'org-drop', email: 'naomi@dropaccess.test', isActive: true, firstName: 'Naomi', lastName: 'Ruto' },
  };
  const writes: string[] = [];
  const created: any[] = [];
  const matchesOr = (row: any, or: any[]) => or.some((c) => Object.entries(c).every(([k, v]) => row[k] === v));
  const prisma: any = {
    ground: {
      findFirst: jest.fn(async () => ground),
      findUnique: jest.fn(async () => ({ ...ground, participants: participants.map((p) => ({ id: p.id, userId: p.userId })) })),
      update: jest.fn(async () => { writes.push('ground.update'); return {}; }),
    },
    organization: { findUnique: jest.fn(async () => ({ release1bTabsOn: over.switchOn ?? true })) },
    user: { findUnique: jest.fn(async (a: any) => users[a.where.id] ?? null) },
    groundContextItem: {
      findMany: jest.fn(async (a: any) => lines.filter((l) => a?.where?.closedAt !== null || !l.closedAt)),
      findFirst: jest.fn(async (a: any) => lines.find((l) => l.id === a.where.id) ?? null),
      create: jest.fn(async ({ data }: any) => { writes.push('groundContextItem.create'); const row = { id: `new-${created.length}`, ...data }; created.push(row); return row; }),
      update: jest.fn(async () => { writes.push('groundContextItem.update'); return {}; }),
    },
    leadContextNote: {
      findMany: jest.fn(async (a: any) => leadNotes.filter((n) => {
        const w = a.where ?? {};
        if (w.participantId === null && n.participantId !== null) return false;
        if (w.participantId?.not === null && n.participantId === null) return false;
        if (w.audience && n.audience !== w.audience) return false;
        return true;
      })),
    },
    groundDocument: {
      findMany: jest.fn(async (a: any) => documents.filter((d) => {
        const w = a.where ?? {};
        if (w.id?.in) return w.id.in.includes(d.id);
        if (w.OR) return matchesOr(d, w.OR);
        if (w.participantId) return d.participantId === w.participantId;
        return true;
      })),
    },
    itemEvidence: {
      findMany: jest.fn(async (a: any) => evidence.filter((e) => {
        const w = a.where ?? {};
        if (w.participantId && e.participantId !== w.participantId) return false;
        if (w.createdAt?.gte && e.createdAt < w.createdAt.gte) return false;
        return true;
      }).sort((x, y) => +y.createdAt - +x.createdAt)),
    },
    planProposal: { findMany: jest.fn(async () => proposals) },
  };
  return { prisma, writes, created };
}

const read = (prisma: any, userId: string) => readReferencesAndResources(prisma, { groundId: 'g-sales', userId, contextEnabled: true }, NOW);

describe("with Release 1B's switch off, nothing new is served, and nothing is written", () => {
  it('every reader is served { on: false }, so the Context tab reads exactly as it did', async () => {
    for (const who of ['u-grace', 'u-naomi', 'u-mercy']) {
      const { prisma, writes } = theSalesCheckIn({ switchOn: false });
      expect(await read(prisma, who)).toEqual({ on: false });
      expect(await readTheEvidence(prisma, { groundId: 'g-sales', userId: who }, {}, NOW)).toBeNull();
      expect(writes).toEqual([]);
    }
  });

  it('the old Context page still reads only its five kinds of line to a team member: no People line reaches it', () => {
    const lines: any[] = [
      { id: '1', kind: 'WAY_OF_WORKING', text: 'A rule', audience: 'EVERYONE' },
      { id: '2', kind: 'PERSON_NOTE', text: NOTE_ON_KEVIN, audience: 'EVERYONE', aboutParticipantId: 'p-kevin' },
      { id: '3', kind: 'HELP_WITH', text: HELP_KEVIN, audience: 'EVERYONE', aboutParticipantId: 'p-kevin' },
    ];
    expect(theLinesFor(lines, { isTheLead: false }).map((l) => l.id)).toEqual(['1']);
  });

  it('a line cannot be added while the switch is off, even by the lead', async () => {
    const { prisma, writes } = theSalesCheckIn({ switchOn: false });
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    await expect(service.addAReference('g-sales', 'u-grace', { kind: 'RULE', text: 'A rule' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(writes).toEqual([]);
  });
});

describe('the lead, Grace, reads every section', () => {
  it('the top line, About this work in her words, and How we work with her lines and the sales starting set', async () => {
    const { prisma, writes } = theSalesCheckIn();
    const r: any = await read(prisma, 'u-grace');
    expect(r.view).toBe('lead');
    expect(r.mayAdd).toBe(true);
    expect(r.topLine).toBe('Your team’s reference for this work. They can read it, except People. Only you can add to it.');
    expect(r.about.purpose).toBe('Sell 120 water dispensers this quarter, mostly to hardware shops and schools in Nairobi and Kiambu.');
    expect(r.about.whose).toBe('Grace, at setup');
    expect(r.about.keyFacts).toEqual([{ id: 'l-fact', label: 'Customers', fact: 'Hardware shops and schools, Nairobi and Kiambu' }]);
    /* Today's Notes, and her note to everyone, land under About this work. */
    expect(r.about.alsoWorthKnowing.map((l: any) => l.text)).toEqual(['This quarter decides the January stock order.', 'Schools buy in January.']);
    /* Today's How we work and The strategy land under Rules, her own private line marked as hers. */
    expect(r.howWeWork.rules).toEqual([
      { id: 'l-rule', text: 'Drop a lead after three calls with no reply.' },
      { id: 'l-strategy', text: 'Hardware shops first, schools before the January term.' },
      { id: 'l-private-rule', text: PRIVATE_RULE, onlyYou: true },
    ]);
    expect(r.howWeWork.stageNeeds.map((l: any) => l.text)).toEqual([
      'Pitched: the decision maker has seen the price.',
      'Qualified: need, budget, decision maker and buying date.',
      'Quoted: the customer has the quote, with a photo or the email.',
      'Won: a signed order or a payment, with proof.',
    ]);
    expect(r.howWeWork.stageNeeds.filter((l: any) => l.fromTheTemplate)).toHaveLength(3);
    expect(r.howWeWork.coaching.map((l: any) => l.text)).toEqual(['Find the decision maker before quoting.']);
    expect(r.howWeWork.risks.map((l: any) => l.text)).toEqual(['A price below KES 4,200.', 'A deal marked won without a signed order or payment.']);
    expect(r.howWeWork.startingSetSays).toBe('Lines marked as Groundwork’s are the starting set for a sales team.');
    /* Still to decide and Not settled are decisions: they stay on the board, never on this page. */
    expect(JSON.stringify(r)).not.toContain('price range counts as a budget');
    expect(JSON.stringify(r)).not.toContain('counts deposits');
    expect(writes).toEqual([]);
  });

  it('Suggested holds the plan proposals waiting for her, and People holds her notes on each person', async () => {
    const { prisma } = theSalesCheckIn();
    const r: any = await read(prisma, 'u-grace');
    expect(r.suggested).toEqual([{ id: 'pp-1', what: 'a rule', from: 'From Q4 plan.pdf, 14 October', says: 'Discounts above 5% need Grace’s yes.', saidAs: 'Any discount over 5% comes to me.' }]);
    const kevin = r.people.find((p: any) => p.participantId === 'p-kevin');
    expect(kevin).toEqual({ participantId: 'p-kevin', name: 'Kevin Omondi', role: 'Rep, Nairobi hardware', note: { id: 'l-note-kevin', text: NOTE_ON_KEVIN }, helpWith: { id: 'l-help-kevin', text: HELP_KEVIN }, earlier: [OLD_READ_OF_KEVIN] });
    const mercy = r.people.find((p: any) => p.participantId === 'p-mercy');
    expect(mercy.earlier).toEqual(['Wants to grow into school accounts.']);
    expect(r.people.map((p: any) => p.name)).toEqual(['Kevin Omondi', 'Mercy Wairimu', 'Joseph Kariuki']);
  });

  it('Documents she may open, with who can see each, and every piece of evidence, newest first', async () => {
    const { prisma } = theSalesCheckIn();
    const r: any = await read(prisma, 'u-grace');
    expect(r.documents.items.map((d: any) => [d.name, d.added, d.summary, d.whoCanSee, d.kind])).toEqual([
      ['Q4 sales strategy.pdf', 'You, 1 October', 'Hardware shops first, schools before the January term.', 'Everyone', 'PDFs'],
      ['Juja Hardware price request.pdf', 'Joseph, 15 October', 'Asks for 20 units at KES 3,900; includes a competitor’s quote.', 'Joseph and you', 'PDFs'],
    ]);
    expect(r.evidence.total).toBe(2);
    expect(r.evidence.items.map((e: any) => [e.readAs, e.belongsTo, e.addedBy, e.addedOn])).toEqual([
      ['A signed order', 'Greenfield Hardware', 'Mercy', '16 October'],
      ['A payment', 'Kilele Supplies', 'Kevin', '12 October'],
    ]);
    expect(r.evidence.people.map((p: any) => p.name).sort()).toEqual(['Kevin', 'Mercy']);
    expect(r.evidenceSays).toBe('Photos, slips and documents your team added as proof. Each also shows on the board.');
  });
});

describe('a team member, Kevin, never receives People or the lead’s notes', () => {
  it('the keys are absent, and no private word is anywhere in what he is sent', async () => {
    const { prisma } = theSalesCheckIn();
    const r: any = await read(prisma, 'u-kevin');
    expect(r.view).toBe('member');
    expect(r.mayAdd).toBe(false);
    expect(r.topLine).toBe('Your team’s reference for this work, kept by Grace.');
    expect('people' in r).toBe(false);
    expect('suggested' in r).toBe(false);
    const sent = JSON.stringify(r);
    for (const secret of [NOTE_ON_KEVIN, HELP_KEVIN, OLD_READ_OF_KEVIN, PRIVATE_RULE, 'Wants to grow into school accounts.', 'Discounts above 5%', 'Juja Hardware price request.pdf', 'Mercy notes.docx']) {
      expect(sent).not.toContain(secret);
    }
    /* What everyone reads is still there. */
    expect(r.howWeWork.coaching.map((l: any) => l.text)).toEqual(['Find the decision maker before quoting.']);
    expect(r.about.alsoWorthKnowing.map((l: any) => l.text)).toEqual(['This quarter decides the January stock order.', 'Schools buy in January.']);
  });

  it('reads what everyone reads about the work, never the lead’s own brief where it differs', async () => {
    const BRIEF = 'Sell 120 units. Kevin needs pushing on follow-ups.';
    const { prisma } = theSalesCheckIn({ brief: BRIEF });
    const kevin: any = await read(prisma, 'u-kevin');
    expect(kevin.about.purpose).toBe('Sell 120 water dispensers this quarter, mostly to hardware shops and schools in Nairobi and Kiambu.');
    expect(kevin.about.whose).toBe('Groundwork wrote this from Grace’s words at setup.');
    expect(JSON.stringify(kevin)).not.toContain('needs pushing');
    const grace: any = await read(prisma, 'u-grace');
    expect(grace.about.yourOwnWords).toBe(BRIEF);
  });

  it('his own evidence only, said as his, and the documents shared with everyone', async () => {
    const { prisma } = theSalesCheckIn();
    const r: any = await read(prisma, 'u-kevin');
    expect(r.evidence.items.map((e: any) => [e.readAs, e.belongsTo, e.addedBy])).toEqual([['A payment', 'Kilele Supplies', 'You']]);
    expect(r.evidence.people).toEqual([]);
    expect(r.evidenceSays).toBe('Proof you added in your check-ins. Each also shows on the board.');
    expect(r.documents.items.map((d: any) => d.name)).toEqual(['Q4 sales strategy.pdf']);
    /* Asking for another person's evidence by filter still returns only his own. */
    const page: any = await readTheEvidence(prisma, { groundId: 'g-sales', userId: 'u-kevin' }, { person: 'p-mercy' }, NOW);
    expect(page.items.map((e: any) => e.id)).toEqual(['e-payment']);
  });

  it('cannot add to it, or change a line: the server refuses, and nothing is written', async () => {
    const { prisma, writes } = theSalesCheckIn();
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    await expect(service.addAReference('g-sales', 'u-kevin', { kind: 'RULE', text: 'Anything goes.' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.addAReference('g-sales', 'u-kevin', { kind: 'PERSON_NOTE', text: 'About Mercy', aboutParticipantId: 'p-mercy' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.changeAReference('g-sales', 'u-kevin', 'l-rule', { closed: true })).rejects.toBeInstanceOf(ForbiddenException);
    expect(writes).toEqual([]);
  });
});

describe('an admin who does not run it, Naomi', () => {
  it('reads the shared sections and every piece of evidence, never People, and no documents', async () => {
    const { prisma } = theSalesCheckIn();
    const r: any = await read(prisma, 'u-naomi');
    expect(r.view).toBe('admin');
    expect(r.mayAdd).toBe(false);
    expect('people' in r).toBe(false);
    expect('suggested' in r).toBe(false);
    expect(r.documents).toEqual({ total: 0, items: [], notOpenToYou: true });
    expect(r.evidence.total).toBe(2);
    const sent = JSON.stringify(r);
    for (const secret of [NOTE_ON_KEVIN, HELP_KEVIN, OLD_READ_OF_KEVIN, PRIVATE_RULE]) expect(sent).not.toContain(secret);
  });

  it('cannot add to it while the lead is still in the organisation', async () => {
    const { prisma, writes } = theSalesCheckIn();
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    await expect(service.addAReference('g-sales', 'u-naomi', { kind: 'RISK', text: 'Something' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(writes).toEqual([]);
  });
});

describe('the lead adds to it', () => {
  it('a rule is today’s How we work line, shared; a note on a person is hers alone, whatever is sent', async () => {
    const { prisma, created } = theSalesCheckIn();
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    (service as any).logger = { log: () => undefined, warn: () => undefined };
    await service.addAReference('g-sales', 'u-grace', { kind: 'RULE', text: 'Discounts above 5% need Grace’s yes.' });
    await service.addAReference('g-sales', 'u-grace', { kind: 'PERSON_NOTE', text: 'New. Needs structure more than pressure.', aboutParticipantId: 'p-joseph' });
    const fact: any = await service.addAReference('g-sales', 'u-grace', { kind: 'KEY_FACT', label: 'Product', text: '20 L dispenser, KES 4,500 list price' });
    expect(created.map((c) => [c.kind, c.audience, c.aboutParticipantId])).toEqual([
      ['WAY_OF_WORKING', 'EVERYONE', null],
      ['PERSON_NOTE', 'LEAD_ONLY', 'p-joseph'],
      ['KEY_FACT', 'EVERYONE', null],
    ]);
    expect(fact).toMatchObject({ label: 'Product', fact: '20 L dispenser, KES 4,500 list price' });
    /* A note about the lead herself, or nobody, is refused. */
    await expect(service.addAReference('g-sales', 'u-grace', { kind: 'HELP_WITH', text: 'x', aboutParticipantId: 'p-grace' })).rejects.toThrow('Choose the person this note is about.');
  });
});

describe('the words of the page', () => {
  it('who can see a document, said to whoever reads it', () => {
    const lead = { participantId: 'p-grace', isLead: true };
    const joseph = { participantId: 'p-joseph', isLead: false };
    expect(whoCanSeeIt({ visibility: 'OPEN', participantId: 'p-joseph' }, lead, 'Joseph', 'Grace')).toBe('Everyone');
    expect(whoCanSeeIt({ visibility: 'CLOSED', participantId: 'p-joseph' }, lead, 'Joseph', 'Grace')).toBe('Joseph and you');
    expect(whoCanSeeIt({ visibility: 'CLOSED', participantId: 'p-joseph' }, joseph, 'Joseph', 'Grace')).toBe('You and Grace');
    expect(whoCanSeeIt({ visibility: 'OWN', participantId: 'p-joseph' }, joseph, 'Joseph', 'Grace')).toBe('Only you');
  });

  it('a key fact is its label and its fact, and nothing else', () => {
    expect(aKeyFactFrom('x', 'Sold means\nA signed order or a payment, with proof')).toEqual({ id: 'x', label: 'Sold means', fact: 'A signed order or a payment, with proof' });
    expect(aKeyFactFrom('x', 'Only a label')).toBeNull();
  });
});
