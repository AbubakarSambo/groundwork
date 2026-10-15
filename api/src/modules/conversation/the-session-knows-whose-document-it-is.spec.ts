import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { whereThisCameFrom, WHAT_TO_DO_WITH_THESE } from './where-this-document-came-from';
import { whatFitsInTheRoom } from './a-prompt-that-ran-out-of-room-says-so';

/**
 * THE SESSION READS EVERYBODY'S SHARED DOCUMENTS AND WAS TOLD THE PERSON WROTE THEM ALL.
 *
 * `documentWhereFor` has reached the session for a while, so an OPEN document - the lead's brief, a
 * grant's terms, an admin's policy - already arrives. It went in under one heading: "SUPPORTING
 * DOCUMENTS (uploaded by this party before the session)". False about every one of them.
 *
 * Which is why the session could not do the thing asked for: "the chat can help me understand or
 * fill in blanks i am missing by stating this is context from x that is available to you if i seem
 * to say something misaligned with the context or ask it a question." You cannot say "this is from
 * the brief your lead shared with everyone" if you were told they wrote it themselves.
 */
describe('where a document came from', () => {
  it('says when the person you are talking to provided it, and whether they shared it', () => {
    expect(whereThisCameFrom({ mine: true, sharedWithEveryone: false }))
      .toBe('Provided by the person you are talking to. Private to them.');
    expect(whereThisCameFrom({ mine: true, sharedWithEveryone: true }))
      .toContain('shared it with everyone');
  });

  it('names the lead as the lead, because that is what makes a brief a brief', () => {
    const line = whereThisCameFrom({ mine: false, who: 'Adaeze', fromTheLead: true, sharedWithEveryone: true });
    expect(line).toContain('Adaeze, who runs this check-in');
    expect(line).toContain('the person you are talking to can read it too');
  });

  it('and falls back to a role rather than inventing a name', () => {
    expect(whereThisCameFrom({ mine: false, who: null, fromTheLead: true, sharedWithEveryone: true }))
      .toContain('the person who runs this check-in');
    expect(whereThisCameFrom({ mine: false, who: null, fromTheLead: false, sharedWithEveryone: true }))
      .toContain('somebody else in this check-in');
  });

  /**
   * The line is what tells the session whether a document is common ground. Getting it wrong in
   * this direction means quoting somebody's private file at them as though the room had seen it.
   */
  it('never says a document is shared when it is not', () => {
    for (const p of [
      { mine: true, sharedWithEveryone: false },
      { mine: false, who: 'Ada', sharedWithEveryone: false },
      { mine: false, who: 'Ada', fromTheLead: true, sharedWithEveryone: false },
    ]) {
      expect(whereThisCameFrom(p)).not.toMatch(/everyone|everybody|can read it too/i);
    }
  });
});

describe('the line travels with the document into the prompt', () => {
  const doc = (over: Record<string, unknown> = {}) => ({
    fileName: 'handover-plan.txt',
    content: 'x'.repeat(1200),
    uploaderNote: null,
    ...over,
  });

  it('sits above the text it describes', () => {
    const { block } = whatFitsInTheRoom([doc({ provenance: 'Provided by Adaeze, who runs this check-in.' })]);
    expect(block.indexOf('Provided by Adaeze')).toBeGreaterThan(block.indexOf('handover-plan.txt'));
    expect(block.indexOf('Provided by Adaeze')).toBeLessThan(block.indexOf('xxxx'));
  });

  /** Absent, a document goes in exactly as every document used to. */
  it('and a document without one is unchanged', () => {
    const { block } = whatFitsInTheRoom([doc()]);
    expect(block).toContain('--- handover-plan.txt ---');
    expect(block).not.toContain('Provided by');
  });

  it('and survives a document that only half fits', () => {
    const { block } = whatFitsInTheRoom([doc({ content: 'y'.repeat(50_000), provenance: 'Provided by Adaeze.' })], 2_000);
    expect(block).toContain('Provided by Adaeze.');
  });
});

