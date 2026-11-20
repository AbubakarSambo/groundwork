import { theRecordsPrompt, onlyRecordsTheLinesSay } from './the-kind-of-work';

/**
 * A TICKET, INCIDENT OR TASK KEEPS THE FIGURES ITS PEOPLE GAVE (pilot, tickets family). The support, operations and engineering boards
 * draw what people said in their own check-ins. The instruction to the model names the labels each board reads, only for its own kind
 * of work, and what a line gives under those labels is kept word for word, with nothing worked out.
 *
 * The instruction is read from the code by board.listener.ts (theRecordsPrompt); it is not a PromptVersion, so this file is the version
 * that runs.
 */
const LABELS: Record<string, string[]> = {
  'support desk': ['Where it stands', 'Queue', 'Cause', 'Seen before', 'Within a day', 'Reopened', 'Passed to engineering', 'Next step'],
  'distribution operations': ['Where it stands', 'Site', 'Type', 'Impact', 'Cause', 'Fix', 'Prevention', 'On time', 'Downtime', 'Next step'],
  'engineering release': ['Area', 'Done', 'Change', 'Test', 'Deploy', 'Blocked', 'Released', 'Next step'],
};

describe('the records prompt for the tickets family', () => {
  it.each(Object.entries(LABELS))('%s names the labels its board reads, and says to give only what the line says', (kind, labels) => {
    const p = theRecordsPrompt(kind as any);
    for (const l of labels) expect(p).toContain(l);
    expect(p).toContain('never a figure added up from several lines or worked out');
    expect(p).toContain('Leave out anything the line does not say.');
  });
  it('gives each kind only its own labels, and gives none to any other kind', () => {
    expect(theRecordsPrompt('support desk')).not.toContain('Downtime');
    expect(theRecordsPrompt('distribution operations')).not.toContain('Passed to engineering');
    expect(theRecordsPrompt('engineering release')).not.toContain('Queue');
    for (const k of ['sales team', 'sales org', 'asset loans', 'a law firm matter'] as const) {
      const p = theRecordsPrompt(k);
      expect(p).not.toContain('Prevention');
      expect(p).not.toContain('Passed to engineering');
      expect(p).not.toContain('Seen before');
    }
  });
});

describe('an incident line read into a record', () => {
  const lines = [{ id: 'l1', participantId: 'p-fatuma', text: 'Forklift 3 in Mombasa stopped again, 2.5 hours down and 14 orders late. New seals are not in stock.' }];
  it('keeps each detail as the line gave it, and no figure the line did not give', () => {
    const kept = onlyRecordsTheLinesSay('distribution operations', [
      { lineId: 'l1', kind: 'incident', name: 'Forklift 3', details: [{ label: 'Site', value: 'Mombasa' }, { label: 'Type', value: 'equipment' }, { label: 'Impact', value: '2.5 hours down and 14 orders late' }, { label: 'Prevention', value: 'new seals, not in stock' }] },
    ], lines, null, []);
    expect(kept).toHaveLength(1);
    expect(kept[0].fields).toEqual({ Site: 'Mombasa', Type: 'equipment', Impact: '2.5 hours down and 14 orders late', Prevention: 'new seals, not in stock' });
    expect(kept[0].ownerParticipantId).toBe('p-fatuma');
  });
});
