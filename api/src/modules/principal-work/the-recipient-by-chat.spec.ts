import { aWorldForPrincipalWork, fatima, amina, NOW } from './a-world-for-principal-work';
import { ReaderWithAModel, readARequestPlainly } from './the-work-reader';

/**
 * "SEND IT TO THE MANAGING DIRECTOR TOO" (plan sections 14.3 and 19). The model reads who she means; she is told who and what; the person is added only on
 * her own yes, through the one function that adds a recipient; the person who acts for her cannot say yes for her; an address outside the office needs
 * her clear yes; nothing is sent to the person.
 */
async function aWorld(over: Parameters<typeof aWorldForPrincipalWork>[1] = {}) {
  const w = aWorldForPrincipalWork(NOW, over);
  const hear = (message: string, speaker = fatima) => w.work.hear({ organizationId: w.ORG, principalUserId: 'u-fatima', principalFirst: 'Fatima', speaker, message, channel: 'chat', now: new Date(NOW.getTime() + w.t.yearEndLog.rows.length) });
  const recipients = () => w.t.yearEndRecipient.rows.map((r: any) => r.email);
  return { w, hear, recipients };
}

describe('naming a recipient by chat', () => {
  it('"Send it to the Managing Director too": says back who, at which address and what they would get, and adds nobody until she says yes', async () => {
    const { w, hear, recipients } = await aWorld();
    const back = await hear('Send it to the Managing Director too.');
    console.log(`WHAT SHE READS, AND HER YES\n\n${back}`);
    expect(back).toBe('You want me to send the final year-end files to Musa Bello (Managing Director) at md@example.com as well as to you. Shall I add them? Nothing is sent to them until you say yes.');
    expect(recipients()).toEqual([]);
    expect(w.sent).toEqual([]);
    const yes = await hear('Yes');
    expect(yes).toBe('I have added Musa Bello (Managing Director). They will get the final files when you approve them, and the drafts stay with you only.');
    expect(recipients()).toEqual(['md@example.com']);
    /* the question is closed: a second yes adds nothing and answers nothing */
    expect(await hear('yes')).toBeNull();
    expect(recipients()).toEqual(['md@example.com']);
    /* and nothing was sent to the person: adding is not sending */
    expect(w.sent).toEqual([]);
  });

  it('her no adds nobody', async () => {
    const { hear, recipients } = await aWorld();
    await hear('Send it to the Managing Director too.');
    expect(await hear('No')).toBe('Thank you. I have not added anyone.');
    expect(recipients()).toEqual([]);
  });

  it('the person who acts for her cannot add a recipient, and cannot say yes for her', async () => {
    const { w, hear, recipients } = await aWorld();
    await w.withAmina();
    expect(await hear('Send it to the Managing Director too.', amina)).toBe('Only Fatima can say who else may be sent the year-end files. I have not added anyone.');
    expect(await w.t.yearEndLog.findFirst({ where: { kind: 'asked', subject: { startsWith: 'recipient:' } } })).toBeNull();
    /* she asks, then Amina says yes */
    await hear('Send it to the Managing Director too.');
    expect(await hear('Yes', amina)).toBe('Only Fatima can say who else may be sent the year-end files. I have not added anyone.');
    expect(recipients()).toEqual([]);
    /* the question is still waiting for HER */
    expect(await hear('yes')).toContain('I have added Musa Bello');
    expect(recipients()).toEqual(['md@example.com']);
  });

  it('an address outside her own office is said to be outside, and is added only on her yes', async () => {
    const { hear, recipients } = await aWorld();
    const back = await hear('Please share the final report with Dr Abdul at abdul@ministry.gov.ng as well.');
    expect(back).toBe('You want me to send the final year-end files to Dr Abdul at abdul@ministry.gov.ng as well as to you. Shall I add them? Nothing is sent to them until you say yes. abdul@ministry.gov.ng is outside your own office, so I need a clear yes from you before I add it.');
    expect(recipients()).toEqual([]);
    expect(await hear('yes')).toBe('I have added Dr Abdul. They will get the final files when you approve them, and the drafts stay with you only.');
    expect(recipients()).toEqual(['abdul@ministry.gov.ng']);
  });

  it('where there is no address she is asked for one, and her answer is said back before anything is added', async () => {
    const { hear, recipients } = await aWorld();
    expect(await hear('Send it to the Chief of Staff too.')).toBe('I do not have an address for the Chief of Staff. Which address should I use?');
    const back = await hear('chief@partner.org');
    expect(back).toBe('You want me to send the final year-end files to the Chief of Staff at chief@partner.org as well as to you. Shall I add them? Nothing is sent to them until you say yes. chief@partner.org is outside your own office, so I need a clear yes from you before I add it.');
    expect(recipients()).toEqual([]);
    await hear('yes');
    expect(recipients()).toEqual(['chief@partner.org']);
  });

  it('where more than one person fits she is asked which, and never has one picked for her', async () => {
    const { w, hear, recipients } = await aWorld();
    w.t.person.rows.push({ id: 'pid-md2', organizationId: w.ORG, externalId: 'p-md2', active: true, email: 'deputy@example.com', givenName: 'Ada', familyName: 'Obi', displayName: 'Ada Obi', title: 'Deputy Managing Director', userName: 'ada.obi' });
    expect(await hear('Send it to the managing director too')).toBe('More than one person could be the managing director: Musa Bello at md@example.com, or Ada Obi at deputy@example.com. Which one do you mean?');
    expect(recipients()).toEqual([]);
    expect(await hear('Ada Obi')).toContain('You want me to send the final year-end files to Ada Obi (Deputy Managing Director) at deputy@example.com');
  });

  it('is read by the model, not matched to a phrase: "please also copy Musa Bello in" is understood', async () => {
    const calls: string[] = [];
    const model = new ReaderWithAModel({ extract: async (_s: string, h: any[]) => { calls.push(h[0].content); return { kind: 'add_recipient', who: 'Musa Bello' } as any; } });
    const { hear } = await aWorld({ reader: model });
    expect(readARequestPlainly('please also copy Musa Bello in')).toBeNull();
    expect(await hear('please also copy Musa Bello in')).toContain('You want me to send the final year-end files to Musa Bello (Managing Director) at md@example.com');
    expect(calls[0]).toContain('please also copy Musa Bello in');
  });

  it('what the model returns is checked: a kind it was not offered, or a recipient with nothing to go on, adds nothing', async () => {
    const odd = new ReaderWithAModel({ extract: async () => ({ kind: 'delete_everything', who: 'x' }) as any });
    expect(await odd.readARequest('whatever')).toBeNull();
    const empty = new ReaderWithAModel({ extract: async () => ({ kind: 'add_recipient' }) as any });
    expect(await empty.readARequest('whatever')).toBeNull();
    const off = new ReaderWithAModel({ extract: async () => null });
    expect(await off.readARequest('Send it to the Managing Director too')).toEqual({ kind: 'add_recipient', who: 'the Managing Director', email: null });
  });
});
