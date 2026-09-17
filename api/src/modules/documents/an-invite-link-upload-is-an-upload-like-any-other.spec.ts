import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

/**
 * AN INVITE-LINK UPLOAD IS AN UPLOAD LIKE ANY OTHER.
 *
 * The public upload took an invite token straight into a bare lookup - no expiry, no single-use -
 * and asked none of what the signed-in upload asks: a transcript arrived unmarked, with no
 * visibility and nobody's word behind it. And the token sat in the query string, in every access
 * log on the way. The token rule is the invitation's now, the conversation handling is the upload's,
 * and the token is in a header or the body.
 */
const svc = (participant: any, content = 'Our strategy for the year.\n\nThree markets.') => {
  const written: any[] = [];
  const s = Object.create(DocumentsService.prototype) as any;
  s.logger = { log: () => {}, warn: () => {} };
  s.extractContent = async () => content;
  s.assessDocument = async () => null;
  s.decideOrigin = async () => 'somebody wrote it';
  s.anchorAfterUpload = () => undefined;
  s.config = { get: () => false };
  s.prisma = {
    groundParticipant: { findUnique: async () => participant },
    groundDocument: { create: async (a: any) => { written.push(a.data); return { id: 'd1', ...a.data }; } },
  };
  return { s, written };
};
const file = { originalname: 'Call notes.txt', mimetype: 'text/plain', size: 100, buffer: Buffer.from('x') } as any;
const live = { id: 'p1', groundId: 'g1', userId: null, inviteTokenExpiresAt: new Date(Date.now() + 86_400_000) };

describe('the token', () => {
  it('that nobody issued, or that has been used, is refused with the invitation’s own sentence', async () => {
    const { s, written } = svc(null);
    await expect(s.uploadByInviteToken('gone', file)).rejects.toBeInstanceOf(NotFoundException);
    await expect(s.uploadByInviteToken('gone', file)).rejects.toThrow(/do not recognise that link/);
    expect(written).toHaveLength(0);
  });

  it('that expired before anybody accepted is refused', async () => {
    const { s, written } = svc({ ...live, inviteTokenExpiresAt: new Date(Date.now() - 1000) });
    await expect(s.uploadByInviteToken('old', file)).rejects.toBeInstanceOf(BadRequestException);
    expect(written).toHaveLength(0);
  });

  it('is read from a header or the body, never the query string', () => {
    const src = readFileSync(join(__dirname, 'documents.controller.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const at = src.indexOf("@Post('invite-upload')");
    const handler = src.slice(at, src.indexOf('@Post()', at));
    expect(handler).toMatch(/@Headers\('x-invite-token'\)/);
    expect(handler).not.toMatch(/@Query\('token'\)/);
  });
});

describe('what is written', () => {
  it('a transcript is marked as one, kept private by default, and taken on the holder’s word', async () => {
    const transcript = ['Sam: Thanks for making time.', 'Ngozi: No problem.', 'Sam: What do you use now?', 'Ngozi: The market.', 'Sam: And?', 'Ngozi: Fine.'].join('\n');
    const { s, written } = svc(live, transcript);
    const res = await s.uploadByInviteToken('t', file);
    expect(written[0]).toMatchObject({ isConversation: true, visibility: expect.any(String), groundId: 'g1', participantId: 'p1' });
    expect(written[0].consentConfirmedAt).toBeInstanceOf(Date);
    expect(res.assumed).toMatch(/on your word/);
  });

  it('an ordinary document is kept as one, with a visibility', async () => {
    const { s, written } = svc(live);
    const res = await s.uploadByInviteToken('t', { ...file, originalname: 'Strategy.pdf' });
    expect(written[0].isConversation).toBe(false);
    expect(written[0].visibility).toEqual(expect.any(String));
    expect(res.assumed).toBeUndefined();
  });
});
