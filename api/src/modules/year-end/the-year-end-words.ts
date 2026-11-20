/**
 * WHAT A PERSON READS ABOUT THE YEAR-END WORK (Fatima, increment 4). The words are the product's, never a model's, so a name, a number or
 * a month cannot change on the way. The draft-ready WhatsApp line and the draft-ready email are Hafsah's wording from the brief
 * (plan 14.1 and 14.2); the rest follows the same voice.
 *
 * Each says only what is true when it is sent. The WhatsApp line says "I've emailed both to you" and is sent only after the email has
 * been sent (the-year-end-owner.ts holds that), so it is never a promise about a mail that is still held.
 */
import { MONTHS, type YearEndContent } from './the-year-end-content';
import { theYearInWords } from './the-year-end-files';

export interface AMessage { subject: string; text: string }

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const monthNames = (keys: string[]) => list(keys.map((k) => MONTHS[Number(k.slice(5)) - 1]));

export const DRAFT_READY_WHATSAPP = (first: string, version: number): string =>
  version <= 1
    ? `${first}, I've put together the first draft of your year-end report and presentation from the information you and the team shared. I've emailed both to you for review. I'm still following up on a few gaps, which I've flagged clearly. You can reply here, send a voice note or email me any changes. When you're happy with it, I'll send the final versions.`
    : `${first}, I've updated your year-end report and presentation with your changes. This is version ${version}, and I've emailed both to you for review. You can reply here, send a voice note or email me any more changes. When you're happy with it, I'll send the final versions.`;

export function draftReadyEmail(c: YearEndContent, version: number): AMessage {
  const open = c.register.filter((r) => r.status !== 'completed' && r.status !== 'cancelled');
  const noOwner = open.filter((r) => r.owner === 'unconfirmed').length;
  const lead = version <= 1
    ? `I've prepared the draft of your year-end report and leadership presentation and attached both files. I've also included the supporting information and flagged the items that still need confirmation.`
    : `I've updated the draft of your year-end report and leadership presentation with your changes. This is version ${version}, and I've attached both files again with the supporting information. The earlier versions are kept.`;
  return {
    subject: version <= 1 ? 'Your year-end report and presentation are ready for review' : `Version ${version} of your year-end report and presentation is ready for review`,
    text: [
      `Hello ${c.principalFirstName},`,
      lead,
      open.length === 0 ? theYearInWords(c).join(' ') : `${theYearInWords(c).join(' ')} ${open.length} ${open.length === 1 ? 'matter is' : 'matters are'} still open in the outstanding register, and ${noOwner} of them ${noOwner === 1 ? 'has' : 'have'} no confirmed owner.`,
      `You can reply to this email, send a WhatsApp message or record a voice note with changes. I'll update the drafts and send you the final versions once you approve them.`,
      'Groundwork',
    ].join('\n\n'),
  };
}

export function finalEmail(c: YearEndContent, version: number): AMessage {
  return {
    subject: `Your final ${c.year} year-end report and presentation`,
    text: [
      `Hello ${c.principalFirstName},`,
      `As you approved version ${version}, I've attached the final report as a Word file and a PDF, the editable presentation, the outstanding register as a spreadsheet with a short readable summary, and the evidence index. Nothing has been changed since you approved it.`,
      `If you want a later change, tell me and I'll make a new version for you to approve. This one stays as it is.`,
      'Groundwork',
    ].join('\n\n'),
  };
}

export const FINAL_WHATSAPP = (first: string) => `${first}, the final versions of your year-end report and presentation are in your email now.`;

/* ------------------------------------------------------------------ meaningful progress */

export type ASignal =
  | { kind: 'coverage'; newRecords: number; first: boolean; months: string[]; gaps: string[] }
  | { kind: 'gap'; gaps: string[]; askedOf: string | null }
  | { kind: 'decision'; questions: string[] }
  | { kind: 'newer'; version: number };

/** Short, for WhatsApp. */
export function progressShort(first: string, s: ASignal): string {
  switch (s.kind) {
    case 'coverage':
      return `${first}, I now have ${s.newRecords}${s.first ? '' : ' more'} ${s.newRecords === 1 ? 'record' : 'records'} for your year-end work, covering ${monthNames(s.months) || 'the year so far'}.${s.gaps.length ? ` I still have nothing from ${monthNames(s.gaps)}.` : ''} I'll send you the draft when it's ready.`;
    case 'gap':
      return `${first}, I don't have anything yet from ${monthNames(s.gaps)} for your year-end work. ${s.askedOf ? `I've asked ${s.askedOf} for it, so you don't need to chase it.` : `I'll ask the team for it.`}`;
    case 'decision':
      return s.questions.length === 1
        ? `${first}, one thing for your year-end work needs your decision. ${s.questions[0]}`
        : `${first}, ${s.questions.length} things for your year-end work need your decision. Here is the first. ${s.questions[0]}`;
    case 'newer':
      return `${first}, new records have arrived since version ${s.version} of your draft. Say "update the draft" and I'll make a new version. Nothing changes until you do.`;
  }
}

/** Fuller, for email, where there is no WhatsApp number to use. */
export function progressFull(first: string, s: ASignal): AMessage {
  const subject = s.kind === 'coverage' ? 'More records for your year-end work' : s.kind === 'gap' ? 'A gap in the record for your year-end work' : s.kind === 'decision' ? 'Your decision is needed for the year-end work' : 'New records since your last draft';
  const more = s.kind === 'decision'
    ? s.questions.slice(0, 5).map((q, i) => `${i + 1}. ${q}`).join('\n')
    : s.kind === 'coverage' ? `I'm still collecting, and I'll email you the draft report and presentation when they are ready.` : s.kind === 'gap' ? `Nothing has been guessed for those months. They are marked unverified in the draft until a record arrives.` : `I've kept version ${s.version} as it is.`;
  return { subject, text: [`Hello ${first},`, progressShort(first, s).replace(new RegExp(`^${first}, `), '').replace(/^./, (c) => c.toUpperCase()), more, 'Groundwork'].join('\n\n') };
}

/** To the person the record says can answer a gap, never to the principal over and over. */
export const ASK_ABOUT_MONTHS = (name: string, principalFirst: string, months: string[]) =>
  `Hello ${name}, I'm putting together ${principalFirst}'s year-end report, and I don't have anything yet from ${monthNames(months)}. If you have emails, documents or notes from then, you can forward them to this address or reply here, and I'll add them. Thank you.`;
export const ASK_THE_OWNER = (name: string, question: string) => `Hello ${name}, one question for the year-end report. ${question}`;
