import { labelsForParties, withNames } from './party-labels';
import { PartyType } from '@prisma/client';

/*
 * TEN AGRIBUSINESSES, ONE OPEN LINK, AND CHIDINMA'S TRUCKS PUBLISHED UNDER IBRAHIM'S NAME.
 *
 * The write path fetched participants `orderBy: createdAt asc`; the read path used a bare
 * `include` with no ordering. Letters were handed out by array position, so the read's labels sat
 * one place off the write's and "Participant B" resolved to the person who had been "Participant A".
 */
const at = (n: number) => new Date(Date.UTC(2026, 8, 24, 13, n, 0));

const lead: any = { id: 'lead', partyType: PartyType.INITIATOR, roleAsDescribed: 'a_party', createdAt: at(0) };
const ten: any[] = ['ibrahim', 'chidinma', 'yusuf', 'amina', 'tunde', 'grace', 'musa', 'blessing', 'samuel', 'fatima']
  .map((id, i) => ({ id, partyType: PartyType.PARTICIPANT, roleAsDescribed: null, createdAt: at(i + 1) }));

describe('a letter is not a row number', () => {
  it('gives the same person the same letter whatever order the rows arrive in', () => {
    const inOrder = labelsForParties([lead, ...ten]);
    const shuffled = labelsForParties([...ten].reverse().concat(lead));
    const rotated = labelsForParties([ten[4], lead, ...ten.filter((_, i) => i !== 4)]);
    for (const p of [lead, ...ten]) {
      expect(shuffled.get(p.id)).toBe(inOrder.get(p.id));
      expect(rotated.get(p.id)).toBe(inOrder.get(p.id));
    }
  });

  it('and the letters are the ones the write path was already assigning', () => {
    const labels = labelsForParties([lead, ...ten]);
    expect(labels.get('ibrahim')).toBe('Participant A');
    expect(labels.get('chidinma')).toBe('Participant B');
    expect(labels.get('fatima')).toBe('Participant J');
    /* The lead is "the initiator" and takes no letter, which is why the respondents start at A.
       This read `a_party` when the lead's role was used as their label; labels are positional now. */
    expect(labels.get('lead')).toBe('the initiator');
  });

  /* The defect, end to end: the stored sentence resolves to the person who said it. */
  it('resolves a stored label to the person who actually said it', () => {
    const written = labelsForParties([lead, ...ten]);
    const read = labelsForParties([...ten].reverse().concat(lead));
    const stored = 'Participant B said this was for: It is about having more trucks, first.';
    const visible = new Map<string, string>();
    for (const [id, label] of read) {
      visible.set(label, id === 'chidinma' ? 'Chidinma (Freshline Cold Chain)' : id === 'ibrahim' ? 'Ibrahim (Danladi Grains)' : id);
    }
    const out = withNames(stored, visible, [...read.values()]);
    expect(out).toContain('Chidinma (Freshline Cold Chain)');
    expect(out).not.toContain('Ibrahim');
    expect(written.get('chidinma')).toBe('Participant B');
  });

  /*
   * AND IT LEAVES A LIST ALONE WHERE THE DATA CANNOT ANSWER THE QUESTION. Sorting those by id was
   * my first version, and it made a participant see a colleague's name - a reorder is exactly how
   * one person gets another's label, which is the thing being fixed.
   */
  it('keeps the order it was given where nobody selected createdAt', () => {
    const bare: any[] = ten.map((p) => ({ ...p, createdAt: undefined }));
    expect(labelsForParties(bare).get('ibrahim')).toBe('Participant A');
    expect(labelsForParties([...bare].reverse()).get('fatima')).toBe('Participant A');
  });

  /* One party missing a timestamp is enough to fall back, because a half-sorted list is worse. */
  it('falls back whole rather than sorting part of a list', () => {
    const mixed: any[] = [{ ...ten[0], createdAt: undefined }, ...ten.slice(1)];
    expect(labelsForParties(mixed).get('ibrahim')).toBe('Participant A');
  });
});