describe('what the session is told to do with them', () => {
  it('names a source when answering a question', () => {
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/WHEN THEY ASK YOU SOMETHING/);
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/say where the\n   answer came from/);
  });

  it('and asks rather than corrects when an account and a document disagree', () => {
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/DOES NOT MATCH A SHARED DOCUMENT/);
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/You are not correcting them/);
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/a document can be out of date/);
  });

  /**
   * DRIVEN, NOT READ. The first version of this said "name the source" and gave an example, and the
   * live session dropped it: told the handover was finished in August, it answered "You've said the
   * handover was finished in August. Which one is right?" - asking somebody to guess what it was
   * looking at. Naming what the document says is now stated as the instruction rather than shown in
   * an example, and the refusal is named too.
   */
  it('and shows the discrepancy rather than asking somebody to guess it', () => {
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/SAY WHAT THE\n   DOCUMENT SAYS AND WHOSE IT IS/);
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/Not "which one is right\?"/);
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/cannot answer a discrepancy you have\n   not shown them/);
  });

  it('and fills a blank rather than interrogating somebody about it', () => {
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/tell them it is\n   there rather than interrogating/);
  });

  /**
   * The limit. The query never hands over anybody else's private documents, so the only way to
   * break this here is to quote the reader's own private file back as though the room had seen it.
   */
  it('and never speaks about a private document as common ground', () => {
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/THE LIMIT/);
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/Never quote it/);
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/Only a document that says it is shared with everyone/);
  });

  it('and does not let a document outrank the account it is here to test', () => {
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/NEVER TREAT A DOCUMENT AS THE TRUTH ABOUT WHAT HAPPENED/);
    expect(WHAT_TO_DO_WITH_THESE).toMatch(/that difference is the finding/);
  });
});

/**
 * AND IT REACHES THE ASSEMBLED PROMPT, which is the only proof that counts.
 *
 * The lesson this codebase keeps relearning: a block that is built and never concatenated is a
 * comment with extra steps. The provenance line and the instructions are useless if they are
 * computed beside a prompt rather than in it.
 */
