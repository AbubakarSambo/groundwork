import { anOrganisationForAnExecutive } from '../outstanding/an-organisation-for-an-executive';
import { readAnAnswerAsAPersonWould } from '../team-loop/a-mind-that-reads-meaning';
import { askGroundwork, textOf } from './request-92-harness';
import { asATextMessage } from '../public-api/a-reply-reads-as-a-text-message';
import { forSomeoneWithNoScreen, NOT_FOUND_IN_WHAT_YOU_SENT, NOT_SURE_WHAT_YOU_MEAN, NO_SCREEN_PROMPT } from './a-reply-for-someone-with-no-screen';

/**
 * FATIMA ROUND 1, GROUPS A AND B (issues I-01, I-02 and I-07). Everything a person reads is printed.
 *
 * I-07: "Zainab Musa zainab@fatima.test is my executive assistant. She can see what I see." was not understood, so the grant could not be made on WhatsApp.
 * Now the model's reading (stood in for here by a reader that works out who is named and in what role) points at the existing say-back, and only her own
 * yes, in any words that mean yes, writes the grant. I-01: where Ask does not know what was meant, a phone chat is never sent to a screen.
 */
const NOW = new Date('2026-11-10T09:00:00Z');
const ORG = 'org-a';
const GROUNDS = [{ id: 'g1', label: 'Sales team, Q3', initiatorId: 'lead-1', organizationId: 'org-a', participants: [] } as any];

/** The model as a person would read: who is named as the one who acts for her, and whether a reply is a yes. */
function theModelAsAPersonWould() {
  return {
    respond: async () => { throw new Error('the model is off for the plain answers in this test'); },
    extract: async (_system: string, history: { content: string }[], schema: { name: string }) => {
      const said = history[history.length - 1].content;
      if (schema.name === 'her_answer') return { answer: readAnAnswerAsAPersonWould(said.split('Her words:')[1]?.replace(/[<>\n]/g, ' ').trim() ?? said) };
      if (schema.name === 'what_they_mean') {
        const email = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(said)?.[0] ?? null;
        const role = /\b(?:executive assistant|assistant|ea|pa|secretary)\b|\bp\.a\./i.test(said);
        const name = /\b(Amina Yusuf)\b/.exec(said)?.[1] ?? null;
        if (role && (name || email)) return { kind: 'delegate', who: { name, email } };
        return { kind: 'update', parts: 1 };
      }
      return null;
    },
  };
}

const ASSISTANT_SAID: string[] = [
  'Amina Yusuf amina@example.com is my executive assistant. She can see what I see.',
  'Amina Yusuf is my executive assistant.',
  'amina@example.com is my PA.',
  'My assistant, Amina Yusuf, can see everything I see.',
  'Amina Yusuf works as my secretary and should be able to see what I see.',
  'I would like Amina Yusuf to be able to see what I see, she is my EA.',
  'Please let Amina Yusuf (amina@example.com) see my work. She is my personal assistant.',
  'Amina Yusuf is my P.A.',
  'Our executive assistant is Amina Yusuf.',
  'Amina Yusuf, my EA, should be able to see my work.',
];
const YES_IN_ANY_WORDS = ['Yes, go ahead.', 'Yes please.', 'Sure, please do.', 'Okay, do it.', "That's fine, carry on."];

describe('naming her executive assistant in her own words is understood, said back, and written only on her own yes', () => {
  it.each(ASSISTANT_SAID)('%s', async (said) => {
    const o = anOrganisationForAnExecutive(NOW);
    (o.assistant as any).engine = theModelAsAPersonWould();
    const back = await o.says('u-fatima', said);
    console.log(`SHE SAYS "${said}" AND READS\n${back}`);
    expect(back).toContain('I will let Amina Yusuf act for you.');
    expect(back).toMatch(/Shall I do that\?$/);
    expect(o.tables.delegate.rows).toHaveLength(0);
  });

  it.each(YES_IN_ANY_WORDS)('her yes, "%s", gives the right, and nothing else does', async (yes) => {
    const o = anOrganisationForAnExecutive(NOW);
    (o.assistant as any).engine = theModelAsAPersonWould();
    await o.says('u-fatima', 'Amina Yusuf amina@example.com is my executive assistant. She can see what I see.');
    const back = await o.says('u-fatima', yes);
    console.log(`SHE SAYS "${yes}" AND READS\n${back}`);
    expect(back).toBe('Done. Amina Yusuf can now act for you. To end it, tell me that Amina Yusuf can no longer act for you.');
    expect(o.tables.delegate.rows).toHaveLength(1);
  });

  it('a condition, a question or a no is not a yes, and the grant is not written', async () => {
    for (const said of ['Yes, but only for the outstanding list.', 'Who will see it?', 'No thank you.', 'Not yet.']) {
      const o = anOrganisationForAnExecutive(NOW);
      (o.assistant as any).engine = theModelAsAPersonWould();
      await o.says('u-fatima', 'Amina Yusuf amina@example.com is my executive assistant. She can see what I see.');
      /* The words are then answered as themselves; the small test organisation has no documents to answer from, so that step may throw. Only the grant matters here. */
      await o.says('u-fatima', said).catch(() => null);
      expect(o.tables.delegate.rows).toHaveLength(0);
    }
  });

  it('somebody with no standing of their own cannot name an assistant, in any words', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    (o.assistant as any).engine = theModelAsAPersonWould();
    const back = await o.says('u-ibrahim', 'Amina Yusuf is my executive assistant.');
    expect(back).toBe('Only a lead or an administrator can name somebody to act for them. Ask the person you work for to tell me who should act for them.');
    expect(o.tables.delegate.rows).toHaveLength(0);
  });

  it('with the model off, the words the rules know still work, exactly as before', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    expect(await o.says('u-fatima', 'My EA is Amina Yusuf, Amina can do things for me.')).toContain('I will let Amina Yusuf act for you.');
    expect(await o.says('u-fatima', 'yes')).toBe('Done. Amina Yusuf can now act for you. To end it, tell me that Amina Yusuf can no longer act for you.');
  });
});

