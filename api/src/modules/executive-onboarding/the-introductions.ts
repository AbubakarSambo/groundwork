/**
 * THE FOUR INTRODUCTIONS, WORD FOR WORD FROM THE PLAN (Fatima, increment 5; plan sections 4.1, 4.2, 6.1 and 6.2).
 *
 * These are the customer's own scripts and they are kept exactly, including the colon in "whatever you have: emails" and the dash in the
 * team subject; the plain-words rule bends to them, as the brief says. Only three things change, and only where the script has a blank:
 * her first name, the address she can write to (one function owns it, email/the-assistants-address.ts), and the name of the office in
 * the two team notes ("the Abuja office"), which the admin gives when adding her. Paragraph breaks follow the plan's own paragraphs.
 *
 * Nothing is added to a script. What a team member is told about who sees what they send is said in the reply to their first message
 * (team-introductions.ts), not here.
 */

export interface AnIntroduction { subject: string | null; text: string }

const join = (...paragraphs: string[]) => paragraphs.join('\n\n');

/** 4.1. WhatsApp to the principal. */
export function whatsAppToThePrincipal(first: string, address: string): AnIntroduction {
  return {
    subject: null,
    text: join(
      `Hello ${first}, I’m your Groundwork assistant.`,
      'I understand you’re trying to bring together your office’s work, government engagements, outstanding commitments and reports, and that you need your year-end report and presentation prepared.',
      'You can start by forwarding me whatever you have: emails, documents, reports, spreadsheets or WhatsApp messages. You don’t need to organise anything. You can also just send me a voice note.',
      'I’ll start putting things together, let you know what I’m finding and follow up on gaps where I can.',
      'Are there other members of your team working on these things? Share their names and contacts and, with your permission, I’ll start collecting their documents and updates too.',
      'What would you like to send me first?',
    ),
  };
}

/** 4.2. Email to the principal. */
export function emailToThePrincipal(first: string): AnIntroduction {
  return {
    subject: 'I’m your Groundwork assistant',
    text: join(
      `Hello ${first},`,
      'I’m your Groundwork assistant. I understand you need to bring together your office’s work, government engagements, reports and outstanding commitments, including your year-end report and presentation.',
      'Just forward me what you already have. Emails, reports, spreadsheets, correspondence and other documents are fine. There’s no need to sort them first. You can also message me on WhatsApp or send a voice note.',
      'I’ll begin organising the information, connecting the work and building your report. If something is missing, I’ll ask the right person where I have permission. I’ll email you the draft when it’s ready for review, and the final versions when you approve them.',
      'Are other team members handling these matters? You can send their contacts and authorise me to collect their updates directly.',
      'You can simply reply to this email. What would you like me to start with?',
      'Groundwork',
    ),
  };
}

/** 6.1. WhatsApp to a team member. `office` is "the Abuja office" for her; "her office" when the admin did not say. */
export function whatsAppToATeamMember(principalFirst: string, office: string, first?: string | null): AnIntroduction {
  return {
    subject: null,
    text: join(
      `Hello${first ? ` ${first}` : ''}, I’m Groundwork. I’m helping ${principalFirst} bring together the work and updates from ${office}.`,
      `${principalFirst} asked me to reach out to you. Could you forward me any reports, documents or updates you have on the work you’re handling? You can also just tell me what’s happening or send a voice note.`,
      'I’ll help organise the information and can assist you with follow-ups and preparing your updates. You don’t need to sign up to anything.',
      'What are you currently working on?',
    ),
  };
}

/** 6.2. Email to a team member. */
export function emailToATeamMember(principalFirst: string, office: string, first?: string | null): AnIntroduction {
  return {
    subject: 'Updates and support for your work from Groundwork',
    text: join(
      `Hello${first ? ` ${first}` : ''},`,
      `I’m Groundwork, helping ${principalFirst} bring together ${office}’s work, reports and outstanding commitments. ${principalFirst} has authorised me to reach out for relevant updates and supporting documents.`,
      'You can reply directly to this email, forward files or send a WhatsApp voice note. You don’t need to register or use another application.',
      'I can help organise your updates, clarify next steps and follow up on matters where useful.',
      'What are you currently working on, and what recent documents or updates would help me understand it?',
      'Groundwork',
    ),
  };
}

/** "the Abuja office" for the first, and "the Abuja office’s" in the email, from one name the admin gave. */
export const theOffice = (name: string | null | undefined): string => {
  const n = (name ?? '').trim();
  if (!n) return 'the office';
  return /^the\s/i.test(n) ? n : `the ${n}`;
};
