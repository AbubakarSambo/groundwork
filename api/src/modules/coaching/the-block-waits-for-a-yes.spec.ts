import { ConversationService } from '../conversation/conversation.service';

/**
 * THE COACHING BLOCK IS ALWAYS ON (Hafsah, 22 November 2026: coaching is always on, never off).
 *
 * UPDATED 23 November 2026. This file proved that `platform_settings.coaching_live` set to false paused the block. That
 * setting is gone: no setting, flag or organisation switch turns coaching off. Rows are still written on every completed
 * session and can be read at /admin/coaching.
 */
describe('the coaching block', () => {
  const svc = (setting: any) => {
    const s = new ConversationService(
      { platformSetting: { findUnique: async () => setting }, coachingState: { findUnique: async () => ({ participantId: 'p1', currentStep: 'name the blocker out loud', stepGivenAt: 1, staircase: 'ownership', staircasePosition: 1, history: [] }) } } as any,
      undefined as any, undefined as any, undefined as any, undefined as any,
      undefined as any, undefined as any, undefined as any, undefined as any, undefined as any,
    );
    return s as any;
  };
  it('speaks with no setting row', async () => {
    expect(await svc(null).coachingBlock('p1', 2)).toMatch(/name the blocker out loud/);
  });
  it('still speaks when an old coaching_live row says false: nothing switches it off', async () => {
    expect(await svc({ key: 'coaching_live', value: false }).coachingBlock('p1', 2)).toMatch(/name the blocker out loud/);
  });
});
