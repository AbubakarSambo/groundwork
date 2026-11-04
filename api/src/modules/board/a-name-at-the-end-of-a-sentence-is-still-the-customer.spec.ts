import { aLineNamesTheCustomer } from './one-deal-per-customer';
import { factsAbout } from '../reports/the-facts-about-a-person';

/**
 * A CUSTOMER NAMED AT THE END OF A SENTENCE IS STILL THAT CUSTOMER (engine test, second run, Drop Access, Thursday 15 October).
 *
 * Joseph, Tuesday 13 October: "I'm closing Juja Hardware and Mama Pima. That's 35 units." The capital of "That" was read as another name
 * after "Mama Pima", so the line was about Juja Hardware alone, and the 35 units were set against Juja Hardware's 5 on Thursday. Grace's
 * board said "Review with Kevin Omondi and Joseph Kariuki why their sales figures were revised down from 40 to 5 and 35 to 5". His own
 * drift, 10 units for Mama Pima on Monday and 15 on Tuesday, was never handed over. Lines word for word from the run's record.
 */
const josephByThursday = [
  {"text": "I'm going to follow up with Mrs. Atieno at Mama Pima Stores.", "type": "COMMITMENT", "session": 1},
  {"text": "My goal is to hit my target of 30 units, absolutely.", "type": "SUCCESS_DEFINITION", "session": 1},
  {"text": "about fifteen visits today alone.", "type": "PROGRESS", "session": 1},
  {"text": "I've got some big deals in the pipeline that are basically closed.", "type": "PROGRESS", "session": 1},
  {"text": "That 10-unit deal for Mama Pima is definitely part of my 30-unit target. It's basically closed.", "type": "PROGRESS", "session": 1},
  {"text": "Mrs. Atieno is signing this week, so that 10-unit deal will be done.", "type": "COMMITMENT", "session": 1},
  {"text": "Things are moving forward nicely.", "type": "PROGRESS", "session": 1},
  {"text": "My job is to get those water dispensers sold.", "type": "INTENT", "session": 1},
  {"text": "Nothing, I've got this.", "type": "INTENT", "session": 2},
  {"text": "Mama Pima is 15 units now, she's expanding.", "type": "PROGRESS", "session": 2},
  {"text": "The owner of Juja Hardware is ready, just waiting for a price.", "type": "PROGRESS", "session": 2},
  {"text": "I'll get that price to Juja Hardware this week for sure.", "type": "COMMITMENT", "session": 2},
  {"text": "I'm closing Juja Hardware and Mama Pima. That's 35 units.", "type": "INTENT", "session": 2},
  {"text": "I need to know if we can offer a unit at KES 4,500.", "type": "ASK", "session": 3},
  {"text": "Our units are KES 5,000", "type": "SUCCESS_DEFINITION", "session": 3},
  {"text": "is that price allowed?", "type": "ASK", "session": 3},
  {"text": "I met the owner, Mr. Mutua, and he's interested in 5 units at KES 4,500 each", "type": "PROGRESS", "session": 3},
  {"text": "Mama Pima paid a deposit.", "type": "PROGRESS", "session": 3},
  {"text": "I'm expecting to hear back from her early next week.", "type": "TIMEFRAME", "session": 4},
  {"text": "The Mama Pima deposit hasn't actually come through yet, she's still choosing.", "type": "WORRY", "session": 4},
  {"text": "I was busy in the field yesterday, so I haven't had a chance to get a decision on the KES 4,500 price yet.", "type": "WORRY", "session": 4},
  {"text": "Their [INFERRED: Juja Hardware's] need is for dispensers, the owner Mr. Mutua makes the decision, and he wants 5 units if the price is KES 4,500 each.", "type": "SUCCESS_DEFINITION", "session": 4},
  {"text": "Juja Hardware will sign on Monday.", "type": "PROGRESS", "session": 4},
  {"text": "I have close to 30 units in the pipeline.", "type": "INTENT", "session": 4},
  {"text": "She's [INFERRED: Mrs Atieno] still choosing between us and another supplier", "type": "WORRY", "session": 4},
  {"text": "it's looking like maybe 5 units from her [INFERRED: Mrs Atieno].", "type": "INTENT", "session": 4},
  {"text": "I need to hear her final decision on the number of units and confirmation of payment.", "type": "ASK", "session": 4},
];
const CUSTOMERS = ['Greenfield Supermarket', 'Juja Hardware', 'Kamau Electricals', 'Kilele Hotel', 'Lavington Business Park', 'Mama Pima Stores', "Mama Rose's Kiosk", 'Ngong Road Minimart', 'Roysambu Gym', 'Savannah Cafe', 'Sunrise Primary School', 'Upper Hill Offices'];

describe('A customer named at the end of a sentence', () => {
  it('"... and Mama Pima. That\'s 35 units." names Mama Pima Stores', () => {
    expect(aLineNamesTheCustomer("I'm closing Juja Hardware and Mama Pima. That's 35 units.", 'Mama Pima Stores')).toBe(true);
  });
  it('and a name said short and followed by another name in the same sentence is still not that customer', () => {
    expect(aLineNamesTheCustomer("Mama Pima hasn't replied since Monday.", 'Mama Mboga Mart')).toBe(false);
  });
});

describe('What the report is handed about Joseph on Thursday', () => {
  const f = factsAbout({ participantId: 'p-joseph', label: 'Joseph Kariuki', isLead: false, said: josephByThursday, targets: [{ name: 'units sold by 30 October', target: 30, count: 0, yours: true, setByThem: false }], customers: CUSTOMERS, people: ['Grace', 'Kevin', 'Mercy', 'Joseph', 'Peter'] }, 4)!;
  it('holds his Mama Pima figures, 10 units then 15, and never 35 units then 5', () => {
    expect(f.whatDoesNotAddUp).toContain('That is 10 units then 15: up 50%');
    expect(f.whatDoesNotAddUp.join(' ')).not.toContain('35 units then 5');
  });
});
