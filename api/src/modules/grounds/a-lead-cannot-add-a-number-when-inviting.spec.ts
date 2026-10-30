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
 * after the add and the setup's save. So the add's own fields stay as they were, with no number, and
 * the API's pipe still refuses one sent with them: one way in for a number, not two. These assertions
 * are kept unchanged.
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

  it('nor does the people step of a check-in set up in conversation', () => {
    const src = withoutComments(readFileSync(join(__dirname, '..', 'entry', 'entry.controller.ts'), 'utf8'));
    const contributor = src.slice(src.indexOf('class ContributorDto'), src.indexOf('}', src.indexOf('class ContributorDto')));
    expect(contributor).toContain('email');
    expect(contributor).not.toMatch(/phone|whatsapp|mobile/i);
  });
});
