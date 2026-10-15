import { serviceFor, theSessionReportAs } from './__fixtures__/sales-team-q3-two-sessions';
import { reportAsText } from '../public-api/a-whatsapp-message-is-routed';
import { draftTheQuestion } from './the-picture-is-drafted-from-the-reads';

/**
 * B-103. Amani's own report on WhatsApp ended "Here is a conversation worth having. What is the real
 * risk to delivery here, not the task list?" - a role map's probe, which is a question for the lead
 * to ask. It is the lead's alone; a difference on record is still everybody's to settle.
 */
const THE_PROBE = 'What is the real risk to delivery here, not the task list?';

function aProjectTeamWithNoDifference() {
  const { svc, w } = serviceFor('sales');
  w.report.divergences = [];
  for (const r of Object.values(w.rounds) as any[]) r.divergences = [];
  for (const p of w.ground.participants) { p.detectedFunction = 'PROJECT_MANAGEMENT'; p.detectedFunctionConfidence = 0.95; }
  (svc as any).phrase = async () => ({});
  return svc;
}

describe('B-103: the lead\'s question is never put to a participant', () => {
  it('the rule: a role map\'s probe goes only to the lead', () => {
    const functions = [{ fn: 'PROJECT_MANAGEMENT', confidence: 0.95 }];
    expect(draftTheQuestion({ functions, blockers: [] })?.text).toBe(THE_PROBE);
    expect(draftTheQuestion({ functions, blockers: [], forTheLead: true })?.text).toBe(THE_PROBE);
    expect(draftTheQuestion({ functions, blockers: [], forTheLead: false })).toBeNull();
    /* A difference on record is everybody's to settle, so a participant still reads it. */
    expect(draftTheQuestion({ functions, blockers: [], forTheLead: false, differences: [{ topic: 'Who decides the discount', settledBy: 'Rukia decides' }] })?.text)
      .toBe('Rukia decides. That is what settles who decides the discount.');
  });

  it('Rukia, who runs it, is given the question', async () => {
    const read = await theSessionReportAs(aProjectTeamWithNoDifference(), 'u-rukia', 2);
    expect(read.theConversationWorthHaving).toBe(THE_PROBE);
  });

  it.each([['Amani', 'u-amani'], ['Baraka', 'u-baraka']])('%s, a participant, is not, and her report on the phone does not carry it', async (_who, userId) => {
    const read = await theSessionReportAs(aProjectTeamWithNoDifference(), userId, 2);
    expect(read.refused).toBeUndefined();
    expect(read.theConversationWorthHaving ?? null).toBeNull();
    expect(read.whyNoQuestion ?? null).toBeNull();
    const text = reportAsText(read, 'Sales team, Q3');
    expect(text).not.toContain(THE_PROBE);
    expect(text).not.toContain('Here is a conversation worth having.');
  });
});
