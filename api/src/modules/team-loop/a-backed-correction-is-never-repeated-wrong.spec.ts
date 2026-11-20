import { aScriptedMind, aTeamLoopWorld } from './a-world-for-the-team-loop';
import { buildTheRegister } from '../outstanding/the-outstanding-register';
import { nudgeWhereItHelps } from './a-nudge-that-helps';
import { theUpdateForHer } from './the-update-for-her';
import { theTeamSheMayAsk } from './standing-instructions';

/**
 * "THAT'S NOT RIGHT, I SENT IT ON MONDAY" (the first principle). Fatima or a team member says so; the claim probe that already exists checks it against
 * what they may read; a backed correction changes the record itself, so the register and the email to her say the new thing, and it is never raised wrong
 * again. A correction that is not backed stays unproven, and nobody is chased about it meanwhile. The probe's model is the test's own script.
 */
const THE_REPLY = 'Thank you. The letter you sent on Monday is in the file you attached, so I have marked the Kilele letter as done.';
const probe = (verdict: 'backed' | 'needs_proof' | 'contradicted' | 'unclear', reply: string, done = true) => ({
  extract: async (_p: string, history: { content: string }[]) => {
    const id = /- (commitment:[\w-]+):/.exec(history[0].content)?.[1];
    return { verdict, reply, ...(verdict === 'backed' && done && id ? { promiseId: id, promiseIs: 'DONE' } : {}) };
  },
});

/* A document shows the letter was sent only when its own words say so (which-document-shows-it.ts); the test's model says so for the Kilele letter and for nothing else. */
const showsTheLetter = ({ documents }: { documents: { id: string; text: string }[] }) => documents.find((d) => /Kilele site, sent Monday/.test(d.text))?.id ?? null;

async function aminaPromisedTheLetter(engine: any, withFile = 'Letter to the ministry about the Kilele site, sent Monday 9 November.') {
  const x = await aTeamLoopWorld({ mind: aScriptedMind({ readings: [['not right', { kind: 'correction' }]], shows: showsTheLetter }), engine });
  await x.t.commitment.create({ data: { organizationId: 'org-1', personExternalId: 'p-amina', text: 'I will send the Kilele letter on Monday', dueSaid: 'on Monday', dueAt: null, state: 'OPEN', source: 'team_reply', statedAt: new Date(x.now.getTime() - 5 * 86_400_000) } });
  await x.theyWrite('Amina Yusuf', { files: [{ fileName: 'Kilele letter.txt', text: withFile }], at: new Date(x.now.getTime() - 3_600_000) });
  x.w.sent.length = 0;
  return x;
}

describe('a team member corrects what the record holds', () => {
  it('a backed correction marks the promise done with the document that shows it, and says plainly what changed', async () => {
    const x = await aminaPromisedTheLetter(probe('backed', THE_REPLY));
    const said = await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: "That's not right, I sent the Kilele letter on Monday." });
    console.log(`WHAT AMINA READS\n${said}`);
    expect(said).toBe(THE_REPLY);
    const row = x.t.commitment.rows[0];
    expect(row.state).toBe('KEPT');
    expect(String(row.provenBy)).toMatch(/^material:/);
  });

  it('reaches the register and the email to Fatima, and is never chased or repeated wrong again', async () => {
    const x = await aminaPromisedTheLetter(probe('backed', THE_REPLY));
    await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: "That's not right, I sent the Kilele letter on Monday." });
    const reg = await buildTheRegister(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', now: x.now, forADelegate: false });
    expect(reg.rows.find((r) => r.item.includes('Kilele letter'))).toMatchObject({ owner: 'Amina Yusuf', status: 'completed' });
    const update = await theUpdateForHer(x.prisma, null, { organizationId: 'org-1', principalUserId: 'u-fatima', first: 'Fatima', contacts: await theTeamSheMayAsk(x.prisma, 'u-fatima'), since: new Date(x.now.getTime() - 86_400_000), now: x.now, lead: 'week', nobodyAnswered: [] });
    console.log(`WHAT FATIMA READS NOW\n${update}`);
    expect(update).toMatch(/Amina sent “Kilele letter\.txt” as the proof for “send the Kilele letter on Monday”, and it is counted as done\./);
    expect(update).not.toMatch(/said they will send the Kilele letter/);
    const ports = { whatsapp: { send: async () => ({ sent: true }) }, email: { send: async () => undefined } };
    const later = await nudgeWhereItHelps(x.prisma, ports as any, new Date(x.now.getTime() + 10 * 86_400_000));
    expect(later.sent).toHaveLength(0);
  });

  it('a correction nothing backs yet is left as it was, and is asked for its proof, and nobody chases them meanwhile', async () => {
    const x = await aminaPromisedTheLetter(probe('needs_proof', 'Thank you, Amina. I cannot see the letter yet. Could you forward the email you sent it with, and I will put it right once it is here?'));
    const said = await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: "That's not right, I sent the Kilele letter on Monday." });
    console.log(`WHAT AMINA READS\n${said}`);
    expect(said).toBe('Thank you, Amina. I cannot see the letter yet. Could you forward the email you sent it with, and I will put it right once it is here?');
    expect(x.t.commitment.rows[0].state).toBe('OPEN');
    expect(x.t.commitment.rows[0].lastFollowedUpAt).not.toBeNull();
  });

  it('is asked which one when it cannot tell what is wrong', async () => {
    const x = await aminaPromisedTheLetter(probe('unclear', 'Amina, which of your promises do you mean?'));
    expect(await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: "That's not right." })).toBe('Amina, which of your promises do you mean?');
    expect(x.t.commitment.rows[0].state).toBe('OPEN');
  });
});

describe('a correction is matched to what it is about before it changes anything', () => {
  it('a document about something else, or written by somebody else, does not make it done; the one thing that would show it is asked for', async () => {
    const x = await aminaPromisedTheLetter(probe('backed', 'You are right, there is an email chain about the ministry, so it is done.'), 'Email chain between Ibrahim and the ministry about a meeting in October. Nothing here says anybody sent a letter.');
    const said = await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: "That's not right, Amina sent the Kilele letter on Monday." });
    console.log(`WHAT FATIMA READS\n${said}`);
    expect(said).toBe('Fatima, I have not changed it yet, because nothing I hold shows that it was done. Please send me the message or document that shows it, and I will put it right as soon as I have it.');
    expect(x.t.commitment.rows[0].state).toBe('OPEN');
  });
});

describe('Fatima corrects what she was told about her team', () => {
  it('a backed correction changes the same record, so the register agrees with it everywhere', async () => {
    const x = await aminaPromisedTheLetter(probe('backed', 'Thank you, Fatima. Amina sent the letter on Monday and the file she attached shows it, so I have corrected it.'));
    const said = await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: "That's not right, Amina sent the Kilele letter on Monday." });
    console.log(`WHAT FATIMA READS\n${said}`);
    expect(said).toBe('Thank you, Fatima. Amina sent the letter on Monday and the file she attached shows it, so I have corrected it.');
    expect(x.t.commitment.rows[0].state).toBe('KEPT');
    const reg = await buildTheRegister(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', now: x.now, forADelegate: false });
    expect(reg.rows.find((r) => r.item.includes('Kilele letter'))?.status).toBe('completed');
  });

  it('goes on to Ask, as it always did, when the probe cannot tell which line she means', async () => {
    const x = await aminaPromisedTheLetter(probe('unclear', 'Which line do you mean?'));
    expect(await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: "That's not right." })).toBeNull();
  });
});
