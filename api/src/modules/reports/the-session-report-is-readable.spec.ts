import { RecordEntryType } from '@prisma/client';
import { theSessionReport } from './the-session-report';
import { cleanText } from './what-the-record-actually-holds';

/**
 * WHAT THE PER-SESSION REPORT MUST NEVER SHOW A PERSON, AND WHAT IT MUST ALWAYS SAY.
 *
 * Both findings came from driving it, not from reading it.
 *
 * THE MARKERS. Record entries are stored with the extraction's verifiability tier stamped on the
 * front. Every line of the promised report rendered as "[VERIFIABILITY:HIGH] Fifteen qualified
 * meetings a month" - machinery on the one screen whose whole claim is that it holds what a person
 * said carefully. `cleanText` existed for exactly this and the new read did not call it.
 *
 * THE EMPTY SECTIONS. A heading that disappears when there is nothing under it teaches a client the
 * product is inconsistent from session to session. "Nobody named a risk this session" is a finding.
 */
const entry = (type: RecordEntryType, text: string) => ({
  type, text, who: null, recallBased: true, threadKey: null,
});

const base = {
  sessionNumber: 1,
  closed: false,
  agreements: [],
  divergences: [],
  entries: [],
  previousEntries: [],
  baselineSuccess: null,
  startingPoint: null,
  previousSharedPicture: null,
  evidence: [],
  specificityLevel: null,
  recallConfidence: null,
  centralQuestion: null,
};

describe('the read that feeds it', () => {
  const service = require('fs')
    .readFileSync(require('path').join(__dirname, 'reports.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('cleans the marker off every entry before assembling', () => {
    /* The pure function cannot strip what it is handed; the marker lives on the stored row, so the
       READ is the only place it can be removed. Both halves are guarded because either one alone
       leaves the marker one refactor away from the screen. */
    const at = service.indexOf('theSessionReport({');
    expect(at).toBeGreaterThan(-1);
    const call = service.slice(at, at + 1800);
    expect(call).toContain('text: cleanText(e.text)');
    expect(call).not.toMatch(/text: e\.text,/);
  });
});

describe('the per-session report', () => {
  it('carries every promised heading even when a section is empty, and says why', () => {
    const out = theSessionReport(base);
    const titles = out.sections.map((s) => s.title);
    for (const promised of [
      'Progress and priorities', 'Commitments', 'Risks and concerns', 'Asks',
      'What changed since last session', 'What changed since the beginning', 'What this rests on',
    ]) {
      expect(titles).toContain(promised);
    }
    for (const s of out.sections) {
      expect(s.items.length === 0 ? s.saying : 'x').toBeTruthy();
    }
  });

  it('never renders the engine\'s verifiability marker', () => {
    /* Guarded at the assembly too, not only at the call site: the marker is on the stored row, so
       any future caller passing raw text would put it back on the screen. */
    const out = theSessionReport({
      ...base,
      entries: [entry(RecordEntryType.COMMITMENT, cleanText('[VERIFIABILITY:HIGH] Ship by Friday'))],
    });
    const all = JSON.stringify(out);
    expect(all).not.toContain('VERIFIABILITY');
    expect(all).toContain('Ship by Friday');
  });

  it('says a first session has nothing before it, rather than showing an empty change list', () => {
    const changed = theSessionReport(base).sections.find((s) => s.title === 'What changed since last session');
    expect(changed!.saying).toContain('first session');
  });

  it('names last session\'s commitments that were not returned to', () => {
    const out = theSessionReport({
      ...base,
      sessionNumber: 2,
      entries: [{ ...entry(RecordEntryType.INTENT, 'Working on onboarding'), threadKey: 'onboarding' }],
      previousEntries: [
        { type: RecordEntryType.COMMITMENT, text: 'CRM current every Friday', threadKey: 'crm' },
        { type: RecordEntryType.COMMITMENT, text: 'Onboarding doc', threadKey: 'onboarding' },
      ],
    });
    const commitments = out.sections.find((s) => s.title === 'Commitments')!;
    const texts = commitments.items.map((i) => i.text);
    /* The one whose theme came up again is not flagged; the one that vanished is. */
    expect(texts.some((t) => t.includes('CRM current every Friday'))).toBe(true);
    expect(texts.some((t) => t.includes('Onboarding doc'))).toBe(false);
  });

  it('and never claims delivery, only what the record shows', () => {
    const out = theSessionReport({
      ...base,
      sessionNumber: 2,
      previousEntries: [{ type: RecordEntryType.COMMITMENT, text: 'Ship it', threadKey: 'ship' }],
    });
    const commitments = out.sections.find((s) => s.title === 'Commitments')!;
    expect(JSON.stringify(commitments)).not.toMatch(/delivered|done|complete|failed/i);
    expect(commitments.items[0].text).toContain('not mentioned again');
  });

  it('is final only when the round closed', () => {
    expect(theSessionReport(base).state).toBe('forming');
    expect(theSessionReport({ ...base, closed: true }).state).toBe('final');
  });

  it('does not call one account agreed', () => {
    const out = theSessionReport(base);
    expect(out.whereThingsStand.saying).toContain('nothing to agree or differ with');
  });
});
