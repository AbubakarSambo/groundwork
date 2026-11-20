import { hearHer, mightBeHerWords } from '../executive-onboarding/her-words';
import { aWorldForPrincipalWork, NOW } from './a-world-for-principal-work';

/**
 * WHERE THE NEW WORDS JOIN THE ONES ALREADY HEARD. Her words go through one door (executive-onboarding/her-words.ts) on every channel. The payments,
 * the briefings and the recipient are heard there too, before a name with an address is taken as a new team member, and after the older questions that
 * were already waiting (the go-ahead for her team), so nothing that worked before is answered differently.
 */
function aDoor() {
  const w = aWorldForPrincipalWork(NOW);
  const calls: string[] = [];
  const ports: any = { email: {}, whatsapp: {}, theWork: (a: any) => { calls.push(a.message); return w.work.hear(a); } };
  const say = (message: string, userId = 'u-fatima', channel: 'chat' | 'email' | 'whatsapp' = 'chat') => hearHer(w.prisma, ports, { organizationId: w.ORG, userId, message, now: NOW, channel });
  return { w, say, calls };
}

describe('her words reach the new work', () => {
  it('lets the new words through the cheap look, and nothing else', () => {
    for (const m of ['Send it to the Managing Director too', 'Give me my day', 'Send me a weekly update every Friday', 'yes', 'slow down']) expect(mightBeHerWords(m)).toBe(true);
    /* Changed (round 1, I-02, I-08): the word list that decided what could be hers is gone. What her words mean is read further in, and only for the senior person an admin added. A message costs a model call only when something waits for her answer or a reader finds a contact or an instruction in it. */
    expect(mightBeHerWords('Thank you')).toBe(true);
    expect(mightBeHerWords('   ')).toBe(false);
  });

  it('a name with an address after "send it to ... too" is a recipient to confirm, not a new person to write to', async () => {
    const { w, say } = await aDoor();
    expect(await say('Send it to Musa at musa@partner.org too')).toBe('You want me to send the final year-end files to Musa at musa@partner.org as well as to you. Shall I add them? Nothing is sent to them until you say yes. musa@partner.org is outside your own office, so I need a clear yes from you before I add it.');
    expect(w.t.outreachContact.rows.filter((r: any) => r.state === 'proposed')).toHaveLength(0);
  });

  it('a question about her team that is already waiting still takes her yes first, and the new work is not asked', async () => {
    const { w, say, calls } = await aDoor();
    w.t.outreachContact.rows.push({ id: 'oc-wait', organizationId: w.ORG, principalUserId: 'u-fatima', name: 'Chidi Eze', email: 'chidi@example.com', contactKey: 'chidi@example.com', kind: 'team', state: 'proposed', proposedAt: NOW });
    await say('yes').catch(() => null);
    expect(calls).toEqual([]);
  });

  it('is silent for everybody who is not her or somebody who acts for her', async () => {
    const { say, calls } = await aDoor();
    expect(await say('Give me my day', 'u-tunde')).toBeNull();
    expect(await say('Send it to the Managing Director too', 'u-ibrahim')).toBeNull();
    expect(calls).toEqual([]);
  });
});

describe('an assistant asks for a principal\'s day by her name (Fatima round 3)', () => {
  it('"Give me Amara\'s day" is the day request', () => {
    const { readARequestPlainly } = require('./the-work-reader');
    expect(readARequestPlainly("Give me Amara's day.")).toEqual({ kind: 'my_day' });
    expect(readARequestPlainly('Show me Fatima’s day')).toEqual({ kind: 'my_day' });
    expect(readARequestPlainly('Give me my day')).toEqual({ kind: 'my_day' });
    /* The cheap look that decides whether the words are worth reading must let it through too (round 5: it did not). */
    const { mightBeARequest } = require('./the-work-reader');
    expect(mightBeARequest("Give me Ifeoma's day.")).toBe(true);
  });
});
