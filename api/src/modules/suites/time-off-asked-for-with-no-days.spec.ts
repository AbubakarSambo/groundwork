import * as fs from 'fs';
import * as path from 'path';
import { mentionsTimeOff, whenNoDaysAreSaid, readLeaveDates, LEAVE_TELL_ME_THE_DAYS, LEAVE_WHICH_DAYS, LEAVE_IS_NOT_ON } from './leave-said-in-chat';
import { whatTheModelSaid, UNDERSTAND_PROMPT, UNDERSTAND_SCHEMA } from '../assistant/ask-understands-with-the-model';

/**
 * Hafsah's screenshot of 19 November 2026 (cleantex on staging, Leave requests on): "how do i apply for leave", "I want to apply for
 * leave" and "can i get 3 days off?" were each answered with a refusal. Time off asked for with no days is now asked for its days.
 */
describe('time off asked for with no days', () => {
  it.each(['how do i apply for leave', 'I want to apply for leave', 'can i get 3 days off?'])('"%s" is passed to the model to read', (said) => {
    expect(mentionsTimeOff(said)).toBe(true);
  });

  /* Changed with Batch S (20 November 2026): Ask's model-led reading replaced the time_off kind. "I want to apply for leave" is now read as wants, with the guide's key for asking for leave, and Ask asks for the days the same way. */
  it('the model can say so, and nothing else it says is read', () => {
    expect(UNDERSTAND_SCHEMA.input_schema.properties.kind.enum).toContain('wants');
    expect(UNDERSTAND_PROMPT).toMatch(/- wants: they want one of the things in the list below done for them now, in any words, however short \("I want to apply for leave", "can I get 3 days off\?"/);
    expect(whatTheModelSaid({ kind: 'send_the_leave' })?.kind).toBe('other');
  });

  it('asks for the days when leave is on, and says plainly when it is off', async () => {
    const withLeave = (isOn: boolean | null) => ({ organizationSuite: { findUnique: async () => (isOn === null ? null : { isOn }) } });
    expect(await whenNoDaysAreSaid(withLeave(true), 'org')).toBe(LEAVE_TELL_ME_THE_DAYS);
    expect(await whenNoDaysAreSaid(withLeave(false), 'org')).toBe(LEAVE_IS_NOT_ON);
    expect(await whenNoDaysAreSaid(withLeave(null), 'org')).toBe(LEAVE_IS_NOT_ON);
  });

  it('the example it gives is one the rules read as leave, so copying it works', () => {
    for (const asked of [LEAVE_TELL_ME_THE_DAYS, LEAVE_WHICH_DAYS]) {
      const example = /"([^"]+)"/.exec(asked)![1];
      expect(readLeaveDates(example, new Date('2026-11-19T10:00:00Z'))).toEqual({ startsOn: '2026-11-23', endsOn: '2026-11-25' });
    }
  });

  it('Ask reads it after the days the rules can read, and acts on what the model says they want', () => {
    const service = fs.readFileSync(path.join(__dirname, '..', 'assistant', 'assistant.service.ts'), 'utf8');
    const rulesRead = service.indexOf('if (plainlyAsksForLeave(message)) return this.leaveFromADraft(');
    const modelRead = service.indexOf("understood?.kind === 'wants'");
    expect(rulesRead).toBeGreaterThan(0);
    expect(modelRead).toBeGreaterThan(rulesRead);
  });
});
