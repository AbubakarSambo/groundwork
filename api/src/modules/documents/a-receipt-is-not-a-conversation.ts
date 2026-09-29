/**
 * A RECEIPT OR AN INVOICE IS NEVER CALLED "A CONVERSATION" (week 15 of docs/weekly-plan.md).
 *
 * A photo of a receipt is read into text, and a receipt's text is many short lines that open with a
 * word and a colon: "Date: 12/09", "Cashier: Musa", "Subtotal: 4,500", "VAT: 337", "Total: 4,837".
 * That is the shape looksLikeAConversation takes for a transcript ("Tobi: I sent it"), so a receipt
 * was stored as a conversation, told "This looks like a record of a conversation", and listed as "a
 * conversation". The labels of a receipt or an invoice are its fields, not people speaking.
 *
 * This says, from the file name first and then the text, whether a file is a receipt or an invoice.
 * It never makes a real transcript into one: a line with a person's name before the colon is still a
 * speaker, and a transcript that mentions an invoice is still a transcript unless its lines are
 * mostly fields.
 */
export type ReceiptOrInvoice = 'receipt' | 'invoice';

/** The words a receipt or an invoice puts before a colon, or at the start of a line. */
export const A_FIELD_OF_A_RECEIPT = /^\s*(grand total|sub ?-?total|total( due| paid| amount)?|vat|tax|date|time|invoice( no\.?| number| #| date)?|receipt( no\.?| number| #)?|bill(ed)? to|ship to|amount( due| paid)?|balance( due)?|due date|payment( method| terms| due)?|terms|qty|quantity|price|unit price|rate|item(s)?|description|cashier|served by|till( no\.?)?|table|change|cash|card|discount|ref(erence)?( no\.?)?|account( name| number| no\.?)?|bank|tin|phone|tel|email|address|customer|store|branch|order( no\.?| number| #)?|transaction( id| no\.?)?)\s*[:#.]/i;

function nameSays(fileName: string): ReceiptOrInvoice | null {
  const name = (fileName ?? '').toLowerCase();
  if (/invoice|\binv[-_ ]?\d/.test(name)) return 'invoice';
  if (/receipt/.test(name)) return 'receipt';
  return null;
}

/** How many of the opening lines are fields of a receipt or an invoice. */
function fieldLines(content: string): { fields: number; lines: number } {
  const opening = (content ?? '').slice(0, 2_000).split('\n').filter((l) => l.trim());
  return { fields: opening.filter((l) => A_FIELD_OF_A_RECEIPT.test(l)).length, lines: opening.length };
}

export function aReceiptOrAnInvoice(fileName: string, content: string): ReceiptOrInvoice | null {
  const byName = nameSays(fileName);
  if (byName) return byName;
  const { fields } = fieldLines(content);
  if (fields < 3) return null;
  const text = (content ?? '').slice(0, 4_000);
  if (/\binvoice\b/i.test(text)) return 'invoice';
  if (/\breceipt\b/i.test(text)) return 'receipt';
  return null;
}
