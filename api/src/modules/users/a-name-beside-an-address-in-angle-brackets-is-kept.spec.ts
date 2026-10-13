import { addressesIn, namesIn, planFor } from './putting-a-whole-company-on';

/**
 * B-128: pasting "Дмитрий Иванов <p01@fieldnote.test>" invited the person but dropped the name, so
 * the account was called "P01" and the invitation began "Hi P01,". The name beside an address in
 * angle brackets, as a mail client writes it, is kept, in any script, shown in the preview, and
 * handed to the invitation.
 */
describe('a name written beside an address in angle brackets', () => {
  const pasted = 'Дмитрий Иванов <p01@fieldnote.test>\n"Ada Obi" <ada@x.com>\nMaría José Peña <maria@x.com>, Ben Eze <ben@x.com>';

  it('is kept, whatever script it is written in', () => {
    expect(addressesIn(pasted)).toEqual(['p01@fieldnote.test', 'ada@x.com', 'maria@x.com', 'ben@x.com']);
    expect([...namesIn(pasted)]).toEqual([
      ['p01@fieldnote.test', 'Дмитрий Иванов'], ['ada@x.com', 'Ada Obi'], ['maria@x.com', 'María José Peña'], ['ben@x.com', 'Ben Eze'],
    ]);
  });

  it('is shown on the preview row, so the admin sees what was read', () => {
    const rows = planFor(pasted, () => false, null);
    expect(rows.map((r) => [r.email, r.name])).toEqual([
      ['p01@fieldnote.test', 'Дмитрий Иванов'], ['ada@x.com', 'Ada Obi'], ['maria@x.com', 'María José Peña'], ['ben@x.com', 'Ben Eze'],
    ]);
  });

  it('leaves a bare address without a name, and a typo is still a typo', () => {
    expect(planFor('a@x.com, oops', () => false, null)).toEqual([{ email: 'a@x.com', result: 'invited' }, { email: 'oops', result: 'not an email' }]);
  });
});
