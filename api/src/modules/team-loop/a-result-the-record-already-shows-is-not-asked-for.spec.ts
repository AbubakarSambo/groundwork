import { aScriptedMind, aTeamLoopWorld } from './a-world-for-the-team-loop';

/**
 * BATCH F, F5 (Dangote, D13). Toyin wrote "Lumen PR received the N8.4 million on 2 September" and was asked "Is there a message or a document that shows this?",
 * while the Treasury bank advice for that payment had been on the record since 3 September, sent by somebody else. A result is now held against what the team
 * has already sent before it is called only their word, and the person is not asked for it. Nothing about the other document, or who sent it, is told to them.
 */
describe('a result the record already shows is not asked for', () => {
  it('is kept with the proof a colleague sent, and the person is asked nothing and told nothing about it', async () => {
    const offered: string[][] = [];
    const mind = aScriptedMind({
      shows: ({ thing, documents }) => { offered.push(documents.map((d) => d.text)); return /Lumen/.test(thing) ? documents.find((d) => /Bank advice/.test(d.text))?.id ?? null : null; },
      readings: [['received the N8.4 million', { kind: 'update', outcomes: [{ commitmentId: null, text: 'Lumen PR received the N8.4 million on 2 September' }] }]],
    });
    const x = await aTeamLoopWorld({ mind });
    await x.theyWrite('Ibrahim Sule', { words: 'The bank advice is attached.', files: [{ fileName: 'Bank_Advice_LPR-0611.txt', text: 'Bank advice: outward transfer. Value date 2 September 2026. Beneficiary Lumen PR. Amount NGN 8,400,000.00. Reference LPR-0611. Status completed.' }] });
    const said = await x.theyWrite('Amina Yusuf', { words: 'For the record, Lumen PR received the N8.4 million on 2 September. Thank you.' });
    console.log(`WHAT AMINA READS\n${said}`);
    const row = x.t.commitment.rows.find((c: any) => /Lumen PR received/.test(c.text));
    const advice = x.t.principalMaterial.rows.find((m: any) => m.fileName === 'Bank_Advice_LPR-0611.txt');
    expect([row.state, row.provenBy]).toEqual(['KEPT', `material:${advice.id}`]);
    expect(x.t.informationGap.rows.filter((g: any) => g.gapKey === 'q:result')).toHaveLength(0);
    expect(String(said ?? '')).not.toMatch(/shows this|bank advice|Ibrahim/i);
  });
});
