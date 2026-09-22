import { TheOpenLinkService, AN_UNCLAIMED_ADDRESS } from './the-open-link.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ANSWER FIRST, SAY WHO YOU ARE AT THE END.
 *
 * "The update can also be a QR code we share where people can provide the update and add their
 * email in the end to get the final report themselves." The link already existed and asked for a
 * name, an address and a role before anybody could say a word.
 */
function serviceWith(over: any = {}) {
  const state: any = { participant: null, checkIn: null, updated: null };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => over.ground ?? { id: 'g1', label: 'Sales this quarter', brief: 'How is sales going?', scenario: 'TEAM_UPDATES', status: 'ACTIVE', initiator: { firstName: 'Hafsah' } }) },
    groundParticipant: {
      create: jest.fn(async ({ data }: any) => { state.participant = { id: 'p-open', ...data }; return { id: 'p-open' }; }),
      findFirst: jest.fn(async ({ where }: any) => {
        if (where.inviteToken) {
          return over.noRow ? null : { id: 'p-open', email: `open-abc${AN_UNCLAIMED_ADDRESS}`, groundId: 'g1', checkIns: [{ id: 'ci1', status: 'IN_PROGRESS' }] };
        }
        return over.clash ?? null;
      }),
      update: jest.fn(async ({ data }: any) => { state.updated = data; return data; }),
      delete: jest.fn(async ({ where }: any) => { state.deleted = where.id; return {}; }),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    /* The merge moves what they said onto the row that was already invited. See one-person-one-row. */
    checkIn: {
      create: jest.fn(async () => ({ id: 'ci1' })),
      findFirst: jest.fn(async () => ({ id: 'ci1' })),
      updateMany: jest.fn(async ({ data }: any) => { state.movedCheckIns = data; return { count: 1 }; }),
    },
    recordEntry: { updateMany: jest.fn(async ({ data }: any) => { state.movedEntries = data; return { count: 3 }; }) },
    groundDocument: { updateMany: jest.fn(async () => ({ count: 0 })) },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
  const conversation: any = {
    open: jest.fn(async () => ({ reply: 'How is sales going for you this quarter?' })),
    sendMessage: jest.fn(async () => ({ reply: 'What is blocking it?' })),
    complete: jest.fn(async () => ({ status: 'completed' })),
  };
  return { svc: new TheOpenLinkService(prisma, conversation), prisma, conversation, state };
}

describe('the open link', () => {
  it('shows the lead question before anybody commits to anything', async () => {
    const { svc } = serviceWith();
    expect(await svc.whatThisIs('tok')).toMatchObject({ theQuestion: 'How is sales going?', askedBy: 'Hafsah' });
  });

  it('refuses a link into a check-in that has finished', async () => {
    const { svc } = serviceWith({ ground: { id: 'g1', status: 'CLOSED', label: 'x', brief: null, scenario: 'TEAM_UPDATES', initiator: null } });
    await expect(svc.whatThisIs('tok')).rejects.toBeInstanceOf(BadRequestException);
  });

  /* The row exists before the person does, so the address on it must be one nothing can write to. */
  it('starts a real session against a row with no address on it', async () => {
    const { svc, state, conversation } = serviceWith();
    const started = await svc.start('tok');
    expect(state.participant.email.endsWith(AN_UNCLAIMED_ADDRESS)).toBe(true);
    expect(state.participant.inviteToken).toBe(started.key);
    expect(conversation.open).toHaveBeenCalledWith('ci1', { theParticipant: 'p-open' });
    expect(started.reply).toContain('How is sales going');
  });

  it('answers through the same engine as everybody else, as that participant', async () => {
    const { svc, conversation } = serviceWith();
    await svc.say('key', 'Two closed, pipeline is thin.');
    expect(conversation.sendMessage).toHaveBeenCalledWith('ci1', { theParticipant: 'p-open' }, 'Two closed, pipeline is thin.');
  });

  it('takes the address at the end and says the report is coming', async () => {
    const { svc, state } = serviceWith();
    const done = await svc.finish('key', '  Sam@Work.COM ');
    expect(state.updated.email).toBe('sam@work.com');
    expect(done.willGetTheReport).toBe(true);
  });

  /* Somebody who answers and gives nothing still leaves their account on the record. */
  it('and finishes without one, because an answer is still an answer', async () => {
    const { svc, state } = serviceWith();
    const done = await svc.finish('key');
    expect(state.updated).toBeNull();
    expect(done.willGetTheReport).toBe(false);
  });

  /*
   * IT USED TO REFUSE. Read on a live board: "Ehi Okosun - nobody has said anything about this yet"
   * beside an unnamed card holding everything he had said. Invited by mail, answered on the shared
   * link, two rows, and every count read them as two people.
   */
  it('moves an answer onto the row already invited at that address, rather than splitting their account', async () => {
    const { svc, state, conversation } = serviceWith({ clash: { id: 'p-other' } });
    const done = await svc.finish('key', 'sam@work.com', 'Sam Bello', true);
    expect(state.movedCheckIns).toEqual({ participantId: 'p-other' });
    expect(state.movedEntries).toEqual({ participantId: 'p-other' });
    expect(state.deleted).toBe('p-open');
    expect(conversation.complete).toHaveBeenCalledWith('ci1', { theParticipant: 'p-other' }, { theyAskedToFinish: true });
    expect(done).toMatchObject({ willGetTheReport: true, at: 'sam@work.com' });
  });

  it('and a key that belongs to nothing opens nothing', async () => {
    const { svc } = serviceWith({ noRow: true });
    await expect(svc.say('nope', 'hello')).rejects.toBeInstanceOf(NotFoundException);
  });

  /* The placeholder is only safe because the mailer refuses it by name, before any other rule. */
  it('is an address the mailer will not write to', () => {
    /* Comments stripped: a rule that only a comment satisfies is not a rule. */
    const mailer = fs.readFileSync(path.join(__dirname, '..', 'email', 'email.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(mailer).toContain('unclaimed');
    expect(mailer).toContain('that check-in has no address on it yet');
  });
});
