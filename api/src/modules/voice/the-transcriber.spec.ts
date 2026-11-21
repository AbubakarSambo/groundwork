import { readATranscription, isAudio, GeminiTranscriber } from './the-transcriber';

describe('reading what the model sent back', () => {
  it('takes the words and only the unclear phrases that really are in them', () => {
    expect(readATranscription('```json\n{"text":"I met Mr Okonkwo on Friday.","unclear":["Mr Okonkwo","something not said"]}\n```')).toEqual({ ok: true, text: 'I met Mr Okonkwo on Friday.', unclear: [{ heard: 'Mr Okonkwo' }] });
  });
  it('is a failure, never an empty answer, when there are no words or the answer is not the shape asked for', () => {
    expect(readATranscription('{"text":"  ","unclear":[]}')).toEqual({ ok: false });
    expect(readATranscription('I am sorry, I cannot do that.')).toEqual({ ok: false });
  });
});

describe('what counts as audio', () => {
  it('goes by type, and by name for a plain binary, and never takes a video', () => {
    expect(isAudio('audio/ogg; codecs=opus')).toBe(true);
    expect(isAudio('application/octet-stream', 'note.m4a')).toBe(true);
    expect(isAudio('video/webm', 'clip.webm')).toBe(false);
    expect(isAudio('application/pdf', 'report.pdf')).toBe(false);
  });
});

describe('the Gemini transcriber', () => {
  it('sends the audio through the same media call the documents use, and says failure when the call fails', async () => {
    const calls: any[] = [];
    const ok = new GeminiTranscriber({ respondWithMedia: async (...a: any[]) => { calls.push(a); return '{"text":"Hello there.","unclear":[]}'; } } as any);
    expect(await ok.transcribe({ buffer: Buffer.from('A'), mimeType: 'audio/ogg; codecs=opus', fileName: 'v.ogg' })).toEqual({ ok: true, text: 'Hello there.', unclear: [] });
    expect(calls[0][2]).toEqual({ mimeType: 'audio/ogg', base64: Buffer.from('A').toString('base64') });
    const bad = new GeminiTranscriber({ respondWithMedia: async () => { throw new Error('busy'); } } as any);
    expect(await bad.transcribe({ buffer: Buffer.from('A'), mimeType: 'audio/ogg', fileName: 'v.ogg' })).toEqual({ ok: false });
  });
});

describe('the transcriber is given the organisation\'s own names (Batch D, D16)', () => {
  it('reads the organisation and its roster, and gives them to the model as a spelling list only', async () => {
    const { theNamesThisOrganisationUses } = await import('./the-transcriber');
    const prisma: any = {
      organization: { findUnique: async () => ({ name: 'Dangote Group (test)' }) },
      person: { findMany: async () => [{ displayName: 'Fatima Wali Abdulrahman' }, { givenName: 'Ahmed', familyName: 'Bako' }, { displayName: '' }] },
    };
    const names = await theNamesThisOrganisationUses(prisma, 'org-1');
    expect(names).toEqual(['Dangote Group', 'Fatima Wali Abdulrahman', 'Ahmed Bako']);
    let asked = '';
    const t = new GeminiTranscriber({ respondWithMedia: async (system: string) => { asked = system; return '{"text":"I need what I need Dangote to decide.","unclear":[]}'; } } as any);
    const heard = await t.transcribe({ buffer: Buffer.from('x'), mimeType: 'audio/ogg', fileName: 'fatima-voice-hour0.ogg', names });
    expect(asked).toMatch(/They are a spelling list only, not words that were said: Dangote Group; Fatima Wali Abdulrahman; Ahmed Bako\.$/);
    expect(heard).toEqual({ ok: true, text: 'I need what I need Dangote to decide.', unclear: [] });
    expect(await theNamesThisOrganisationUses(prisma, null)).toEqual([]);
  });
});
