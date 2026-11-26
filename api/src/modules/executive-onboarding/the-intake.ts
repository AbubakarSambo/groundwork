/**
 * THE DATA DUMP (Ebele, increment 5; plan sections 5, 7 and 8): "just forward it", with no instruction.
 *
 * Anything her assistant is sent by her, or by the person she lets act for her, is kept as her material: the original bytes, exactly as they came,
 * and the words read from them. Nothing is dropped without being said:
 *   - a file sent twice (same bytes) is counted as a duplicate, with the first copy named, and its bytes are not stored twice;
 *   - a file that cannot be read is kept and said, with the reason;
 *   - a zip is opened and each file inside is kept on its own, within explicit limits, and what is over a limit is said;
 *   - an archive of any other kind is kept and said plainly;
 *   - attachments over the number one message may carry are counted and said, never quietly cut.
 * A voice note is heard, kept as the words it says (the original audio is kept too), and any phrase the transcriber was unsure of is asked about.
 *
 * FORWARDED CONTENT IS UNTRUSTED. Nothing in here runs a model on what was sent, and nothing in it is ever read as an instruction: the words are stored
 * as somebody's account, and are quoted back only as the subject of a message she sent. The only thing the arrival does outside the record is that
 * the batch is answered once (the-first-picture.ts), to whoever sent it, and to nobody the message names.
 */
import * as crypto from 'crypto';
const JSZip = require('jszip') as typeof import('jszip');
import { isAudio, theNamesThisOrganisationUses, type Transcriber } from '../voice/the-transcriber';

export interface AnArrival {
  organizationId: string;
  principalUserId: string;
  /** Who sent it: the principal, or the person she lets act for her. */
  fromUserId: string;
  fromAddress: string;
  channel: 'email' | 'whatsapp';
  providerId: string | null;
  subject: string | null;
  body: string | null;
  receivedAt: Date;
  files: { fileName: string; mimeType: string; bytes: Buffer | null }[];
  /** Attachments the message carried beyond what could be taken. Said, never quietly cut. */
  beyondTheLimit: number;
  now: Date;
}

export interface TheIntakePorts {
  transcriber: Transcriber;
  /** The words of a file, read the way an upload reads it. */
  read(file: { fileName: string; mimeType: string; bytes: Buffer }): Promise<{ text: string } | { unreadable: string }>;
}

/** The limits on a zip, said in the reply when one is passed. */
export const ZIP_LIMITS = { files: 25, eachBytes: 10 * 1024 * 1024, totalBytes: 40 * 1024 * 1024 };
/** Forwards that arrive within this long of each other are one batch, and are answered once. */
export const QUIET_FOR_MS = 3 * 60 * 1000;

const EXTENSION_TYPES: Record<string, string> = {
  pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv', txt: 'text/plain', md: 'text/plain', eml: 'text/plain', zip: 'application/zip',
};
const typeOf = (fileName: string, given: string): string => {
  const ext = (fileName.split('.').pop() ?? '').toLowerCase();
  const vague = !given || /^application\/(?:octet-stream|x-unknown)/i.test(given);
  return vague && EXTENSION_TYPES[ext] ? EXTENSION_TYPES[ext] : given || 'application/octet-stream';
};
const isAZip = (fileName: string, mime: string) => /zip/i.test(mime) && !/officedocument/i.test(mime) || /\.zip$/i.test(fileName);
const isAnotherArchive = (fileName: string) => /\.(?:rar|7z|tar|tgz|gz|bz2|xz|cab|iso)$/i.test(fileName);

/** A message of fewer words than this is a courtesy, not material: it is never counted as a duplicate and a batch of nothing else is answered briefly (the-first-picture.ts). */
export const A_COURTESY_IS_FEWER_THAN = 25;
export const theWordsIn = (t: string | null | undefined): number => String(t ?? '').split(/\s+/).filter(Boolean).length;
export const hashOf = (b: Buffer) => crypto.createHash('sha256').update(b).digest('hex');
const plainReason = (s: string) => { const t = s.trim().replace(/[.!]+$/, ''); return t ? t[0].toLowerCase() + t.slice(1) : 'it would not open'; };
const safeName = (n: string) => n.replace(/[\\/\0]/g, '_').replace(/^\.+/, '').slice(0, 200) || 'file';

/** The batch this arrival joins: the principal's open one if it is still within the quiet time, else a new one. */
async function theBatchFor(prisma: any, a: AnArrival): Promise<string> {
  const open: any[] = (await prisma.intakeBatch.findMany({ where: { principalUserId: a.principalUserId, acknowledgedAt: null, fromUserId: a.fromUserId } })) ?? [];
  const joinable = open.filter((b) => a.now.getTime() - new Date(b.lastItemAt).getTime() < QUIET_FOR_MS).sort((x, y) => new Date(y.lastItemAt).getTime() - new Date(x.lastItemAt).getTime())[0];
  if (joinable) {
    await prisma.intakeBatch.update({ where: { id: joinable.id }, data: { lastItemAt: a.now } });
    return joinable.id;
  }
  const made = await prisma.intakeBatch.create({ data: { organizationId: a.organizationId, principalUserId: a.principalUserId, fromUserId: a.fromUserId, fromAddress: a.fromAddress, channel: a.channel, lastItemAt: a.now } });
  return made.id;
}

