import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AddParticipantDto } from './dto/add-participant.dto';

/**
 * A LEAD CANNOT ADD A PHONE NUMBER WHEN INVITING (decision 106 item 6). Numbers come from the person
 * themselves (Settings) or from an admin (the roster). This does not change, and these tests pin it:
 * the invitation's own fields have no number, and the API's pipe refuses one sent anyway.
 */
const PIPE = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

describe('a lead inviting somebody', () => {
  it('cannot send a number with the invitation: the API refuses it in a sentence', async () => {
    const err: any = await PIPE.transform({ email: 'amani@kito.test', phone: '+254700000001' }, { type: 'body', metatype: AddParticipantDto }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(JSON.stringify(err.getResponse())).toContain('property phone should not exist');
  });

  it('the invitation has no field for a number of any name', () => {
    const fields = Object.keys(new AddParticipantDto());
    const src = readFileSync(join(__dirname, 'dto', 'add-participant.dto.ts'), 'utf8');
    expect(src).not.toMatch(/\b(phone|phoneNumber|whatsapp|mobile)\w*\??\s*:/i);
    expect(fields.some((f) => /phone|whatsapp|mobile/i.test(f))).toBe(false);
  });

  it('nor does the people step of a check-in set up in conversation', () => {
    const src = readFileSync(join(__dirname, '..', 'entry', 'entry.controller.ts'), 'utf8');
    const contributor = src.slice(src.indexOf('class ContributorDto'), src.indexOf('}', src.indexOf('class ContributorDto')));
    expect(contributor).toContain('email');
    expect(contributor).not.toMatch(/phone|whatsapp|mobile/i);
  });
});
