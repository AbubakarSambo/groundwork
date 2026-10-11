import { GroundsService } from './grounds.service';

/**
 * DECISION 96, ITEM 8: WHAT THE ANCHOR LEAD SAID IN HER OWN CONVERSATION IS HERS. Nothing is written from it for her team to read. (A person on her team
 * reads only what the product was told to say; see the-anchor-baseline.spec for what the person's own first conversation opens on.)
 */
function service() {
  const update = jest.fn(async () => ({}));
  const compose = jest.fn(async () => 'This check-in is about how project managers work when they finish their deliverables.');
  const fake: any = { logger: { log: jest.fn(), warn: jest.fn() }, prisma: { ground: { update, findUnique: jest.fn(async () => ({ startedFrom: null })) } }, composeWhatParticipantsAreTold: compose };
  const tell = (scenario?: string) => (GroundsService.prototype as any).tellParticipantsAboutThis.call(fake, 'g1', 'You are carrying the delivery team.', scenario);
  return { tell, update, compose };
}

describe('what the team is told, written from the lead\'s brief', () => {
  it('is written for every other situation, as before', async () => {
    const w = service();
    await w.tell('NEW_PROJECT');
    await w.tell(undefined);
    expect(w.compose).toHaveBeenCalledTimes(2);
    expect(w.update).toHaveBeenCalledTimes(2);
  });

  it('is not written for the anchor\'s situation, so her team reads nothing of her own words', async () => {
    const w = service();
    await w.tell('HELP_TEAM_UNDERSTAND');
    expect(w.compose).not.toHaveBeenCalled();
    expect(w.update).not.toHaveBeenCalled();
  });
});

describe('when the lead edits the brief later (decision 96, item 8)', () => {
  it('writes nothing for the team, because the check-in is marked as the anchor\'s, whatever the edit carries', async () => {
    const update = jest.fn(async () => ({}));
    const compose = jest.fn(async () => 'about project managers');
    const fake: any = { logger: { log: jest.fn(), warn: jest.fn() }, prisma: { ground: { update, findUnique: jest.fn(async () => ({ startedFrom: 'anchor' })) } }, composeWhatParticipantsAreTold: compose };
    await (GroundsService.prototype as any).tellParticipantsAboutThis.call(fake, 'g1', 'new brief');
    expect(compose).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
  it('still writes it for any other check-in', async () => {
    const update = jest.fn(async () => ({}));
    const fake: any = { logger: { log: jest.fn(), warn: jest.fn() }, prisma: { ground: { update, findUnique: jest.fn(async () => ({ startedFrom: null })) } }, composeWhatParticipantsAreTold: jest.fn(async () => 'told') };
    await (GroundsService.prototype as any).tellParticipantsAboutThis.call(fake, 'g1', 'brief');
    expect(update).toHaveBeenCalledTimes(1);
  });
});
