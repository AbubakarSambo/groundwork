import { AskService, Asker } from './ask.service';

/**
 * DECISION 65 (30 September 2026): ASK GROUNDWORK OPENED FROM INSIDE A CHECK-IN KNOWS WHICH ONE.
 *
 * The screen sends `groundId` and `openedFrom: 'check_in_setup'` together, so a setup conversation
 * starts without the lead having to say the word "context". This is checked here at the level
 * `ask.service.ts` decides it: whether `openedFrom` is acted on at all, which depends on
 * `GroundsService.mayOpenSetupChatFor` (decision 63's rule - the lead, or an admin once the lead has
 * left) - never on the message's own wording. What happens once the assistant is told to skip the
 * keyword is covered separately, in assistant/add-context-is-the-context-chat.spec.ts (describe
 * block "decision 65").
 *
 * The assistant itself is faked here: these tests are about ROUTING - which call `ask` makes, with
 * which arguments - not about what the setup conversation says.
 */
const ORG = 'org-atlas';

function fixture(opts: { mayOpenSetupChat?: boolean; groundOK?: boolean } = {}) {
  const prisma: any = {
    organizationMembership: {
      findUnique: jest.fn(async () => ({ role: 'MEMBER' })),
    },
    person: {
      findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-wairimu', active: true, linkedUserId: 'u-wairimu' })),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    ground: {
      findFirst: jest.fn(async () => (opts.groundOK === false ? null : { organizationId: ORG, initiatorId: 'u-wairimu' })),
      findMany: jest.fn(async () => [{ id: 'g-tobi', label: 'Tobi, the next few weeks' }]),
    },
    user: {
      findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: ORG })),
    },
  };
  const assistant = { respond: jest.fn(async () => ({ lane: 'add_context', composedBy: 'rules', blocks: [{ type: 'text', body: 'How long does this check-in run for?' }] })) };
  const reports = {};
  const grounds = { mayOpenSetupChatFor: jest.fn(async () => opts.mayOpenSetupChat ?? true) };
  const ask = new AskService(prisma, assistant as any, reports as any, grounds as any);
  const asker: Asker = { userId: 'u-wairimu', email: 'wairimu@atlas.test', organizationId: ORG };
  return { ask, prisma, assistant, grounds, asker };
}

describe('decision 65: openedFrom routes straight to the setup conversation, for whoever may confirm setup', () => {
  it('the lead, with openedFrom and an empty message, gets the setup conversation opened for that check-in', async () => {
    const { ask, assistant, grounds, asker } = fixture({ mayOpenSetupChat: true });
    await ask.ask(asker, { message: '', groundId: 'g-tobi', openedFrom: 'check_in_setup' });
    expect(grounds.mayOpenSetupChatFor).toHaveBeenCalledWith('g-tobi', 'u-wairimu', ORG);
    expect(assistant.respond).toHaveBeenCalledWith(ORG, 'p1', '', 'g-tobi', true);
  });

  it('the lead, with openedFrom and "twelve weeks", has it treated as an answer in the setup conversation for that check-in', async () => {
    const { ask, assistant, asker } = fixture({ mayOpenSetupChat: true });
    await ask.ask(asker, { message: 'twelve weeks', groundId: 'g-tobi', openedFrom: 'check_in_setup' });
    expect(assistant.respond).toHaveBeenCalledWith(ORG, 'p1', 'twelve weeks', 'g-tobi', true);
  });

  it('a participant, who may not confirm setup here, gets the ordinary answer - openedFrom is ignored, not refused', async () => {
    const { ask, assistant, grounds, asker } = fixture({ mayOpenSetupChat: false });
    const reply = await ask.ask(asker, { message: 'twelve weeks', groundId: 'g-tobi', openedFrom: 'check_in_setup' });
    expect(grounds.mayOpenSetupChatFor).toHaveBeenCalled();
    expect(assistant.respond).toHaveBeenCalledWith(ORG, 'p1', 'twelve weeks', 'g-tobi');
    expect(assistant.respond).not.toHaveBeenCalledWith(ORG, 'p1', 'twelve weeks', 'g-tobi', true);
    expect(reply).toBeDefined();
  });

  it('with no openedFrom at all, behaves exactly as it always has, whoever is asking', async () => {
    const { ask, assistant, grounds, asker } = fixture({ mayOpenSetupChat: true });
    await ask.ask(asker, { message: 'twelve weeks', groundId: 'g-tobi' });
    expect(grounds.mayOpenSetupChatFor).not.toHaveBeenCalled();
    expect(assistant.respond).toHaveBeenCalledWith(ORG, 'p1', 'twelve weeks', 'g-tobi');
  });

  it('openedFrom without a groundId does nothing special: there is no check-in to open setup for', async () => {
    const { ask, assistant, grounds, asker } = fixture({ mayOpenSetupChat: true });
    await ask.ask(asker, { message: 'twelve weeks', openedFrom: 'check_in_setup' });
    expect(grounds.mayOpenSetupChatFor).not.toHaveBeenCalled();
    expect(assistant.respond).toHaveBeenCalledWith(ORG, 'p1', 'twelve weeks', undefined);
  });
});
