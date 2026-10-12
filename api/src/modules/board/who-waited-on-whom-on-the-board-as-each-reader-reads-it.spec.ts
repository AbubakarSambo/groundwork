import { GroundScenario } from '@prisma/client';
import { BISI, FEMI, JUMA, KWAME, NGOZI, SALES_RUN, SETUP_ADMIN, boardAs, handoff, type Setup } from './the-switchboards-sections-harness';

/**
 * WHO WAITED ON WHOM, AS EACH READER READS IT (request 70, the switchboard's "Who waited on whom", the
 * prototype's "Dependency ledger": every time someone waited on someone else). Every wait in the record,
 * open or cleared, oldest first, with the day it started and the day it was cleared. Nothing in it counts
 * from today, so opening the board never changes it. On the sales run, with one wait already cleared.
 */
const WITH_A_CLEARED_WAIT: Setup = {
  ...SALES_RUN,
  dependencies: [
    handoff('d-ngozi-1', 'p-ngozi', 'the Head of Credit\'s reply', { onLabel: 'the Head of Credit', status: 'CLEARED', createdAt: new Date('2026-09-02T17:00:00Z'), clearedAt: new Date('2026-09-16T17:00:00Z') }),
    ...(SALES_RUN.dependencies ?? []),
  ],
};
const says = (b: any) => (b.whoWaitedOnWhom ?? []).map((w: any) => w.says);