interface AKeep {
  kind: 'message' | 'file' | 'voice' | 'archive';
  fileName: string;
  mimeType: string;
  bytes: Buffer | null;
  text?: string | null;
  state: 'kept' | 'duplicate' | 'unreadable' | 'not_opened';
  because?: string | null;
  insideArchive?: string | null;
  unsure?: string[];
}

/** One row of material, the bytes stored once: a second row for the same bytes points at the first and carries no bytes. */
async function keepOne(prisma: any, a: AnArrival, batchId: string, k: AKeep): Promise<void> {
  const hash = k.bytes ? hashOf(k.bytes) : null;
  const first: any = hash ? await prisma.principalMaterial.findFirst({ where: { principalUserId: a.principalUserId, hash, duplicateOfId: null } }) : null;
  /* A few words are never "sent twice": two short replies that read alike ("Thank you.") are two messages, not something sent more than once (round 1, I-04). A mail with real content or attachments, forwarded again, still is. */
  const duplicate = !!first && k.state !== 'not_opened' && !(k.kind === 'message' && theWordsIn(k.text) < A_COURTESY_IS_FEWER_THAN && !a.files.length);
  await prisma.principalMaterial.create({
    data: {
      organizationId: a.organizationId, principalUserId: a.principalUserId, batchId, fromUserId: a.fromUserId, fromAddress: a.fromAddress, channel: a.channel,
      kind: k.kind, fileName: k.fileName, mimeType: k.mimeType, hash, bytes: duplicate ? null : k.bytes, size: k.bytes?.length ?? null,
      text: duplicate ? null : k.text ?? null, subject: a.subject, state: duplicate ? 'duplicate' : k.state, because: k.because ?? null,
      duplicateOfId: duplicate ? first.id : null, insideArchive: k.insideArchive ?? null, unsure: k.unsure?.length ? (k.unsure as any) : null, receivedAt: a.receivedAt,
    },
  });
}

/** Opens a zip within the limits. Every entry is either returned, or named in `left`, with why. */
async function openTheZip(bytes: Buffer): Promise<{ files: { fileName: string; bytes: Buffer }[]; left: { fileName: string; because: string }[] } | { cannot: string }> {
  let zip: InstanceType<typeof JSZip>;
  try { zip = await JSZip.loadAsync(bytes); } catch { return { cannot: 'it is not a zip file I can open' }; }
  const files: { fileName: string; bytes: Buffer }[] = [];
  const left: { fileName: string; because: string }[] = [];
  let total = 0;
  for (const entry of Object.values(zip.files)) {
    const name = entry.name;
    if (entry.dir || /(^|\/)(?:__MACOSX|\.DS_Store)/.test(name) || /(^|\/)\.[^/]+$/.test(name)) continue;
    const declared = Number((entry as any)._data?.uncompressedSize ?? 0);
    if (files.length >= ZIP_LIMITS.files) { left.push({ fileName: name, because: `a zip is opened up to ${ZIP_LIMITS.files} files` }); continue; }
    if (declared > ZIP_LIMITS.eachBytes) { left.push({ fileName: name, because: 'it is larger than 10 MB' }); continue; }
    if (total + declared > ZIP_LIMITS.totalBytes) { left.push({ fileName: name, because: 'the zip is larger than 40 MB when opened' }); continue; }
    try {
      const b = await entry.async('nodebuffer');
      if (b.length > ZIP_LIMITS.eachBytes || total + b.length > ZIP_LIMITS.totalBytes) { left.push({ fileName: name, because: 'it is too large to open here' }); continue; }
      total += b.length;
      files.push({ fileName: safeName(name.split('/').pop() ?? name), bytes: b });
    } catch {
      left.push({ fileName: name, because: 'it would not open' });
    }
  }
  return { files, left };
}

