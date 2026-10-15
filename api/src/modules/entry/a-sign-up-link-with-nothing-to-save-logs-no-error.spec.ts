import { BadRequestException } from '@nestjs/common';
import { EntryCommitController } from './entry.controller';

/**
 * THE JOURNEY OF 12 OCTOBER: a new admin opened the sign-up email link and their first page logged a
 * 400 on POST /entry/commit, because nothing was saved anywhere to commit. The link's page now asks
 * with `?ifThereIsOne=1`, and then nothing to save is a plain answer, not an error. Without it, the
 * entry chat's own save still hears NO_ENTRY_SESSION, as before.
 */
describe('POST /entry/commit with nothing saved anywhere', () => {
  const admin = { id: 'u-ada', organizationId: 'org-1' } as any;
  const nothingSaved = () => ({
    commit: jest.fn(async () => { throw new BadRequestException({ message: 'NO_ENTRY_SESSION', code: 'NO_ENTRY_SESSION' }); }),
  });

  it('answers "nothing" when asked only if there is one', async () => {
    const c = new EntryCommitController(nothingSaved() as any, {} as any);
    await expect(c.commit(admin, { groundLabel: '', history: [], contributors: [] } as any, '1')).resolves.toEqual({ nothing: true });
  });

  it('is still refused, as before, when the entry chat saves', async () => {
    const c = new EntryCommitController(nothingSaved() as any, {} as any);
    await expect(c.commit(admin, { groundLabel: '', history: [], contributors: [] } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('never hides any other refusal', async () => {
    const service = { commit: jest.fn(async () => { throw new BadRequestException({ message: 'COMMIT_IN_PROGRESS', code: 'COMMIT_IN_PROGRESS' }); }) };
    const c = new EntryCommitController(service as any, {} as any);
    await expect(c.commit(admin, { groundLabel: '', history: [], contributors: [] } as any, '1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('still saves a draft the server holds from another browser', async () => {
    const service = { commit: jest.fn(async () => ({ groundId: 'g1', joinToken: null, contributors: [], failedInvites: [] })) };
    const c = new EntryCommitController(service as any, {} as any);
    await expect(c.commit(admin, { groundLabel: '', history: [], contributors: [] } as any, '1')).resolves.toMatchObject({ groundId: 'g1' });
  });
});
