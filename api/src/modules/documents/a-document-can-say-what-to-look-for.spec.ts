import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A FILE ARRIVED WITH NO INSTRUCTIONS AND THE SESSION HAD TO GUESS WHAT MATTERED ABOUT IT.
 *
 * In the chat somebody can say what to look for as they attach a file, because there is a
 * conversation to say it into. From the Context tab there was nowhere to put it, so a forty page
 * architecture document went in mute and the session asked about whichever half it read.
 *
 * Comments stripped: this explanation names the code it protects.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '');
const SERVICE = strip(readFileSync(join(__dirname, 'documents.service.ts'), 'utf8'));
const CONTROLLER = strip(readFileSync(join(__dirname, 'documents.controller.ts'), 'utf8'));
const CONVERSATION = strip(readFileSync(join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8'));

describe('a document can say what to look for in it', () => {
  it('is accepted on the upload route', () => {
    expect(CONTROLLER).toContain('uploaderNote?: string');
    expect(CONTROLLER).toContain('body?.uploaderNote');
  });

  it('is stored in their words, or not at all', () => {
    /* Trimmed, never rewritten, and an empty one is null rather than an empty string - so nothing
       downstream has to tell the difference between "said nothing" and "said nothing at length". */
    expect(SERVICE).toContain("uploaderNote: uploaderNote?.trim() || null");
  });

  it('reaches the session, or it is a field nobody reads', () => {
    expect(CONVERSATION).toContain('uploaderNote: true');
    expect(CONVERSATION).toContain('They asked for this to be read for:');
  });

  it('sits above the document rather than after it', () => {
    /* A long document read first is a long document read without knowing what to look for. */
    const line = CONVERSATION.slice(CONVERSATION.indexOf('const asked = d.uploaderNote'));
    expect(line.slice(0, 400)).toContain('${asked}${d.content}');
  });

  it('says nothing at all when nobody asked for anything', () => {
    expect(CONVERSATION).toContain("d.uploaderNote?.trim()\n            ?");
  });
});
