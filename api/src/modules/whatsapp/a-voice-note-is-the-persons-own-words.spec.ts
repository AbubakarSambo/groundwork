import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * A VOICE NOTE ON WHATSAPP IS THE PERSON'S OWN WORDS (Fatima, increment 2).
 * Read as what the person is sent back, word for word, with the transcriber stubbed so nothing leaves the machine.
 */
const FROM = '2348012345678';
const voiceNote = (id = 'wamid.v1') => ({ entry: [{ changes: [{ value: { messages: [{ id, from: FROM, type: 'audio', audio: { id: 'media-1', mime_type: 'audio/ogg; codecs=opus' } }] } }] }] });

function aPersonWith(heard: any, opts: { fetched?: boolean; who?: any } = {}) {
  const h = anInboundHarness({ open: [{ id: 'ci-1', label: 'Weekly check-in' }], ...(opts.who ? { who: opts.who } : {}) });
  const notes: any[] = [];
  h.prisma.voiceNote = { create: jest.fn(async ({ data }: any) => { notes.push(data); return data; }) };
  const transcribe = jest.fn(async () => heard);
  (h.service as any).transcriber = { transcribe };
  const audio = { buffer: Buffer.from('AUDIO'), mimeType: 'audio/ogg; codecs=opus' };
  h.whatsapp.fetchMediaFor = jest.fn(async () => (opts.fetched === false ? null : audio));
  h.whatsapp.fetchMediaOn = jest.fn(async () => (opts.fetched === false ? null : audio));
  return { ...h, notes, transcribe };
}
const sentToTheCheckIn = (h: any) => h.conversation.sendMessage.mock.calls.map((c: any[]) => c[2]);

describe('a clear voice note', () => {
  it('goes into the check-in exactly as typed words would, and the reply is the check-in\'s own', async () => {
    const h = aPersonWith({ ok: true, text: 'We closed the Kilele deal on Monday and sent the proof.', unclear: [] });
    await h.service.handle('org-1', voiceNote(), 'theirs');
    expect(sentToTheCheckIn(h)).toEqual(['We closed the Kilele deal on Monday and sent the proof.']);
    expect(h.conversation.sendMessage.mock.calls[0][3]).toMatchObject({ door: 'whatsapp' });
    expect(h.said.join('\n')).toContain('Thank you. What happens next?');
    expect(h.said.join('\n')).not.toMatch(/I can read text/);
  });

  it('keeps where the original came from and what it was heard as, privately, and nothing else is told to anybody', async () => {
    const h = aPersonWith({ ok: true, text: 'We closed the Kilele deal.', unclear: [] });
    await h.service.handle('org-1', voiceNote(), 'theirs');
    expect(h.notes).toEqual([expect.objectContaining({ organizationId: 'org-1', personId: 'person-1', channel: 'whatsapp', reference: 'media-1', transcript: 'We closed the Kilele deal.', wasUnsure: false })]);
    /* Only the sender is written to; Ask, the lead and documents are not touched by a voice note. */
    expect(new Set(h.sent.map((s) => s.to))).toEqual(new Set([FROM]));
    expect(h.assistant.respond).not.toHaveBeenCalled();
  });
});

describe('a voice note with a phrase the transcriber was unsure of', () => {
  const heard = { ok: true, text: 'I met Mr Okonkwo on Friday.', unclear: [{ heard: 'Mr Okonkwo' }] };

  it('asks one short question and writes nothing until they answer', async () => {
    const h = aPersonWith(heard);
    await h.service.handle('org-1', voiceNote(), 'theirs');
    expect(h.said).toEqual(['I think you said "Mr Okonkwo", but I am not sure I heard it right. Is that right? Reply yes, or type what you meant.']);
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.notes[0].wasUnsure).toBe(true);
  });

  it('uses what was heard when they say yes', async () => {
    const h = aPersonWith(heard);
    await h.service.handle('org-1', voiceNote(), 'theirs');
    await h.service.handle('org-1', h.message('yes', FROM, 'wamid.t1'), 'theirs');
    expect(sentToTheCheckIn(h)).toEqual(['I met Mr Okonkwo on Friday.']);
  });

  it('uses what they type when they correct it, and never the misheard words', async () => {
    const h = aPersonWith(heard);
    await h.service.handle('org-1', voiceNote(), 'theirs');
    await h.service.handle('org-1', h.message('I met Mr Okoro on Friday.', FROM, 'wamid.t2'), 'theirs');
    expect(sentToTheCheckIn(h)).toEqual(['I met Mr Okoro on Friday.']);
  });

  it('asks them to type it when they say no, and writes nothing', async () => {
    const h = aPersonWith(heard);
    await h.service.handle('org-1', voiceNote(), 'theirs');
    await h.service.handle('org-1', h.message('no', FROM, 'wamid.t3'), 'theirs');
    expect(h.said[1]).toBe('Thank you. Please type what you meant, or send the voice note again.');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
  });
});

describe('a voice note that cannot be read is never dropped silently', () => {
  it('says so when it could not be heard', async () => {
    const h = aPersonWith({ ok: false });
    await h.service.handle('org-1', voiceNote(), 'theirs');
    expect(h.said).toEqual(['I could not make out that voice note. Please send it again, or type what you wanted to say.']);
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.notes[0].transcript).toBeNull();
  });
  it('says so when it could not be fetched from WhatsApp', async () => {
    const h = aPersonWith({ ok: true, text: 'x', unclear: [] }, { fetched: false });
    await h.service.handle('org-1', voiceNote(), 'theirs');
    expect(h.said).toEqual(['I could not fetch that voice note from WhatsApp. Please send it again, or type what you wanted to say.']);
    expect(h.transcribe).not.toHaveBeenCalled();
  });
});

describe('a number nobody knows', () => {
  it('has its voice note neither fetched nor heard', async () => {
    const h = aPersonWith({ ok: true, text: 'x', unclear: [] }, { who: { personId: null, userId: null } });
    await h.service.handle('org-1', voiceNote(), 'theirs');
    expect(h.transcribe).not.toHaveBeenCalled();
    expect(h.notes).toHaveLength(0);
  });
});
