import { R2, theRunRebuiltEachEvening, theRunAsADatabase, aPersonRecordTable, thePersonOf, THE_END_OF_THE_RUN } from './the-persons-record-bed';
import { rebuildThePersonsRecords, readThePersonsRecord } from './the-persons-record-store';
import { theRecordInWords } from './the-persons-record-in-words';

/**
 * EACH PERSON'S RECORD, FROM THE SECOND NIGHT RUN, AS EACH PERSON AND THEIR LEAD READ IT (Groundwork does the managing, part 1).
 *
 * The record is built as the run would have built it: each evening a check-in finished, from the rows written by then, and once more on
 * Tuesday 20 October in the morning. What is read here is the words a person reads (board/the-persons-record-in-words.ts), not the
 * counts behind them.
 *
 * Joseph said "It's basically closed." and "Mama Pima paid a deposit." with nothing on file, and gave 10 units for Mama Pima on Monday and
 * 15 on Tuesday. Aisha said four times that a client had paid, with no slip or statement on file. Both must show. Kevin, Mercy and Njeri
 * backed what they said (Kevin's Kilele Hotel payment, his M-Pesa code RCD8M1LS4W, Mercy's receipt and signed order, Njeri's bank slip),
 * and must not be shown as the problem.
 */
const LABELS = /\b(?:at risk|PIP|performance improvement|underperform\w*|low performer|poor performer|score|grade|rating|rated)\b|\d+\s?%|\b\d+\s?\/\s?\d+\b/i;
/* A colon joining two pieces, outside their own quoted words. */
const A_COLON = (s: string) => /:/.test(s.replace(/“[^”]*”/g, ''));

async function theRecordOf(g: 'drop' | 'fees', who: string, self = true) {
  const table = await theRunRebuiltEachEvening(g, rebuildThePersonsRecords);
  const p = thePersonOf(g, who);
  const stored = await readThePersonsRecord({ personRecord: table }, p.participantId);
  if (!stored) throw new Error(`No record for ${who}`);
  const words = theRecordInWords(stored.record, stored.coaching, { self, firstName: who }, R2[g].ground.label);
  const all = [words.heading, words.note, ...words.parts.flatMap((x) => [x.heading, x.says, x.toChange ?? '', ...x.evidence]), ...words.coaching.flatMap((c) => [c.said, c.since]), words.coachingEmpty].filter((x): x is string => !!x);
  return { stored, words, all, part: (h: RegExp) => words.parts.find((x) => h.test(x.heading)) ?? null };
}

describe('Joseph, overstating, reads his own record', () => {
  it('says none of the three things he said were sold, paid or signed has proof, with his own words and the days', async () => {
    const { part } = await theRecordOf('drop', 'Joseph');
    const said = part(/what you said/i)!;
    expect(said.says).toBe('You said three times that something was sold, paid or signed. None of them has proof on file, and you took two back later.');
    expect(said.toChange).toBe('Adding the photo, slip or link when you say something is done would change this.');
    expect(said.evidence).toEqual([
      'On Monday 12 October you said “I\'ve got some big deals in the pipeline that are basically closed.” Nothing on file shows it yet.',
      'On Monday 12 October you said “That 10-unit deal for Mama Pima is definitely part of my 30-unit target. It\'s basically closed.” On Friday 16 October you said “The Mama Pima deposit hasn\'t actually come through yet, she\'s still choosing.”',
      'On Wednesday 14 October you said “Mama Pima paid a deposit.” On Friday 16 October you said “The Mama Pima deposit hasn\'t actually come through yet, she\'s still choosing.”',
    ]);
  });
  it('puts his two figures for Mama Pima side by side', async () => {
    const { part } = await theRecordOf('drop', 'Joseph');
    expect(part(/figures/i)!.evidence).toEqual(['On Monday 12 October you said 10 units for Mama Pima Stores, and on Tuesday 13 October you said 15 units.']);
  });
  it('was coached on proof after his first check-in, and the record says it has stayed the same', async () => {
    const { words, stored } = await theRecordOf('drop', 'Joseph');
    expect(stored.coaching.map((c) => [c.about, c.afterSession, c.outcome])).toEqual([['proof', 1, 'the same']]);
    expect(words.coaching).toEqual([{ said: 'After your check-in on Monday 12 October, Groundwork told you “Add the photo, slip or link when you say something is done.”', since: 'Backing what you say with proof has stayed the same since then.' }]);
  });
  it('and Grace, who runs it, reads the same about Joseph by name', async () => {
    const { words, part } = await theRecordOf('drop', 'Joseph', false);
    expect(words.heading).toBe('Joseph’s record in Sales team, Q4');
    expect(part(/what joseph said/i)!.says).toBe('Joseph said three times that something was sold, paid or signed. None of them has proof on file, and Joseph took two back later.');
    expect(words.coaching[0].said).toBe('After Joseph’s check-in on Monday 12 October, Groundwork told Joseph “Add the photo, slip or link when you say something is done.”');
  });
});

