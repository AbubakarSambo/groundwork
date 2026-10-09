import { aSetupConversation } from './request-92-harness';
import { alreadyHowItIs } from './nothing-is-offered-that-changes-nothing';

/**
 * B-085. Ask's set-up questions on a check-in that is already set up: it reads what the check-in has,
 * does not offer a change that changes nothing, and a yes to one writes nothing into the history.
 * These read what the lead is told, not only what the code returns.
 */
const SET_UP = { timelineDays: 90, timelineStated: true, cadence: 'FORTNIGHTLY', cadenceStated: true, runsUntilEnded: false, endsAt: new Date('2026-12-15') };

describe('what the check-in already has is told to the lead, and nothing is offered', () => {
  it('a length that is already the length is not offered again', () => {
    expect(alreadyHowItIs(SET_UP as any, { kind: 'timeline', days: 90 })).toBe('This check-in already runs for 90 days, so nothing needs to change.');
    expect(alreadyHowItIs(SET_UP as any, { kind: 'timeline', days: 60 })).toBeNull();
  });
  it('a rhythm that is already the rhythm is not offered again, and a different one is', () => {
    expect(alreadyHowItIs(SET_UP as any, { kind: 'cadence', cadence: 'FORTNIGHTLY' })).toBe('People already check in every two weeks, so nothing needs to change.');
    expect(alreadyHowItIs(SET_UP as any, { kind: 'cadence', cadence: 'WEEKLY' })).toBeNull();
  });
  it('a length or rhythm nobody chose is not "already" anything', () => {
    const guessed = { ...SET_UP, timelineStated: false, endsAt: null, cadenceStated: false };
    expect(alreadyHowItIs(guessed as any, { kind: 'timeline', days: 90 })).toBeNull();
    expect(alreadyHowItIs(guessed as any, { kind: 'cadence', cadence: 'FORTNIGHTLY' })).toBeNull();
  });
});

describe('through the set-up conversation, as the lead reads it', () => {
  const heard = (extract: any) => (_s: string, _h: any[], tool: any) => extract(tool.input_schema.properties);

  it('a length the check-in already has is told, not offered: "90 days" on a check-in that runs 90 days', async () => {
    const { service, writes } = aSetupConversation({ ground: { ...SET_UP, participants: [{ id: 'pN', managingOnly: false }, { id: 'pM', managingOnly: false }] }, reply: 'Thank you.' });
    const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: '90 days' }], { yesOrNo: true });
    expect(out.proposal).toBeNull();
    expect(out.reply).toBe('This check-in already runs for 90 days, so nothing needs to change.');
    expect(writes).toEqual([]);
  });

  it('"until I end it" on a check-in that already runs until it is ended is told, not offered', async () => {
    const { service } = aSetupConversation({ ground: { ...SET_UP, timelineDays: 0, runsUntilEnded: true }, reply: 'Thank you.' });
    const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: 'It runs until I end it.' }], { yesOrNo: true });
    expect(out.proposal).toBeNull();
    expect(out.reply).toBe('This check-in already runs until you end it, so nothing needs to change.');
  });

  it('a different length is still offered', async () => {
    const { service } = aSetupConversation({ ground: SET_UP, reply: 'Thank you.' });
    const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: '60 days' }], { yesOrNo: true });
    expect(out.proposal?.say).toBe('I will set this to run for 60 days.');
  });

  it('the length is not asked for when the check-in has an end date', async () => {
    const { service } = aSetupConversation({ ground: { ...SET_UP, timelineStated: false, cadenceStated: true } });
    const out: any = await service.contextChat('g1', 'userLead', []);
    expect(out.gaps).not.toContain('timeline');
    expect(out.reply).not.toMatch(/How long/i);
  });

  it('a yes to a rhythm nobody had chosen, that is the rhythm it already has, writes nothing into the history', async () => {
    const update = jest.fn(async ({ data }: any) => ({ ...SET_UP, ...data }));
    const { service } = aSetupConversation({
      ground: { ...SET_UP, cadenceStated: false, timelineStated: true, participants: [{ id: 'pN', managingOnly: false }, { id: 'pM', managingOnly: false }] },
      seed: { ground: { findUnique: async () => ({ id: 'g1', ...SET_UP, cadenceStated: false, timelineStated: true, initiatorId: 'userLead', organizationId: 'org1', label: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT', status: 'ACTIVE', groundAuditLog: { timeline: [], contextNotes: [] }, participants: [{ id: 'pN', managingOnly: false }, { id: 'pM', managingOnly: false }], objectives: [] }), update } },
      extract: heard((props: any) => (props.cadence ? { cadence: 'FORTNIGHTLY' } : null)),
    });
    const out: any = await service.applyContextProposal('g1', 'userLead', { said: 'Every two weeks', history: [{ role: 'assistant', content: 'How often should people check in?' }] });
    expect(out.changed).toBe('cadence');
    expect(update).toHaveBeenCalled();
    expect(update.mock.calls.some((c: any) => c[0].data?.cadenceStated === true)).toBe(true);
    const written = update.mock.calls.map((c: any) => JSON.stringify(c[0].data?.groundAuditLog ?? {}));
    expect(written.join('')).toMatch(/timeline/);
    expect(written.join('')).not.toMatch(/FORTNIGHTLY/);
  });
});
