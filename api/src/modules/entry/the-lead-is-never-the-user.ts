/**
 * THE LEAD IS NEVER "THE USER" (B-013). After "Her manager is me", the setup card read
 * `whoInvolved: "The user (her manager)"`, which a screen showing the card prints to the lead. The
 * extraction is about the person setting it up, so "the user" is "you", with the verb agreeing.
 * Applied to every string the extraction hands back, where it is read.
 */
const SWAPS: [RegExp, string][] = [
  [/\bthe user's\b/g, 'your'], [/\bThe user's\b/g, 'Your'],
  [/\bthe user is\b/g, 'you are'], [/\bThe user is\b/g, 'You are'],
  [/\bthe user was\b/g, 'you were'], [/\bThe user was\b/g, 'You were'],
  [/\bthe user has\b/g, 'you have'], [/\bThe user has\b/g, 'You have'],
  [/\bthe user\b/g, 'you'], [/\bThe user\b/g, 'You'],
];

export function withoutTheUserLabel<T>(value: T): T {
  if (typeof value === 'string') return SWAPS.reduce((s, [re, to]) => s.replace(re, to), value as string) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => withoutTheUserLabel(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) out[k] = withoutTheUserLabel(v);
    return out;
  }
  return value;
}
