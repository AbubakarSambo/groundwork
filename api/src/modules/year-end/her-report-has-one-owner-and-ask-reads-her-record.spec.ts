import { aYearEndWorld } from './a-world-for-the-year-end';
import { actOnTheJobs } from './the-year-end-owner';
import { advanceThePersistentJobs, ensureThePrincipalsJobs } from '../outstanding/the-persistent-jobs';
import { handleTheDraftWords } from './year-end.service';
import { refreshTheDraft } from './the-year-end-versions';
import { herYearEndRecordForAsk, theirReportIsTheYearEndDraft, thePagesOfHerRecord } from './her-year-end-record';
import { grantADelegate } from '../outstanding/a-delegate-acts-for-a-principal';
import { ReportsOnRequestService } from '../reports-on-request/reports-on-request.service';
import { answerFromTheDocuments } from '../assistant/a-question-is-answered-from-the-documents';

/**
 * BATCH D, R1 AND R2, IN THE RUN'S OWN WORDS (the Dangote stress test of 20 November 2026). Her report has one owner, the year-end draft: "a report on
 * request" never opens for her, "Give me the structure of the report" is answered from the draft, and "Send me the draft" sends the newest version.
 * And Ask reads the record her draft is built from, with how far each line is proven, for her and for whoever acts for her, and for nobody else.
 * Every text a person reads is printed.
 */
const NOW = new Date('2026-11-20T08:30:00Z');

async function aDraftExists() {
  const w = aYearEndWorld(NOW);
  w.t.principalMaterial = w.aTable([], 'pm');
  await ensureThePrincipalsJobs(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
  await advanceThePersistentJobs(w.prisma, NOW);
  await actOnTheJobs(w.prisma, w.ports, NOW);
  w.mails.length = 0;
  return w;
}

describe('R1: for a senior person, the year-end draft is her report', () => {
  it('a report on request never opens for her, nor for the person who acts for her, and still opens for anybody else', async () => {
    const w = await aDraftExists();
    await grantADelegate(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', via: 'admin' });
    expect(await theirReportIsTheYearEndDraft(w.prisma, w.ORG, 'u-fatima')).toBe(true);
    expect(await theirReportIsTheYearEndDraft(w.prisma, w.ORG, 'u-amina')).toBe(true);
    const someoneElse = (w.t.user.rows as any[]).find((u) => u.id !== 'u-fatima' && u.id !== 'u-amina')?.id ?? 'u-nobody';
    expect(await theirReportIsTheYearEndDraft(w.prisma, w.ORG, someoneElse)).toBe(false);

    const db: any = w.prisma;
    db.reportOnRequest = w.aTable([], 'rr');
    /* An outline she was dropped into before this fix is never picked up again for her. */
    await db.reportOnRequest.create({ data: { organizationId: w.ORG, userId: 'u-fatima', status: 'outline', channel: 'whatsapp', asked: 'Give me the structure of the report.', outline: { sections: [] } } });
    const service = new ReportsOnRequestService(db);
    expect(await service.openRequestOf(w.ORG, 'u-fatima')).toBeNull();
    expect(await service.start({ organizationId: w.ORG, userId: 'u-fatima', message: 'Please contact my office and all the department heads today.', channel: 'whatsapp' })).toBeNull();
    expect(await service.onWhatsApp({ organizationId: w.ORG, userId: 'u-fatima', arrived: { kind: 'text', text: 'Send me the draft.' }, fetchMedia: async () => null })).toBeNull();
  });

  it('"What have you found so far? Give me the structure of the report." is answered from the draft, never with an empty outline', async () => {
    const w = await aDraftExists();
    const said = await handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message: 'What have you found so far? Give me the structure of the report.', channel: 'whatsapp', now: NOW, readTheRequest: async () => ({ asks: 'structure', version: null }) });
    console.log(`WHAT FATIMA READS\n${said}`);
    expect(said).toMatch(/^Version 1 of the year-end report is a draft waiting for your approval\./);
    expect(said).toMatch(/The report has \d+ parts?, “What matters most”/);
    expect(said).toMatch(/The presentation has \d+ slides?, “/);
    expect(said).not.toMatch(/outline|0 sections/i);
    expect(w.mails).toHaveLength(0);
  });

  it('"Send me the draft." sends the newest version, even when one was made while her words were being read (D17)', async () => {
    const w = await aDraftExists();
    const said = await handleTheDraftWords(w.prisma, w.ports, {
      organizationId: w.ORG, userId: 'u-fatima', message: 'Send me the draft.', channel: 'whatsapp', now: NOW,
      /* "Update the draft." a moment before: version 2 is written while the model reads "Send me the draft." */
      readTheRequest: async () => {
        await (w.prisma as any).yearEndDraft.create({ data: { ...(await (w.prisma as any).yearEndDraft.findFirst({ where: { principalUserId: 'u-fatima', version: 1 } })), id: undefined, version: 2, status: 'revised' } });
        return { asks: 'send_draft', version: null };
      },
    });
    console.log(`WHAT FATIMA READS\n${said}`);
    expect(said).toBe('I have emailed version 2 of the report and presentation to you, with the files attached.');
    expect(w.mails.map((m) => m.subject).join(' ')).toMatch(/2|Version 2/);
    void refreshTheDraft;
  });
});

