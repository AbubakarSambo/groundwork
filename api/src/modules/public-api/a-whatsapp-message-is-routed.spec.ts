import { pickedOne, whichOneAsText, whatArrived, sessionHeader, reportAsText, languageBlock } from './a-whatsapp-message-is-routed';

const open = [
  { id: 'c1', status: 'IN_PROGRESS', sessionNumber: 3, label: 'September sprint' },
  { id: 'c2', status: 'NOT_STARTED', sessionNumber: 1, label: 'October OKRs' },
];

describe('a number with two check-ins open is asked which', () => {
  it('lists them numbered, and a typed number or a tapped id picks one', () => {
    expect(whichOneAsText(open)).toContain('1. September sprint, session 3 (started)');
    expect(pickedOne('2', open)?.id).toBe('c2');
    expect(pickedOne('c1', open)?.id).toBe('c1');
    expect(pickedOne('hello', open)).toBeNull();
    expect(pickedOne('9', open)).toBeNull();
  });
  it('names the session on the phone', () => {
    expect(sessionHeader(open[0])).toBe('September sprint, session 3.');
  });
});

describe('what arrived', () => {
  it('reads text, a tapped row, and media with its caption', () => {
    expect(whatArrived({ type: 'text', text: { body: ' hi ' } })).toEqual({ kind: 'text', text: 'hi' });
    expect(whatArrived({ type: 'interactive', interactive: { list_reply: { id: 'c2' } } })).toEqual({ kind: 'pick', id: 'c2' });
    expect(whatArrived({ id: 'm1', type: 'image', image: { id: 'media9', mime_type: 'image/jpeg', caption: 'the rota' } })).toEqual({ kind: 'media', mediaId: 'media9', mimeType: 'image/jpeg', fileName: 'image-m1.jpeg', caption: 'the rota', named: false, what: 'photo' });
    expect(whatArrived({ type: 'document', document: { id: 'd1', mime_type: 'application/pdf', filename: 'plan.pdf' } })).toMatchObject({ kind: 'media', fileName: 'plan.pdf' });
    expect(whatArrived({ type: 'sticker' })).toEqual({ kind: 'other' });
  });
});

describe('the report as one message, and the language line', () => {
  it('says where things stand, the reads, and the question on its own', () => {
    const t = reportAsText({ whereThingsStand: { saying: 'Two things settled, one open.' }, atAGlance: [{ label: 'Scope', value: 'Clear', sub: 'five pages named' }], theConversationWorthHaving: 'Who signs off copy.' }, 'New project');
    expect(t).toContain('Your report for New project is ready.');
    expect(t).toContain('Five pages named.');
    expect(t).toContain('Who signs off copy.');
    expect(t).not.toContain('conversation worth having');
    expect(t).not.toMatch(/Scope: Clear|Worth having:|\(five pages named\)/);
  });
  it('is empty for English and names the language otherwise', () => {
    expect(languageBlock('en')).toBe('');
    expect(languageBlock(null)).toBe('');
    expect(languageBlock('ha')).toContain('HAUSA');
    expect(languageBlock('xx')).toBe('');
  });
});
