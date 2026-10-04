import { whatToProbe } from './what-to-probe';
import { whatToWorkOnNext } from './what-to-work-on-next';

/**
 * ITEM 18 (THE PROJECT AND ONBOARDING BOARDS): EACH WAIT IS SAID UNDER WHOEVER HOLDS IT, AND EACH THING ONCE.
 *
 * Served from the local test database on 2 October 2026:
 *  - "Atlas delivery": Tunde (the lead) read in coaching.eachPerson "Samuel Aryee has been waiting on
 *    Kwabena Mensah for the details for the analysis and approval for the external dataset since 25
 *    September", but the approval waits on Finance; and "Kwabena Mensah has been waiting for the data
 *    team's market sizing extract and the data team's market sizing extract since 25 September".
 *  - "Engagement Director, first 90 days": Tobi read in coaching.yours.beforeNextTime "Put ... a briefing
 *    on pricing structures and renewal processes, ... three dates and times for the meeting ... in writing to
 *    Dr Amina Bello", two things that wait on the pricing decision and on his own team, not on Amina.
 *
 * These two builders write exactly those lines: whatToProbe for the lead's "what to ask each person"
 * (served to whoever runs the check-in only), whatToWorkOnNext for a person's own coaching (served to
 * that person only). Nobody else is served either line.
 */
const probeFor = (waitingOn: any[]) => whatToProbe({
  who: 'Samuel Aryee', participantId: 'p-samuel', role: 'Data Lead', answeredThisSession: true, patterns: [],
  waitingOn, holdingUp: [], concrete: [], documentsAttached: 0, sessionNumber: 2, totalSessions: 6, scenario: 'NEW_PROJECT',
});
const coachingFor = (waitingOn: any[]) => whatToWorkOnNext({
  patterns: [], role: null, detectedFunction: null, functionConfidence: null, noticedBehaviour: null,
  sessionNumber: 6, totalSessions: 6, scenario: 'NEW_HIRE', waitingOn, holdingUp: [],
  saidSomethingSpecific: true, anythingDocumented: false,
});

describe('item 18: each wait under whoever holds it, and each thing once', () => {
  it('the lead reads Samuel\'s two waits each under its own holder', () => {
    const p = probeFor([
      { what: 'the details for the analysis', who: 'Kwabena Mensah', daysOld: 7, escalated: false, since: '25 September' },
      { what: 'approval for the external dataset', who: 'Finance', daysOld: 7, escalated: false, since: '25 September' },
    ]);
    expect(p.probe).toContain('Samuel Aryee has been waiting on Kwabena Mensah for the details for the analysis, and on Finance for approval for the external dataset, since 25 September, and nothing on record says it was raised higher. It is early, so ask Samuel Aryee what is being held up and whether help raising it would be useful.');
  });

  it('the lead reads a wait recorded twice once', () => {
    const p = probeFor([
      { what: 'the data team\'s market sizing extract', who: null, daysOld: 7, escalated: false, since: '25 September' },
      { what: 'the data team\'s market sizing extract', who: null, daysOld: 7, escalated: false, since: '25 September' },
    ]);
    expect(p.probe).toContain('Samuel Aryee has been waiting for the data team\'s market sizing extract since 25 September, and nothing on record says it was raised higher. It is early, so ask Samuel Aryee what is being held up and whether help raising it would be useful.');
  });

  it('a person reads each thing put in writing to the person who holds it, and the rest without a holder', () => {
    const c = coachingFor([
      { what: 'an invitation to lead a client meeting', who: 'Dr Amina Bello', daysOld: 2, escalated: false, since: '30 September' },
      { what: 'a briefing on pricing structures and renewal processes', who: null, daysOld: 2, escalated: false, since: '30 September' },
      { what: 'feedback on the QBR deck', who: 'Dr Amina Bello', daysOld: 2, escalated: false, since: '30 September' },
      { what: 'feedback on the QBR deck', who: 'Dr Amina Bello', daysOld: 2, escalated: false, since: '30 September' },
    ]);
    expect(c.beforeNextTime).toContain('Put an invitation to lead a client meeting and feedback on the QBR deck in writing to Dr Amina Bello, with the date you need them by. Put a briefing on pricing structures and renewal processes in writing, with the date you need it by.');
  });

  it('one wait on one person reads as it always did', () => {
    const c = coachingFor([{ what: 'the price list', who: 'Rukia Otieno', daysOld: 2, escalated: false, since: '30 September' }]);
    expect(c.beforeNextTime).toContain('Put the price list in writing to Rukia Otieno, with the date you need it by.');
  });
});

/*
 * RUN-25, SALES, SESSION 3: THE SAME THING SAID THREE WAYS. Femi's own coaching (served to Femi only) read "Put their
 * documents, especially the bank statements, the bank statements from the customers and the three remaining bank
 * statements in writing, with the date you need them by." and Bisi's probe (served to Bisi only) read "Femi Okonkwo
 * has been waiting for their documents, especially the bank statements, the bank statements from the customers and
 * the three remaining bank statements since 2 October". One thing, said once.
 */
describe('run-25: the bank statements, said three ways, are one thing', () => {
  const THREE = [
    { what: 'their documents, especially the bank statements', who: null, daysOld: 1, escalated: false, since: '2 October' },
    { what: 'the bank statements from the customers', who: null, daysOld: 1, escalated: false, since: '2 October' },
    { what: 'the three remaining bank statements', who: null, daysOld: 1, escalated: false, since: '2 October' },
  ];

  it('Femi reads it once in his own coaching', () => {
    const c = coachingFor(THREE);
    expect(c.beforeNextTime).toContain('Put their documents, especially the bank statements in writing, with the date you need it by.');
    expect(JSON.stringify(c)).not.toMatch(/bank statements from the customers|three remaining bank statements/);
  });

  it('Bisi reads it once in what to ask Femi', () => {
    const p = whatToProbe({
      who: 'Femi Okonkwo', participantId: 'p-femi', role: null, answeredThisSession: true, patterns: [],
      waitingOn: THREE, holdingUp: [], concrete: [], documentsAttached: 0, sessionNumber: 3, totalSessions: 12, scenario: 'OKR_ALIGNMENT',
    } as any);
    expect(p.probe.join(' ')).toContain('Femi Okonkwo has been waiting for their documents, especially the bank statements since 2 October');
    expect(JSON.stringify(p)).not.toMatch(/bank statements from the customers|three remaining bank statements/);
  });

  it('two different things that share a word are still two', () => {
    const c = coachingFor([
      { what: 'the signed contract', who: null, daysOld: 1, escalated: false, since: '2 October' },
      { what: 'the contract template from legal', who: null, daysOld: 1, escalated: false, since: '2 October' },
    ]);
    expect(c.beforeNextTime).toContain('Put the signed contract and the contract template from legal in writing, with the date you need them by.');
  });
});
