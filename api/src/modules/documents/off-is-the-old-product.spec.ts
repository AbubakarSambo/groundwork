import { DocumentVisibility } from '@prisma/client';
import { canSeeDocument, documentWhereFor } from './who-can-see-a-document';

/**
 * THE TEST THAT MATTERS FOR A FLAG IS NOT THAT THE FEATURE WORKS.
 *
 * It is that turning the flag off restores exactly what was there before. That is
 * the thing you need at the moment you reach for the switch, and it is the thing
 * nobody writes a test for, because when the feature is working the switch feels
 * theoretical.
 *
 * So the first half of this file is the OFF case, and it asserts one property:
 * with CONTEXT_ENABLED off, a document is visible to its uploader and to nobody
 * else, whatever its visibility column happens to say. A row can have been
 * written as OPEN while the flag was on and the flag then turned off, and the
 * wrong answer in that moment is somebody's document reaching somebody it should
 * not. That is why the flag is read inside the rule rather than at the call site.
 */

const lead = { participantId: 'lead', isLead: true };
const owner = { participantId: 'a', isLead: false };
const other = { participantId: 'b', isLead: false };
const stranger = { participantId: null, isLead: false };

const doc = (visibility: DocumentVisibility, participantId: string | null = 'a') => ({ participantId, visibility });

describe('flag OFF: the old product, exactly', () => {
  const OFF = false;

  it('a document is visible to whoever uploaded it', () => {
    expect(canSeeDocument(doc(DocumentVisibility.OWN), owner, OFF)).toBe(true);
  });

  it('and to nobody else, including the lead', () => {
    // The behaviour today, which nobody chose: documents.list filters on
    // participantId, so even the person carrying the ground cannot see them.
    expect(canSeeDocument(doc(DocumentVisibility.OWN), lead, OFF)).toBe(false);
    expect(canSeeDocument(doc(DocumentVisibility.OWN), other, OFF)).toBe(false);
    expect(canSeeDocument(doc(DocumentVisibility.OWN), stranger, OFF)).toBe(false);
  });

  it('IGNORES the column, which is the whole point of a kill switch', () => {
    // THE REGRESSION THIS FILE EXISTS FOR. A row written as OPEN while the flag
    // was on must not stay open when the flag goes off.
    for (const v of [DocumentVisibility.OPEN, DocumentVisibility.CLOSED, DocumentVisibility.OWN]) {
      expect(canSeeDocument(doc(v), other, OFF)).toBe(false);
      expect(canSeeDocument(doc(v), lead, OFF)).toBe(false);
    }
  });

  it('and the query says the same thing as the rule', () => {
    expect(documentWhereFor('g1', owner, OFF)).toEqual({ groundId: 'g1', participantId: 'a' });
  });
});

describe('flag ON: three cases, because there are three', () => {
  const ON = true;

  it('OPEN reaches everyone in the ground', () => {
    // The brief, the plan, the grant terms. Useless if one person has them, which
    // is the state they are in today.
    expect(canSeeDocument(doc(DocumentVisibility.OPEN, 'lead'), owner, ON)).toBe(true);
    expect(canSeeDocument(doc(DocumentVisibility.OPEN, 'lead'), other, ON)).toBe(true);
    expect(canSeeDocument(doc(DocumentVisibility.OPEN, 'lead'), lead, ON)).toBe(true);
  });

  it('OPEN does not reach somebody who is not a party at all', () => {
    expect(canSeeDocument(doc(DocumentVisibility.OPEN, 'lead'), stranger, ON)).toBe(false);
  });

  it('CLOSED is the lead only', () => {
    expect(canSeeDocument(doc(DocumentVisibility.CLOSED, 'lead'), lead, ON)).toBe(true);
    expect(canSeeDocument(doc(DocumentVisibility.CLOSED, 'lead'), owner, ON)).toBe(false);
    expect(canSeeDocument(doc(DocumentVisibility.CLOSED, 'lead'), other, ON)).toBe(false);
  });

  it('OWN is still the uploader only, even with the flag on', () => {
    // A participant's evidence for their own account does not become shared just
    // because context did.
    expect(canSeeDocument(doc(DocumentVisibility.OWN, 'a'), owner, ON)).toBe(true);
    expect(canSeeDocument(doc(DocumentVisibility.OWN, 'a'), other, ON)).toBe(false);
    expect(canSeeDocument(doc(DocumentVisibility.OWN, 'a'), lead, ON)).toBe(false);
  });
});

describe('the query and the rule cannot drift apart', () => {
  /**
   * They are supposed to give the same answer and they are two different pieces
   * of code. Left alone, one gets fixed and the other does not - and the failure
   * mode is a document appearing in a list that the rule would have refused.
   *
   * Every combination, both ways, checked against each other rather than against
   * a hand-written expectation.
   */
  const readers = [lead, owner, other, stranger];
  const visibilities = [DocumentVisibility.OPEN, DocumentVisibility.CLOSED, DocumentVisibility.OWN];
  const uploaders = ['a', 'lead', null];

  const matchesWhere = (d: { participantId: string | null; visibility: DocumentVisibility }, where: any): boolean => {
    // The "match nothing" shape, for a reader who owns nothing on this ground.
    if (where.id?.in?.length === 0) return false;
    if (where.participantId !== undefined) return d.participantId === where.participantId;
    return (where.OR as any[]).some((c) =>
      c.visibility !== undefined ? d.visibility === c.visibility : d.participantId === c.participantId,
    );
  };

  for (const flag of [false, true]) {
    for (const reader of readers) {
      it(`agree for ${reader.isLead ? 'the lead' : reader.participantId ?? 'a non-party'}, flag ${flag ? 'on' : 'off'}`, () => {
        const where = documentWhereFor('g1', reader, flag);
        for (const visibility of visibilities) {
          for (const uploader of uploaders) {
            const d = { participantId: uploader, visibility };
            expect({ visibility, uploader, byRule: canSeeDocument(d, reader, flag) })
              .toMatchObject({ byRule: matchesWhere(d, where) });
          }
        }
      });
    }
  }
});

describe('a reader who is not a party to the ground', () => {
  /**
   * FOUND BY THE PROPERTY TEST ABOVE, not by looking. `participantId: null` in a
   * Prisma where matches every row whose participantId IS null, and those exist:
   * the participant relation is onDelete SetNull, so removing somebody orphans
   * their documents. A reader with no participant id was matching all of them.
   *
   * Guarded upstream today by assertParticipant. That is exactly the kind of
   * guarantee that disappears when the query gets reused somewhere else.
   */
  it('sees nothing, flag off', () => {
    const where: any = documentWhereFor('g1', stranger, false);
    expect(where.id?.in).toEqual([]);
  });

  it('sees nothing, flag on', () => {
    const where: any = documentWhereFor('g1', stranger, true);
    expect(where.id?.in).toEqual([]);
  });

  it('and in particular does not inherit orphaned documents', () => {
    const orphan = { participantId: null, visibility: DocumentVisibility.OWN };
    expect(canSeeDocument(orphan, stranger, false)).toBe(false);
    expect(canSeeDocument(orphan, stranger, true)).toBe(false);
  });
});
