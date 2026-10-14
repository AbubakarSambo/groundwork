import { ConversationService } from './conversation.service';

/**
 * REVIEWER, 14 OCTOBER: A PARTICIPANT NEVER READS THE LEAD'S JUDGEMENT, SO IT NEVER REACHES THE MODEL IN THEIR TURN.
 *
 * Njeri's private first check-in wrote David's roleAsDescribed as "A team member you identified as a potential 'weak link'".
 * The main prompt blanks it, but the fit of David's answer sent it to the model and could store it as his kind. This
 * calls the real fitTheirAnswer and reads everything it sends and stores.
 */
const WEAK = "David Mutua - A team member you identified as a potential 'weak link'";

function run(partyType: 'PARTICIPANT' | 'INITIATOR', kindFromTheModel: string) {
  const sent: string[] = [];
  const stored: any[] = [];
  const svc: any = Object.create(ConversationService.prototype);
  svc.logger = { warn: () => undefined, log: () => undefined };
  svc.prisma = {
    checkIn: {
      findUnique: jest.fn(async () => ({
        groundId: 'g1', whatWeHave: {},
        participant: { id: 'p-david', roleAsDescribed: WEAK, organisationGiven: null, partyType },
        turns: [{ content: 'I own all the Kamau v. Apex Ltd documents.' }, { content: 'The witness statement is ready.' }],
      })),
      update: jest.fn(async (a: any) => { stored.push(a.data); return {}; }),
    },
  };
  svc.theFrameFor = jest.fn(async () => [{ id: 'item-due', asks: 'What is the matter?', shape: 'THING', askedOf: null, matters: 'x', required: true }]);
  svc.anthropic = {
    extract: jest.fn(async (system: string, messages: any[]) => { sent.push(system, ...messages.map((m) => m.content)); return { kind: kindFromTheModel, organisation: '', values: {} }; }),
  };
  return { svc, sent, stored };
}

describe("the fit of a participant's answer", () => {
  it('sends nothing of the lead\'s judgement, and stores none of it as his kind', async () => {
    const { svc, sent, stored } = run('PARTICIPANT', '');
    await svc.fitTheirAnswer('c-david');
    expect(sent.join('\n')).not.toMatch(/weak link|you identified/i);
    expect(JSON.stringify(stored)).not.toMatch(/weak link|you identified/i);
  });
  it('the lead\'s own description of herself is still read for her own answer', async () => {
    const { svc, sent } = run('INITIATOR', '');
    await svc.fitTheirAnswer('c-njeri');
    expect(sent.join('\n')).toContain('weak link');
  });
});
