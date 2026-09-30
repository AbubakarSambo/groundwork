import { ConversationService } from './conversation.service';

/**
 * WEEK 20. WHAT THE LEAD CONFIRMED FOR THE ORGANISATION REACHES THE NEXT CHECK-IN'S INSTRUCTIONS,
 * AS CONTEXT, AND NOTHING THAT WAS ONLY OFFERED DOES.
 *
 * Asked of the real composer for a real prompt, the way their-week-reaches-the-prompt does it.
 */
const RULE = "Every quote over 1 million needs Amina's sign-off";

function service(memoryRows: any[]) {
  const ground = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', moment: 'STARTING',
    label: 'Sales', mode: 'SHARED', timelineDays: 90, objectives: [], brief: null,
    startsAt: null, endsAt: null, status: 'ACTIVE', leadRemit: null, cadence: null,
  };
  const answers: Record<string, any> = {
    'ground.findUnique': ground, 'ground.findFirst': ground,
    'user.findUnique': { email: 'sam@x.test' },
    'person.findFirst': { externalId: 'p-sam' },
  };
  const prisma: any = new Proxy({}, {
    get: (_t, model: string) => new Proxy({}, {
      get: (_t2, method: string) => async (args: any) => {
        if (model === 'organizationMemory' && method === 'findMany') {
          return memoryRows.filter((r) => Object.entries(args?.where ?? {}).every(([k, v]) => r[k] === v));
        }
        const hit = answers[`${model}.${String(method)}`];
        if (hit !== undefined) return hit;
        return String(method).endsWith('Many') ? [] : null;
      },
    }),
  });
  const s = Object.create(ConversationService.prototype) as any;
  s.prisma = prisma;
  s.prompts = { getActiveContent: async () => null };
  s.logger = { log: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
  s.config = { get: () => undefined };
  s.context = { build: async () => ({ block: '' }) };
  s.knowledge = { covering: async () => [] };
  return s;
}

const checkIn = {
  id: 'c1', groundId: 'g1', participantId: 'p1', sessionNumber: 2,
  participant: { partyType: 'PARTICIPANT', roleAsDescribed: 'Salesperson', userId: 'u-sam' },
} as any;

const row = (over: any) => ({ id: 'm', organizationId: 'org1', kind: 'rule', text: RULE, status: 'KEPT', keptAt: new Date(), ...over });

describe('a later check-in is given what the organisation kept', () => {
  it('as context, with the rule that it is never quoted or treated as anybody\'s account', async () => {
    const prompt: string = await service([row({})]).composeSystemPrompt(checkIn);
    expect(prompt).toContain('WHAT THIS ORGANISATION HAS ASKED US TO KEEP IN MIND.');
    expect(prompt).toContain(`- (rule) ${RULE}`);
    expect(prompt).toContain('Do not quote them to anybody');
    expect(prompt).toContain('never treat one as something this person said');
  });

  it('but not a question that is still only being asked', async () => {
    const prompt: string = await service([row({ status: 'OFFERED' })]).composeSystemPrompt(checkIn);
    expect(prompt).not.toContain(RULE);
    expect(prompt).not.toContain('HAS ASKED US TO KEEP IN MIND');
  });

  it('and not another organisation\'s', async () => {
    const prompt: string = await service([row({ organizationId: 'org-other' })]).composeSystemPrompt(checkIn);
    expect(prompt).not.toContain(RULE);
  });
});
