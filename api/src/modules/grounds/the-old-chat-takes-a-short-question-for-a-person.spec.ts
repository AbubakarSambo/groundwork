import { ForbiddenException } from '@nestjs/common';
import { aSetupConversation } from './request-92-harness';

/**
 * THE OLD SETUP CHAT, AND A SHORT SENTENCE THAT ASKS A NAMED PERSON SOMETHING (6 October 2026).
 *
 * "Ask Miriam which accounts actually have a buying process" was read as a goal or a target for Miriam, and a blind yes made it
 * something she was expected to do. It is now said back as the exact question for her next check-in, and kept only on a yes. Read as
 * the lead, and as an admin while the lead is still there. And a real goal for a person, and a long paste, are read as they always were.
 */
const MIRIAM = { id: 'pM', email: 'miriam@x.test', nameGiven: 'Miriam Test', roleAsDescribed: null, managingOnly: false, userId: 'uM', user: { firstName: 'Miriam', lastName: 'Test' } };
const QUESTION = 'Which accounts actually have a buying process?';

function chat(opts: { userRole?: string } = {}) {
  const made = aSetupConversation({ reply: 'What would you like to set for Miriam?', userRole: opts.userRole, seed: {
    groundParticipant: { findMany: async () => [MIRIAM] },
    /* The lead is still here and active; the other person is an admin of the organisation. */
    user: { findUnique: async ({ where }: any) => (where.id === 'userLead' ? { role: 'LEAD', organizationId: 'org1', isActive: true, firstName: 'Wanjiru', lastName: 'Test' } : { role: opts.userRole ?? 'ADMIN', organizationId: 'org1', isActive: true, firstName: 'Grace', lastName: 'Test' }) },
  } });
  const service: any = made.service;
  jest.spyOn(service, 'theExactQuestionFor').mockResolvedValue(QUESTION);
  const kept = jest.spyOn(service, 'keepAQuestionForAPerson').mockResolvedValue({ say: `I have confirmed it. Groundwork will ask Miriam Test "${QUESTION}" in their next check-in, word for word.` });
  return { ...made, service, kept };
}

describe('the lead says a short sentence that asks Miriam something', () => {
  it('reads it back as the exact question for her next check-in, and writes and asks nothing yet', async () => {
    const { service, writes, kept, anthropic } = chat();
    const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: 'Ask Miriam which accounts actually have a buying process' }]);
    expect(out.proposal.say).toBe(`Groundwork will ask Miriam Test, word for word, "${QUESTION}" in Miriam's next check-in. Shall I send it?`);
    expect(out.proposal.gap).toBe('question_for_person');
    expect(out.reply).toBe('');
    expect(writes).toEqual([]);
    expect(kept).not.toHaveBeenCalled();
    expect(anthropic.respond).not.toHaveBeenCalled();
  });

  it('keeps the question about her, in the words the lead was shown, only on the yes', async () => {
    const { service, kept } = chat();
    const said = 'Ask Miriam which accounts actually have a buying process';
    const shown = `Groundwork will ask Miriam Test, word for word, "${QUESTION}" in Miriam's next check-in. Shall I send it?`;
    const out: any = await service.applyContextProposal('g1', 'userLead', { said, history: [{ role: 'user', content: said }, { role: 'assistant', content: shown }] });
    expect(kept).toHaveBeenCalledTimes(1);
    expect(kept).toHaveBeenCalledWith('g1', 'userLead', { participantId: 'pM', leadWords: 'Ask Miriam which accounts actually have a buying process', exactQuestion: QUESTION });
    expect(out.say).toBe(`I have confirmed it. Groundwork will ask Miriam Test "${QUESTION}" in their next check-in, word for word.`);
    expect(out.changed).toBe('a question for Miriam Test');
  });

  it('says plainly when the name is not on the check-in, and keeps nothing', async () => {
    const { service, kept } = chat();
    const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: 'Ask Zainab which accounts actually have a buying process' }]);
    expect(out.proposal).toBeNull();
    expect(out.reply).toBe('I cannot find anybody called Zainab on this check-in, so nothing was asked. Say the name as it is on the check-in and I will try again.');
    expect(kept).not.toHaveBeenCalled();
  });

  it('an admin is refused while the lead is still there, in both halves, and nothing is kept', async () => {
    const { service, kept } = chat({ userRole: 'ADMIN' });
    await expect(service.contextChat('g1', 'anAdmin', [{ role: 'user', content: 'Ask Miriam which accounts actually have a buying process' }])).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.applyContextProposal('g1', 'anAdmin', { said: 'Ask Miriam which accounts actually have a buying process' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(kept).not.toHaveBeenCalled();
  });
});

describe('what the old chat did before is left exactly as it was', () => {
  it('a real goal for a person is read as the old chat read it, and is not turned into a question', async () => {
    const { service, kept, anthropic } = chat();
    const exact = jest.spyOn(service, 'theExactQuestionFor');
    const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: 'Miriam should sign 12 shops' }]);
    expect(anthropic.respond).toHaveBeenCalled();
    expect(out.proposal?.gap).not.toBe('question_for_person');
    expect(exact).not.toHaveBeenCalled();
    expect(kept).not.toHaveBeenCalled();
    await service.applyContextProposal('g1', 'userLead', { said: 'Miriam should sign 12 shops' }).catch(() => undefined);
    expect(kept).not.toHaveBeenCalled();
  });

  it('a long paste that happens to begin with "Ask Miriam" is read as a paste, not as one question', async () => {
    const { service, kept } = chat();
    const paste = `Ask Miriam which accounts actually have a buying process.\n${'The team sells to shops in Kisumu and Nairobi. '.repeat(15)}`;
    const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: paste }]);
    expect(out.proposal?.gap).not.toBe('question_for_person');
    expect(kept).not.toHaveBeenCalled();
  });

  it('sentences about asking Groundwork, or asking me or you, are not questions for a person', async () => {
    const { service, kept } = chat();
    for (const s of ['Ask me which accounts have a buying process', 'Ask Groundwork which accounts have a buying process', 'Miriam, ask the Kisumu shops about price']) {
      const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: s }]);
      expect(out.proposal?.gap).not.toBe('question_for_person');
    }
    expect(kept).not.toHaveBeenCalled();
  });
});
