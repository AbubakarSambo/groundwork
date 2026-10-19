import { sayWhatDoesNotAddUp } from './what-does-not-add-up';
import { theirOwnDealsAndWhatIsOnFile } from './their-own-deals-and-what-is-on-file';

/**
 * JOSEPH IS HELD TO HIS OWN FIGURES, AND TOLD NOTHING IS ON FILE (engine test, second run, Drop Access).
 *
 * Monday 12 October: "That 10-unit deal for Mama Pima is definitely part of my 30-unit target. It's basically closed." Tuesday 13
 * October, his first answer: "Things are moving forward nicely. Mama Pima is 15 units now, she's expanding." The check-in replied
 * "Fifteen units for Mama Pima is a real expansion." On Wednesday "Mama Pima paid a deposit." passed with nothing asked. His lines are
 * word for word from the run's record, with the time each was kept.
 */
const JOSEPH = '2274e6af-8d37-4388-bd39-8a7aeb582d7b';
const KEVIN = '9f2e58a4-06d8-4a0a-bddc-03cd96df027c';
const CUSTOMERS = ['Greenfield Supermarket', 'Juja Hardware', 'Kamau Electricals', 'Kilele Hotel', 'Lavington Business Park', 'Mama Pima Stores', "Mama Rose's Kiosk", 'Ngong Road Minimart', 'Roysambu Gym', 'Savannah Cafe', 'Sunrise Primary School', 'Upper Hill Offices'];
const PEOPLE = ['Grace', 'Kevin', 'Mercy', 'Joseph', 'Peter'];
const TARGETS = [{ name: 'units sold by 30 October', target: 30, count: 0, yours: true, setByThem: false }, { name: 'Units sold by 30 October', target: 120, count: 40, yours: false, setByThem: false }];
const record: { participantId: string; session: number; type: string; text: string; createdAt: string }[] = [
  { participantId: KEVIN, session: 1, type: "PROGRESS", text: "The Kilele Hotel order is for 40 units.", createdAt: "2026-10-12T11:04:42.75" },
  { participantId: KEVIN, session: 1, type: "COMMITMENT", text: "Tomorrow morning, I'm sending a price list to Savannah Cafe.", createdAt: "2026-10-12T11:04:42.75" },
  { participantId: KEVIN, session: 1, type: "INTENT", text: "My job is to find new clients, tell them about our awesome water dispensers, and close deals.", createdAt: "2026-10-12T11:04:42.75" },
  { participantId: KEVIN, session: 1, type: "PROGRESS", text: "Just closed a big one today... proof of payment for Kilele Hotel.", createdAt: "2026-10-12T11:04:42.75" },
  { participantId: KEVIN, session: 1, type: "COMMITMENT", text: "I'll call Paul tomorrow afternoon to understand their needs better.", createdAt: "2026-10-12T11:04:42.75" },
  { participantId: KEVIN, session: 1, type: "SUCCESS_DEFINITION", text: "hit that 30 units", createdAt: "2026-10-12T11:04:42.75" },
  { participantId: JOSEPH, session: 1, type: "COMMITMENT", text: "I'm going to follow up with Mrs. Atieno at Mama Pima Stores.", createdAt: "2026-10-12T11:10:03.414" },
  { participantId: JOSEPH, session: 1, type: "SUCCESS_DEFINITION", text: "My goal is to hit my target of 30 units, absolutely.", createdAt: "2026-10-12T11:10:03.414" },
  { participantId: JOSEPH, session: 1, type: "PROGRESS", text: "about fifteen visits today alone.", createdAt: "2026-10-12T11:10:03.414" },
  { participantId: JOSEPH, session: 1, type: "PROGRESS", text: "I've got some big deals in the pipeline that are basically closed.", createdAt: "2026-10-12T11:10:03.414" },
  { participantId: JOSEPH, session: 1, type: "PROGRESS", text: "That 10-unit deal for Mama Pima is definitely part of my 30-unit target. It's basically closed.", createdAt: "2026-10-12T11:10:03.414" },
  { participantId: JOSEPH, session: 1, type: "COMMITMENT", text: "Mrs. Atieno is signing this week, so that 10-unit deal will be done.", createdAt: "2026-10-12T11:10:03.414" },
  { participantId: JOSEPH, session: 1, type: "PROGRESS", text: "Things are moving forward nicely.", createdAt: "2026-10-12T11:10:03.414" },
  { participantId: JOSEPH, session: 1, type: "INTENT", text: "My job is to get those water dispensers sold.", createdAt: "2026-10-12T11:10:03.414" },
  { participantId: KEVIN, session: 2, type: "WORRY", text: "Paul hasn't answered my call yet. Still waiting on him.", createdAt: "2026-10-13T11:04:09.541" },
  { participantId: KEVIN, session: 2, type: "WORRY", text: "I don't know what Paul needs yet.", createdAt: "2026-10-13T11:04:09.541" },
  { participantId: KEVIN, session: 2, type: "PROGRESS", text: "visited two shops on Ngong Road.", createdAt: "2026-10-13T11:04:09.541" },
  { participantId: KEVIN, session: 2, type: "PROGRESS", text: "Ngong Road Minimart wants a quote for 4 units.", createdAt: "2026-10-13T11:04:09.541" },
  { participantId: KEVIN, session: 2, type: "PROGRESS", text: "Kamau Electricals said no.", createdAt: "2026-10-13T11:04:09.541" },
  { participantId: KEVIN, session: 2, type: "PROGRESS", text: "Kilele Hotel's 40 units were KES 200,000.", createdAt: "2026-10-13T11:04:09.541" },
  { participantId: KEVIN, session: 2, type: "PROGRESS", text: "sent it [the price list] this morning [INFERRED: 'it' refers to the price list for Savannah Cafe]", createdAt: "2026-10-13T11:04:09.541" },
  { participantId: KEVIN, session: 2, type: "PROGRESS", text: "Jane wants 6 units!", createdAt: "2026-10-13T11:04:09.541" },
  { participantId: KEVIN, session: 2, type: "PROGRESS", text: "Just sent her the quote for 30k.", createdAt: "2026-10-13T11:04:09.541" },
  { participantId: JOSEPH, session: 2, type: "INTENT", text: "Nothing, I've got this.", createdAt: "2026-10-13T11:07:00.522" },
  { participantId: JOSEPH, session: 2, type: "PROGRESS", text: "Mama Pima is 15 units now, she's expanding.", createdAt: "2026-10-13T11:07:00.522" },
  { participantId: JOSEPH, session: 2, type: "PROGRESS", text: "The owner of Juja Hardware is ready, just waiting for a price.", createdAt: "2026-10-13T11:07:00.522" },
  { participantId: JOSEPH, session: 2, type: "COMMITMENT", text: "I'll get that price to Juja Hardware this week for sure.", createdAt: "2026-10-13T11:07:00.522" },
  { participantId: JOSEPH, session: 2, type: "INTENT", text: "I'm closing Juja Hardware and Mama Pima. That's 35 units.", createdAt: "2026-10-13T11:07:00.522" },
  { participantId: KEVIN, session: 3, type: "TIMEFRAME", text: "Ali from Ngong Road Minimart will decide next week.", createdAt: "2026-10-14T11:03:56.408" },
  { participantId: KEVIN, session: 3, type: "PROGRESS", text: "Savannah Cafe is a go! Jane said yes to 6 units.", createdAt: "2026-10-14T11:03:56.408" },
  { participantId: KEVIN, session: 3, type: "PROGRESS", text: "Jane Mwende, the owner, made the decision.", createdAt: "2026-10-14T11:03:56.408" },
  { participantId: KEVIN, session: 3, type: "PROGRESS", text: "I sent Ali a quote for KES 25,000 this morning for 5 units for Ngong Road Minimart.", createdAt: "2026-10-14T11:03:56.408" },
  { participantId: KEVIN, session: 3, type: "PROGRESS", text: "Ali at Ngong Road Minimart wants 5 units, not 4.", createdAt: "2026-10-14T11:03:56.408" },
  { participantId: KEVIN, session: 3, type: "PROGRESS", text: "Kamau Electricals said no.", createdAt: "2026-10-14T11:03:56.408" },
  { participantId: KEVIN, session: 3, type: "PROGRESS", text: "Jane from Savannah Cafe will pay a KES 15,000 deposit on Friday.", createdAt: "2026-10-14T11:03:56.408" },
  { participantId: KEVIN, session: 3, type: "COMMITMENT", text: "I'll try calling Paul at Upper Hill Offices again tomorrow.", createdAt: "2026-10-14T11:03:56.408" },
  { participantId: KEVIN, session: 3, type: "WORRY", text: "Upper Hill Offices still haven't replied to my calls.", createdAt: "2026-10-14T11:03:56.408" },
  { participantId: KEVIN, session: 3, type: "WORRY", text: "The final payment date for the remaining balance on the six units from Savannah Cafe is not confirmed yet.", createdAt: "2026-10-14T11:03:56.408" },
  { participantId: KEVIN, session: 3, type: "TENSION", text: "Kamau Electricals already buy from Aqua Pure at about KES 4,500 a unit.", createdAt: "2026-10-14T11:03:56.408" },
  { participantId: KEVIN, session: 4, type: "PROGRESS", text: "I sent Ali the quote for KES 25,000 this morning.", createdAt: "2026-10-15T11:03:13.295" },
  { participantId: KEVIN, session: 4, type: "TOLERANCE", text: "Kamau Electricals is a no-go. They already buy from Aqua Pure at a lower price, so I'm not chasing that one.", createdAt: "2026-10-15T11:03:13.295" },
  { participantId: KEVIN, session: 4, type: "PROGRESS", text: "I visited Roysambu Gym today, they want 3 units, and I sent them a quote for KES 15,000.", createdAt: "2026-10-15T11:03:13.295" },
  { participantId: KEVIN, session: 4, type: "COMMITMENT", text: "Upper Hill Offices: I'll try Paul one more time on Monday", createdAt: "2026-10-15T11:03:13.295" },
  { participantId: KEVIN, session: 4, type: "TOLERANCE", text: "I'll drop it if there's still no reply.", createdAt: "2026-10-15T11:03:13.295" },
  { participantId: KEVIN, session: 4, type: "WORRY", text: "I just haven't been able to reach him.", createdAt: "2026-10-15T11:03:13.295" },
  { participantId: KEVIN, session: 4, type: "COMMITMENT", text: "Savannah Cafe is still a go.", createdAt: "2026-10-15T11:03:13.295" },
  { participantId: KEVIN, session: 4, type: "PROGRESS", text: "Jane said she'll pay the deposit tomorrow", createdAt: "2026-10-15T11:03:13.295" },
  { participantId: KEVIN, session: 4, type: "WORRY", text: "I'm just waiting on that. [INFERRED: the deposit from Jane]", createdAt: "2026-10-15T11:03:13.295" },
  { participantId: KEVIN, session: 4, type: "COMMITMENT", text: "Ngong Road Minimart is 5 units.", createdAt: "2026-10-15T11:03:13.295" },
];
const saidBy = (who: string, upTo: number) => record.filter((r) => r.participantId === who && r.session <= upTo).map((r) => ({ text: r.text, type: r.type, session: r.session }));

