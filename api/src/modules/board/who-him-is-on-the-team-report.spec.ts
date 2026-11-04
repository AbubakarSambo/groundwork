import { PartyType } from '@prisma/client';
import { boardAs, person, answered, type Setup } from './the-switchboards-sections-harness';

/**
 * THE TEAM REPORT'S "WILL DO" ON 14 OCTOBER, AS THE TEST BED HOLDS IT (Drop Access short run, 18 October).
 *
 * Grace's team report read, under Mercy, "Will do: I'll call him again on Thursday morning. I'll follow up again on Thursday
 * if they're not there.", and under Joseph, "Will do: I'll ask Grace first about the price, then I'll call him back.", with
 * nobody to be "him". The check-in says who: Groundwork had just asked Mercy about Joseph, and Joseph about Mr Kariuki. Kevin's
 * "him" is named nowhere in the line before, so his own words stay, in quotation marks. Mercy's "Delivery is set for Friday,
 * and they'll pay then." is Greenfield's promise and is never her "Will do". The lines and the conversation are the bed's own.
 * "Will do" is worked out here exactly as the team report page works it out (ThePicturedTeamReport).
 */
const PEOPLE = [
  person('p-grace', 'u-grace', 'Grace', 'Achieng', PartyType.INITIATOR),
  person('p-kevin', 'u-kevin', 'Kevin', 'Omondi'),
  person('p-mercy', 'u-mercy', 'Mercy', 'Wairimu'),
  person('p-joseph', 'u-joseph', 'Joseph', 'Kariuki'),
];
const at = (s: string) => new Date(s);
const line = (id: string, participantId: string, type: string, text: string, n: number, createdAt: string) => ({
  id, participantId, type, text, checkInId: `c${n}-${participantId}`, recallBased: true, createdAt: at(createdAt), disputedAt: null,
});
const MERCY_AT = '2026-10-14T11:07:55Z';
const JOSEPH_AT = '2026-10-14T11:09:48Z';
const KEVIN_AT = '2026-10-14T11:03:26Z';
const LINES = [
  line('m-pay', 'p-mercy', 'COMMITMENT', "Delivery is set for Friday, and they'll pay then.", 3, MERCY_AT),
  line('m-call', 'p-mercy', 'COMMITMENT', "I'll call Joseph again on Thursday morning.", 3, MERCY_AT),
  line('m-gf', 'p-mercy', 'PROGRESS', "For Greenfield, we got the order signed yesterday for 25 units. It's actually KES 125,000.", 3, MERCY_AT),
  line('j-call', 'p-joseph', 'COMMITMENT', "I'll ask Grace first about the price, then I'll call him back.", 3, JOSEPH_AT),
  line('j-juja', 'p-joseph', 'SUCCESS_DEFINITION', "Mr Kariuki wants five units if they're KES 4,500 each.", 3, JOSEPH_AT),
  line('k-mon', 'p-kevin', 'COMMITMENT', "I'll follow up with him on Monday.", 3, KEVIN_AT),
];
const T = (n: string, role: 'AI' | 'PERSON', content: string) => ({ checkInId: `c3-${n}`, role, content });
const TURNS = [
  T('p-mercy', 'AI', 'Last time you said your priority right now was closing the Greenfield deal and following up on the Tuskys Westgate lead. What exists in the record against that now?'),
  T('p-mercy', 'PERSON', "Okay, so for Greenfield, we got the order signed yesterday for 25 units. I mistakenly said it was KES 120,000, but it's actually KES 125,000. Delivery is set for Friday, and they'll pay then. As for Tuskys Westgate, Peter is still waiting for Joseph to bring the samples."),
  T('p-mercy', 'AI', 'What have you done since yesterday about getting those samples from Joseph?'),
  T('p-mercy', 'PERSON', 'I called Joseph yesterday about the samples. He said they\'d be ready on Thursday.'),
  T('p-mercy', 'AI', "So Tuskys Westgate is waiting until Thursday for samples. What happens if Joseph doesn't deliver on Thursday?"),
  T('p-mercy', 'PERSON', "I'll call him again on Thursday morning. I expect him to deliver."),
  T('p-mercy', 'AI', 'If the samples are essential for Peter, what can you do to unblock that with Joseph?'),
  T('p-mercy', 'PERSON', "I've already called him and he said Thursday. I'll follow up again on Thursday if they're not there."),
  T('p-joseph', 'AI', 'You have Juja Hardware, with Mr Kariuki wanting five units at KES 4,500 each, but no date yet. Before we finish, what will you do about getting that date from Mr Kariuki, and by when?'),
  T('p-joseph', 'PERSON', "I'll ask Grace first about the price, then I'll call him back."),
  T('p-kevin', 'AI', 'Understood. What would you need to see from Ali next week to know it\'s a "yes" for Ngong Road Minimart?'),
  T('p-kevin', 'PERSON', "I'd need him to confirm he wants the four units and is ready to make a payment."),
  T('p-kevin', 'AI', 'And what is the date you will have that answer by?'),
  T('p-kevin', 'PERSON', 'He said "next week" so I\'ll follow up with him on Monday.'),
];
const run = (on = true): Setup => ({
  people: PEOPLE,
  initiatorId: 'u-grace',
  kindOfWork: 'sales team',
  releaseOneSalesBoard: on,
  clock: { now: at('2026-10-18T09:00:00Z') },
  checkIns: [answered('p-kevin', 3, KEVIN_AT), answered('p-mercy', 3, MERCY_AT), answered('p-joseph', 3, JOSEPH_AT)],
  turns: TURNS,
  lines: LINES,
  items: [
    { id: 'd-gf', groundId: 'g-1', kind: 'deal', name: 'Greenfield Supermarket', stage: 'Won', ownerParticipantId: 'p-mercy', sourceEntryId: null, createdAt: at('2026-10-12T11:07:10Z'), fields: { Contact: 'Mrs. Njeri', 'Next step': "Delivery is set for Friday, and they'll pay then." } },
    { id: 'd-juja', groundId: 'g-1', kind: 'deal', name: 'Juja Hardware', stage: 'Contacted', ownerParticipantId: 'p-joseph', sourceEntryId: null, createdAt: at('2026-10-12T11:35:24Z'), fields: { Contact: 'Mr Kariuki' } },
  ],
  dependencies: [],
  commitments: [],
});
/* The page's own "Will do" for a person in a session (ThePicturedTeamReport's willDo). */
const willDo = (b: any, who: string, session: number): string | null => {
  const row = (b.whoOwnsWhat ?? []).find((w: any) => w.name === who);
  const it = (row?.items ?? []).find((i: any) => i.type === 'COMMITMENT' && i.sessionNumber === session);
  if (!it) return null;
  if (typeof it.withTheName === 'string' && it.withTheName.trim()) return it.withTheName.trim();
  const words = String(it.text).replace(/^[^"“]*?said,\s*/i, '').replace(/^["“]|["”]$/g, '');
  return /\b(?:him|her)\b/i.test(words) && /said,\s*["“]/.test(String(it.text)) ? `"${words}"` : words;
};

describe('with Release 1\'s sales board on, as Grace reads her team report', () => {
  it('says who "him" is where the check-in names him, keeps Kevin\'s own words in quotation marks, and Greenfield\'s promise is not Mercy\'s', async () => {
    const b = await boardAs(run(), 'u-grace', 'MEMBER');
    expect(willDo(b, 'Mercy Wairimu', 3)).toBe("I'll call Joseph again on Thursday morning. I'll follow up again on Thursday if they're not there.");
    expect(willDo(b, 'Joseph Kariuki', 3)).toBe("I'll ask Grace first about the price, then I'll call Mr Kariuki back.");
    expect(willDo(b, 'Kevin Omondi', 3)).toBe('"I\'ll follow up with him on Monday."');
    /* Their own words in the marks are never changed, and the helper is never served. */
    const mercy = (b.whoOwnsWhat ?? []).find((w: any) => w.name === 'Mercy Wairimu');
    expect(mercy.items.find((i: any) => i.withTheName).text).toBe('Mercy Wairimu said, "I\'ll call him again on Thursday morning. I\'ll follow up again on Thursday if they\'re not there."');
    expect(JSON.stringify(b.whoOwnsWhat)).not.toMatch(/theNameForHim|wordsWithHim/);
    /* "Delivery is set for Friday, and they'll pay then." is what happened, never one of Mercy's commitments. */
    const pay = mercy.items.find((i: any) => /pay then/.test(i.text));
    expect(pay.type).toBe('PROGRESS');
    expect(mercy.items.filter((i: any) => i.type === 'COMMITMENT').map((i: any) => i.text).join(' ')).not.toMatch(/pay then/);
  });

  it('Mercy reads her own "Will do" with Joseph named', async () => {
    const b = await boardAs(run(), 'u-mercy', 'MEMBER');
    expect(willDo(b, 'You', 3)).toBe("I'll call Joseph again on Thursday morning. I'll follow up again on Thursday if they're not there.");
  });
});

describe('with Release 1\'s sales board off', () => {
  it('nothing is named, and the board reads as before', async () => {
    const b = await boardAs(run(false), 'u-grace', 'MEMBER');
    expect(JSON.stringify(b.whoOwnsWhat)).not.toMatch(/withTheName/);
  });
});
