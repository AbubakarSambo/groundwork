import { addAnExecutive } from './onboard-an-executive';
import { keepWhatWasForwarded, QUIET_FOR_MS, type AnArrival } from './the-intake';
import { answerTheQuietBatches } from './the-first-picture';
import { aWorldForOnboarding, addFatima, ORG } from './a-world-for-onboarding';
import { theWordsInDoubt } from '../voice/the-transcriber';

/**
 * FATIMA ROUND 1, GROUP E (issues I-04 and I-06). Everything a person reads is printed.
 *
 * I-04: her short reply "Thank you. I will forward what I have." opened a batch and, three minutes later, she read "One thing was sent more than once ... The
 * messages are about 'I'm your Groundwork assistant'". Nothing was sent twice: the same few words from an earlier run had been counted as a copy.
 * I-06: after a voice note, the question named an internal file ("audio-wamid.in.1794350176655.2.ogg") and said "reply to this email" to somebody on WhatsApp,
 * three times over.
 */
const b = (s: string) => Buffer.from(s, 'utf8');
async function fatimaIsAdded() {
  const w = aWorldForOnboarding();
  await addAnExecutive(w.prisma, w.ports, addFatima(w));
  w.sent.length = 0;
  const arrival = (over: Partial<AnArrival> = {}): AnArrival => ({ organizationId: ORG, principalUserId: 'u-fatima', fromUserId: 'u-fatima', fromAddress: 'fatimawale@example.com', channel: 'email', providerId: null, subject: null, body: null, receivedAt: w.now, files: [], beyondTheLimit: 0, now: w.now, ...over });
  const later = (ms: number) => new Date(w.now.getTime() + ms);
  const answer = (ms: number) => answerTheQuietBatches(w.prisma, w.ports, later(ms), async () => 'assistant+dangote-abuja@myground.work');
  return { w, arrival, later, answer };
}

describe('a short courtesy is a courtesy', () => {
  it.each(['Thank you. I will forward what I have.', 'Thanks, I will send things shortly.', 'Okay, give me a day.', 'Noted, thank you.'])('"%s" is not counted as sent twice, and is answered like a person would', async (words) => {
    const { w, arrival, later, answer } = await fatimaIsAdded();
    /* The same words had come before, in an earlier run, as they do. */
    await keepWhatWasForwarded(w.prisma, w.intake, arrival({ providerId: 'mail-0', subject: 'Re: I’m your Groundwork assistant', body: words, receivedAt: later(-86_400_000), now: later(-86_400_000) }));
    await answer(-86_400_000 + QUIET_FOR_MS + 1000);
    w.sent.length = 0;
    await keepWhatWasForwarded(w.prisma, w.intake, arrival({ providerId: 'mail-1', subject: 'Re: I’m your Groundwork assistant', body: words }));
    expect(w.t.principalMaterial.rows.filter((r: any) => r.state === 'duplicate')).toHaveLength(0);
    await answer(QUIET_FOR_MS + 1000);
    const text = w.sent[0].text;
    console.log(`SHE SENDS\n${words}\n\nSHE READS\n${text}`);
    expect(text).toBe('Fatima, thank you. I have your message. Forward me whatever you have whenever you are ready, or send a voice note, and I will start putting it together.');
    expect(text).not.toMatch(/more than once|The messages are about|I have everything you sent/);
  });

  it('a mail with real content, forwarded again, is still one mail', async () => {
    const { w, arrival } = await fatimaIsAdded();
    const body = 'From: Ibrahim Danjuma. The Permanent Secretary can receive your delegation on the fourth Thursday of the month, at eleven in the morning, at his office. Please confirm the names of the people who will attend and whether a vehicle pass is needed.';
    await keepWhatWasForwarded(w.prisma, w.intake, arrival({ providerId: 'm1', subject: 'Fwd: Meeting', body }));
    await keepWhatWasForwarded(w.prisma, w.intake, arrival({ providerId: 'm2', subject: 'Fwd: Meeting', body }));
    expect(w.t.principalMaterial.rows.filter((r: any) => r.state === 'duplicate')).toHaveLength(1);
  });

  it('a courtesy sent together with a real forward does not make the real forward a courtesy', async () => {
    const { w, arrival, answer } = await fatimaIsAdded();
    await keepWhatWasForwarded(w.prisma, w.intake, arrival({ providerId: 'a', body: 'Thank you.' }));
    await keepWhatWasForwarded(w.prisma, w.intake, arrival({ providerId: 'b', subject: 'Fwd: Payments', body: 'Payments for November.', files: [{ fileName: 'Payments.csv', mimeType: 'text/csv', bytes: b('payee,amount\nA,100') }] }));
    await answer(QUIET_FOR_MS + 1000);
    expect(w.sent[0].text).toMatch(/^Fatima, thank you\.\n\nI have everything you sent, which is two messages and one file\./);
  });
});

describe('a doubt about a voice note is one question that names no file', () => {
  it('says all the words in doubt once, and tells her to reply here', () => {
    const one = theWordsInDoubt(['Aminusul']);
    const three = theWordsInDoubt(['Aminusul', 'Abiranondi', 'Hawa Lawal']);
    console.log(`ONE WORD\n${one}\n\nTHREE WORDS\n${three}`);
    expect(one).toBe('In your voice note, I think you said “Aminusul”, but I am not sure I heard it right. Is that right? Reply here and tell me, or tell me what you meant.');
    expect(three).toBe('In your voice note, I was not sure I heard these words right, “Aminusul”, “Abiranondi” and “Hawa Lawal”. Are they right? Reply here and tell me, or tell me what you meant.');
    for (const t of [one, three]) expect(t).not.toMatch(/\.ogg|\.m4a|audio-|email/i);
  });

  it('in the picture she reads on WhatsApp, three doubtful words are one line, with no file name and no "reply to this email"', async () => {
    const { w, arrival, answer } = await fatimaIsAdded();
    (w.intake.transcriber as any).transcribe = async () => ({ ok: true, text: 'Aminu Sule, Obiora Nnamdi and Hauwa Lawal are my team.', unclear: [{ heard: 'Aminusul' }, { heard: 'Abiranondi' }, { heard: 'Hawa Lawal' }] });
    await keepWhatWasForwarded(w.prisma, w.intake, arrival({ channel: 'whatsapp', files: [{ fileName: 'audio-wamid.in.1794350176655.2.ogg', mimeType: 'audio/ogg', bytes: b('VOICE') }] }));
    await answer(QUIET_FOR_MS + 1000);
    const text = w.sent[0].text;
    console.log(`SHE READS\n${text}`);
    expect(text).toContain('In your voice note, I was not sure I heard these words right, “Aminusul”, “Abiranondi” and “Hawa Lawal”. Are they right? Reply here and tell me, or tell me what you meant.');
    expect(text).not.toMatch(/audio-wamid|\.ogg|reply to this email/i);
    expect((text.match(/not sure I heard/g) ?? []).length).toBe(1);
  });
});
