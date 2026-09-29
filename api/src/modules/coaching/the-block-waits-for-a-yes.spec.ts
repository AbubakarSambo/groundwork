import { ConversationService, COACHING_LIVE_KEY } from '../conversation/conversation.service';

/**
 * THE COACHING BLOCK WAITS FOR A YES.
 *
 * coaching_states had zero rows for as long as the chain existed, so nobody has ever read what it
 * says. Rows are now written on every completed session and can be read at /admin/coaching. The
 * block is switched off only when platform_settings.coaching_live is explicitly false - an admin's
 * own choice to pause it. Coaching is on by default on every database, including a brand new one
 * with no row at all (decision 57, item 6, 30 September 2026).
 */
describe('the coaching block waits for a yes', () => {
  const svc = (setting: any) => {
    const s = new ConversationService(
      { platformSetting: { findUnique: async () => setting }, coachingState: { findUnique: async () => ({ participantId: 'p1', currentStep: 'name the blocker out loud', stepGivenAt: 1, staircase: 'ownership', staircasePosition: 1, history: [] }) } } as any,
      undefined as any, undefined as any, undefined as any, undefined as any,
      undefined as any, undefined as any, undefined as any, undefined as any, undefined as any,
    );
    return s as any;
  };
  it('speaks when the setting row does not exist, because coaching defaults on', async () => {
    expect(await svc(null).coachingBlock('p1', 2)).toMatch(/name the blocker out loud/);
  });
  it('says nothing when the setting is false', async () => {
    expect(await svc({ key: COACHING_LIVE_KEY, value: false }).coachingBlock('p1', 2)).toBe('');
  });
  it('speaks once the setting is true', async () => {
    expect(await svc({ key: COACHING_LIVE_KEY, value: true }).coachingBlock('p1', 2)).toMatch(/name the blocker out loud/);
  });
  it('the key is the one the admin page reads', () => {
    expect(COACHING_LIVE_KEY).toBe('coaching_live');
  });
});
