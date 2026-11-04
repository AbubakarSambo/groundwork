import { THANKS_YOUR_ANSWER_IS_IN, reportAsText, reportAsTemplateBlanks, THE_WORDS } from './a-whatsapp-message-is-routed';
import { WhatsAppForAnOrganisationService } from './whatsapp-for-an-organisation.service';
import { TEMPLATES } from '../whatsapp/a-message-outside-the-window';

/**
 * THE WHATSAPP LINES THE PRODUCT WRITES, DIRECT BEHIND THE DIRECT MORNING'S SWITCH (Hafsah, 20 October 2026, part 4).
 *
 * From the second night run: what Kevin, Joseph and Brian read after a check-in, and what Grace read when her report was ready. Since
 * release batch 1 (4 November 2026) the switch is gone: the finding in place of "Three things are settled, and one is still open", no "shared picture",
 * and the words that switch ("ask", "back", "switch") said the first time only. The approved templates' own words never change: only
 * what fills their blanks.
 */
const REPORT = {
  state: 'ready',
  whereThingsStand: {
    agreed: 3,
    stillOpen: 1,
    saying: 'Three things are settled, and one is still open.',
    differences: ["The standard for what counts as a 'sold' unit is not being applied consistently"],
  },
};
const fill = (body: string, params: string[]) => body.replace(/\{\{(\d+)\}\}/g, (_m, n) => params[Number(n) - 1] ?? '');
const reportReady = (TEMPLATES as any).groundwork_report_ready?.body ?? (Object.values(TEMPLATES as any).find((t: any) => /Your report for \{\{1\}\} is ready/.test(t?.body ?? '')) as any)?.body;

describe('the words that switch, as Kevin reads them', () => {
  it('the words that switch, as Kevin read them at the top of each session', () => {
    expect(`Sales team, Q4, session 1. ${THE_WORDS('Ask Drop Access (test)')}`).toBe('Sales team, Q4, session 1. You can write "ask" at any time to talk to Ask Drop Access (test), "back" to come back to your check-in, and "switch" to choose another check-in.');
  });
});

describe('the finding, and nothing about a shared picture', () => {
  it('the thank-you', () => {
    expect(THANKS_YOUR_ANSWER_IS_IN('Litigation team daily')).toBe('Thank you, your answer for Litigation team daily is in. You will be told when the report is ready.');
  });
  it('the report notice: the approved words around it, the finding in its blank', () => {
    expect(fill(reportReady, reportAsTemplateBlanks(REPORT, 'Sales team, Q4'))).toBe("Your report for Sales team, Q4 is ready. The standard for what counts as a 'sold' unit is not being applied consistently. Open Groundwork to read it.");
  });
  it('the report as one message inside the 24 hours', () => {
    const said = reportAsText({ ...REPORT, theConversationWorthHaving: "Agree on the point at which a deal is counted as 'sold'." }, 'Sales team, Q4');
    expect(said).toBe("Your report for Sales team, Q4 is ready.\n\nThe standard for what counts as a 'sold' unit is not being applied consistently.\n\nAgree on the point at which a deal is counted as 'sold'.");
    expect(said).not.toMatch(/settled|conversation worth having|shared picture/i);
  });
  it('with nothing open, it says so', () => {
    expect(reportAsTemplateBlanks({ whereThingsStand: { agreed: 2, stillOpen: 0, saying: 'Two things are settled, and none are still open.', differences: [] } }, 'Fee notes')[1]).toBe('Nothing in it is still open.');
  });
});

describe('the words that switch, once', () => {
  function theService(on: boolean) {
    const sends: any[] = [];
    const svc: any = Object.create(WhatsAppForAnOrganisationService.prototype);
    svc.prisma = {
      organization: { findUnique: jest.fn(async () => ({ directMorningOn: on })) },
      whatsAppSend: {
        findFirst: jest.fn(async ({ where }: any) => sends.find((s) => s.organizationId === where.organizationId && s.phone === where.phone && s.kind === where.kind) ?? null),
        create: jest.fn(async ({ data }: any) => { sends.push(data); return data; }),
      },
    };
    return { svc, sends };
  }
  const words = ` ${THE_WORDS('Ask Drop Access (test)')}`;

  it('the first time on the number, then never again; the note is not a message sent', async () => {
    const { svc, sends } = theService(true);
    expect(await svc.theWordsOnce('Ask Drop Access (test)', 'org-drop', '+254700000001')).toBe(words);
    expect(await svc.theWordsOnce('Ask Drop Access (test)', 'org-drop', '+254700000001')).toBe('');
    expect(await svc.theWordsOnce('Ask Drop Access (test)', 'org-drop', '+254700000002')).toBe(words);
    expect(sends.every((s) => s.sentAt === null && s.kind === 'the-words-told')).toBe(true);
  });
});
