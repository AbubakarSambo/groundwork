import { THE_PEOPLE_STEP_RULES } from './the-anchor-people-step';
import { NotFoundException } from '@nestjs/common';
import { TheAnchorDoor, THE_SWITCH_IS_KEPT_FOR_MS, aSourceMark } from './the-anchor-door';
import { EntryController } from './entry.controller';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

const prismaWith = (on: boolean) => {
  const findUnique = jest.fn(async () => (on ? { value: { on: true } } : { value: { on: false } }));
  return { prisma: { platformSetting: { findUnique } } as any, findUnique };
};

describe('the anchor scenario front door', () => {
  it('says only whether it is available, and nothing else', async () => {
    expect(await new TheAnchorDoor(prismaWith(true).prisma).available()).toEqual({ available: true });
    expect(await new TheAnchorDoor(prismaWith(false).prisma).available()).toEqual({ available: false });
  });

  it('is off when the setting cannot be read', async () => {
    const prisma: any = { platformSetting: { findUnique: jest.fn(async () => { throw new Error('down'); }) } };
    expect(await new TheAnchorDoor(prisma).available()).toEqual({ available: false });
  });

  it('reads the setting once a moment, not once a visitor', async () => {
    const { prisma, findUnique } = prismaWith(true);
    let t = 1000;
    const door = new TheAnchorDoor(prisma, () => t);
    await door.available(); await door.available(); await door.available();
    expect(findUnique).toHaveBeenCalledTimes(1);
    t += THE_SWITCH_IS_KEPT_FOR_MS + 1;
    await door.available();
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it('starts an anchor draft with its marks when the switch is on', async () => {
    const out = await new TheAnchorDoor(prismaWith(true).prisma).start('Founders-WhatsApp');
    expect(out).toEqual({ available: true, scenario: 'HELP_TEAM_UNDERSTAND', startedFrom: 'anchor', groundLabel: 'Help my team understand', firstQuestion: "What's happening right now that makes you wish your team saw more of what you see?", source: 'founders-whatsapp', thePeopleStep: THE_PEOPLE_STEP_RULES });
  });

  it('answers as unavailable and starts nothing when the switch is off', async () => {
    await expect(new TheAnchorDoor(prismaWith(false).prisma).start('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('keeps a source mark short and plain, and drops the rest', () => {
    expect(aSourceMark('linkedin_post-3')).toBe('linkedin_post-3');
    expect(aSourceMark('<script>alert(1)</script>')).toBeNull();
    expect(aSourceMark('a'.repeat(41))).toBeNull();
    expect(aSourceMark(undefined)).toBeNull();
  });

  it('is reachable by a visitor who is not signed in', () => {
    for (const name of ['anchorAvailable', 'anchorStart'] as const) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, EntryController.prototype[name])).toBe(true);
    }
  });
});