describe('Who waited on whom, as each person reads it', () => {
  it('Bisi, who runs it, reads every wait, oldest first, the cleared one with how long it took', async () => {
    const b = await boardAs(WITH_A_CLEARED_WAIT, ...BISI);
    expect(says(b)).toEqual([
      'Ngozi Eze waited on the Head of Credit for the Head of Credit\'s reply from 2 September until it was cleared on 16 September, 14 days in all.',
      'Femi Okonkwo has been waiting for the bank statements since 16 September, and it has not been cleared.',
      'Ngozi Eze has been waiting on Mr. Adebayo for a date for the credit decision since 16 September, and it has not been cleared.',
      'Kwame Mensah says the work has been waiting on you for the approval of five applications since 16 September. Not backed: no attempt to unblock mentioned. Kwame Mensah could have messaged you or asked again.',
    ]);
    expect(b.whoWaitedOnWhom[0]).toMatchObject({ startedAt: '2026-09-02', clearedAt: '2026-09-16', days: 14 });
    expect(b.whoWaitedOnWhom[1]).toMatchObject({ startedAt: '2026-09-16', clearedAt: null, days: null });
  });

  it('Ngozi reads her own waits as "You"', async () => {
    const b = await boardAs({ ...WITH_A_CLEARED_WAIT, peersVisibleToEachOther: false }, ...NGOZI);
    expect(says(b)).toEqual([
      'You waited on the Head of Credit for the Head of Credit\'s reply from 2 September until it was cleared on 16 September, 14 days in all.',
      'You have been waiting on Mr. Adebayo for a date for the credit decision since 16 September, and it has not been cleared.',
    ]);
  });

  it('where people do not see each other, Femi reads only the wait he is in', async () => {
    const b = await boardAs({ ...WITH_A_CLEARED_WAIT, peersVisibleToEachOther: false }, ...FEMI);
    expect(says(b)).toEqual(['You have been waiting for the bank statements since 16 September, and it has not been cleared.']);
  });

  it('an admin who only reads an ordinary check-in reads every wait, with the lead named', async () => {
    expect(says(await boardAs(WITH_A_CLEARED_WAIT, ...JUMA))[3]).toBe('Kwame Mensah says the work has been waiting on Bisi Adeyemi for the approval of five applications since 16 September. Not backed: no attempt to unblock mentioned. Kwame Mensah could have messaged Bisi Adeyemi or asked again.');
  });

  it('on an evaluation check-in the person reviewed reads only their own waits, the admin who set it up reads all, and an admin with no access reads nothing', async () => {
    const evaluation: Setup = { ...WITH_A_CLEARED_WAIT, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    expect(says(await boardAs(evaluation, ...KWAME))).toEqual(['You say the work has been waiting on Bisi Adeyemi for the approval of five applications since 16 September. Not backed: no attempt to unblock mentioned. You could have messaged Bisi Adeyemi or asked again.']);
    expect(says(await boardAs(evaluation, ...SETUP_ADMIN))).toHaveLength(4);
    const asJuma = await boardAs(evaluation, ...JUMA).then((b) => b, (e) => e);
    expect(asJuma.whoWaitedOnWhom).toBeUndefined();
  });

  it('is left out, rather than served empty, when nobody has waited on anybody', async () => {
    expect((await boardAs({ ...SALES_RUN, dependencies: [] }, ...BISI)).whoWaitedOnWhom).toBeUndefined();
  });

  /*
   * FATUMA'S BOARD (decision 137; change 4). "Kevin Odhiambo waited on you for the final prices from 11 October until it was cleared on
   * 2 November, 22 days in all" counted 22 days against her on his word alone. A wait on a colleague who has not said it is theirs is the
   * speaker's account, with the note beside it, and no count of days; once the colleague has promised it, it reads as before.
   */
  it('a wait on a colleague only the speaker claims is their account, with the note, and no days counted against the colleague', async () => {
    const claimed: Setup = { ...SALES_RUN, dependencies: [
      handoff('d-kw', 'p-kwame', 'the final prices', { onParticipantId: 'p-ngozi', onLabel: null, status: 'CLEARED', createdAt: new Date('2026-09-02T17:00:00Z'), clearedAt: new Date('2026-09-24T17:00:00Z') }),
      handoff('d-kw2', 'p-kwame', 'the signed forms', { onParticipantId: 'p-ngozi', onLabel: null, triedSaid: 'I chased Ngozi twice on Monday.', status: 'WAITING', createdAt: new Date('2026-09-16T17:00:00Z') }),
    ] };
    const asNgozi = await boardAs(claimed, ...NGOZI);
    expect(says(asNgozi)).toEqual([
      'Kwame Mensah said the work was waiting on you for the final prices from 2 September until it was cleared on 24 September. Not backed: no attempt to unblock mentioned. Kwame Mensah could have messaged you, asked again, or raised it with Bisi Adeyemi.',
      /* Hafsah, 12 October: with his attempt in the record it is a confirmed block, and reads as any wait does. */
      'Kwame Mensah has been waiting on you for the signed forms since 16 September, and it has not been cleared.',
    ]);
    expect(asNgozi.whoWaitedOnWhom[0].days).toBeNull();
    expect(says(asNgozi).join(' ')).not.toMatch(/days in all/);
    const asBisi = await boardAs(claimed, ...BISI);
    expect(says(asBisi)[0]).toBe('Kwame Mensah said the work was waiting on Ngozi Eze for the final prices from 2 September until it was cleared on 24 September. Not backed: no attempt to unblock mentioned. Kwame Mensah could have messaged Ngozi Eze, asked again, or raised it with you.');
    const promised = await boardAs({ ...claimed, commitments: [...(SALES_RUN.commitments ?? []), { id: 'c-ng', groundId: 'g-1', participantId: 'p-ngozi', text: 'I will send the final prices to Kwame.', status: 'DONE', createdAt: new Date('2026-09-02T17:00:00Z') }] }, ...NGOZI);
    expect(says(promised)[0]).toBe('Kwame Mensah waited on you for the final prices from 2 September until it was cleared on 24 September, 22 days in all.');
  });

  it('the risks and the timeline say a claim on a colleague as the speaker\'s account, with the note', async () => {
    const claimed: Setup = { ...SALES_RUN, dependencies: [
      handoff('d-kw2', 'p-kwame', 'the signed forms', { onParticipantId: 'p-ngozi', onLabel: null, status: 'WAITING', createdAt: new Date('2026-09-16T17:00:00Z') }),
    ] };
    const b: any = await boardAs(claimed, ...BISI);
    expect((b.risks ?? []).map((x: any) => x.says)).toContain('Kwame Mensah says the work is waiting on Ngozi Eze for the signed forms. Not backed: no attempt to unblock mentioned. Kwame Mensah could have messaged Ngozi Eze, asked again, or raised it with you.');
    expect((b.timeline ?? []).map((x: any) => x.says)).toContain('On 16 September, Kwame Mensah said the work was waiting on Ngozi Eze for the signed forms. Not backed: no attempt to unblock mentioned. Kwame Mensah could have messaged Ngozi Eze, asked again, or raised it with you.');
  });
});
