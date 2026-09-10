import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * FINISHING IN THE APP STILL SENDS THE REPORT TO THE PHONE. The listener returned early whenever any
 * thread row existed for the check-in, and a thread row is written on any WhatsApp interaction - so
 * one message here followed by a finish in the app meant no report here, ever. The one fact that
 * matters is whether a report send already went, and the send record says so.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const handler = strip(readFileSync(join(__dirname, '..', 'public-api', 'whatsapp-for-an-organisation.service.ts'), 'utf8'));
const listener = handler.slice(handler.indexOf('async onCheckInCompleted('), handler.indexOf('private async firstTimeWeSeeThis('));

describe('the completion listener', () => {
  it('asks the send record, not the thread table, and not whether the connection is enabled', () => {
    expect(listener).toMatch(/whatsAppSend\.findFirst\(\{ where: \{ checkInId: c\.id, kind: \{ in: \['report', 'report:template'\] \}, sentAt: \{ not: null \} \}/);
    expect(listener).not.toContain('whatsAppThread.findFirst');
    expect(listener).not.toContain('connected?.enabled');
  });
  it('does not hold the completing request for the synthesis', () => {
    expect(listener).toMatch(/void this\.sendTheReport\(/);
  });
});
