import { ConversationService, COACHING_LIVE_KEY } from '../conversation/conversation.service';

/**
 * THE COACHING BLOCK WAITS FOR A YES.
 *
 * coaching_states had zero rows for as long as the chain existed, so nobody has ever read what it
 * says. Rows are now written on every completed session and can be read at /admin/coaching. The
 * block reaches a live prompt only when platform_settings.coaching_live is true, set by a person
 * after reading a batch. No row means off.
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
  it('says nothing when the setting row does not exist', async () => {
    expect(await svc(null).coachingBlock('p1', 2)).toBe('');
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
