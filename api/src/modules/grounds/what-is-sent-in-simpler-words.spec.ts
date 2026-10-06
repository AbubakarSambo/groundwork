import { reportAsText } from '../public-api/a-whatsapp-message-is-routed';
import { TEMPLATES, fill } from '../whatsapp/a-message-outside-the-window';
import {
  theCheckInIsCompleteSaying, enoughToCloseSaying, theReminderBody, THE_REMINDERS_IN_SIMPLER_WORDS, THE_EMAILS, THE_REPORT_IN_SIMPLER_WORDS,
} from './what-is-sent-in-simpler-words';

/**
 * WHAT A PERSON IS SENT AFTER THE CHECK-IN, WITH THE SWITCH OFF AND ON.
 * Off is the sentence the product has always sent. On is the plainer one.
 */
const REPORT = {
  whereThingsStand: { saying: 'Two things are settled and one is open.' },
  atAGlance: [],
  theConversationWorthHaving: 'Who can decide on the Quickmart price?',
};

describe('the WhatsApp messages after "finish"', () => {
  it('say what they always said with the switch off', () => {
    expect(theCheckInIsCompleteSaying()).toBe('Your check-in is complete and on record. Your report follows in a moment.');
    expect(theCheckInIsCompleteSaying(false)).toBe(theCheckInIsCompleteSaying());
    expect(enoughToCloseSaying(false)).toBe('That is enough to close this check-in. Reply "finish" to complete it, or keep going.');
  });
  it('say it in short plain sentences with the switch on', () => {
    expect(theCheckInIsCompleteSaying(true)).toBe('Your check-in is finished, and your answers are saved. Your report will come in a moment.');
    expect(enoughToCloseSaying(true)).toBe('You have said enough to finish. Write "finish" to end this check-in, or keep talking.');
  });
});

describe('the report on the phone', () => {
  it('is byte for byte what it was with the switch off or missing', () => {
    expect(reportAsText(REPORT, 'sales')).toBe(reportAsText(REPORT, 'sales', false));
    expect(reportAsText(REPORT, 'sales')).toContain('Here is a conversation worth having. Who can decide on the Quickmart price?');
  });
  it('reads "Here is one thing worth talking about." with the switch on, and keeps the facts', () => {
    const on = reportAsText(REPORT, 'sales', true);
    expect(on).toContain('Here is one thing worth talking about. Who can decide on the Quickmart price?');
    expect(on).toContain('Two things are settled and one is open.');
  });
});

describe('a reminder, as the person reads it', () => {
  it('is the approved body with the switch off', () => {
    for (const kind of Object.keys(THE_REMINDERS_IN_SIMPLER_WORDS)) {
      expect(theReminderBody(kind, TEMPLATES[kind].body, false)).toBe(TEMPLATES[kind].body);
    }
  });
  it('has the same blanks, in the same places, in the plainer form', () => {
    for (const kind of Object.keys(THE_REMINDERS_IN_SIMPLER_WORDS)) {
      const blanks = (b: string) => [...new Set(b.match(/\{\{\d+\}\}/g) ?? [])].sort();
      expect(blanks(THE_REMINDERS_IN_SIMPLER_WORDS[kind])).toEqual(blanks(TEMPLATES[kind].body));
    }
  });
  it('reads, filled in for Wairimu, as short sentences with no contraction', () => {
    const said = fill(theReminderBody('overdue', TEMPLATES.overdue.body, true), ['Wairimu', 'Sales review']);
    expect(said).toBe('Hi Wairimu, your check-in for Sales review is late. It is still open. You can answer here now.');
    for (const kind of Object.keys(THE_REMINDERS_IN_SIMPLER_WORDS)) expect(THE_REMINDERS_IN_SIMPLER_WORDS[kind]).not.toMatch(/['’]/);
  });
});

describe('an email about a check-in', () => {
  it('says what it always said with the switch off', () => {
    expect(THE_EMAILS.nudge(false).stillOpen).toBe('is still open.');
    expect(THE_EMAILS.nudge(false).theOtherHasAnswered).toBe('They have already shared their side. Yours is the last one we are waiting for.');
    expect(THE_EMAILS.nextCheckInOpen().before).toBe('A new check-in is ready for');
  });
  it('says it in plain sentences with the switch on', () => {
    expect(THE_EMAILS.nudge(true).theOtherHasAnswered).toBe('The other person has already answered. Yours is the last answer we need.');
    expect(THE_EMAILS.nextCheckInOpen(true)).toEqual({ before: 'Your next check-in for', after: ' is open. It takes about five minutes.' });
  });
});

it('says the two reminders that said "your view" and "the picture" in the words the product uses', () => {
  expect(THE_REMINDERS_IN_SIMPLER_WORDS['team-almost-in']).toContain('You have not answered yet. When you answer, your answers go into the report.');
  expect(THE_REMINDERS_IN_SIMPLER_WORDS['closes-soon']).toContain('Please answer now. It takes five minutes. Then your answers go into the report.');
});

it('tells the model to keep every fact when it writes the report in simpler words', () => {
  expect(THE_REPORT_IN_SIMPLER_WORDS).toMatch(/short sentences/);
  expect(THE_REPORT_IN_SIMPLER_WORDS).toMatch(/Keep every fact, number, name and quote exactly as it is/);
  expect(THE_REPORT_IN_SIMPLER_WORDS).toMatch(/do not use work words such as pipeline, bottleneck, escalate or escalation/);
});