describe('R2: Ask reads her record, with how far each line is proven', () => {
  it('serves her own record to her, the same record to the person she lets act for her, and nothing to anybody else', async () => {
    const w = await aDraftExists();
    const mine = await herYearEndRecordForAsk(w.prisma, { organizationId: w.ORG, userId: 'u-fatima', now: NOW });
    console.log(`WHAT ASK READS FOR FATIMA\n${mine.map((p) => `== ${p.fileName}\n${p.content.slice(0, 600)}`).join('\n')}`);
    expect(mine.map((p) => p.fileName)).toEqual([
      'your year-end report for 2026, version 1',
      /* Changed 21 November 2026 (Batch E, N3): plain names. Ask repeated "the lines of your year, with how far each is proven" to Fatima as if it were a file.
         Changed again (Batch F, F3): each page is named for what she has, the way she knows it. Ask still said "in your year, line by line". */
      'your year-end report for 2026, in full',
      'your outstanding list',
      'your leadership presentation, version 1',
      'the evidence index of your year-end report',
    ]);
    expect(mine[0].content).toMatch(/Only a line marked PROVEN is achieved/);
    expect(mine[3].content).toMatch(/^The leadership presentation of version 1 has \d+ slides\. It is a draft waiting for approval\./);

    /* Not a delegate yet: nothing. */
    expect(await herYearEndRecordForAsk(w.prisma, { organizationId: w.ORG, userId: 'u-amina', now: NOW })).toEqual([]);
    await grantADelegate(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', via: 'admin' });
    const hers = await herYearEndRecordForAsk(w.prisma, { organizationId: w.ORG, userId: 'u-amina', now: NOW });
    expect(hers.map((p) => p.fileName)[0]).toBe("Fatima's year-end report for 2026, version 1");
  });

  /* DANGOTE RERUN, N9. Ask told Fatima "nothing on record says whether five payments ... were actually paid", while the sheets and their bank confirmations were there. */
  it('reads her payments as Today counts them: each payee, its reference, its amount, and whether a bank confirmation shows it', async () => {
    const w = await aDraftExists();
    w.t.principalMaterial = w.aTable([], 'pm');
    const line = (o: any) => ({ organizationId: w.ORG, principalUserId: 'u-fatima', currency: 'NGN', fileName: '2026_Payments_Final.xlsx', receivedAt: new Date('2026-09-01T09:00:00Z'), statedApproval: 'Approved', owner: 'Ngozi Eze', ...o });
    w.t.paymentTrackerLine = w.aTable([
      line({ id: 'l1', paymentKey: 'fieldpoint', payee: 'Fieldpoint Surveys', reference: 'FP-1014', amount: '1250000', dueOn: new Date('2026-08-14'), statedStatus: 'paid', confirmation: 'BNK-PAY1014', rowNumber: 2 }),
      line({ id: 'l2', paymentKey: 'kestrel', payee: 'Kestrel Advisory', reference: 'KA-2026-07', amount: '12500000', dueOn: new Date('2026-08-20'), statedStatus: 'paid', confirmation: null, rowNumber: 3 }),
    ], 'ptl');
    const pages = await herYearEndRecordForAsk(w.prisma, { organizationId: w.ORG, userId: 'u-fatima', now: NOW });
    const pay = pages.find((p) => p.fileName === 'your payments')!;
    console.log(`WHAT ASK READS FOR FATIMA\n${pay.content}`);
    expect(pay.content).toMatch(/^2 payments are on the record\. 1 is paid, with proof\. 1 payment is said to be paid, with no proof yet\./);
    expect(pay.content).toContain('- Fieldpoint Surveys, reference FP-1014, NGN 1,250,000, due on 14 August 2026. [PROVEN paid, bank confirmation BNK-PAY1014; from the payments sheet 2026_Payments_Final.xlsx, row 2]');
    expect(pay.content).toContain('- Kestrel Advisory, reference KA-2026-07, NGN 12,500,000, due on 20 August 2026. [SAID to be paid, with no proof yet;');
  });

  it('each line keeps its standing: proven, only said, disputed, open, waiting for a decision, and what an owner still owes with the day it was due', () => {
    const row: any = {
      version: 2, status: 'revised',
      content: {
        year: 2026, principalName: 'Fatima Wali Abdulrahman', principalFirstName: 'Fatima', builtAt: '2026-11-20T05:15:00Z', gaps: [], questions: [], edits: [], shortened: [],
        evidence: [
          { ref: 'F-aa11', kind: 'forwarded', label: 'a forwarded email', said: 'The Ministry of Industry approval is granted in principle. The signed letter is still outstanding.', at: '2026-11-13T10:00:00Z', title: 'Legal on the October approval' },
          { ref: 'D-bb22', kind: 'document', label: 'a document', said: 'Kogi State permit granted', at: '2026-05-25T10:00:00Z' },
          { ref: 'M-cc33', kind: 'whatsapp', label: 'a WhatsApp message', said: 'The thing with the commissioner is sorted.', at: '2026-04-14T10:00:00Z' },
        ],
        sections: [
          { id: 'achieved', title: 'What was achieved, with evidence', claims: [{ id: 'a1', text: 'The Kogi permit was granted.', status: 'achieved', refs: ['D-bb22'] }] },
          { id: 'unverified', title: 'Said to be done, but not yet shown', claims: [{ id: 'u1', text: 'Ahmed Bako said the approval has gone through.', status: 'unverified', refs: ['F-aa11'] }, { id: 'u2', text: 'Amina Yusuf said the thing with the commissioner was sorted.', status: 'unverified', refs: ['M-cc33'] }] },
          { id: 'decision', title: 'What needs a decision', claims: [{ id: 'd1', text: 'The export levy memo position.', status: 'decision', refs: ['F-aa11'] }] },
        ],
        register: [
          { key: 'r1', item: 'Send the signed Ministry of Industry approval letter', workstream: 'Government relations', owner: 'Ahmed Bako', actionNeeded: 'Send it', status: 'open', priority: 'high', dueOn: '2026-10-07', dueInferred: true, dependency: 'the Minister\'s office', decision: null, refs: ['F-aa11'], lastVerifiedAt: '2026-11-13', nextFollowUp: '2026-11-21', carryForward: true, resolution: null },
          { key: 'r2', item: 'The Kogi permit', workstream: null, owner: 'Amina Yusuf', actionNeeded: '', status: 'completed', priority: 'low', dueOn: null, dueInferred: false, dependency: null, decision: null, refs: ['D-bb22'], lastVerifiedAt: '2026-05-25', nextFollowUp: '', carryForward: false, resolution: 'done' },
        ],
      },
    };
    const pages = thePagesOfHerRecord(row, 'own');
    const all = pages.map((p) => `== ${p.fileName}\n${p.content}`).join('\n');
    console.log(`WHAT ASK READS FOR FATIMA\n${all}`);
    expect(all).toMatch(/The Kogi permit was granted\. \[PROVEN by a record; from a document, 25 May 2026\]/);
    expect(all).toMatch(/Ahmed Bako said the approval has gone through\. \[SAID to be done, and nothing on the record shows it yet; from “Legal on the October approval”, a forwarded email, 13 November 2026\]/);
    expect(all).toMatch(/- Send the signed Ministry of Industry approval letter\. Owner Ahmed Bako\. Open\. It was due on 7 October 2026, a date worked out from what was said\. It waits on the Minister's office\./);
    /* What is done is not outstanding. */
    expect(pages[2].content).not.toMatch(/The Kogi permit\. Owner/);
    /* Nothing judges a person. */
    expect(all).not.toMatch(/failed|poor|underperform|at risk/i);
  });

  it('the challenge questions and the ultimate test reach the model with her record, and its answer is what she reads', async () => {
    const w = await aDraftExists();
    const QUESTIONS = [
      'Which claims are weak?',
      'What did we actually accomplish?',
      'What has Ahmed failed to deliver?',
      'What will leadership challenge me on?',
      'Did the October approval actually happen?',
      'Is my presentation ready? How many slides is it?',
      "I haven't had time to read any of this. Tell me the five most important things Dangote needs to know, what we actually achieved this year, what I should be worried about, who hasn't delivered, and what questions leadership is likely to ask me. Then make sure my presentation is ready.",
    ];
    for (const question of QUESTIONS) {
      let read = '';
      let rules = '';
      const engine = { extract: async (system: string, history: any[]) => { rules = system; read = history[0].content; return { found: true, answer: 'Version 1 is a draft waiting for your approval.', judgesAPerson: false }; } };
      /* She runs no check-in of her own here, so only her year-end record is there to read. */
      const prisma = new Proxy(w.prisma as any, { get: (t, k: string) => (k === 'ground' ? { findMany: async () => [] } : t[k]) });
      const said = await answerFromTheDocuments({ prisma, engine }, { organizationId: w.ORG, userId: 'u-fatima', question });
      console.log(`FATIMA ASKS\n${question}\nFATIMA READS\n${said}`);
      expect(said).toBe('Version 1 is a draft waiting for your approval.');
      expect(read).toMatch(/DOCUMENT "your year-end report for 2026, version 1"/);
      expect(read).toMatch(/DOCUMENT "your leadership presentation, version 1"/);
      expect(rules).toMatch(/Only a line marked PROVEN is achieved/);
      expect(rules).toMatch(/say what is still outstanding that each person owns, with the record it rests on and the day it was due\. Say only what is outstanding\. Never judge the person/);
    }
  });
});

/*
 * BATCH F, F3. The ultimate test came back at 4,095 characters, opening with the version and the slide count, and prompt rules alone never kept it short. Ask now
 * answers in a fixed shape that code checks: one lead sentence, at most five short points, one offer to go deeper. The model picks and writes; code keeps the shape.
 */
describe('a concise, defensible answer straight away', () => {
  const ULTIMATE = "I haven't had time to read any of this. Tell me the five most important things Dangote needs to know, what we actually achieved this year, what I should be worried about, who hasn't delivered, and what questions leadership is likely to ask me.";
  const ask = async (w: any, read: any) => {
    const engine = { extract: async () => read };
    const prisma = new Proxy(w.prisma as any, { get: (t, k: string) => (k === 'ground' ? { findMany: async () => [] } : t[k]) });
    return answerFromTheDocuments({ prisma, engine }, { organizationId: w.ORG, userId: 'u-fatima', question: ULTIMATE });
  };

  it('a lead, at most five points and one offer, however much the model writes', async () => {
    const w = await aDraftExists();
    const long = 'The Ministry of Industry has agreed the export incentive in principle, and the signed letter is still outstanding. It was promised by 10 December. Legal cannot confirm it.';
    const said = await ask(w, {
      found: true,
      lead: 'Four results are proven this year, and five matters need your decision before December. Version 1 has 15 slides.',
      points: ['The Kogi permit was granted in May, and the permit letter shows it.', long, 'The NMDPRA inspection has no date.', 'Four payments marked paid have no bank confirmation.', 'Leadership will ask about the export incentive letter.', 'A sixth point that is never read.', 'A seventh.'],
      offer: 'I can go through the five decisions one by one. Or anything else you like.',
    });
    console.log(`FATIMA READS (${said.length} characters)\n${said}`);
    const [lead, points, offer] = said.split('\n\n');
    expect(lead).toBe('Four results are proven this year, and five matters need your decision before December.');
    expect(points.split('\n')).toHaveLength(5);
    expect(points).toContain('The Ministry of Industry has agreed the export incentive in principle, and the signed letter is still outstanding. It was promised by 10 December.');
    expect(points).not.toMatch(/Legal cannot confirm it|sixth|seventh/);
    expect(offer).toBe('I can go through the five decisions one by one.');
    expect(said.length).toBeLessThanOrEqual(1800);
  });

  it('a lead that answers it all stands alone, with no offer', async () => {
    const w = await aDraftExists();
    expect(await ask(w, { found: true, lead: 'Version 1 is a draft waiting for your approval.', points: [], offer: 'I can tell you more.' })).toBe('Version 1 is a draft waiting for your approval.');
  });
});

/* BATCH F, F-7. "What has Ahmed failed to deliver?" read that nothing was found: Ahmed's lines were past the end of her outstanding list's page. */
describe('what the question names is read first', () => {
  it('puts the lines of the person asked about at the top of the outstanding list', () => {
    const line = (key: string, owner: string, item: string) => ({ key, item, workstream: null, owner, actionNeeded: '', status: 'open', priority: 'high', dueOn: '2026-10-07', dueInferred: false, dependency: null, decision: null, refs: [], lastVerifiedAt: '2026-11-13', nextFollowUp: '', carryForward: true, resolution: null });
    const row: any = { version: 6, status: 'revised', content: { year: 2026, principalName: 'Fatima Wali', principalFirstName: 'Fatima', builtAt: '2026-11-21T10:00:00Z', gaps: [], questions: [], edits: [], shortened: [], evidence: [], sections: [], register: [...Array.from({ length: 300 }, (_, i) => line(`h${i}`, 'Hauwa Bello', `Follow up nothing major in the state, week ${i}`)), line('a1', 'Ahmed Bako', 'Send the signed Ministry of Industry approval letter')] } };
    const list = thePagesOfHerRecord(row, 'own', 'What has Ahmed failed to deliver?').find((p) => p.fileName === 'your outstanding list')!;
    expect(list.content.split('\n')[1]).toMatch(/^- Send the signed Ministry of Industry approval letter\. Owner Ahmed Bako\./);
  });
});