describe("Joseph's check-in on Tuesday 13 October, after his first answer", () => {
  const said = [...saidBy(JOSEPH, 1), { text: "Things are moving forward nicely. Mama Pima is 15 units now, she's expanding.", type: 'PROGRESS', session: 2 }];
  const block = sayWhatDoesNotAddUp({ said, thisSession: 2, targets: TARGETS, sessionsLeft: null, aiTurnsThisSession: [], customers: CUSTOMERS, people: PEOPLE });

  it('is told to put Monday\'s 10 units for Mama Pima beside today\'s 15', () => {
    expect(block).toContain('PUT THIS ONE TO THEM THIS SESSION, once the current thread is done: counted differently.');
    expect(block).toContain('Session 1: "That 10-unit deal for Mama Pima is definitely part of my 30-unit target. It\'s basically closed.".');
    expect(block).toContain('That is 10 units then 15: up 50%.');
  });

  it('on a check-in that is not a sales one, reads as before', () => {
    expect(sayWhatDoesNotAddUp({ said, thisSession: 2, targets: TARGETS, sessionsLeft: null, aiTurnsThisSession: [] })).not.toContain('10 units then 15');
  });
});

describe('What the conversation is told about his own deals on Wednesday 14 October', () => {
  const deals: any[] = [
    { name: 'Mama Pima Stores', stage: 'Won', ownerParticipantId: JOSEPH, paid: false, signed: false, proven: false, fields: { Units: '15' } },
    { name: 'Juja Hardware', stage: 'Quoted', ownerParticipantId: JOSEPH, paid: false, signed: false, proven: false, fields: {} },
    { name: 'Kilele Hotel', stage: 'Won', ownerParticipantId: KEVIN, paid: true, signed: false, proven: true, fields: { Units: '40' } },
  ];
  const lines = record.map((r) => ({ text: r.text, createdAt: r.createdAt, participantId: r.participantId }));
  const told = theirOwnDealsAndWhatIsOnFile(deals, lines, JOSEPH, 'Africa/Nairobi', { target: 30, paidUnits: 0 });

  it('says nothing written is on file for Mama Pima Stores, and the units he gave for it each day', () => {
    expect(told).toContain('  Mama Pima Stores, at Won: nothing written is on file for it, only what they said. Units they gave for it: 10 on Monday 12 October, then 15 on Tuesday 13 October.');
    expect(told).toContain('  Their own target is 30 units. The record shows 0 of them sold with a payment record.');
  });

  it('never gives Juja Hardware the 35 units he said of two deals together', () => {
    expect(told).toContain('  Juja Hardware, at Quoted: nothing written is on file for it, only what they said.');
    expect(told).not.toContain('35');
  });

  it("never tells him about Kevin's deals", () => {
    expect(told).not.toContain('Kilele Hotel');
  });
});

describe("Kevin, who put a figure right himself, and whose deposit was in shillings", () => {
  it('is not asked again which of 4 or 5 units stands for Ngong Road Minimart, nor handed "0 deposits then 0"', () => {
    const block = sayWhatDoesNotAddUp({ said: saidBy(KEVIN, 4), thisSession: 4, targets: TARGETS, sessionsLeft: null, aiTurnsThisSession: [], customers: CUSTOMERS, people: PEOPLE });
    expect(block).not.toContain('4 units then 5');
    expect(block).not.toContain('0 deposits');
  });
});
