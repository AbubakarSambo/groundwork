import { anInboundHarness } from './a-whatsapp-inbound-harness';
import { DocumentsService } from '../documents/documents.service';
import { canSeeDocument } from '../documents/who-can-see-a-document';
import { defaultVisibilityForUpload } from '../documents/a-document-is-context';
import { I_COULD_NOT_OPEN_THAT_FILE } from '../public-api/whatsapp-for-an-organisation.service';

/**
 * PHOTOS, DOCUMENTS AND LOCATION PINS SENT ON WHATSAPP ARE PROOF (Hafsah, 11 October 2026; B-102,
 * B-103). Fake incoming messages through the signed-webhook route, the media fetch mocked: no Meta,
 * no model. A file is kept exactly as an app upload, against Amani on her open check-in. A pin is
 * kept with the check-in and said only as the record holds it. A file nothing could be read from
 * gets the honest sentence.
 */
const OPEN = { id: 'ci-1', label: 'Field visits, Kilimani', status: 'IN_PROGRESS' as const };
const AMANI = { id: 'p-amani', groundId: 'g-1', userId: 'u-amani', nameGiven: null };
/* Tuesday 13 October 2026, 10:42 in Nairobi. */
const TUESDAY_10_42 = Math.floor(new Date('2026-10-13T07:42:00Z').getTime() / 1000);

/** The real documents service, with its database and readers mocked: what it writes is what the app's upload writes. */
function realDocuments(content: string) {
  const d = Object.create(DocumentsService.prototype) as any;
  const created: any[] = [];
  d.prisma = {
    ground: { findUnique: jest.fn(async () => ({ id: 'g-1' })) },
    groundParticipant: { findFirst: jest.fn(async () => AMANI) },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Amani' })) },
    groundDocument: { create: jest.fn(async (q: any) => { created.push(q.data); return { id: `d-${created.length}`, ...q.data }; }) },
  };
  d.config = { get: () => true };
  d.logger = { log: jest.fn(), warn: jest.fn() };
  d.extractContent = jest.fn(async () => content);
  d.decideOrigin = jest.fn(async (f: any) => (f.mimetype.startsWith('image/') ? 'photo' : 'typed'));
  d.readTheAgreementInIt = jest.fn(async () => undefined);
  d.readTheRestOfIt = jest.fn(async () => undefined);
  d.anchorAfterUpload = jest.fn();
  d.sayHowLongTheUploadTook = jest.fn();
  return { d, created };
}

function amaniSends(message: any, content = 'Acme 40000 won') {
  const h = anInboundHarness({ open: [OPEN], thread: { checkInId: 'ci-1' }, who: { personId: 'person-amani', userId: 'u-amani' } });
  h.whatsapp.fetchMediaOn.mockResolvedValue({ buffer: Buffer.from('%PDF-1.4 fake'), mimeType: message[message.type]?.mime_type ?? 'application/pdf' });
  const { d, created } = realDocuments(content);
  (h.service as any).documents = d;
  const body = { entry: [{ changes: [{ value: { messages: [{ id: `wamid.${Math.random()}`, from: '254700000001', timestamp: String(TUESDAY_10_42), ...message }] } }] }] };
  return { h, d, created, send: () => h.service.handle('org-1', body, 'ours') };
}

describe('a photo and a PDF sent on WhatsApp', () => {
  it.each([
    ['a PDF', { type: 'document', document: { id: 'm-1', mime_type: 'application/pdf', filename: 'pipeline.pdf' } }, '"pipeline.pdf"', 'typed'],
    ['a photo', { type: 'image', image: { id: 'm-2', mime_type: 'image/jpeg' } }, 'Your photo', 'photo'],
  ])('%s is kept on her check-in exactly as an app upload, and counted as proof', async (_what, message, called, origin) => {
    const { h, d, created, send } = amaniSends(message);
    await send();
    expect(h.whatsapp.fetchMediaOn).toHaveBeenCalled();
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ groundId: 'g-1', participantId: 'p-amani', visibility: defaultVisibilityForUpload(), origin });
    /* Read against what she said, as an app upload is: this is what makes a line backed by it. */
    expect(d.anchorAfterUpload).toHaveBeenCalledWith('p-amani', 'g-1');
    expect(h.said).toHaveLength(1);
    expect(h.said[0]).toMatch(new RegExp(`^${called} is on your check-in\\. `));
    expect(h.said[0]).not.toMatch(/shows|I can see|I saw/);
  });

  it('B-102: her pipeline PDF is said back as hers, never as a target for everyone', async () => {
    const { h, send } = amaniSends({ type: 'document', document: { id: 'm-1', mime_type: 'application/pdf', filename: 'pipeline.pdf' } });
    await send();
    expect(h.said.join(' ')).not.toMatch(/For everyone in this check-in|target for Acme|40,000/);
  });

  it('a file nothing could be read from is kept, and she is asked what it shows, in one plain sentence', async () => {
    const { h, created, send } = amaniSends({ type: 'image', image: { id: 'm-3', mime_type: 'image/jpeg' } }, '[Attached: image-1.jpg - could not read the image.]');
    await send();
    expect(created).toHaveLength(1);
    expect(h.said).toEqual([I_COULD_NOT_OPEN_THAT_FILE]);
    expect(I_COULD_NOT_OPEN_THAT_FILE).toBe('I could not open that file. Could you tell me what it shows?');
  });
});

