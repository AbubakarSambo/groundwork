import { anInboundHarness } from './a-whatsapp-inbound-harness';
import { AssistantService } from '../assistant/assistant.service';
import { onWhatsApp } from '../assistant/a-check-in-kept-in-the-app-is-not-read-on-whatsapp';

/**
 * PILOTS, 13 OCTOBER 2026, PROBLEM 6. Grace runs the sales check-in. Her "Hi", "I want to check in myself" and START on
 * WhatsApp were answered "I have not added the line. Nothing was changed. What does doing well look like here?", left
 * over from Add context in the app two days before. The lead's own check-in opens on her word, as Check in yourself
 * does in the app, and a setup turn left waiting in the app does not take her message.
 */
function gracesPhone() {
  const h = anInboundHarness({ open: [] });
  let made = false;
  h.prisma.ground = {
    findMany: jest.fn(async () => [{ id: 'g-sales' }]),
    findUnique: jest.fn(async () => ({ id: 'g-sales', status: 'ACTIVE', initiatorId: 'u-1', organizationId: 'org-1' })),
  };
  h.prisma.groundParticipant.findFirst = jest.fn(async (q: any) => (q?.where?.userId ? { id: 'p-grace' } : null));
  const theRow = () => ({ id: 'ci-grace-4', status: 'NOT_STARTED', sessionNumber: 4, availableFrom: null, createdAt: new Date(), ground: { label: 'DropPure sales', scenario: 'PULSE_CHECK', overWhatsApp: null, cadence: 'DAILY' } });
  h.prisma.checkIn.findFirst = jest.fn(async () => null);
  h.prisma.checkIn.aggregate = jest.fn(async () => ({ _max: { sessionNumber: 3 } }));
  h.prisma.checkIn.create = jest.fn(async () => { made = true; return { id: 'ci-grace-4', sessionNumber: 4 }; });
  h.prisma.checkIn.findMany = jest.fn(async () => (made ? [theRow()] : []));
  return h;
}

describe("the lead's own check-in, on WhatsApp", () => {
  it.each(['Hi', 'START', 'I want to check in myself'])('"%s" opens her own check-in, and Ask is not asked', async (word) => {
    const h = gracesPhone();
    await h.service.handle('org-1', h.message(word), 'ours');
    expect(h.prisma.checkIn.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ participantId: 'p-grace', optional: true }) }));
    expect(h.conversation.open).toHaveBeenCalledWith('ci-grace-4', 'u-1');
    expect(h.assistant.respond).not.toHaveBeenCalled();
    expect(h.said.join(' ')).not.toMatch(/I have not added the line|What does doing well look like/);
  });

  it('a real question still goes to Ask, and nothing is opened', async () => {
    const h = gracesPhone();
    await h.service.handle('org-1', h.message('What is the price of 40 units?'), 'ours');
    expect(h.prisma.checkIn.create).not.toHaveBeenCalled();
    expect(h.assistant.respond).toHaveBeenCalled();
  });
});

describe('a setup turn left waiting in the app does not take a WhatsApp message', () => {
  it('a line offered two days ago in the app is let go, and "Hi" is not read as its No', async () => {
    const svc = Object.create(AssistantService.prototype) as any;
    const updates: any[] = [];
    svc.prisma = {
      assistantProposal: {
        findFirst: jest.fn(async () => ({ id: 'pp1', kind: 'context_line', state: 'PARKED', createdAt: new Date(Date.now() - 2 * 86_400_000), payload: { groundId: 'g-sales' } })),
        update: jest.fn(async (a: any) => { updates.push(a); return {}; }),
      },
    };
    svc.resolveParked = jest.fn(async () => ({ lane: 'add_context', blocks: [{ type: 'text', body: 'I have not added the line. Nothing was changed.' }] }));
    svc.answerTheRest = jest.fn();
    await onWhatsApp(() => svc.answer('org-1', 'person-1', 'grace', 'Hi', false, undefined, 'u-1').catch(() => null));
    expect(svc.resolveParked).not.toHaveBeenCalled();
    expect(updates[0]).toMatchObject({ where: { id: 'pp1' }, data: { state: 'DROPPED' } });
  });

  it('one offered a minute ago on WhatsApp still takes its yes', async () => {
    const svc = Object.create(AssistantService.prototype) as any;
    svc.prisma = { assistantProposal: { findFirst: jest.fn(async () => ({ id: 'pp2', kind: 'context_line', state: 'PARKED', createdAt: new Date(Date.now() - 60_000), payload: { groundId: 'g-sales' } })), update: jest.fn() } };
    svc.resolveParked = jest.fn(async () => ({ lane: 'add_context', blocks: [] }));
    await onWhatsApp(() => svc.answer('org-1', 'person-1', 'grace', 'yes', false, undefined, 'u-1'));
    expect(svc.resolveParked).toHaveBeenCalled();
  });
});