describe('it reaches the assembled prompt', () => {
  const SERVICE = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('attaches the line to every document before they are measured for room', () => {
    expect(SERVICE).toMatch(/provenance: whereThisCameFrom\(\{/);
    /* Before, so a document that only half fits still says whose it is. */
    expect(SERVICE.indexOf('provenance: whereThisCameFrom'))
      .toBeLessThan(SERVICE.indexOf('whatFitsInTheRoom([...withProvenance]'));
  });

  it('reads the uploader and the visibility, without which it could not', () => {
    expect(SERVICE).toMatch(/fileName: true, content: true, uploaderNote: true, visibility: true/);
    expect(SERVICE).toMatch(/participant: \{\s*select: \{\s*userId: true, email: true/);
  });

  it('and the false heading is gone', () => {
    expect(SERVICE).not.toContain('uploaded by this party before the session');
    expect(SERVICE).toContain('DOCUMENTS THIS SESSION CAN READ:');
  });

  it('and the instructions are concatenated into the block, not merely imported', () => {
    expect(SERVICE).toMatch(/\+ `\\n\\n\$\{WHAT_TO_DO_WITH_THESE\}`/);
  });

  it('and docContext is joined into the prompt', () => {
    expect(SERVICE).toMatch(/docContext[^\]]*\]\.filter\(Boolean\)\.join/);
  });

  /** Which documents arrive is `documentWhereFor`'s job, and this must not have widened it. */
  it('and none of this widened which documents arrive', () => {
    expect(SERVICE).toMatch(/where: documentWhereFor\(/);
  });
});

/**
 * NIGHT QUALITY RUN 1, PROBLEM 1. Amina's pin reached Collins's session and he was told "Amina shared
 * a location pin on Monday for a Rangwe stockist shop, and Rangwe said Rangwe asked you to check it
 * out." The prompt Collins's session receives now holds only the record's facts about her pin and
 * photo, with the rule against a story above them.
 */
describe("a colleague's photo or pin, as Collins's session receives it", () => {
  const { aColleaguesProofAsTheRecordHoldsIt, whatMayBeSaidAboutAColleaguesProof, isAColleaguesProof } = require('./where-this-document-came-from');
  const pin = {
    fileName: 'Location pin shared at 11:30 on Monday 19 October',
    content: 'Amina shared a location pin at 11:30 on Monday 19 October. The pin is named Rangwe stockist shop. The address on the pin is Rangwe market, Homa Bay county. The pin is at latitude -0.6296, longitude 34.5948.',
    uploaderNote: null, mimeType: 'text/plain', createdAt: new Date('2026-10-19T08:30:00Z'),
  };
  const photo = {
    fileName: 'image-wamid.in.369badb59f254f98.png',
    content: 'A delivery note DN-1182 signed by the Rangwe shop owner, showing six kits received.',
    uploaderNote: 'DN-1182 signed', mimeType: 'image/png', createdAt: new Date('2026-10-19T08:31:00Z'),
  };
  const block = () => whatFitsInTheRoom([pin, photo].map((d) => ({
    ...aColleaguesProofAsTheRecordHoldsIt(d, 'Amina Otieno', 'Africa/Nairobi'),
    provenance: whatMayBeSaidAboutAColleaguesProof('Amina Otieno'),
  }))).block;

  it('knows a photo and a pin from a brief', () => {
    expect(isAColleaguesProof(pin)).toBe(true);
    expect(isAColleaguesProof(photo)).toBe(true);
    expect(isAColleaguesProof({ fileName: 'handover-plan.txt', content: 'x', mimeType: 'text/plain' })).toBe(false);
  });

  it('holds who shared the pin, when, and its name', () => {
    expect(block()).toContain('Amina shared a location pin at 11:30 on Monday 19 October. The pin is named Rangwe stockist shop.');
  });

  it('says plainly that nobody may be told who asked whom, why, or what it shows', () => {
    const b = block();
    expect(b).toContain('Never say who asked anybody to go there, why it was sent, or what it shows, unless Amina Otieno said so in those words.');
    expect(b).toContain('Never put it to the person you are talking to as something they did, were asked to do, or know about.');
    expect(WHAT_TO_DO_WITH_THESE).toContain("A COLLEAGUE'S PHOTO OR PIN");
  });

  it("never hands over what the machine read in Amina's photo, only her own words with it", () => {
    const b = block();
    expect(b).not.toContain('six kits received');
    expect(b).toContain('A photo Amina Otieno sent with their own check-in on Monday 19 October. Amina Otieno wrote with it: "DN-1182 signed"');
  });

  /* Changed 12 October (Hafsah, step 3): this pinned that the session handed a colleague's proof over as the record holds it. Run 2
     still put Amina's pin to Collins, so a colleague's proof is now never handed to another person's session at all. */
  it('and the session is never handed a colleague\'s proof at all', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(src).toMatch(/withoutAColleaguesProof\(uploadedDocs as any\[\], \{ userId: checkIn\.participant\.userId, leadUserId: ground\.initiatorId \}\)/);
    expect(src).not.toMatch(/aColleaguesProofAsTheRecordHoldsIt\(/);
  });
});

/*
 * HAFSAH, 12 OCTOBER, STEP 3: "A colleague's proof is never put to another person in their session; proof goes into the person's own
 * check-in." Run 2: "Amina shared a location pin on Monday for a Rangwe stockist shop. Do you know about that one?"
 */
describe("Collins's session holds none of Amina's proof, and the shared page still shows it", () => {
  const { withoutAColleaguesProof } = require('./where-this-document-came-from');
  const { documentWhereFor, canSeeDocument } = require('../documents/who-can-see-a-document');
  const amina = { userId: 'u-amina' };
  const docs = [
    { fileName: 'Location pin shared at 11:30 on Monday 19 October', content: 'Amina shared a location pin at 11:30 on Monday 19 October. The pin is named Rangwe stockist shop.', mimeType: 'text/plain', visibility: 'OPEN', participantId: 'p-amina', participant: amina },
    { fileName: 'image-wamid.in.369badb59f254f98.png', content: 'A delivery note DN-1182.', uploaderNote: 'DN-1182 signed', mimeType: 'image/png', origin: 'photo', visibility: 'OPEN', participantId: 'p-amina', participant: amina },
    { fileName: 'IMG_2041.jpg', content: 'A slip.', mimeType: 'image/jpeg', origin: 'photo', visibility: 'OPEN', participantId: 'p-amina', participant: amina },
    { fileName: 'kit-price-list.pdf', content: 'Kits are 2,400 shillings.', mimeType: 'application/pdf', origin: 'typed', visibility: 'OPEN', participantId: 'p-esther', participant: { userId: 'u-esther' } },
    { fileName: 'Location pin shared at 09:00 on Tuesday 20 October', content: 'Collins shared a location pin. The pin is named Oyugis shop.', mimeType: 'text/plain', visibility: 'OWN', participantId: 'p-collins', participant: { userId: 'u-collins' } },
  ];

  it("Collins's session is handed his own pin and Esther's price list, and nothing Amina sent", () => {
    const handed = withoutAColleaguesProof(docs, { userId: 'u-collins', leadUserId: 'u-esther' });
    expect(handed.map((d: any) => d.fileName)).toEqual(['kit-price-list.pdf', 'Location pin shared at 09:00 on Tuesday 20 October']);
    expect(JSON.stringify(handed)).not.toMatch(/Amina|Rangwe|DN-1182/);
  });

  it("Amina's own session still has her pin and photos", () => {
    expect(withoutAColleaguesProof(docs, { userId: 'u-amina', leadUserId: 'u-esther' })).toHaveLength(4);
  });

  it('the shared page still shows her pin and photo to Collins and to Esther, exactly as before', () => {
    const where = documentWhereFor('g1', { participantId: 'p-collins', isLead: false }, true);
    expect(JSON.stringify(where)).toContain('"visibility":"OPEN"');
    for (const d of docs.slice(0, 3)) {
      expect(canSeeDocument(d as any, { participantId: 'p-collins', isLead: false }, true)).toBe(true);
      expect(canSeeDocument(d as any, { participantId: 'p-esther', isLead: true }, true)).toBe(true);
    }
  });
});