describe('a location pin sent on WhatsApp', () => {
  it('is kept with her check-in, with its coordinates, and said as the record holds it', async () => {
    const { h, d, created, send } = amaniSends({ type: 'location', location: { latitude: -1.2921, longitude: 36.7871, name: 'Kilimani Shop', address: 'Argwings Kodhek Road' } });
    await send();
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      groundId: 'g-1', participantId: 'p-amani', visibility: defaultVisibilityForUpload(),
      fileName: 'Location pin shared at 10:42 on Tuesday 13 October',
      content: 'Amani shared a location pin at 10:42 on Tuesday 13 October. The pin is named Kilimani Shop. The address on the pin is Argwings Kodhek Road. The pin is at latitude -1.2921, longitude 36.7871.',
    });
    expect(created[0].createdAt).toEqual(new Date(TUESDAY_10_42 * 1000));
    expect(d.anchorAfterUpload).toHaveBeenCalledWith('p-amani', 'g-1');
    expect(h.said).toEqual(['Your location pin is on your check-in. You shared it at 10:42 on Tuesday 13 October. The pin is named Kilimani Shop. The address on the pin is Argwings Kodhek Road. Only you can see this, and nobody else can open it.']);
  });

  it('with no name from WhatsApp, no place is named', async () => {
    const { h, created, send } = amaniSends({ type: 'location', location: { latitude: -1.2921, longitude: 36.7871 } });
    await send();
    expect(created[0].content).toBe('Amani shared a location pin at 10:42 on Tuesday 13 October. The pin is at latitude -1.2921, longitude 36.7871.');
    expect(h.said[0]).toMatch(/^Your location pin is on your check-in\. You shared it at 10:42 on Tuesday 13 October\. [A-Z]/);
    expect(h.said[0]).not.toMatch(/named|address/);
  });

  it('with no check-in open, it is not put anywhere and she is told so', async () => {
    const h = anInboundHarness({ open: [], thread: null });
    const body = { entry: [{ changes: [{ value: { messages: [{ id: 'wamid.x', from: '254700000001', type: 'location', location: { latitude: 1, longitude: 2 } }] } }] }] };
    await h.service.handle('org-1', body, 'ours');
    expect(h.said).toEqual(['There is no check-in open to put that on. I will message you here when the next one opens; send it again then.']);
  });
});

describe('who sees a photo, a PDF or a pin: whoever sees her other proof today', () => {
  it('kept with the same visibility as an app upload, so the same people can open it', async () => {
    const pin = amaniSends({ type: 'location', location: { latitude: -1.2921, longitude: 36.7871 } });
    await pin.send();
    const photo = amaniSends({ type: 'image', image: { id: 'm-2', mime_type: 'image/jpeg' } });
    await photo.send();
    const anAppUpload = { participantId: 'p-amani', visibility: defaultVisibilityForUpload() };
    const readers = { Amani: { participantId: 'p-amani', isLead: false }, 'Rukia, the lead': { participantId: 'p-rukia', isLead: true }, 'Baraka, a colleague': { participantId: 'p-baraka', isLead: false }, 'Juma, a read-only admin': { participantId: null, isLead: true } };
    for (const kept of [pin.created[0], photo.created[0]]) {
      for (const reader of Object.values(readers)) {
        for (const contextOn of [true, false]) {
          expect(canSeeDocument({ participantId: kept.participantId, visibility: kept.visibility }, reader, contextOn)).toBe(canSeeDocument(anAppUpload, reader, contextOn));
        }
      }
    }
  });
});
