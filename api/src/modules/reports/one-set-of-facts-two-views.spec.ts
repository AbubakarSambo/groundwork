import { theSessionReport, type SessionReportInputs } from './the-session-report';
import { RecordEntryType } from '@prisma/client';

/**
 * BY PERSON AND BY THEME ARE TWO VIEWS OF ONE SET OF FACTS.
 *
 * The page used to render both at once, as two sections, so every quote appeared twice and one
 * party's block was word for word identical to the Progress and priorities block above it. The
 * page ran to about double the length it needed. The fix on the client is one rendering and a
 * control that regroups it; the fix here is that there is one set of lines to regroup.
 *
 * It was not one set. `whatEachPersonSaid` took every entry regardless of type, and the themes
 * take five types, so the by-person view carried two kinds of line the by-theme view never shows:
 *
 *   SUCCESS_DEFINITION, which answers what good would look like and has its own section. Printed
 *   here it read as something somebody had done.
 *
 *   TIMEFRAME, which is a modifier on another entry. Read off the live page, one person's block
 *   ended on a bare "in September" - the whole text of that entry. A fragment on a shared report
 *   reads as a system fault.
 */
const base: SessionReportInputs = {
  sessionNumber: 1,
  closed: true,
  agreements: [],
  divergences: [],
  entries: [],
  previousEntries: [],
  baselineSuccess: null,
  startingPoint: null,
  previousSharedPicture: null,
  evidence: [],
  specificityLevel: null,
  centralQuestion: null,
  movedOnTargets: null,
  blocked: 0,
  answeredThisSession: [{ who: 'Participant A', isYou: false }],
};

const entry = (type: RecordEntryType, text: string) => ({
  type, text, who: 'Participant A', recallBased: true, threadKey: null,
});

describe('the two groupings hold the same lines', () => {
  const out = theSessionReport({
    ...base,
    entries: [
      entry(RecordEntryType.INTENT, 'I run the clinic that takes the referrals'),
      entry(RecordEntryType.ASK, 'I want one named person on call each night'),
      entry(RecordEntryType.SUCCESS_DEFINITION, 'zero transfers waiting more than an hour'),
      entry(RecordEntryType.TIMEFRAME, 'in September'),
    ],
  });
  const person = out.whatEachPersonSaid[0];
  const inThemes = out.sections.flatMap((s) => s.items.map((i) => i.text));

  it('shows what somebody said in both views', () => {
    expect(person.lines).toContain('I run the clinic that takes the referrals');
    expect(inThemes).toContain('I run the clinic that takes the referrals');
  });

  it('and never a line that only one of them has', () => {
    for (const line of person.lines) expect(inThemes).toContain(line);
  });

  it('drops the bare timeframe, which is a modifier and not something anybody said', () => {
    expect(person.lines).not.toContain('in September');
    expect(inThemes).not.toContain('in September');
  });

  it('and leaves what good looks like to the section named after that question', () => {
    expect(person.lines).not.toContain('zero transfers waiting more than an hour');
    expect(inThemes).not.toContain('zero transfers waiting more than an hour');
  });
});
