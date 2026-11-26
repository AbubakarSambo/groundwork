import { aReceiptOrAnInvoice } from './a-receipt-is-not-a-conversation';
import { looksLikeAConversation } from './a-conversation-belongs-to-the-people-in-it';
import { originFromTheFile, whatThisDocumentIs, originLabel, COUNTS_AS_A_SOURCE } from './what-kind-of-thing-a-document-is';
import { theEndCard } from '../conversation/the-end-card';

/*
 * WEEK 15: A RECEIPT OR AN INVOICE IS NEVER CALLED "A CONVERSATION". The text below is what a photo
 * of each reads as. Before this, both were taken for a transcript (most lines open with a word and a
 * colon), stored with the origin "conversation", and listed as "IMG_2041.jpg is a conversation."
 */
const A_RECEIPT = [
  'SHOPRITE LEKKI',
  'Receipt No: 004512',
  'Date: 12/09/2026',
  'Cashier: Musa',
  'Item: Printer paper x4',
  'Subtotal: 18,000',
  'VAT: 1,350',
  'Total: 19,350',
  'Cash: 20,000',
  'Change: 650',
].join('\n');

const AN_INVOICE = [
  'GREEN MART SUPPLIES LTD',
  'Invoice No: INV-2291',
  'Date: 3 September 2026',
  'Bill To: Coamana',
  'Description: 40 crates of tomatoes',
  'Quantity: 40',
  'Unit Price: 12,500',
  'Total: 500,000',
  'Amount Due: 500,000',
  'Due Date: 30 September 2026',
].join('\n');

const A_TRANSCRIPT = [
  'Tobi: Did the invoice go to Green Mart?',
  'Ada: Yes, I sent it on Monday.',
  'Tobi: And the total was 500,000?',
  'Ada: Yes, and they said they would pay by the 30th.',
  'Tobi: Good. Can you send me the receipt when it comes?',
  'Ada: I will.',
].join('\n');

describe('a photo of a receipt or an invoice', () => {
  it('a receipt is a receipt, not a conversation', () => {
    expect(looksLikeAConversation('IMG_2041.jpg', A_RECEIPT)).toBe(false);
    expect(aReceiptOrAnInvoice('IMG_2041.jpg', A_RECEIPT)).toBe('receipt');
    const origin = originFromTheFile('image/jpeg', 'IMG_2041.jpg', { isConversation: false, receiptOrInvoice: aReceiptOrAnInvoice('IMG_2041.jpg', A_RECEIPT) });
    expect(origin).toBe('receipt');
    expect(whatThisDocumentIs('IMG_2041.jpg', origin)).toBe('IMG_2041.jpg is a receipt.');
  });

  it('an invoice is an invoice, not a conversation', () => {
    expect(looksLikeAConversation('IMG_2042.jpg', AN_INVOICE)).toBe(false);
    const origin = originFromTheFile('image/jpeg', 'IMG_2042.jpg', { isConversation: false, receiptOrInvoice: aReceiptOrAnInvoice('IMG_2042.jpg', AN_INVOICE) });
    expect(origin).toBe('invoice');
    expect(whatThisDocumentIs('IMG_2042.jpg', origin)).toBe('IMG_2042.jpg is an invoice.');
  });

  it('the file name says so too, even with "teams" in it', () => {
    expect(aReceiptOrAnInvoice('teams lunch receipt.jpg', '')).toBe('receipt');
    expect(looksLikeAConversation('teams lunch receipt.jpg', '')).toBe(false);
    expect(aReceiptOrAnInvoice('Green Mart invoice.pdf', '')).toBe('invoice');
  });

  it('a receipt and an invoice count as proof, and the person is told which it was', () => {
    expect(COUNTS_AS_A_SOURCE.has('receipt')).toBe(true);
    expect(COUNTS_AS_A_SOURCE.has('invoice')).toBe(true);
    const card = theEndCard([
      { type: 'OUTCOME', text: 'I bought the printer paper', recallBased: false, anchoredDocumentId: 'r', anchoredOrigin: 'receipt' },
      { type: 'OUTCOME', text: 'Green Mart was invoiced for 500,000', recallBased: false, anchoredDocumentId: 'i', anchoredOrigin: 'invoice' },
    ])!;
    expect(card.inYourRecord).toEqual([
      { says: 'I bought the printer paper.', how: 'From the receipt you added.', mark: 'proven' },
      { says: 'Green Mart was invoiced for 500,000.', how: 'From the invoice you added.', mark: 'proven' },
    ]);
  });
});

describe('a real conversation is still a conversation', () => {
  it('a transcript that mentions an invoice and a receipt is still one', () => {
    expect(aReceiptOrAnInvoice('call with Ada.txt', A_TRANSCRIPT)).toBeNull();
    expect(looksLikeAConversation('call with Ada.txt', A_TRANSCRIPT)).toBe(true);
    expect(originFromTheFile('text/plain', 'call with Ada.txt', { isConversation: true, receiptOrInvoice: null })).toBe('conversation');
    expect(originLabel('conversation')).toBe('a conversation');
  });

  it('a file named as a transcript stays one even if it says invoice', () => {
    expect(looksLikeAConversation('invoice dispute call transcript.txt', A_TRANSCRIPT)).toBe(true);
  });
  it('a weekly report whose lines open with the week is a report, not a conversation, and a transcript still is one', () => {
    const report = ['National Assembly monitoring report, March 2026', '', 'Week of 2 March: Hearing date for HB 412 fixed for 18 March.', 'Week of 9 March: Position paper drafted.', 'Week of 16 March: Public hearing on HB 412 held on 18 March.', 'Week of 23 March: Committee report not yet laid.', 'Week of 30 March: No further movement.', 'Pending at month end: HB 412 committee report.'].join('\n');
    expect(looksLikeAConversation('NASS-update-2026-03-March.docx', report)).toBe(false);
    expect(looksLikeAConversation('notes.txt', A_TRANSCRIPT)).toBe(true);
  });
});
