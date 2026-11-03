/**
 * A SLOW READING OF WHAT THE LEAD SAID MUST NOT HOLD THE SAVE (known issue B4, 6 October 2026; screens request 174 item 2; Hafsah's
 * speed brief, 3 November 2026).
 *
 * Saving a check-in reads the setup conversation for its aims and targets with a model, after the people are on it. The save used to
 * wait for the whole reading, which kept the page on "Saving..." for 20 to 50 seconds. B4 capped that wait at twenty seconds; the
 * reading usually took about twenty, so every save still waited about twenty seconds. The save now answers as soon as the check-in,
 * its people and their invitations are made, and the reading runs after it, the same call on the same words, writing the same rows.
 * The board is warmed again when it lands (GroundworkEvents.AIMS_READ), so what it shows is built with the targets.
 *
 * A reading that fails is not lost: it was logged and dropped before. It is tried again after half a minute, two minutes and ten
 * minutes, which outlasts the model being busy or away for a while. The words it reads are kept on the check-in either way.
 */
export const THE_READING_IS_TRIED_AGAIN_AFTER_MS = [30_000, 120_000, 600_000];

/** Runs the reading until it lands or the tries run out. Never throws. Resolves true when it landed. */
export async function readUntilItLands(
  read: () => Promise<unknown>,
  onFailure: (err: any, tried: number, willTryAgain: boolean) => void,
  waits: readonly number[] = THE_READING_IS_TRIED_AGAIN_AFTER_MS,
): Promise<boolean> {
  for (let tried = 1; ; tried++) {
    try {
      await read();
      return true;
    } catch (err: any) {
      const willTryAgain = tried <= waits.length;
      onFailure(err, tried, willTryAgain);
      if (!willTryAgain) return false;
      await new Promise((r) => { const t = setTimeout(r, waits[tried - 1]); (t as any).unref?.(); });
    }
  }
}
