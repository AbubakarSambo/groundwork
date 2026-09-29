import * as fs from 'fs';
import * as path from 'path';
import { ConversationService } from './conversation.service';
import { READS_DIFFERENTLY, thisReplyRaisesIt } from './a-document-that-disagrees-is-asked-once';

/**
 * A DOCUMENT THAT READS DIFFERENTLY FROM THE RECORD IS ASKED ABOUT ONCE (week 14, request 6c).
 *
 * Otieno said the 600L's lowest price is 78,000. The price list he can see says 76,000. The turn
 * that puts the two to him is stamped with his line's id, and from then on the line is not offered
 * to the model again, in this check-in or any later one.
 */
const LINE = { id: 'e-1', text: 'The lowest price for the 600L is 78,000.', documentSays: 'Lowest price for the 600L: KES 76,000' };

function aSession(stampsSoFar: string[]) {
  const s = Object.create(ConversationService.prototype) as any;
  s.prisma = {
    recordEntry: { findMany: jest.fn(async () => [LINE]) },
    conversationTurn: { groupBy: jest.fn(async () => stampsSoFar.map((askedFor) => ({ askedFor }))) },
  };
  return s;
}

describe('a document that reads differently is asked about once', () => {
  it('the turn that puts the document\'s number to him is stamped with his line', async () => {
    const said = 'Your price list says the lowest price for the 600L is KES 76,000, and you told me 78,000. Which is current?';
    expect(await aSession([]).theDocumentQuestionItRaised('p-ot', said)).toBe(`${READS_DIFFERENTLY}e-1`);
  });

  it('a turn that does not raise it is not stamped for it', async () => {
    expect(await aSession([]).theDocumentQuestionItRaised('p-ot', 'What moved this week?')).toBeNull();
    /* Saying the number without asking is not asking. */
    expect(thisReplyRaisesIt('The list says 76,000.', LINE)).toBe(false);
  });

  it('once asked, it is never stamped or offered again', async () => {
    const s = aSession([`${READS_DIFFERENTLY}e-1`]);
    expect(await s.theDocumentQuestionItRaised('p-ot', 'The list says 76,000 and you said 78,000. Which is current?')).toBeNull();
    expect([...(await s.theLinesAlreadyAskedAbout('p-ot'))]).toEqual(['e-1']);
  });

  it('the check-in offers the model only lines not yet asked, one at a time, and stamps both the opener and every reply', () => {
    const CONVO = fs.readFileSync(path.join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(CONVO).toContain('return all.filter((r) => !asked.has(r.id)).slice(0, 1);');
    expect(CONVO).toContain('...await this.theDocumentQuestionItRaised(checkIn.participantId, reply).then((raised) => (raised ? { askedFor: raised } : {})),');
    expect(CONVO).toContain('...await this.theDocumentQuestionItRaised(checkIn.participantId, opening).then((raised) => (raised ? { askedFor: raised } : {})),');
    /* The stamps are read only from this person's own check-ins. */
    expect(CONVO).toContain("where: { role: TurnRole.AI, askedFor: { startsWith: READS_DIFFERENTLY }, checkIn: { participantId } }");
  });
});
