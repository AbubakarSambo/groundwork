/**
 * A PROMISE IN SOMEBODY'S OWN VOICE, AS A TASK ON A LIST (Fatima round 3). The record keeps what people said they would do in their own words ("I will go next week").
 * Said back to a third person, in a register line, Today, or a year-end report, that reads as the assistant speaking for somebody it cannot speak for. The one place
 * that takes the promise off its "I will" is here; the nudges, the register and the report all read it from here.
 */
const PROMISE_OPENING = /^\s*(?:(?:i|we)\s+will|(?:i|we)'ll|(?:i|we)\s+(?:am|are)\s+going\s+to|(?:i|we)'m\s+going\s+to|(?:i|we)\s+shall)\s+/i;

export const theThingOf = (text: string): string => String(text ?? '').replace(PROMISE_OPENING, '').replace(/[.!\s]+$/, '').slice(0, 140);
/** Whether the words are a promise in the person's own voice ("I will send the letter"), which "you told me you would ..." can say back. */
export const isAPromiseInTheirVoice = (text: string): boolean => PROMISE_OPENING.test(String(text ?? ''));
/** "I will go next week" is "Go next week", and "I am also waiting on Ngozi" is "Waiting on Ngozi"; anything else is left as it was. */
const WAITING = /^\s*(?:i|we)\s+(?:am|are)(?:\s+also)?\s+waiting\s+on\s+/i;
export const asATask = (item: string): string => (isAPromiseInTheirVoice(item) ? theThingOf(item) : WAITING.test(item) ? `Waiting on ${item.replace(WAITING, '')}` : item);
