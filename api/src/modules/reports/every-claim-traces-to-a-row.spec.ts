import { whatToWorkOnNext } from './what-to-work-on-next';
import { whatToProbe } from './what-to-probe';
import { wordedByTheModel, sameShape } from './the-engine-drafts-it-the-model-words-it';
import { ROLE_MAPS, RoleFunction } from '../board/role-maps';

/**
 * ENGINES PRODUCE THE CLAIMS. THE MODEL CHOOSES THE WORDS. NEITHER DOES THE OTHER'S JOB.
 *
 * Both halves were wrong on this page and in opposite directions.
 *
 * The engines had no phrasing layer, so three blockers rendered as one sentence three times with
 * the noun swapped, and every OPS person in every organisation read identical text. Correct, and
 * useless the second time somebody sees it.
 *
 * And the surfaces that DO call a model - the shared picture, the private summary - hand it a
 * transcript and take back claims nothing checks.
 *
 * So: the engine drafts, the model rewords, `safeToUse` guards, and the draft ships on refusal.
 * This file holds both ends of that. Everything rendered traces to a row or a field, and nothing
 * rendered is a template with a noun swapped.
 */
const map = ROLE_MAPS[RoleFunction.OPS];

const three = [
  { what: 'the on-call rota', who: 'Hafsah', daysOld: 26, escalated: false },
  { what: 'a clear list of what is mine', who: 'Hafsah', daysOld: 26, escalated: false },
  { what: 'to be paid for the nights', who: 'Hafsah', daysOld: 26, escalated: false },
];

const member = {
  patterns: [], role: 'ward coordinator',
  detectedFunction: 'OPS', functionConfidence: 0.72, noticedBehaviour: null,
  sessionNumber: 2, totalSessions: 6, scenario: 'NEW_HIRE',
  waitingOn: three, holdingUp: [], saidSomethingSpecific: true, anythingDocumented: false,
};
const lead = {
  who: 'Zainab', participantId: 'p1', role: 'ward coordinator', answeredThisSession: true,
  patterns: [], waitingOn: three, holdingUp: [], concrete: [], documentsAttached: 0,
  sessionNumber: 2, totalSessions: 6, scenario: 'NEW_HIRE',
};

/** Two lines that differ in one token are the mail-merge shape, whatever the tokens are. */
export function readsAsAMailMerge(lines: string[]): [string, string] | null {
  for (let a = 0; a < lines.length; a++) {
    for (let b = a + 1; b < lines.length; b++) {
      const x = lines[a].split(/\s+/);
      const y = lines[b].split(/\s+/);
      if (x.length !== y.length || x.length < 5) continue;
      const differ = x.filter((w, n) => w !== y[n]).length;
      if (differ <= 1) return [lines[a], lines[b]];
    }
  }
  return null;
}

describe('one claim about three things is one sentence', () => {
  it('the member note groups them rather than repeating itself', () => {
    const out = whatToWorkOnNext(member);
    expect(out.beforeNextTime).toHaveLength(1);
    for (const d of three) expect(out.beforeNextTime[0]).toContain(d.what);
  });

  it('and so does the lead section', () => {
    const out = whatToProbe(lead);
    expect(out.probe).toHaveLength(1);
    for (const d of three) expect(out.probe[0]).toContain(d.what);
  });

  it('neither renders the same sentence twice with one word changed', () => {
    /* THE SHAPE ITSELF, not a particular sentence. This is what "Put this in writing, with the date
       you need it by: a reply." twice, differing only in the noun, actually looks like to a reader. */
    expect(readsAsAMailMerge(whatToWorkOnNext(member).beforeNextTime)).toBeNull();
    expect(readsAsAMailMerge(whatToProbe(lead).probe)).toBeNull();
  });

  it('and the detector would catch it if it came back', () => {
    /* A guard nobody has seen fail is a guard nobody can trust. */
    expect(readsAsAMailMerge([
      'Put this in writing, with the date you need it by: a reply',
      'Put this in writing, with the date you need it by: a rota',
    ])).not.toBeNull();
  });
});

