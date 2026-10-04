import { TheAnchorDoor, THE_SWITCH_IS_KEPT_FOR_MS } from './the-anchor-door';
import { EntryController } from './entry.controller';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

const prismaWith = (on: boolean) => {
  const findUnique = jest.fn(async () => (on ? { value: { on: true } } : null));
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

  it('is reachable by a visitor who is not signed in', () => {
    for (const name of ['anchorAvailable'] as const) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, EntryController.prototype[name])).toBe(true);
    }
  });
});
