/**
 * WHAT A FILE IS FOR, DECIDED ONCE (WhatsApp test, 20 November 2026, C2, C3 and C4).
 *
 * A file sent on WhatsApp went wherever a check-in did: with one open it went on the check-in, with none it was refused ("There is no
 * check-in open to put that on. I will message you here when the next one opens; send it again then."), and in Ask it was refused again
 * ("Ask Msingi Foods reads words here. Write "back" first..."). So Peter's fuel receipt, captioned "fuel for nakuru trip pls refund", never
 * reached his spending request; Grace's leave policy, captioned "our leave policy, add for everyone", never reached the Desk; and Wairimu's
 * "use this in the report too" never reached her report.
 *
 * Now one decision says what a file is for, from what is waiting for it and what the person wrote with it:
 *   - a waiting request it belongs to: a receipt for their spending request, material for the report they asked for, a document for the
 *     Desk from an admin or a lead, or their open check-in;
 *   - what its caption (and, for a document, its words) says, read by the model against those places;
 *   - otherwise Ask asks plainly what it is for.
 * Each path is the one that already exists (the spending attachment, the report's material, the Desk, the check-in's documents), and
 * each is said back and done only on a yes, as Ask does. The report takes it at once only because the report asked for it.
 */

export const A_FILE_SENT_KIND = 'a_file_sent';

export type AFileIsFor = 'check-in' | 'receipt' | 'report' | 'desk' | 'spending' | 'unclear';

/** Where this file could go, for this person, now. Each is null or false where it cannot. */
export interface WhereAFileCouldGo {
  /** Their check-in open in this conversation, by its name. */
  checkIn: { label: string } | null;
  /** Their newest spending request still waiting with nothing attached: what it is, as a sentence's end ("KES 2,500 on fuel"). */
  receipt: { id: string; said: string } | null;
  /** The report they asked for is open (waiting for documents, or its outline sent) and can take material. */
  report: boolean;
  /** The Desk, for an admin or a lead: the organisation's name. */
  desk: { organisation: string } | null;
  /** Spending requests are on for them, so the file can start one. */
  spending: boolean;
}

/** What arrived, as the sentence names it: "your photo", or the document's own name in quotation marks. */
export interface AFileThatArrived { fileName: string; named?: boolean; what?: string; caption?: string; words?: string }

export function theFile(f: AFileThatArrived): string {
  return f.named ? `“${f.fileName}”` : `your ${f.what ?? 'file'}`;
}

const cap = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/** The places it could go, in the order a waiting request comes before anything else. */
export function thePlaces(could: WhereAFileCouldGo): AFileIsFor[] {
  const out: AFileIsFor[] = [];
  if (could.receipt) out.push('receipt');
  if (could.report) out.push('report');
  if (could.desk) out.push('desk');
  if (could.checkIn) out.push('check-in');
  if (could.spending && !could.receipt) out.push('spending');
  return out;
}

/** Each place in words the person reads, for the model and for the question. */
function aPlaceSaid(p: AFileIsFor, could: WhereAFileCouldGo): string {
  switch (p) {
    case 'receipt': return `with your request to spend ${could.receipt!.said}`;
    case 'report': return 'in the report you asked for';
    case 'desk': return `on the Desk, for everyone at ${could.desk!.organisation}`;
    case 'check-in': return `on your check-in "${could.checkIn!.label}"`;
    case 'spending': return 'with a new request to spend money';
    default: return '';
  }
}

function inAList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

/**
 * Where nothing the person wrote is read (no caption, no words, or the model cannot say): a waiting request it can only belong to, else
 * the check-in it was sent in, else nothing.
 */
function withNothingToRead(places: AFileIsFor[]): AFileIsFor {
  const waiting = places.filter((p) => p === 'receipt' || p === 'report');
  if (waiting.length === 1 && !places.includes('check-in')) return waiting[0];
  if (places.includes('check-in') && waiting.length === 0) return 'check-in';
  return 'unclear';
}

type Extract = (system: string, messages: { role: 'user'; content: string }[], tool: any, opts?: any) => Promise<{ for?: string } | null>;

const THE_QUESTION = [
  'A person has sent a file to their workplace assistant. Say what the file is for, from the places it can go and what they wrote with it.',
  'Read what they mean, in any words: a receipt or a bill they want paid back or approved goes with a request to spend; a document for the whole organisation to use goes on the Desk; material for the report they asked for goes in the report; something about their own work goes on the check-in.',
  'Answer with one of the keys given, exactly. If what they wrote does not say, or it could be more than one, answer unclear.',
].join(' ');

/** The one decision. The model reads the caption (and a document's first words) against the places; nothing is guessed where it cannot say. */
export async function whatAFileIsFor(extract: Extract | undefined, could: WhereAFileCouldGo, f: AFileThatArrived): Promise<AFileIsFor> {
  const places = thePlaces(could);
  if (!places.length) return 'unclear';
  const caption = (f.caption ?? '').trim();
  const words = (f.words ?? '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  if ((!caption && !words) || typeof extract !== 'function') return withNothingToRead(places);
  const keys = [...places, 'unclear'];
  const read = await extract(
    THE_QUESTION,
    [{ role: 'user', content: [
      `The places it can go: ${places.map((p) => `${p} (${aPlaceSaid(p, could)})`).join('; ')}.`,
      `What they wrote with it: ${caption ? `"${caption}"` : 'nothing'}.`,
      words ? `The file begins: "${words}"` : `It is a ${f.what ?? 'file'} with no words that can be read.`,
    ].join('\n') }],
    { name: 'what_the_file_is_for', description: 'Where the file goes', input_schema: { type: 'object', properties: { for: { type: 'string', enum: keys } }, required: ['for'] } },
    { thinkingBudget: 128 },
  ).catch(() => null);
  const said = String(read?.for ?? '').trim() as AFileIsFor;
  if (keys.includes(said) && said !== 'unclear') return said;
  /* The model could not say. With nothing in the caption to go on, the one place it can only belong to; with a caption it did not place, ask. */
  return caption ? 'unclear' : withNothingToRead(places);
}

/** "Shall I attach your photo to your request to spend KES 2,500 on fuel?" */
export const SHALL_I_ATTACH = (f: AFileThatArrived, said: string) => `Shall I attach ${theFile(f)} to your request to spend ${said}?`;
/** "I attached your photo to your request, so Wairimu can read it with the request." (the shape of aFileWentWithTheRequest, for a photo too). */
export const ATTACHED = (f: AFileThatArrived, approverFirstName: string | null) => `I attached ${theFile(f)} to your request, so ${approverFirstName ?? 'whoever decides'} can read it with the request.`;
export const NOT_ATTACHED = (f: AFileThatArrived) => `All right. I have not attached ${theFile(f)} to anything.`;

/** The plain question, when nothing says what it is for. */
export function whatIsItFor(f: AFileThatArrived, could: WhereAFileCouldGo): string {
  const places = thePlaces(could).filter((p) => p !== 'check-in');
  if (!places.length) {
    return `I have ${theFile(f)}, but there is nothing it can go with yet. No check-in of yours is open, and nothing of yours is waiting for a file. Tell me what it is for, and I will tell you where it can go.`;
  }
  return `${cap(theFile(f))} is here. What is it for? It can go ${inAList(places.map((p) => aPlaceSaid(p, could)))}. Tell me which, in your own words.`;
}

/** Said in front of Ask's own reply, when the file waits for the request their caption starts. */
export const KEPT_FOR_THE_REQUEST = (f: AFileThatArrived) => `I have kept ${theFile(f)}, and it will go with your request to spend once you send it.`;