/** Keeps one file, and anything found inside it. Never throws. */
async function keepAFile(prisma: any, ports: TheIntakePorts, a: AnArrival, batchId: string, f: { fileName: string; mimeType: string; bytes: Buffer | null }, insideArchive: string | null, depth = 0): Promise<void> {
  const fileName = safeName(f.fileName);
  const mimeType = typeOf(fileName, f.mimeType);
  if (!f.bytes) return keepOne(prisma, a, batchId, { kind: 'file', fileName, mimeType, bytes: null, state: 'unreadable', because: 'it did not come through to me', insideArchive });

  if (isAudio(mimeType, fileName)) {
    const heard = await ports.transcriber.transcribe({ buffer: f.bytes, mimeType, fileName, names: await theNamesThisOrganisationUses(prisma, a.organizationId) }).catch(() => ({ ok: false as const }));
    if (!heard.ok) return keepOne(prisma, a, batchId, { kind: 'voice', fileName, mimeType, bytes: f.bytes, state: 'unreadable', because: 'I could not make out what was said', insideArchive });
    return keepOne(prisma, a, batchId, { kind: 'voice', fileName, mimeType, bytes: f.bytes, text: heard.text, state: 'kept', insideArchive, unsure: heard.unclear.map((u) => u.heard) });
  }

  if (isAZip(fileName, mimeType)) {
    if (depth >= 1) return keepOne(prisma, a, batchId, { kind: 'archive', fileName, mimeType, bytes: f.bytes, state: 'not_opened', because: 'it is a zip inside a zip, and I open one level only', insideArchive });
    const opened = await openTheZip(f.bytes);
    if ('cannot' in opened) return keepOne(prisma, a, batchId, { kind: 'archive', fileName, mimeType, bytes: f.bytes, state: 'not_opened', because: opened.cannot, insideArchive });
    await keepOne(prisma, a, batchId, { kind: 'archive', fileName, mimeType, bytes: f.bytes, state: 'kept', text: `${opened.files.length} files inside`, insideArchive });
    for (const inner of opened.files) await keepAFile(prisma, ports, a, batchId, { fileName: inner.fileName, mimeType: '', bytes: inner.bytes }, fileName, depth + 1);
    for (const l of opened.left) await keepOne(prisma, a, batchId, { kind: 'file', fileName: safeName(l.fileName), mimeType: 'application/octet-stream', bytes: null, state: 'not_opened', because: l.because, insideArchive: fileName });
    return;
  }
  if (isAnotherArchive(fileName)) return keepOne(prisma, a, batchId, { kind: 'archive', fileName, mimeType, bytes: f.bytes, state: 'not_opened', because: 'I can only open zip files', insideArchive });

  const read = await ports.read({ fileName, mimeType, bytes: f.bytes }).catch(() => ({ unreadable: 'it would not open' }));
  if ('unreadable' in read) return keepOne(prisma, a, batchId, { kind: 'file', fileName, mimeType, bytes: f.bytes, state: 'unreadable', because: plainReason(read.unreadable), insideArchive });
  return keepOne(prisma, a, batchId, { kind: 'file', fileName, mimeType, bytes: f.bytes, text: read.text, state: 'kept', insideArchive });
}

export interface TheIntakeResult {
  batchId: string;
  /** True when this exact message (the same provider id or the same words and files from the same sender) was kept already. */
  alreadySeen: boolean;
}

/**
 * Keeps one arrival, whole. The message's own words are kept as a row of their own (so a forward with no attachment is not lost), each file is
 * kept, and nothing is answered here: the batch is answered once, when it has gone quiet.
 */
export async function keepWhatWasForwarded(prisma: any, ports: TheIntakePorts, a: AnArrival): Promise<TheIntakeResult> {
  /* A redelivery is not a second copy. */
  if (a.providerId) {
    const seen = await prisma.principalMaterial.findFirst({ where: { principalUserId: a.principalUserId, kind: 'message', fileName: `message:${a.providerId}` } });
    if (seen) return { batchId: seen.batchId, alreadySeen: true };
  }
  const batchId = await theBatchFor(prisma, a);
  const words = (a.body ?? '').trim();
  if (words || a.subject) {
    const bytes = Buffer.from([`Subject: ${a.subject ?? '(no subject)'}`, `Sent by: ${a.fromAddress}`, '', words].join('\n'), 'utf8');
    await keepOne(prisma, a, batchId, { kind: 'message', fileName: a.providerId ? `message:${a.providerId}` : `message:${hashOf(bytes).slice(0, 16)}`, mimeType: 'text/plain', bytes, text: words || null, state: 'kept' });
  }
  for (const f of a.files) await keepAFile(prisma, ports, a, batchId, f, null);
  if (a.beyondTheLimit > 0) {
    await keepOne(prisma, a, batchId, { kind: 'file', fileName: `${a.beyondTheLimit} more attachments`, mimeType: 'application/octet-stream', bytes: null, state: 'not_opened', because: `a single message can carry only so many, and ${a.beyondTheLimit} more ${a.beyondTheLimit === 1 ? 'was' : 'were'} attached. Please forward ${a.beyondTheLimit === 1 ? 'it' : 'them'} again in a second message` });
  }
  return { batchId, alreadySeen: false };
}

/**
 * The part of a message that is her own: what is written above the forwarded part, never the forwarded part itself. A message whose subject says
 * it is a forward, with no marker showing where her words end, has no words of hers in it: all of it is material, so nothing inside it can answer
 * a question, give a go-ahead or name a contact.
 */
export function herOwnWords(body: string | null | undefined, subject?: string | null): string {
  const text = String(body ?? '').replace(/\r\n/g, '\n');
  const cut = text.search(/\n\s*(?:-{2,}\s*(?:forwarded message|original message)|begin forwarded message|on .{3,200} wrote:?\s*$|from:\s.+\n(?:sent|date|to|subject):|>)/im);
  if (cut < 0) return /^\s*(?:fwd?|fw)\s*:/i.test(subject ?? '') || /^\s*-{2,}\s*(?:forwarded message|original message)|^\s*begin forwarded message|^\s*from:\s/i.test(text) ? '' : text.trim();
  return text.slice(0, cut).trim();
}
