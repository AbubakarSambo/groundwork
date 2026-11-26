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
/*
 * The note is rendered where the documents are assembled, which moved when they were given a size
 * bound. Same invariants, pointed at where the code now lives - the alternative is a guard that
 * passes because it is looking at the wrong file.
 */
const ASSEMBLY = strip(readFileSync(join(__dirname, '..', 'conversation', 'a-prompt-that-ran-out-of-room-says-so.ts'), 'utf8'));

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
    expect(ASSEMBLY).toContain('They asked for this to be read for:');
  });

  it('sits above the document rather than after it', () => {
    /* A long document read first is a long document read without knowing what to look for. */
    const head = ASSEMBLY.slice(ASSEMBLY.indexOf('const head ='));
    expect(head.slice(0, 200)).toContain('${asked}');
    expect(ASSEMBLY).toContain('${head}${quotedAsData(d.content)}');
  });

  it('says nothing at all when nobody asked for anything', () => {
    expect(ASSEMBLY).toContain("d.uploaderNote?.trim()");
    expect(ASSEMBLY).toContain("? `They asked");
  });
});
