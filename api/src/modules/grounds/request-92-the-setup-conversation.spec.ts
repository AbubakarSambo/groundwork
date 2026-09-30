import { aSetupConversation, aPaste } from './request-92-harness';
import { whatWeTookFromThat } from './a-dump-is-many-things';

/**
 * REQUEST 92, POINTS 6 TO 11, in the setup conversation: what the lead reads, and what a yes keeps.
 */

describe('point 6: the list a paste gives keeps one bullet to a line, as the confirmation does', () => {
  it('the say-back the lead is shown and the proposal stored are the list as written', async () => {
    const paste = {
      success: 'Every Kilimani shop has paid its deposit.',
      teamTargets: [{ name: 'Shops signed', target: 4 }, { name: 'Deposits paid', target: 10 }],
      strategy: ['Lead with the cold chain.', 'Visit every shop twice.'],
    } as any;
    const { service } = aSetupConversation({ paste });
    const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: 'z'.repeat(500) }]);
    expect(out.proposal.say).toBe(whatWeTookFromThat(aPaste(paste), { asking: true }));
    expect(out.proposal.say).toContain('\n- Shops signed: 4\n- Deposits paid: 10\n');
    expect(out.proposal.say).toContain('\n- Lead with the cold chain.\n- Visit every shop twice.\n');
    expect(out.proposal.say).not.toContain('Go wide Pricing');
  });
});