/* ------------------------------------------------------------------------------------------------------------------------------- the phone */

const BANNED = /choose a file|add something|press |tap |click|button|menu|what am i on|what is on my list|tell me what you can see|open groundwork|on your check-in/i;
const MESSAGES = [
  'Hello, I got your email. Is this you?', 'Is Aminu performing well?', 'Who are you?', 'asdf ghjk', 'What is the weather like in Kano?', 'Thanks, but what now?',
  'Can you check the thing from yesterday?', 'Is the Kilele proof there?', 'Which one?', 'I do not understand', 'Hello', 'What did the Minister say?',
];

describe('on a phone chat, Ask never sends anyone to a screen', () => {
  it.each(MESSAGES)('with the model off, "%s" is answered with a plain line that names no control and offers no menu', async (said) => {
    const { service } = askGroundwork({ grounds: GROUNDS });
    const reply: any = await service.respondOnWhatsApp(ORG, 'p1', said);
    const text = asATextMessage(reply);
    console.log(`SHE SAYS "${said}" ON WHATSAPP AND READS\n${text}`);
    expect(text).not.toMatch(BANNED);
    expect(text).not.toContain('\n- ');
    expect([NOT_SURE_WHAT_YOU_MEAN, NOT_FOUND_IN_WHAT_YOU_SENT]).toContain(text);
  });

  it('where the model can be asked, it writes the reply from what was said, and the same web question is still the web answer', async () => {
    const said = 'Hello, I got your email. Is this you?';
    const respond = jest.fn(async (..._a: any[]) => 'Yes, this is me. I am your Groundwork assistant, and I put your work together from what you forward to me. What would you like to send me first?');
    const { service } = askGroundwork({ grounds: GROUNDS, engine: { respond, extract: async () => null } });
    const onThePhone: any = await service.respondOnWhatsApp(ORG, 'p1', said);
    expect(asATextMessage(onThePhone)).toBe('Yes, this is me. I am your Groundwork assistant, and I put your work together from what you forward to me. What would you like to send me first?');
    expect(respond.mock.calls[0][0]).toBe(NO_SCREEN_PROMPT);
    expect(JSON.stringify(respond.mock.calls[0][1])).toContain(said);
    const { service: web } = askGroundwork({ grounds: GROUNDS, engine: { respond: jest.fn(async () => { throw new Error('off'); }), extract: async () => null } });
    const onTheWeb = textOf(await web.respond(ORG, 'p1', said));
    console.log(`THE SAME WORDS ON THE WEB READ\n${onTheWeb}`);
    expect(onTheWeb).toMatch(/Choose a file|I cannot answer that one yet|Hello/);
  });

  it('words with a bracketed blank, or a long ramble, are not sent: the fixed line is', async () => {
    const reply = { lane: 'unplaced', composedBy: 'rules', blocks: [{ type: 'text', body: 'I cannot answer that one yet.' }, { type: 'picker', options: [{ key: 'a', label: 'What am I on?' }] }] } as any;
    for (const bad of ['Dear [Name], I will help.', 'x'.repeat(900)]) {
      const out = await forSomeoneWithNoScreen({ respond: async () => bad } as any, null, reply, 'hmm');
      expect(asATextMessage(out)).toBe(NOT_SURE_WHAT_YOU_MEAN);
    }
  });

  it('a reply that was not the shrug is left alone', async () => {
    const reply = { lane: 'what_is_due', composedBy: 'rules', blocks: [{ type: 'text', body: 'Nothing is due.' }] } as any;
    expect(await forSomeoneWithNoScreen({ respond: async () => 'x' } as any, null, reply, 'what is due')).toBe(reply);
  });
});
