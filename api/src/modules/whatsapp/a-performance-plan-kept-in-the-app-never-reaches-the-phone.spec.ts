import { readFileSync } from 'fs';
import { join } from 'path';
import { anInboundHarness } from './a-whatsapp-inbound-harness';
import { keptOffThePhone } from './a-check-in-kept-off-the-phone';

/**
 * A PERFORMANCE PLAN KEPT IN THE APP NEVER REACHES THE PHONE (survey item 5, a privacy fault).
 *
 * The lead can set a check-in to stay in the app (`overWhatsApp = false`). Only the opening notice
 * read that setting. The session-ready message, the report sent to the phone when a session closed,
 * and messages coming in all ignored it, so the report of a performance plan could arrive on a phone
 * after the lead had said it stays in the app. Each of the four is checked here on a performance plan.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PLAN = { id: 'ci-plan', label: 'Performance plan for Amina', scenario: 'PIP', overWhatsApp: false };

describe('the setting itself', () => {
  it('only an explicit "keep it in the app" keeps a check-in off the phone; not set follows the organisation', () => {
    expect(keptOffThePhone({ overWhatsApp: false })).toBe(true);
    expect(keptOffThePhone({ overWhatsApp: null })).toBe(false);
    expect(keptOffThePhone({ overWhatsApp: true })).toBe(false);
    expect(keptOffThePhone(undefined)).toBe(false);
  });
});

describe('a message coming in to a performance plan kept in the app', () => {
  it('is not taken into the check-in, and the person is told plainly to answer it in the app', async () => {
    const h = anInboundHarness({ open: [PLAN] });
    await h.service.handle('org-1', h.message('I finished the two reports my manager asked for.'));
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.conversation.open).not.toHaveBeenCalled();
    expect(h.assistant.respond).not.toHaveBeenCalled();
    expect(h.said).toEqual([
      'Your check-in "Performance plan for Amina" is kept in the Groundwork app, so I cannot take your answers to it here. Please open Groundwork and answer it there.',
    ]);
  });

  it('even when the phone had been talking to it before the lead kept it in the app', async () => {
    const h = anInboundHarness({ open: [PLAN], thread: { checkInId: 'ci-plan' } });
    await h.service.handle('org-1', h.message('Here is my update.'));
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.said[0]).toMatch(/kept in the Groundwork app/);
  });

  it('a second check-in that may go to the phone still works, and the plan is never offered in the list', async () => {
    const h = anInboundHarness({ open: [PLAN, { id: 'ci-sales', label: 'Sales team', overWhatsApp: null }] });
    await h.service.handle('org-1', h.message('We closed Green Mart today.'));
    expect(h.conversation.sendMessage).toHaveBeenCalledWith('ci-sales', 'u-1', 'We closed Green Mart today.', { door: 'whatsapp' });
    expect(h.said.join(' ')).not.toMatch(/Performance plan/);
  });
});

describe('the report when a session of a performance plan kept in the app closes', () => {
  it('is never sent to the phone', async () => {
    const h = anInboundHarness({ completed: { overWhatsApp: false, scenario: 'PIP' } });
    await h.service.onCheckInCompleted({ checkInId: 'ci-plan', groundId: 'g-1', sessionNumber: 2 } as any);
    await new Promise((r) => setImmediate(r));
    expect(h.reports.sessionReport).not.toHaveBeenCalled();
    expect(h.whatsapp.sendFor).not.toHaveBeenCalled();
    expect(h.whatsapp.sendOn).not.toHaveBeenCalled();
  });

  it('while a check-in that may go to the phone still gets its report there', async () => {
    const h = anInboundHarness({ completed: { overWhatsApp: null, scenario: 'PULSE_CHECK', label: 'Sales team' } });
    await h.service.onCheckInCompleted({ checkInId: 'ci-sales', groundId: 'g-1', sessionNumber: 2 } as any);
    for (let i = 0; i < 5 && !h.said.length; i++) await new Promise((r) => setImmediate(r));
    expect(h.said[0]).toMatch(/^Your report for Sales team is ready\./);
  });
});

describe('the notices that start a conversation', () => {
  it('the session-ready sweep sends nothing on WhatsApp at all; the opening notice is the one, and it asks the setting', () => {
    /* Changed with survey item 7: the sweep's own WhatsApp message went, so it has nothing left to ask. */
    const cron = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.cron.ts'), 'utf8'));
    const at = cron.indexOf('const newlyOpen');
    expect(cron.slice(at, cron.indexOf('async sendWhatsAppReminders(', at))).not.toMatch(/this\.whatsapp\.send/);
    const listener = strip(readFileSync(join(__dirname, '..', 'webhooks', 'webhooks.listener.ts'), 'utf8'));
    expect(listener).toMatch(/if \(ground\.overWhatsApp === false\) return;/);
  });

  it('and the morning reminders and nudges ask it before anything else', () => {
    const cron = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.cron.ts'), 'utf8'));
    const at = cron.indexOf('async sendWhatsAppRemindersInner(');
    expect(cron.slice(at, at + 2500)).toMatch(/if \(keptOffThePhone\(ci\.ground\)\) continue;/);
  });
});

/*
 * POLISH ROUND 1 (25 October): a request or a decision sent on WhatsApp is never lost because the person has a check-in waiting in the
 * app. It goes to Ask, which says it back and acts only on a yes, and the check-in is left as it is.
 */
describe('a request or a decision sent on WhatsApp while a check-in waits in the app', () => {
  it('a leave request goes to Ask, not into the check-in, and is not answered "answer it in the app"', async () => {
    const h = anInboundHarness({ open: [PLAN] });
    await h.service.handle('org-1', h.message('Can I take leave on Monday 26 and Tuesday 27 October?'));
    expect(h.assistant.respond).toHaveBeenCalled();
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.said.join(' ')).not.toMatch(/kept in the Groundwork app/);
  });

  it('an approver\'s "approve" and "decline" go to Ask when something waits for them to decide', async () => {
    for (const words of ['Approve Mercy\'s leave', 'Decline Peter\'s leave, we are two short that Friday']) {
      const h = anInboundHarness({ open: [PLAN], decisionWaiting: true });
      await h.service.handle('org-1', h.message(words));
      expect(h.assistant.respond).toHaveBeenCalled();
      expect(h.conversation.sendMessage).not.toHaveBeenCalled();
      expect(h.said.join(' ')).not.toMatch(/kept in the Groundwork app/);
    }
  });

  it('"approve" with nothing waiting to decide, and an ordinary answer, are told to answer in the app as before', async () => {
    const h = anInboundHarness({ open: [PLAN], decisionWaiting: false });
    await h.service.handle('org-1', h.message('Approve'));
    expect(h.said[0]).toMatch(/kept in the Groundwork app/);
  });
});
