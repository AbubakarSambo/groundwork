import { GroundsByApiService } from './grounds-by-api.service';
import { BadRequestException } from '@nestjs/common';

/**
 * AN INTEGRATOR'S FIRST WRONG GUESS.
 *
 * Found by driving the real endpoint, not by reading it: `"scenario": "performance"` came back as a
 * 500 carrying a source path, a line number and the insert statement. The mistake is ordinary and
 * the answer to it is a list, so it is a 400 that prints the list.
 */
const svc = () => new GroundsByApiService(
  {} as any, {} as any, {} as any, {} as any, {} as any,
);

const dto = (over: Record<string, unknown> = {}) => ({
  actingPersonExternalId: 'p-1', label: 'Check-in', scenario: 'OKR_ALIGNMENT', moment: 'STARTING', ...over,
}) as any;

describe('a scenario we do not have', () => {
  it('is refused before anything touches the database', async () => {
    await expect(svc().open('org', dto({ scenario: 'performance' })))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('names the ones we do have, because that is the answer to the question', async () => {
    const err = await svc().open('org', dto({ scenario: 'performance' })).catch((e) => e);
    expect(err.message).toContain('OKR_ALIGNMENT');
    expect(err.message).toContain('NEW_HIRE');
  });

  it('says nothing about the inside of this codebase', async () => {
    const err = await svc().open('org', dto({ scenario: 'performance' })).catch((e) => e);
    /* The 500 leaked all three of these. */
    expect(err.message).not.toContain('prisma');
    expect(err.message).not.toContain('.ts');
    expect(err.message).not.toContain('/Users');
  });

  it('refuses a moment we do not have, which failed the same way one line later', async () => {
    const err = await svc().open('org', dto({ moment: 'underway' })).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toContain('STARTING');
  });

  it('takes a lowercase situation, since that is what half of them will send', async () => {
    /* Refusing case would be pedantry: there is exactly one thing "okr_alignment" can mean. */
    const err = await svc().open('org', dto({ scenario: 'okr_alignment' })).catch((e) => e);
    expect(err).not.toBeInstanceOf(BadRequestException);
  });
});