describe('Aisha, whose payments are only said, reads her own record', () => {
  it('says none of the four payments she told us about has proof on file, with FN-006 in her own words', async () => {
    const { part } = await theRecordOf('fees', 'Aisha');
    const said = part(/what you said/i)!;
    expect(said.says).toBe('You said four times that something was sold, paid or signed. None of them has proof on file, and you took one back later.');
    expect(said.evidence).toContain('On Monday 19 October you said “FN-006 for Baraka Hardware has been paid.” Nothing on file shows it yet.');
    expect(said.evidence).toContain('On Monday 12 October you said “I think they\'ve paid, I believe it went through on Friday.” On Monday 19 October you said “I was mistaken; Jamii Clinics hasn\'t actually paid yet.”');
  });
  it('says her promise to follow up with Mr. Baraka is past its day', async () => {
    const { part } = await theRecordOf('fees', 'Aisha');
    expect(part(/promises/i)!.evidence).toContain('You promised “I\'ll follow up with Mr. Baraka.” for Monday 19 October, and nothing you have said since shows it done.');
  });
  it('was coached on proof, with the fee note named', async () => {
    const { stored } = await theRecordOf('fees', 'Aisha');
    expect(stored.coaching.map((c) => c.about)).toEqual(['proof']);
    expect(stored.coaching[0].said).toBe('Add the photo, slip or link when you say something is done. For FN-009, that would be the payment slip, the bank statement or the M-Pesa message.');
  });
});

describe('Kevin, Mercy and Njeri, who backed what they said, are not shown as the problem', () => {
  it('Kevin reads that three of his four have proof, each with what shows it, and he is coached on nothing', async () => {
    const { part, stored, words } = await theRecordOf('drop', 'Kevin');
    const said = part(/what you said/i)!;
    expect(said.says).toBe('You said four times that something was sold, paid or signed. Three of them have proof on file.');
    expect(said.toChange).toBeNull();
    expect(said.evidence).toContain('On Monday 19 October you said “Jane paid the remaining KES 15,000 balance for the 6 Savannah Cafe units. The M-Pesa confirmation code is RCD8M1LS4W.” The M-Pesa code RCD8M1LS4W shows it.');
    expect(said.evidence).toContain('On Friday 16 October you said “Jane paid the KES 15,000 deposit for Savannah Cafe today.” A payment record shows it.');
    expect(part(/figures/i)!.says).toBe('You put a figure right yourself.');
    expect(stored.coaching).toEqual([]);
    expect(words.coaching).toEqual([]);
    expect(words.coachingEmpty).toBe('Groundwork has not coached you on anything yet.');
  });
  it('Kevin’s call to Jane the morning after is kept, not late', async () => {
    const { part } = await theRecordOf('drop', 'Kevin');
    expect(part(/promises/i)!.evidence).toContain('You promised “I\'ll call her tomorrow morning.” on Tuesday 13 October, and it was done by Wednesday 14 October.');
  });
  it('Mercy reads that every one of her five has proof on file, and is coached on nothing', async () => {
    const { part, stored } = await theRecordOf('drop', 'Mercy');
    expect(part(/what you said/i)!.says).toBe('You said five times that something was sold, paid or signed, and every one has proof on file.');
    expect(part(/what you said/i)!.toChange).toBeNull();
    expect(stored.coaching).toEqual([]);
  });
  it('Njeri reads that her one has proof on file, and is coached on nothing', async () => {
    const { part, stored } = await theRecordOf('fees', 'Njeri');
    expect(part(/what you said/i)!.says).toBe('You said once that something was sold, paid or signed, and it has proof on file.');
    expect(stored.coaching).toEqual([]);
  });
});

describe('what every person reads', () => {
  const everybody: ['drop' | 'fees', string][] = [['drop', 'Kevin'], ['drop', 'Joseph'], ['drop', 'Mercy'], ['drop', 'Peter'], ['drop', 'Grace'], ['fees', 'Aisha'], ['fees', 'Njeri'], ['fees', 'Brian'], ['fees', 'Wanjiru']];
  it.each(everybody)('%s, %s: no label, score or grade on the person, and no colon joining pieces, as the person and as the lead', async (g, who) => {
    for (const self of [true, false]) {
      const { all } = await theRecordOf(g, who, self);
      for (const line of all) {
        expect([who, self, line, LABELS.test(line.replace(/“[^”]*”/g, ''))]).toEqual([who, self, line, false]);
        expect([who, self, line, A_COLON(line)]).toEqual([who, self, line, false]);
      }
    }
  });
});

describe('the record is rebuilt only when something new comes in', () => {
  it('a second rebuild from the same record writes nothing', async () => {
    const table = await theRunRebuiltEachEvening('drop', rebuildThePersonsRecords);
    const writes = table.upsert.mock.calls.length;
    expect(await rebuildThePersonsRecords(theRunAsADatabase('drop', { personRecord: table }), R2.drop.ground.id, THE_END_OF_THE_RUN)).toBe(0);
    expect(table.upsert.mock.calls.length).toBe(writes);
  });
  it('where judgements of a person are off for the organisation, nothing is built', async () => {
    const table = aPersonRecordTable();
    expect(await rebuildThePersonsRecords(theRunAsADatabase('drop', { judgements: false, personRecord: table }), R2.drop.ground.id, THE_END_OF_THE_RUN)).toBe(0);
    expect(table.rows).toEqual([]);
  });
  it('each entry carries its evidence: the line, the day, the session and what backs it', async () => {
    const { stored } = await theRecordOf('drop', 'Kevin');
    const kilele = stored.record.claims.find((c) => c.about === 'Kilele Hotel')!;
    expect(kilele).toMatchObject({ on: 'Monday 12 October', sessionNumber: 1, proven: true, proof: 'a document they added', proofIds: ['48855e02-f8bb-47c0-b847-a53a03bdcf9b'] });
    expect(kilele.lineId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
