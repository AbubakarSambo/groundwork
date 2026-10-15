import * as fs from 'fs';
import * as path from 'path';
import { whatToProbe } from './what-to-probe';
import { whatToWorkOnNext } from './what-to-work-on-next';
import { itWasTakenFurther } from './what-they-said-they-did-about-it';
import { dependenciesOverTime } from './what-the-record-shows-over-time';
import { sayOneThingInTheWay } from '../conversation/what-the-record-already-holds';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy a check (a-guard-that-a-comment-satisfies-is-not-a-guard). */
const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');


/**
 * "WHAT HAPPENED TO THE FOUR ITEMS YOU ESCALATED 15 DAYS AGO?" NOTHING HAD BEEN ESCALATED (decision 139, must-fix 3; final evaluation,
 * problem 4: profile 2, problem 7; profile 3, problem 7; profile 4, problem 7; profile 5, problem 10).
 *
 * Every one of these handoffs carried `escalatedAt`, the product's own overnight stamp on a wait still open after a fortnight. Nobody had
 * taken anything higher. Felix was asked about "the four items you escalated"; Wairimu's probes said Kevin "has raised it higher";
 * Samuel's coaching said "You have already taken an explanation of the difference between refunds and credits to somebody above them".
 *
 * Each case below is the sentence a person reads, built from a handoff that has only the product's stamp, then from one where the person
 * really said they took it higher.
 */
const NOW = new Date('2026-10-30T09:00:00Z');
const FIFTEEN_DAYS_AGO = new Date('2026-10-15T07:00:00Z');
const STAMP_ONLY = { escalatedAt: FIFTEEN_DAYS_AGO, triedSaid: null };
const THEY_SAID_SO = { escalatedAt: FIFTEEN_DAYS_AGO, triedSaid: 'I took it to the head of finance on Monday.' };

const probeFor = (escalated: boolean) => whatToProbe({
  who: 'Kevin Odhiambo', participantId: 'p-kevin', role: null, answeredThisSession: true, patterns: [],
  waitingOn: [{ what: 'the phone purchase request', who: 'Fatuma Bello', daysOld: 19, escalated, since: '11 October' }],
  holdingUp: [], concrete: [], documentsAttached: 0, sessionNumber: 3, totalSessions: 12, scenario: null,
} as any);

const coachingFor = (escalated: boolean) => whatToWorkOnNext({
  patterns: [], role: null, detectedFunction: null, functionConfidence: 0, noticedBehaviour: null,
  sessionNumber: 3, totalSessions: 12, scenario: null,
  waitingOn: [{ what: 'an explanation of the difference between refunds and credits', who: 'Sade Balogun', daysOld: 19, since: '11 October', escalated }],
  holdingUp: [], saidSomethingSpecific: true, anythingDocumented: true,
} as any);

describe('the product\'s own stamp is never read as the person taking it higher', () => {
  it('Wairimu\'s probe about Kevin does not say he raised it higher when only the product stamped it', () => {
    const p = probeFor(itWasTakenFurther(STAMP_ONLY));
    const read = [...p.probe, p.triedToUnblock ?? ''].join(' ');
    expect(read).not.toMatch(/raised it higher|taken above the person|escalat/i);
  });

  it('where Kevin said he took it to the head of finance, the probe says so', () => {
    const p = probeFor(itWasTakenFurther(THEY_SAID_SO));
    expect(p.probe.join(' ')).toContain('Kevin Odhiambo has been waiting for the phone purchase request since 11 October, and has raised it higher. Ask what happened after that.');
  });

  it('Samuel\'s coaching does not tell him he has already taken it to somebody above them', () => {
    const read = JSON.stringify(coachingFor(itWasTakenFurther(STAMP_ONLY)));
    expect(read).not.toMatch(/already taken/i);
    expect(read).toContain('you have not taken it any further');
  });

  it('the lead\'s record of what is still open does not say somebody went back about it', () => {
    const [d] = dependenciesOverTime([{
      what: 'replies on the four items', fromParticipantId: 'felix', onParticipantId: null, onLabel: 'the property team',
      status: 'WAITING', ...STAMP_ONLY, statedInSession: 1,
    } as any], (id: string) => (id === 'felix' ? 'Felix Ndungu' : id), 4);
    expect(d.say).not.toMatch(/went back about it|taken above|escalat/i);
    expect(d.say).toContain('nothing on record says anybody has chased it since');
  });

  it('what Felix\'s next check-in is told holds no escalation he did not make', () => {
    const line = sayOneThingInTheWay({ what: 'replies on the four items', on: 'the property team', since: FIFTEEN_DAYS_AGO, escalated: itWasTakenFurther(STAMP_ONLY) }, NOW);
    expect(line).toBe('- "replies on the four items" on the property team, 15 days old, they have not said they took it any higher.');
    expect(line).not.toMatch(/has been escalated/);
  });

  it('the check-in reads escalation from their own words, never from the stamp', () => {
    const svc = withoutComments(fs.readFileSync(path.join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8'));
    expect(svc).not.toMatch(/escalated:\s*!!\w+\.escalatedAt/);
    expect(svc).toMatch(/escalated:\s*itWasTakenFurther\(\{\s*triedSaid:/);
  });
});
