import { aScriptedMind, aTeamLoopWorld } from './a-world-for-the-team-loop';
import { grantADelegate } from '../outstanding/a-delegate-acts-for-a-principal';
import { keepWhatWasForwarded } from '../executive-onboarding/the-intake';
import { answerTheQuietBatches } from '../executive-onboarding/the-first-picture';

/**
 * A FORWARD NOBODY OWNS IS ASKED ABOUT ONCE (Fatima round 2, C5). Zainab, who acts for Fatima, forwarded "Madam said we should sort out the Kano thing before the
 * visit and tell the Governor's office. Not sure who is doing what." and it was filed for the principal with no question. Now the batch's one answer is one
 * precise question (who should take it, and by which day), and a forward that says who and when is not asked about. Every text she reads is printed.
 */
const FORWARDS = [
  { words: "Madam said we should sort out the Kano thing before the visit and tell the Governor's office. Not sure who is doing what. Can you help?", unclear: { kind: 'unclear' as const, matter: 'sort out the Kano thing before the visit', missing: ['owner' as const, 'date' as const] }, expect: /Who should take it, and by which day should it be done\?/ },
  { words: 'The committee wants the minutes circulated. Somebody needs to do it.', unclear: { kind: 'unclear' as const, matter: 'The committee wants the minutes circulated', missing: ['owner' as const] }, expect: /Who should take it\?/ },
  { words: 'Madam wants the delegation list sent to protocol, Tunde to do it.', unclear: { kind: 'unclear' as const, matter: 'the delegation list sent to protocol', missing: ['date' as const] }, expect: /By which day should it be done\?/ },
  { words: 'Please deal with the Governor letter. I do not know who owns it.', unclear: { kind: 'unclear' as const, matter: 'something the model invented', missing: ['owner' as const, 'date' as const] }, expect: /I can follow up with the team on that\./ },
];

async function zainabForwards(words: string, mind: any) {
  const x = await aTeamLoopWorld({ mind });
  (x.service as any).mind = mind;
  await grantADelegate(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', delegateUserId: 'u-amina', via: 'chat' });
  x.w.sent.length = 0;
  const at = new Date(x.now.getTime());
  await keepWhatWasForwarded(x.prisma, x.w.intake as any, { organizationId: 'org-1', principalUserId: 'u-fatima', fromUserId: 'u-amina', fromAddress: 'amina@example.com', channel: 'email', providerId: 'm-1', subject: 'Fwd: Madam said', body: words, receivedAt: at, files: [], beyondTheLimit: 0, now: at } as any);
  await answerTheQuietBatches(x.prisma, { ...(x.w.ports as any), anUnclearMatter: (t: string[]) => x.service.anUnclearMatter(t) }, new Date(at.getTime() + 4 * 60_000), async () => 'assistant+dangote-abuja@myground.work');
  return x.w.sent.filter((m) => m.to === 'amina@example.com').map((m) => m.text);
}

describe('a forward that hands over a matter with no owner or no day is answered with one question', () => {
  it.each(FORWARDS)('$words', async (f) => {
    const got = await zainabForwards(f.words, aScriptedMind({ instruction: f.unclear }));
    console.log(`AMINA READS\n${got.join('\n\n----\n\n')}`);
    expect(got).toHaveLength(1);
    expect(got[0]).toMatch(f.expect);
    expect(got[0].match(/\?/g)).toHaveLength(1);
    expect(got[0]).not.toMatch(/Are other people handling these matters/);
    expect(got[0]).toMatch(/^Hello Amina/);
  });

  it('a forward that is not unclear is answered as before, with no question about an owner', async () => {
    const got = await zainabForwards('The committee minutes were circulated by Tunde on Monday.', aScriptedMind({ instruction: null }));
    console.log(`AMINA READS\n${got.join('\n')}`);
    expect(got[0]).not.toMatch(/Who should take it|By which day/);
  });

  it('files nothing, makes nothing and sends nothing to anybody else because of what was forwarded', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind({ instruction: { kind: 'unclear', matter: 'x', missing: ['owner'] } }) });
    const before = { commitments: x.t.commitment.rows.length, jobs: x.t.persistentJob.rows.length };
    await zainabForwards('Madam said sort out Kano. Not sure who is doing what.', aScriptedMind({ instruction: { kind: 'unclear', matter: null, missing: ['owner'] } }));
    expect(x.t.commitment.rows.length).toBe(before.commitments);
    expect(x.t.persistentJob.rows.length).toBe(before.jobs);
  });
});
