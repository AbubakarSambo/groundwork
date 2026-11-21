import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { emailToATeamMember, emailToThePrincipal, theOffice, whatsAppToATeamMember, whatsAppToThePrincipal } from './the-introductions';

/**
 * THE FOUR SCRIPTS ARE THE CUSTOMER'S OWN (plan 4.1, 4.2, 6.1, 6.2). Each is compared, ignoring only the white space between paragraphs, with the plan's
 * own text, with her name and the one address she can write to put back as the plan had them. The plan's text is kept on the working branches and not in
 * a pull request, so where the file is not there these are skipped and the words are checked in the delivery tests instead.
 */
const PLAN = join(__dirname, '..', '..', '..', '..', 'docs', 'fatima-plan-extract.txt');
const flat = (s: string) => s.replace(/\s+/g, '');
/* Changed 15 November (Fatima round 5, Hafsah's order on the plan-wording items): the WhatsApp opening no longer carries the long assistant address, which the email opening has, and a team member's introduction says their first name after Hello. The plan's sentence about the address is taken out of the plan text here, nothing else. */
/* Changed 11 November (Fatima round 2, D4): the plan's team scripts say "She asked me" and "She has authorised me". Groundwork never works out somebody's gender from a name, so the words say the name where the plan says "She". Nothing else in them differs. */
const planned = existsSync(PLAN) ? flat(readFileSync(PLAN, 'utf8')).replace(/Sheaskedmetoreach/g, 'Fatimaaskedmetoreach').replace(/Shehasauthorisedme/g, 'Fatimahasauthorisedme').replace(/Youcanalsoemailmeat[^\s.]*@ground\.work\./, '') : null;
const thePlan = planned ? it : it.skip;

describe('the four introductions are the plan\'s words', () => {
  thePlan('4.1 the WhatsApp message to Fatima', () => {
    expect(planned).toContain(flat(whatsAppToThePrincipal('Fatima', 'fatimawale@ground.work').text));
  });
  thePlan('4.2 the email to Fatima, with its subject', () => {
    const m = emailToThePrincipal('Fatima');
    expect(planned).toContain(flat(`Subject: ${m.subject}`));
    expect(planned).toContain(flat(m.text));
  });
  thePlan('6.1 the WhatsApp message to a team member', () => {
    expect(planned).toContain(flat(whatsAppToATeamMember('Fatima', 'the Abuja office').text));
  });
  thePlan('6.2 the email to a team member, with its subject', () => {
    const m = emailToATeamMember('Fatima', 'the Abuja office');
    /* Changed 11 November: the plan's subject joins two pieces with a dash ("Groundwork — updates and support for your work"); the product's subject says the same in plain words, per the wording rule. The body is still the plan's. */
    expect(m.subject).toBe('Updates and support for your work from Groundwork');
    expect(planned).toContain(flat('Subject: Groundwork — updates and support for your work'));
    expect(planned).toContain(flat(m.text));
  });

  it('names the office the way the admin gave it, and says "the office" when none was given', () => {
    expect(theOffice('Abuja office')).toBe('the Abuja office');
    expect(theOffice('the Abuja office')).toBe('the Abuja office');
    expect(theOffice(null)).toBe('the office');
    /* D20: the name she was given already says whose office it is. */
    expect(theOffice("Fatima's office")).toBe("Fatima's office");
    expect(theOffice('Fatima’s office')).toBe('Fatima’s office');
    expect(whatsAppToATeamMember('Fatima', theOffice("Fatima's office")).text).not.toMatch(/the Fatima's office/);
    expect(whatsAppToATeamMember('Amara', theOffice(null)).text.split('\n')[0]).toBe('Hello, I’m Groundwork. I’m helping Amara bring together the work and updates from the office.');
  });

  it('never says dashboard, never asks anybody to sign up or register for anything', () => {
    for (const t of [whatsAppToThePrincipal('Fatima', 'a@b.c').text, emailToThePrincipal('Fatima').text, whatsAppToATeamMember('Fatima', 'the office').text, emailToATeamMember('Fatima', 'the office').text]) {
      expect(t).not.toMatch(/dashboard|log ?in|password/i);
      expect(t).not.toMatch(/you (?:need|have|must) to (?:sign up|register)/i);
    }
  });
});
