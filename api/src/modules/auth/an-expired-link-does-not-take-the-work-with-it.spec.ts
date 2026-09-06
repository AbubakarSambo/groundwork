import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * THE RECORD BEHIND A SIGN-UP LINK IS NOT A TOKEN.
 *
 * It is everything somebody did before they gave us an address: the situation they described in
 * their own words, the transcript, the draft ground built out of it. Clicking a day-old link
 * deleted the lot and said "please request a new one" — and the new one rebuilt from an empty
 * record, so the honest answer to "did I lose my work" was yes, silently, at the moment they were
 * trying to come back.
 *
 * The link expiring is a fact about the link.
 */
function service(pending: any) {
  const store = { row: pending };
  const sent: { to: string; token: string }[] = [];
  const prisma: any = {
    pendingSignup: {
      findUnique: jest.fn(async () => store.row),
      update: jest.fn(async ({ data }: any) => { store.row = { ...store.row, ...data }; return store.row; }),
      delete: jest.fn(async () => { store.row = null; return {}; }),
    },
    user: { findUnique: jest.fn(async () => null) },
  };
  const email: any = {
    sendMagicLinkEmail: jest.fn(async (to: string, _n: string, token: string) => { sent.push({ to, token }); }),
  };
  const svc = new AuthService(prisma, {} as any, { get: () => undefined } as any, email, {} as any, {} as any);
  return { svc, prisma, store, sent };
}

const expired = {
  id: 'p1',
  email: 'ada@acme.test',
  firstName: 'Ada',
  token: 'the-old-one',
  expiresAt: new Date(Date.now() - 60_000),
  payload: { situation: 'a renewal nobody has looked at' },
  history: [{ role: 'user', content: 'we are two weeks from signing' }],
};

describe('clicking a link that has expired', () => {
  it('keeps everything that was typed', async () => {
    const { svc, store } = service({ ...expired });
    await expect(svc.verifyEmail({ token: 'the-old-one' } as any)).rejects.toThrow(BadRequestException);

    expect(store.row).not.toBeNull();
    expect(store.row.payload).toEqual({ situation: 'a renewal nobody has looked at' });
    expect(store.row.history).toHaveLength(1);
  });

  it('sends a new link to the same address, which is not a way in for anybody else', async () => {
    const { svc, sent } = service({ ...expired });
    await expect(svc.verifyEmail({ token: 'the-old-one' } as any)).rejects.toThrow();

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('ada@acme.test');
    /* A new secret, not the one somebody just proved is old. */
    expect(sent[0].token).not.toBe('the-old-one');
  });

  it('replaces the token and the day, so the new link works and the old one does not', async () => {
    const { svc, store, sent } = service({ ...expired });
    await expect(svc.verifyEmail({ token: 'the-old-one' } as any)).rejects.toThrow();

    expect(store.row.token).toBe(sent[0].token);
    expect(store.row.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('and says so, rather than asking them to start again', async () => {
    const { svc } = service({ ...expired });
    await expect(svc.verifyEmail({ token: 'the-old-one' } as any)).rejects.toThrow(
      /sent a new one|Nothing you wrote has been lost/,
    );
  });

  it('never deletes the record on the way past', async () => {
    const { svc, prisma } = service({ ...expired });
    await expect(svc.verifyEmail({ token: 'the-old-one' } as any)).rejects.toThrow();
    expect(prisma.pendingSignup.delete).not.toHaveBeenCalled();
  });

  it('and if the mail cannot go out, the record still stands', async () => {
    /* Losing the work because the mail provider had a moment would be the same defect with a
       different cause. */
    const { svc, store } = service({ ...expired });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((svc as any).emailService.sendMagicLinkEmail as jest.Mock).mockRejectedValueOnce(new Error('resend is down'));
    await expect(svc.verifyEmail({ token: 'the-old-one' } as any)).rejects.toThrow();
    expect(store.row).not.toBeNull();
    expect(store.row.payload).toBeTruthy();
  });
});