describe('zero duration is suppressed rather than phrased', () => {
  const today = [{ what: 'the rota', who: 'Hafsah', daysOld: 0, escalated: false }];

  it('because "since today" on a session-1 report carries nothing', () => {
    expect(whatToProbe({ ...lead, waitingOn: today }).probe.join(' ')).not.toMatch(/since today|0 days/);
    expect(whatToWorkOnNext({ ...member, waitingOn: today }).beforeNextTime.join(' ')).not.toMatch(/since today|0 days/);
  });

  it('and a real duration is still said', () => {
    expect(whatToProbe(lead).probe.join(' ')).toContain('26 days');
  });
});

describe('every claim traces to a row or a field', () => {
  const out = whatToWorkOnNext(member);

  it('the role sentences are the map, verbatim', () => {
    expect(out.role?.onTrack).toBe(map.onTrackMeans);
    expect(out.role?.goingWrong).toBe(map.goingWrongLooksLike);
    expect(out.role?.protectAgainst).toBe(map.protectAgainst);
  });

  it('the actions name only what the rows hold', () => {
    const rows = three.map((d) => d.what);
    const said = out.beforeNextTime.join(' ');
    for (const r of rows) expect(said).toContain(r);
    /* And nothing about a fourth thing nobody recorded. */
    expect(said).not.toMatch(/handover|deployment|invoice/i);
  });
});

describe('the phrasing layer may only choose words', () => {
  const drafts = [
    { key: 'a', text: 'Zainab has been waiting on you for 9 days for the rota.' },
    { key: 'b', text: 'Put the request in writing with a date.' },
  ];
  const nothing = async () => null;

  it('ships the draft when the model returns nothing', async () => {
    expect(await wordedByTheModel(drafts, nothing)).toEqual(drafts);
  });

  it('ships the draft when the model merges two claims into one', async () => {
    /* A line that vanishes is a claim that vanishes, and `safeToUse` guards a sentence rather than
       a block, so it cannot see this on its own. */
    const merged = async () => 'Zainab has waited 9 days for the rota, so put it in writing with a date.';
    expect(await wordedByTheModel(drafts, merged)).toEqual(drafts);
  });

  it('ships the draft when a number is invented', async () => {
    const invented = async () => 'Zainab has been waiting on you for 19 days for the rota.\nPut the request in writing with a date.';
    expect(await wordedByTheModel(drafts, invented)).toEqual(drafts);
  });

  it('ships the draft when a number is dropped', async () => {
    const dropped = async () => 'Zainab has been waiting on you a while for the rota.\nPut the request in writing with a date.';
    expect(await wordedByTheModel(drafts, dropped)).toEqual(drafts);
  });

  it('ships the draft when a name nobody recorded appears', async () => {
    const invented = async () => 'Zainab has been waiting on you for 9 days for the rota, per Alex.\nPut the request in writing with a date.';
    expect(await wordedByTheModel(drafts, invented)).toEqual(drafts);
  });

  it('ships the draft when a row\'s own words are restructured', async () => {
    /*
     * DRIVEN LIVE, AND THE REASON `mustKeep` IS THREADED THROUGH HERE AT ALL.
     *
     * The draft said somebody was waiting for "a named on-call person published by Friday each
     * week" - their own words for the thing they are owed. It came back as "Each Friday, give
     * Hafsah in writing a reply and a named on-call person": the weekly cadence moved off the
     * awaited item and onto the action. A different claim, with no invented number and no
     * invented name, so every guard above it passed.
     */
    const row = 'a named on-call person published by Friday each week';
    const one = [{ key: 'a', text: `Put ${row} in writing, with the date you need it by.`, mustKeep: [row] }];
    const restructured = async () => 'Each Friday, give them a named on-call person in writing, with the date you need it by.';
    expect(await wordedByTheModel(one, restructured)).toEqual(one);
  });

  it('and takes the wording when every claim survives', async () => {
    const fine = async () => 'Zainab has waited 9 days on you for the rota.\nPut that request in writing, with a date.';
    const out = await wordedByTheModel(drafts, fine);
    expect(out[0].text).toBe('Zainab has waited 9 days on you for the rota.');
    expect(out[1].text).toBe('Put that request in writing, with a date.');
  });

  it('holds the line count, which is what makes a dropped claim visible', () => {
    expect(sameShape(['a', 'b'], ['a'])).toBe(false);
    expect(sameShape(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
    expect(sameShape(['a', 'b'], ['a', 'b'])).toBe(true);
  });
});
