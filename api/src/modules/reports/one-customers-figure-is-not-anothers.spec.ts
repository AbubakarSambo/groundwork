import { factsAbout } from './the-facts-about-a-person';

/**
 * ONE CUSTOMER'S FIGURE IS NEVER ANOTHER CUSTOMER'S EARLIER FIGURE (engine test, second run, Drop Access, Thursday 15 October).
 *
 * Kevin's record by Thursday, word for word from the run. The facts handed to the report and the judgement said "That is 40 units then
 * 5: down 88%", Kilele Hotel's 40 against Ngong Road Minimart's 5. Every rep then read in the team report "The record shows Kevin
 * Omondi's sales at 40 units, but this has been revised down to 5", and Grace's board said "This means Kevin Omondi's reporting has been
 * inaccurate" and "Review with Kevin Omondi and Joseph Kariuki why their sales figures were revised down from 40 to 5 and 35 to 5".
 */
const kevinByThursday = [
  {"text": "The Kilele Hotel order is for 40 units.", "type": "PROGRESS", "session": 1},
  {"text": "Tomorrow morning, I'm sending a price list to Savannah Cafe.", "type": "COMMITMENT", "session": 1},
  {"text": "My job is to find new clients, tell them about our awesome water dispensers, and close deals.", "type": "INTENT", "session": 1},
  {"text": "Just closed a big one today... proof of payment for Kilele Hotel.", "type": "PROGRESS", "session": 1},
  {"text": "I'll call Paul tomorrow afternoon to understand their needs better.", "type": "COMMITMENT", "session": 1},
  {"text": "hit that 30 units", "type": "SUCCESS_DEFINITION", "session": 1},
  {"text": "Paul hasn't answered my call yet. Still waiting on him.", "type": "WORRY", "session": 2},
  {"text": "I don't know what Paul needs yet.", "type": "WORRY", "session": 2},
  {"text": "visited two shops on Ngong Road.", "type": "PROGRESS", "session": 2},
  {"text": "Ngong Road Minimart wants a quote for 4 units.", "type": "PROGRESS", "session": 2},
  {"text": "Kamau Electricals said no.", "type": "PROGRESS", "session": 2},
  {"text": "Kilele Hotel's 40 units were KES 200,000.", "type": "PROGRESS", "session": 2},
  {"text": "sent it [the price list] this morning [INFERRED: 'it' refers to the price list for Savannah Cafe]", "type": "PROGRESS", "session": 2},
  {"text": "Jane wants 6 units!", "type": "PROGRESS", "session": 2},
  {"text": "Just sent her the quote for 30k.", "type": "PROGRESS", "session": 2},
  {"text": "Ali from Ngong Road Minimart will decide next week.", "type": "TIMEFRAME", "session": 3},
  {"text": "Savannah Cafe is a go! Jane said yes to 6 units.", "type": "PROGRESS", "session": 3},
  {"text": "Jane Mwende, the owner, made the decision.", "type": "PROGRESS", "session": 3},
  {"text": "I sent Ali a quote for KES 25,000 this morning for 5 units for Ngong Road Minimart.", "type": "PROGRESS", "session": 3},
  {"text": "Ali at Ngong Road Minimart wants 5 units, not 4.", "type": "PROGRESS", "session": 3},
  {"text": "Kamau Electricals said no.", "type": "PROGRESS", "session": 3},
  {"text": "Jane from Savannah Cafe will pay a KES 15,000 deposit on Friday.", "type": "PROGRESS", "session": 3},
  {"text": "I'll try calling Paul at Upper Hill Offices again tomorrow.", "type": "COMMITMENT", "session": 3},
  {"text": "Upper Hill Offices still haven't replied to my calls.", "type": "WORRY", "session": 3},
  {"text": "The final payment date for the remaining balance on the six units from Savannah Cafe is not confirmed yet.", "type": "WORRY", "session": 3},
  {"text": "Kamau Electricals already buy from Aqua Pure at about KES 4,500 a unit.", "type": "TENSION", "session": 3},
  {"text": "I sent Ali the quote for KES 25,000 this morning.", "type": "PROGRESS", "session": 4},
  {"text": "Kamau Electricals is a no-go. They already buy from Aqua Pure at a lower price, so I'm not chasing that one.", "type": "TOLERANCE", "session": 4},
  {"text": "I visited Roysambu Gym today, they want 3 units, and I sent them a quote for KES 15,000.", "type": "PROGRESS", "session": 4},
  {"text": "Upper Hill Offices: I'll try Paul one more time on Monday", "type": "COMMITMENT", "session": 4},
  {"text": "I'll drop it if there's still no reply.", "type": "TOLERANCE", "session": 4},
  {"text": "I just haven't been able to reach him.", "type": "WORRY", "session": 4},
  {"text": "Savannah Cafe is still a go.", "type": "COMMITMENT", "session": 4},
  {"text": "Jane said she'll pay the deposit tomorrow", "type": "PROGRESS", "session": 4},
  {"text": "I'm just waiting on that. [INFERRED: the deposit from Jane]", "type": "WORRY", "session": 4},
  {"text": "Ngong Road Minimart is 5 units.", "type": "COMMITMENT", "session": 4},
];
const CUSTOMERS = ['Greenfield Supermarket', 'Juja Hardware', 'Kamau Electricals', 'Kilele Hotel', 'Lavington Business Park', 'Mama Pima Stores', "Mama Rose's Kiosk", 'Ngong Road Minimart', 'Roysambu Gym', 'Savannah Cafe', 'Sunrise Primary School', 'Upper Hill Offices'];
const PEOPLE = ['Grace', 'Kevin', 'Mercy', 'Joseph', 'Peter'];
const TARGETS = [{ name: 'units sold by 30 October', target: 30, count: 46, yours: true, setByThem: false }];

const kevin = (customers: string[] | null) => factsAbout({ participantId: 'p-kevin', label: 'Kevin Omondi', isLead: false, said: kevinByThursday, targets: TARGETS, customers, people: PEOPLE }, 4)!;

describe("What the report is handed about Kevin on Thursday, on Drop Access's sales check-in", () => {
  it('never sets Kilele Hotel\'s 40 units against Ngong Road Minimart\'s 5', () => {
    const f = kevin(CUSTOMERS);
    expect(f.whatDoesNotAddUp.join(' ')).not.toContain('40 units then 5');
    expect(f.whatDoesNotAddUp.join(' ')).not.toMatch(/\b40\b/);
  });

  it('does not hand over as a difference the figure he put right himself, "Ali at Ngong Road Minimart wants 5 units, not 4."', () => {
    expect(kevin(CUSTOMERS).whatDoesNotAddUp).toEqual([]);
  });

  it('hands over no earlier figure that is about another customer', () => {
    const f = kevin(CUSTOMERS);
    expect(f.whereTheySayTheyAre).toBe('I sent Ali the quote for KES 25,000 this morning');
    expect(f.anEarlierFigureTheyGave).not.toBe('Savannah Cafe is a go! Jane said yes to 6 units');
  });

  it('a check-in that is not a sales one reads as before', () => {
    expect(kevin(null).whatDoesNotAddUp).toContain('That is 40 units then 5: down 88%');
  });
});
