import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AddParticipantDto } from './dto/add-participant.dto';

/**
 * THE INVITATION ITSELF STILL CARRIES NO NUMBER. Decision 106 item 6 ("Leads cannot add numbers when
 * inviting") was replaced by Hafsah on 30 October 2026: "phone numbers are always shown and editable,
 * whether WhatsApp is on or off ... adding people, People and setup, and joining". The add form now asks
 * for a phone number, and it goes through the one writer for a lead's number, PATCH
 * /grounds/:id/participants/:participantId/whatsapp-number (the-lead-adds-a-whatsapp-number.ts), right
 * after the add, and inside the setup's save. So the add's own fields stay as they were, with no number,
 * and the API's pipe still refuses one sent with them: one way in for a number, not two.
 */
const PIPE = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('a lead inviting somebody', () => {
  it('cannot send a number with the invitation: the API refuses it in a sentence', async () => {
    const err: any = await PIPE.transform({ email: 'amani@kito.test', phone: '+254700000001' }, { type: 'body', metatype: AddParticipantDto }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(JSON.stringify(err.getResponse())).toContain('property phone should not exist');
  });

  it('the invitation has no field for a number of any name', () => {
    const fields = Object.keys(new AddParticipantDto());
    const src = withoutComments(readFileSync(join(__dirname, 'dto', 'add-participant.dto.ts'), 'utf8'));
    expect(src).not.toMatch(/\b(phone|phoneNumber|whatsapp|mobile)\w*\??\s*:/i);
    expect(fields.some((f) => /phone|whatsapp|mobile/i.test(f))).toBe(false);
  });

  /*
   * UPDATED (Hafsah's blocker, 31 October 2026: "nothing anyone says in setup is ever lost"). The setup's numbers went through a second
   * request the page made after a signed-in save, so a save finished from the email link, on another browser or through Google kept
   * nobody's number. The setup's save now carries each person's number beside them, and keeps it through the same one writer, never
   * through the invitation: still one way in for a number.
   */
  it('the people step of a check-in set up in conversation keeps a number only through the one writer, never the invitation', () => {
    const service = withoutComments(readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8'));
    const loop = service.slice(service.indexOf('const inviteResults:'), service.indexOf('Zero contributors'));
    const invite = loop.slice(loop.indexOf('this.grounds.addParticipant('), loop.indexOf('});', loop.indexOf('this.grounds.addParticipant(')));
    expect(invite).toContain('email: c.email');
    expect(invite).not.toMatch(/phone|whatsapp|mobile/i);
    expect(loop).toContain('await this.grounds.addTheirWhatsAppNumber({ groundId: ground.id, participantId, organizationId, userId: initiatorId, role: \'\', phone: c.phone })');
  });
});
