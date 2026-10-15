const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** Numbers up to ten in words, the rest in digits, the way every message reads them. */
export const aNumberInWords = (n: number): string => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
