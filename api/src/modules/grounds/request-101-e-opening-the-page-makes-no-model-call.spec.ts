import { ForbiddenException } from '@nestjs/common';
import { aSetupConversation } from './request-92-harness';

/**
 * REQUEST 101 (e): OPENING THE LEAD'S CONTEXT TAB MADE A MODEL CALL, AND A NEW OPENING QUESTION, EVERY TIME.
 *
 * The tab asks `POST /grounds/:id/context-chat` for the opening turn with an empty history each time it is
 * opened. That asked the model, so each open cost a call and read differently. The opening is now written
 * from what is stored; the first model call is made on the lead's first message.
 */
const SET = { timelineStated: true, cadenceStated: true };
const OPENING = 'This check-in runs for 90 days and people check in once a week. What does doing well look like here? I do not mean a target for one person. What would make you say, at the end, that this went the way it should have?';

describe('request 101 (e): the opening turn, with no model call', () => {
  it('the lead opens the tab twice and reads the same opening, and the model is never asked', async () => {
    const { service, anthropic, writes } = aSetupConversation({ ground: SET });
    const first: any = await service.contextChat('g1', 'userLead', []);
    const second: any = await service.contextChat('g1', 'userLead', []);
    expect(first.reply).toBe(OPENING);
    expect(second.reply).toBe(first.reply);
    expect(first.openQuestion).toBe('What does doing well look like here? I do not mean a target for one person. What would make you say, at the end, that this went the way it should have?');
    expect(first.proposal).toBeNull();
    expect(anthropic.respond).not.toHaveBeenCalled();
    expect(anthropic.extract).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
  });

  it('with no length set yet, the opening asks for it, in the product\'s own words', async () => {
    const { service, anthropic } = aSetupConversation();
    const out: any = await service.contextChat('g1', 'userLead', []);
    expect(out.reply).toBe('How long should this run? You can give an end date or a number of weeks. I need it to work out how many check-ins there will be.');
    expect(anthropic.respond).not.toHaveBeenCalled();
  });

  it('an admin opening it reads the same opening, and the model is not asked either', async () => {
    const { service, anthropic } = aSetupConversation({ ground: SET, userRole: 'ADMIN' });
    const out: any = await service.contextChat('g1', 'userAdmin', []);
    expect(out.reply).toBe(OPENING);
    expect(anthropic.respond).not.toHaveBeenCalled();
  });

  it('somebody who checks in is still refused, before anything is read', async () => {
    const { service, anthropic } = aSetupConversation({ ground: SET });
    await expect(service.contextChat('g1', 'userBen', [])).rejects.toBeInstanceOf(ForbiddenException);
    expect(anthropic.respond).not.toHaveBeenCalled();
  });

  it('the first model call is made on the lead\'s first message', async () => {
    const { service, anthropic } = aSetupConversation({ ground: SET, reply: 'Thank you. Who decides when a quote is late?' });
    await service.contextChat('g1', 'userLead', [
      { role: 'assistant', content: OPENING },
      { role: 'user', content: 'Every quote goes out within two days.' },
    ]);
    expect(anthropic.respond).toHaveBeenCalledTimes(1);
  });
});
