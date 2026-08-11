import { DocumentVisibility } from '@prisma/client';
import {
  mayBeEvidenceInADivergence,
  mayBeQuotedAsSomebodysWords,
  attributeToItsSource,
  defaultVisibilityForUpload,
  mayShapeTheGround,
  whyNot,
  type ContextClaim,
} from './a-document-is-context';

/**
 * NOBODY GETS TO WIN A DISAGREEMENT BY UPLOADING A FILE. (G24)
 *
 * The failure this file exists to prevent is specific and it is not obvious until
 * it has happened. A lead uploads a role description. The model reads "owns
 * client delivery end to end" out of it. That sentence then appears on one side
 * of a divergence, as though somebody had said it in a check-in - and the
 * divergence resolves in the lead's favour, because the other side is one
 * person's account and this looks like two.
 *
 * It is not two. It is one account and one document the same person uploaded.
 *
 * Rule 1 has to be structural for a reason worth stating: as an instruction in a
 * prompt it is worth nothing, because by the time the model is reasoning the
 * document text is simply text in front of it with no memory of where it came
 * from. So provenance travels with the claim, and the function that decides
 * whether something can be evidence reads the provenance.
 */

const fromAccount = (text: string): ContextClaim => ({ text, source: 'account' });
const fromDocument = (text: string, over: Partial<ContextClaim> = {}): ContextClaim => ({
  text,
  source: 'document',
  documentName: 'delivery-lead-role.pdf',
  uploadedBy: 'Claire',
  confirmed: true,
  ...over,
});

describe('rule 1: a document is context, never an account', () => {
  it('an account can be evidence in a divergence', () => {
    expect(mayBeEvidenceInADivergence(fromAccount('I own the Brightwater relationship'))).toBe(true);
  });

  it('a document cannot, however relevant it is', () => {
    // THE REGRESSION. This is the exact sentence that would have decided a
    // disagreement in favour of whoever uploaded the file.
    expect(mayBeEvidenceInADivergence(fromDocument('Owns client delivery end to end'))).toBe(false);
  });

  it('and confirming it does not promote it to an account', () => {
    // Confirmation is rule 4 and it is a different question. A confirmed
    // extraction is still a document's claim; somebody agreeing the model read
    // the PDF correctly does not make the PDF a person.
    expect(mayBeEvidenceInADivergence(fromDocument('Owns client delivery', { confirmed: true }))).toBe(false);
  });

  it('a document cannot be quoted as somebody\'s words either', () => {
    expect(mayBeQuotedAsSomebodysWords(fromDocument('Owns client delivery end to end'))).toBe(false);
    expect(mayBeQuotedAsSomebodysWords(fromAccount('I own it'))).toBe(true);
  });
});

describe('rule 2: who uploaded it is part of what it is', () => {
  it('carries the document and the person, never bare', () => {
    expect(attributeToItsSource(fromDocument('Owns client delivery end to end')))
      .toBe('Owns client delivery end to end (from delivery-lead-role.pdf, added by Claire)');
  });

  it('says who added it even when the filename is missing', () => {
    expect(attributeToItsSource(fromDocument('Owns delivery', { documentName: undefined })))
      .toBe('Owns delivery (added by Claire)');
  });

  it('degrades to "from a document" rather than to nothing', () => {
    // The one thing it must never do is read as neutral fact.
    const bare = attributeToItsSource(fromDocument('Owns delivery', { documentName: undefined, uploadedBy: null }));
    expect(bare).toBe('Owns delivery (from a document)');
    expect(bare).not.toBe('Owns delivery');
  });

  it('leaves an account\'s own words exactly as they are', () => {
    // A person's words need no provenance; they ARE the provenance.
    expect(attributeToItsSource(fromAccount('I closed 22 tickets'))).toBe('I closed 22 tickets');
  });

  it('says so when it has not been confirmed yet', () => {
    expect(attributeToItsSource(fromDocument('Owns delivery', { confirmed: false })))
      .toMatch(/not yet confirmed/);
  });
});

describe('rule 3: upload defaults to private', () => {
  it('every time, whoever is uploading', () => {
    // THE TEMPTING VERSION is to default a lead's upload to shared, because the
    // lead's material is usually the brief and the brief is for everybody. Right
    // most of the time, catastrophic the once: a performance plan or a note about
    // somebody's health, dropped into shared context in a hurried first week by
    // somebody who assumed it would ask. Asking is cheap; the failure cannot be
    // undone, because the others have already read it.
    expect(defaultVisibilityForUpload()).toBe(DocumentVisibility.OWN);
  });

  it('and is never OPEN by default', () => {
    expect(defaultVisibilityForUpload()).not.toBe(DocumentVisibility.OPEN);
  });
});

describe('rule 4: extraction is confirmed, not adopted', () => {
  it('an unconfirmed extraction cannot shape the ground', () => {
    expect(mayShapeTheGround(fromDocument('Owns delivery', { confirmed: false }))).toBe(false);
  });

  it('a confirmed one can', () => {
    expect(mayShapeTheGround(fromDocument('Owns delivery', { confirmed: true }))).toBe(true);
  });

  it('an absent confirmation is not a confirmation', () => {
    // The failure mode of an optional boolean: undefined must not read as yes.
    expect(mayShapeTheGround({ text: 'Owns delivery', source: 'document' })).toBe(false);
  });

  it('and an account never needs confirming', () => {
    // A person saying a thing IS the record. Making them confirm their own words
    // would be asking somebody to verify themselves.
    expect(mayShapeTheGround(fromAccount('I own it'))).toBe(true);
  });
});

describe('the refusals say why, so a log is something a person can act on', () => {
  it('names the reason for evidence', () => {
    expect(whyNot(fromDocument('x'), 'evidence')).toMatch(/not a party's account/);
  });

  it('names the reason for a quote', () => {
    expect(whyNot(fromDocument('x'), 'quote')).toMatch(/attributes the organisation's standard/);
  });

  it('names the reason for an unconfirmed extraction', () => {
    expect(whyNot(fromDocument('x', { confirmed: false }), 'shape')).toMatch(/proposal rather than context/);
  });

  it('and returns null when there is nothing to say', () => {
    expect(whyNot(fromAccount('x'), 'evidence')).toBeNull();
    expect(whyNot(fromAccount('x'), 'quote')).toBeNull();
    expect(whyNot(fromAccount('x'), 'shape')).toBeNull();
  });
});
