import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

/** A new company's lead could not upload documents during setup (26 October 2026). A file is read for them, and nothing is stored. */
describe('a file read during setup', () => {
  const svc = Object.create(DocumentsService.prototype) as DocumentsService;
  const file = (name: string, mimetype: string, text: string) => ({ originalname: name, mimetype, buffer: Buffer.from(text), size: text.length } as any);
  it('gives back the text of what they added', async () => {
    await expect(svc.readForSetup(file('targets.csv', 'text/csv', 'Rep,Target\nKevin,30\nJoseph,30'))).resolves.toEqual({ name: 'targets.csv', text: 'Rep,Target\nKevin,30\nJoseph,30' });
  });
  it('says so plainly when nothing was chosen or nothing could be read', async () => {
    await expect(svc.readForSetup(undefined)).rejects.toThrow(new BadRequestException('Choose a file to add.'));
    await expect(svc.readForSetup(file('empty.txt', 'text/plain', '   '))).rejects.toThrow(new BadRequestException('Nothing could be read from that file. Paste the text instead.'));
  });
  it('is a route for the person signed in, and stores nothing', () => {
    const ctl = readFileSync(join(__dirname, 'documents.controller.ts'), 'utf8');
    const at = ctl.indexOf("@Controller('documents/read')");
    expect(at).toBeGreaterThan(-1);
    const block = ctl.slice(at - 120, at);
    expect(block).not.toContain('@Public()');
    const body = readFileSync(join(__dirname, 'documents.service.ts'), 'utf8');
    const fn = body.slice(body.indexOf('async readForSetup('), body.indexOf('private async readTheText('));
    expect(fn).not.toMatch(/prisma\.|create\(|upload\(/);
  });
});
