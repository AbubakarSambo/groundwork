import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { withoutBankDetails } from '../documents/bank-details-are-never-kept';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> } };

/**
 * A RECEIPT OR A PROFORMA, ATTACHED WHEN SOMEBODY ASKS TO SPEND (polish round 1, 25 October 2026). Brian asked for the court filing
 * fee with a proforma, and the spending form had nowhere to put it. Now the form takes one file. Its name and which it is are kept,
 * and its words where it is a PDF or a text file, with bank details taken out as with every document here. No file is kept: the
 * approver and finance read what it says, and finance still records that it has had the receipt or the quote, as before.
 */
export const KINDS = { receipt: 'a receipt', quote: 'a proforma or quote' } as const;
export type AnAttachedKind = keyof typeof KINDS;
const MAX_BYTES = 10 * 1024 * 1024;

export async function theWordsOfAnAttachment(file: { buffer: Buffer; mimetype?: string; originalname?: string; size?: number } | undefined): Promise<string | null> {
  if (!file) throw new BadRequestException('No file came through, so choose a file and try again.');
  if ((file.size ?? file.buffer.length) > MAX_BYTES) throw new BadRequestException('That file is larger than 10 MB, so choose a smaller one.');
  const mime = file.mimetype ?? '';
  const name = String(file.originalname ?? '').toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    try {
      const parser = new PDFParse({ data: file.buffer });
      const text = await parser.getText().then((r: any) => r.text?.trim() ?? '').finally(() => parser.destroy());
      return withoutBankDetails(text).slice(0, 20_000) || null;
    } catch { throw new BadRequestException('That PDF could not be opened. Choose another copy, or a photo of it.'); }
  }
  if (mime.startsWith('text/') || /\.(txt|csv|md)$/.test(name)) return withoutBankDetails(file.buffer.toString('utf8')).slice(0, 20_000) || null;
  /* A photo of a receipt is kept by its name only: its words are read by the people who check it. */
  if (mime.startsWith('image/')) return null;
  throw new BadRequestException('Attach a PDF, a photo or a text file.');
}

/** The person who asked attaches one file to their own request while it is still waiting: from the form. */
export async function attachToASpendRequest(prisma: any, reader: { userId: string; organizationId: string }, id: string, kind: unknown, file: any) {
  return keepWhatWasAttached(prisma, reader, id, kind, String(file?.originalname ?? 'the file'), () => theWordsOfAnAttachment(file));
}

/**
 * THE ONE WRITE OF A FILE ON A SPENDING REQUEST, for the form and for a request made in a chat alike (staging check S13, 4 November
 * 2026): a receipt added in Ask stayed in the conversation, so the approver read nothing of it. Only the person who asked, only while it
 * waits. Its name, which it is, and its words are kept on the request, where the approver and finance read them.
 */
export async function keepWhatWasAttached(prisma: any, reader: { userId: string; organizationId: string }, id: string, kind: unknown, fileName: string, theWords: () => Promise<string | null>) {
  const r = await prisma.spendRequest.findUnique({ where: { id }, select: { id: true, organizationId: true, userId: true, status: true } });
  if (!r || r.organizationId !== reader.organizationId) throw new NotFoundException('That request could not be found.');
  if (r.userId !== reader.userId) throw new ForbiddenException('Only the person who asked can attach to this request.');
  if (r.status !== 'waiting') throw new BadRequestException('This request is already decided, so nothing more can be attached.');
  const k: AnAttachedKind = kind === 'receipt' ? 'receipt' : 'quote';
  const words = await theWords();
  const name = fileName.slice(0, 200);
  await prisma.spendRequest.update({ where: { id }, data: { attachedName: name, attachedKind: k, attachedText: words } });
  return { id, attached: { name, kind: k }, says: `${KINDS[k].charAt(0).toUpperCase()}${KINDS[k].slice(1)} is attached to your request.` };
}

/** How the approver and finance read it, in a full sentence. */
export function whatWasAttachedSaid(who: string, r: { attachedName?: string | null; attachedKind?: string | null }): string | null {
  if (!r.attachedName) return null;
  const k = r.attachedKind === 'receipt' ? KINDS.receipt : KINDS.quote;
  return `${who} attached ${k}, “${r.attachedName}”.`;
}
