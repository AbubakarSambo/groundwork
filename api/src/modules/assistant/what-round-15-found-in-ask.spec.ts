import { AssistantService } from './assistant.service';
import { theRecordTheyMayRead, everyFigureIsInTheDocumentsOrSums, ANSWER_FROM_THE_DOCUMENTS_PROMPT } from './a-question-is-answered-from-the-documents';
import { theRound15AsADatabase, R15, R15_FRIDAY_EVENING, thePersonOfRound15 } from '../board/the-round-15-bed';
import { withNothing } from '../board/the-persons-record-bed';
import { NOTHING_TO_PUT_FIRST } from './what-to-do-next';

/**
 * WHAT ASK TOLD GRACE AND KEVIN IN POLISH ROUND 15 (Drop Access, Friday 16 October; the scorer's untrue lines U3, U4, U5 and U28).
 *  - Grace asked "How far is the team from the 120 units, counting only sales with proof?" and read "The only sale with proof is from
 *    Kilele Hotel for 40 units... 80 units away", while her board said 53.
 *  - Kevin asked "How many units have I sold with proof this month?" and read "You have sold 40 units with proof of payment", while his
 *    board said 51.
 *  - Kevin read "You said you would do 2 things that are still waiting" and, seconds later, "You have no open commitments or to-dos".
 *  - Grace read that Peter's line "is proven by a document", from an M-Pesa message Kevin added.
 * What Ask reads is checked here, as each reader may read it. The model is not called.
 */
const ORG = R15.drop.ground.organizationId;
const recordAs = async (userId: string) => (await theRecordTheyMayRead(theRound15AsADatabase({ asOf: R15_FRIDAY_EVENING }), { organizationId: ORG, userId }, R15_FRIDAY_EVENING))[0];

describe('Ask counts the sales the way the board counts them (U3, U4)', () => {
  it('Grace’s record holds the team’s 53 units with proof, 67 short of the 120, and each sale with what shows it', async () => {
    const doc = await recordAs(R15.drop.ground.initiatorId);
    expect(doc.content.startsWith('THE SALES ON RECORD, COUNTED THE WAY THE BOARD COUNTS THEM:')).toBe(true);
    expect(doc.content).toContain('- The team’s aim, “Units sold by 30 October”, is 120. 53 sold, 53 with proof of payment. Not yet. 53 of the 120 units are sold. 53 are paid (Kilele, Juja Hardware, Ngong Road Minimart and Savannah Cafe). It is 67 short of the 120.');
    expect(doc.content).toContain('- Juja Hardware is sold by Joseph Kariuki, 2 units for KES 10,000. It is paid, and the M-Pesa code TGH5K2M9QX shows it.');
    expect(doc.content).toContain('- Savannah Cafe is sold by Kevin Omondi, 6 units for KES 30,000. It is paid, and the M-Pesa code RBT7Y3KQ2P shows it.');
    /* The answer Grace should have read passes the figure check against what Ask reads. */
    expect(everyFigureIsInTheDocumentsOrSums('On the record, the team has sold 53 units with proof of payment, so it is 67 units away from the 120.', [doc])).toBe(true);
  });
  it('Kevin’s record holds his own 51 units with proof, and never Joseph’s sale or the team’s count', async () => {
    const doc = await recordAs(thePersonOfRound15('Kevin').userId);
    expect(doc.content).toContain('- Kevin Omondi’s own aim, “I\'m aiming to hit my 30 units”, is 30. 51 sold, 51 with proof of payment. Yes. 51 units are sold, and 30 were needed.');
    expect(doc.content).toContain('- Ngong Road Minimart is sold by Kevin Omondi, 5 units for KES 25,000. It is paid, and the M-Pesa code SFK2P8LQ4C shows it.');
    expect(doc.content).not.toMatch(/Joseph|Juja|Mercy|The team’s aim/);
  });
  it('a code typed in full is proof, and a document somebody else added proves nothing of Peter’s (U28)', async () => {
    const grace = await recordAs(R15.drop.ground.initiatorId);
    expect(grace.content).toContain('progress, proven by the M-Pesa code they typed: M-Pesa code TGH5K2M9QX.');
    expect(grace.content).not.toMatch(/proven by a document: I haven't actually finished my check-in/);
    expect(ANSWER_FROM_THE_DOCUMENTS_PROMPT).toContain('use "THE SALES ON RECORD" in the record');
  });
});

/* ------------------------------------------------------------------------------------------------ U5: the two lanes read one list */

const KEVIN = { id: 'pe-kevin', externalId: 'x-kevin', email: 'kevin@dropaccess.test', linkedUserId: 'u-kevin' };
const promises = [
  { id: 'c1', participantId: 'p-kevin', groundId: 'g', text: 'I need to send a price list to Savannah Cafe', whenSaid: null, status: 'UNKNOWN', createdAt: new Date('2026-10-12T11:03:00Z'), ground: { label: 'Sales team, Q4' } },
  { id: 'c2', participantId: 'p-kevin', groundId: 'g', text: 'Follow up with Savannah Cafe on that quote', whenSaid: null, status: 'UNKNOWN', createdAt: new Date('2026-10-13T11:03:00Z'), ground: { label: 'Sales team, Q4' } },
];
function anAssistantFor(lines: any[] = []) {
  const prisma = withNothing({
    recordEntry: { findMany: jest.fn(async () => lines) },
    person: { findFirst: jest.fn(async () => KEVIN) },
    commitment: { findMany: jest.fn(async () => []) },
    todo: { findMany: jest.fn(async () => []) },
    groundCommitment: { findMany: jest.fn(async () => promises) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p-kevin', groundId: 'g', nameGiven: 'Kevin Omondi', user: { firstName: 'Kevin', lastName: 'Omondi' } }]) },
  });
  const svc: any = Object.create(AssistantService.prototype);
  Object.assign(svc, {
    prisma,
    board: { whoNeedsYouThisWeek: async () => ({ buckets: [] }) },
    isAnAdminHere: async () => false,
    theBoardLeavesOut: async () => ({ leaveOut: new Set() }),
    compose: async (r: any) => r,
  });
  return svc;
}
const said = (reply: any) => (reply.blocks ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');

describe('“What did I promise?” and “What should I do next?” read the same promises (U5)', () => {
  it('Kevin is never told he has nothing open while the other lane lists two promises', async () => {
    const svc = anAssistantFor();
    const promised = said(await svc.myCommitments(ORG, KEVIN.id));
    const next = said(await svc.whatNext(ORG, KEVIN.externalId, KEVIN.linkedUserId));
    expect(promised).toContain('You said you would do 2 things that are still waiting.');
    expect(next).not.toContain('You have no open commitments or to-dos');
    expect(next).toMatch(/^Start with "I need to send a price list to Savannah Cafe/);
    expect(next).toContain('After that, one more thing is open.');
  });
  it('promises the record shows were done are open in neither: Kevin sent the price list and the quote on 13 October', async () => {
    const svc = anAssistantFor([{ id: 'l1', participantId: 'p-kevin', type: 'PROGRESS', text: 'I sent [Savannah Cafe] the price list this morning. The owner, Jane, wants 6 units, so I sent her a quote for KES 30,000.', createdAt: new Date('2026-10-13T11:03:31Z') }]);
    const promised = said(await svc.myCommitments(ORG, KEVIN.id));
    const next = said(await svc.whatNext(ORG, KEVIN.externalId, KEVIN.linkedUserId));
    expect(promised).toBe('You have not said you will do anything that is still waiting. When you say you will do something in a check-in, it shows up here.');
    expect(next).toBe(NOTHING_TO_PUT_FIRST);
  });
});
