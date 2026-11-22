import { aYearEndWorld } from './a-world-for-the-year-end';
import { loadTheRecord } from './the-year-end-versions';
import { buildTheContentWithTheNarrative, theMonthAsAParagraph, type TheNarrative } from './the-year-end-narrative';
import { assemble } from '../outstanding/the-outstanding-register';
import { refFor } from './the-year-end-content';

/**
 * BATCH F, F2 (D10 and E-7). The day's corrections reached version 3's counts but not its words: November's four places went to its forwarded files, and a new
 * sentence was put after the old ones, where the briefing never reads. And a settled line was said in its longest source's words, which were a document's pasted
 * first lines. The next version now reads what no version has read yet first, newest first, says it first, and a line reads the record that settled it.
 */
const NOW = new Date('2026-11-21T12:00:00Z');

function aNovemberFullOfFiles() {
  const w = aYearEndWorld(NOW);
  w.t.principalMaterial = w.aTable([], 'pm');
  for (let k = 0; k < 6; k += 1) w.t.principalMaterial.rows.push({ id: `pm-file-${k}`, organizationId: w.ORG, principalUserId: 'u-fatima', batchId: `bf-${k}`, fromUserId: 'u-fatima', fromAddress: 'fatima@example.com', channel: 'email', kind: 'file', fileName: `activity-2026-11-note-${k}.txt`, mimeType: 'text/plain', text: `Abuja office activity note, November 2026\n\nThe office met the ministry about permit number ${k}.`, state: 'kept', receivedAt: new Date(Date.UTC(2026, 10, 2 + k)) });
  w.t.principalMaterial.rows.push({ id: 'pm-ruth', organizationId: w.ORG, principalUserId: 'u-fatima', batchId: 'b-ruth', fromUserId: 'contact:ruth', fromAddress: 'ruth@example.com', channel: 'email', kind: 'message', fileName: 'message:ruth', subject: 'Re: 2026 recap', text: 'My Q2 summary said 7 ministry meetings. Halima\'s weekly reports show 5; I counted the moved meetings twice. Please use 5.', state: 'kept', receivedAt: new Date('2026-11-21T09:40:00Z') });
  return w;
}

describe('the next version reads the latest record first', () => {
  it('reads what no version has read yet before the month\'s files, and says it first', async () => {
    const w = aNovemberFullOfFiles();
    const record = await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW, narrator: null });
    const ref = (id: string) => refFor('document', id);
    const old = { text: 'The office met the ministry about permit number 5.', ref: ref('pm-file-5'), quote: 'The office met the ministry about permit number 5' };
    const previous: TheNarrative = { inputHash: 'before', promptKey: 'year-end.write-the-narrative', promptVersionId: null, opening: [old], months: { '2026-11': { sentences: [old], status: 'ongoing', notKnown: null } }, instructionsFound: [] };
    const read: string[] = [];
    const c = await buildTheContentWithTheNarrative(record, [], {
      previous,
      narrator: {
        write: async (a) => {
          read.push(...a.sources.map((s) => s.text));
          const ruth = a.sources.find((s) => s.text.includes('Please use 5'))!;
          const said = { text: 'A correction says the summary counted 7 ministry meetings, and that 5 is the number to use.', source: ruth.id, quote: 'My Q2 summary said 7 ministry meetings' };
          return { raw: { opening: [said], months: [{ month: 11, sentences: [said], status: 'evidenced' }] }, promptKey: 'year-end.write-the-narrative', promptVersionId: null };
        },
      },
    });
    expect(read[0]).toContain('Please use 5');
    const november = theMonthAsAParagraph(c, '2026-11', () => '', 1, true);
    console.log(`NOVEMBER, AS THE BRIEFING READS IT\n${november}\n\nTHE OPENING\n${c.narrative!.opening.map((o) => o.text).join(' ')}`);
    expect(november).toContain('5 is the number to use');
    expect(c.narrative!.opening[0].text).toContain('5 is the number to use');
  });

  it('a settled line reads the words of what settled it, never a document\'s pasted first lines', () => {
    const at = (d: string) => new Date(`2026-${d}T09:00:00Z`);
    const base = { owner: 'Folasade Ogun', workstream: null, whenSaid: null, dueGiven: null, settledAt: null, external: false, dependency: null, decision: null };
    const pasted = { ...base, sourceKind: 'commitment', sourceId: 'c-pasted', from: 'what they told Groundwork', text: 'Community development agreement: Ibese host communities Signed at Ibese on 9 September 2026 by the Oba-in-council for the host communities', action: 'Community development agreement: Ibese host communities Signed at Ibese on 9 September 2026 by the Oba-in-council for the host communities', state: 'DONE', settledBy: 'SAID', at: at('09-11'), updatedAt: at('09-11') };
    const proven = { ...base, sourceKind: 'commitment', sourceId: 'c-proven', from: 'what they told Groundwork', text: 'Send the signed Ibese community agreement', action: 'Send the signed Ibese community agreement', state: 'DONE', settledBy: 'PROVEN', settledAt: at('09-11'), at: at('09-02'), updatedAt: at('09-11') };
    const notes = new Map<string, any>([['commitment:c-pasted', { registerKey: 'same:1' }], ['commitment:c-proven', { registerKey: 'same:1' }]]);
    const { rows } = assemble([pasted, proven] as any, notes, { now: NOW });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('completed');
    expect(rows[0].item).toBe('Send the signed Ibese community agreement');
  });
});

/* BATCH F, F-5. Version 5 opened with "The fertilizer allocation was released in October (from a WhatsApp message)": one person's word, stated as what happened. */
describe('what a message says is said as what it says', () => {
  it('a sentence resting on a message reads as that message\'s words, in every version, and a note keeps its own wording', async () => {
    const { asWhatTheMessageSays } = require('./the-year-end-narrative');
    const msg = { label: 'a WhatsApp message', at: '2026-10-03T09:00:00Z' };
    const once = asWhatTheMessageSays('The fertilizer allocation was released in October.', msg);
    expect(once).toBe('A WhatsApp message of 3 October 2026 says the fertilizer allocation was released in October.');
    expect(asWhatTheMessageSays(once, msg)).toBe(once);
    expect(asWhatTheMessageSays('NAFDAC renewed the certificate on 18 July.', { label: 'an email', at: '2026-07-21T09:00:00Z' })).toBe('An email of 21 July 2026 says NAFDAC renewed the certificate on 18 July.');
    expect(asWhatTheMessageSays('The permit was granted in May.', { label: 'the note "Kogi permit"', at: '2026-05-25T09:00:00Z' })).toBe('The permit was granted in May.');
  });
});
