import { onlyWhoIsActuallyOutside, WHY_THIS_IS_HERE } from './somebody-carrying-work-with-no-account';

const names = ['Ada Test', 'Tom Test'];
const ok = { label: 'F2 doctor on the night rota', evidence: 'Described as the person the ward calls first when the consultant is unreachable.' };

describe('a hidden contributor is outside the room', () => {
  it('keeps somebody referenced by role who is not on the check-in', () => {
    const { keep, dropped } = onlyWhoIsActuallyOutside([ok], names);
    expect(keep).toEqual([ok]);
    expect(dropped).toEqual([]);
  });

  it('drops a row that quotes anybody, because the no-quote rule is absolute', () => {
    /* Real, from the first four rows ever produced: "junior doctors avoid calling them: 'there are
       three wards and one of him'". A quotation attached to a NAME is worse than one attached to a
       role, and the board drops a leadership gap for the same thing. */
    const rows = [{ label: 'the on-call consultant', evidence: "They avoid calling them: 'there are three wards and one of him'." }];
    const { keep, dropped } = onlyWhoIsActuallyOutside(rows, names);
    expect(keep).toEqual([]);
    expect(dropped[0].why).toBe('quotes somebody');
  });

  it('and a word-internal apostrophe is not a quotation', () => {
    const rows = [{ label: 'the ward sister', evidence: "Runs the rota when the consultant isn't reachable." }];
    expect(onlyWhoIsActuallyOutside(rows, names).keep).toHaveLength(1);
  });

  it('drops the schema words for people who are in the room', () => {
    /* Two of the first four were "the initiator" and "participant A", who are parties by
       definition. That is the read mistaking the people in front of it for somebody absent. */
    for (const label of ['the initiator', 'participant A', 'the lead', 'party B']) {
      const { keep, dropped } = onlyWhoIsActuallyOutside([{ label, evidence: 'Referenced as doing the work.' }], names);
      expect(keep).toEqual([]);
      expect(dropped[0].why).toBe('is a party here');
    }
  });

  it('drops a row whose label is somebody on the check-in by name', () => {
    const { dropped } = onlyWhoIsActuallyOutside([{ label: 'Ada Test', evidence: 'Referenced as doing the work.' }], names);
    expect(dropped[0].why).toBe('is a party here');
  });

  it('drops a row whose evidence names somebody on the check-in', () => {
    const rows = [{ label: 'the vendor', evidence: 'Tom Test said they were waiting on the vendor for the rota.' }];
    expect(onlyWhoIsActuallyOutside(rows, names).dropped[0].why).toBe('names a party');
  });

  it('drops a contributor that was worked out rather than referenced', () => {
    /* "Success is defined as the project running without them, implying a handover to a client" -
       names nobody, infers that a client exists. A contributor nobody referenced is one this
       product invented. */
    const rows = [{ label: 'a client', evidence: 'Success is the project running without them, implying a handover to a client.' }];
    expect(onlyWhoIsActuallyOutside(rows, names).dropped[0].why).toBe('was inferred rather than referenced');
  });

  it('refuses a row with nothing behind it', () => {
    expect(onlyWhoIsActuallyOutside([{ label: 'somebody', evidence: 'yes' }], names).keep).toEqual([]);
    expect(onlyWhoIsActuallyOutside([{ label: '', evidence: 'a long enough sentence here' }], names).keep).toEqual([]);
    expect(onlyWhoIsActuallyOutside([], names).keep).toEqual([]);
  });

  it('does not let a board carry a list of everybody mentioned', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ label: `outsider ${i}`, evidence: 'Referenced as doing the work here.' }));
    expect(onlyWhoIsActuallyOutside(many, names).keep).toHaveLength(6);
  });

  it('says why the section exists without it reading as a list of people somebody forgot', () => {
    expect(WHY_THIS_IS_HERE).toContain('cannot correct a record they are not in');
    expect(WHY_THIS_IS_HERE).not.toMatch(/forgot|missed|should have|failed/i);
  });
});
