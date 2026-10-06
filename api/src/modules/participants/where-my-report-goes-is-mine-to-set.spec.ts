import { ParticipantsService } from './participants.service';

/**
 * WHERE MY REPORT GOES IS MINE TO SET.
 *
 * Hafsah, 22 September 2026, after answering a team update from an invite link: "no way to really
 * add my email if I am just an invited person". The row carries whatever address the lead typed,
 * the lead cannot change it once the link has been opened, and the person it goes to had nowhere to
 * say otherwise. `updateMyEmail` is that place: their own row, their own address.
 *
 * Three rules, each pinned: it is the caller's own row on that check-in and nobody else's; the
 * sign-in the link made moves with the address, a sign-in of their own does not; and an address
 * already on the check-in, or already somebody else's sign-in, is refused in plain words.
 */
function makeService(opts: { mine: any | null; takenHere?: boolean; otherUser?: any }) {
  const participantUpdate = jest.fn(async (a: any) => a);
  const userUpdate = jest.fn(async (a: any) => a);
  const prisma: any = {
    groundParticipant: {
      findFirst: jest.fn(async ({ where }: any) => (where.userId ? opts.mine : opts.takenHere ? { id: 'other' } : null)),
      update: participantUpdate,
    },
    user: { findUnique: jest.fn(async () => opts.otherUser ?? null), update: userUpdate },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
  const svc = new ParticipantsService(prisma, { sign: () => 'jwt' } as any, {} as any, {} as any);
  return { svc, prisma, participantUpdate, userUpdate };
}

const linkMade = { id: 'p1', groundId: 'g1', email: 'typed.by.lead@x.test', userId: 'u1', user: { id: 'u1', email: 'typed.by.lead@x.test' } };
const ownSignIn = { id: 'p1', groundId: 'g1', email: 'typed.by.lead@x.test', userId: 'u1', user: { id: 'u1', email: 'their.own@x.test' } };

describe('where my report goes is mine to set', () => {
  it('moves the row, and the sign-in the link made, to the new address', async () => {
    const { svc, participantUpdate, userUpdate } = makeService({ mine: linkMade });
    const r = await svc.updateMyEmail('u1', 'g1', ' Me@Real.test ');
    expect(r).toEqual({ email: 'me@real.test', changed: true, signInMoved: true });
    expect(participantUpdate).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { email: 'me@real.test' } });
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { email: 'me@real.test', isEmailVerified: false } });
  });

  it('leaves a sign-in of their own alone', async () => {
    const { svc, participantUpdate, userUpdate } = makeService({ mine: ownSignIn });
    const r = await svc.updateMyEmail('u1', 'g1', 'me@real.test');
    expect(r.signInMoved).toBe(false);
    expect(participantUpdate).toHaveBeenCalledTimes(1);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('is looked up by the caller and the check-in, never by a participant id from the request', async () => {
    const { svc, prisma } = makeService({ mine: linkMade });
    await svc.updateMyEmail('u1', 'g1', 'me@real.test');
    expect(prisma.groundParticipant.findFirst.mock.calls[0][0].where).toEqual({ groundId: 'g1', userId: 'u1' });
  });

  it('says so when the caller is not on the check-in', async () => {
    const { svc } = makeService({ mine: null });
    await expect(svc.updateMyEmail('u1', 'g1', 'me@real.test')).rejects.toThrow('You are not on this check-in.');
  });

  it('refuses an address already on this check-in, and one that is already somebody else’s sign-in', async () => {
    const taken = makeService({ mine: linkMade, takenHere: true });
    await expect(taken.svc.updateMyEmail('u1', 'g1', 'me@real.test')).rejects.toThrow('Somebody on this check-in already has that address.');
    const theirs = makeService({ mine: linkMade, otherUser: { id: 'u2' } });
    await expect(theirs.svc.updateMyEmail('u1', 'g1', 'me@real.test')).rejects.toThrow('That address already has a sign-in.');
    expect(theirs.participantUpdate).not.toHaveBeenCalled();
  });

  it('and does nothing when the address is the one already there', async () => {
    const { svc, participantUpdate } = makeService({ mine: linkMade });
    expect(await svc.updateMyEmail('u1', 'g1', 'Typed.By.Lead@x.test')).toEqual({ email: 'typed.by.lead@x.test', changed: false });
    expect(participantUpdate).not.toHaveBeenCalled();
  });
});
