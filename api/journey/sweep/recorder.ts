/**
 * THE WHATSAPP RECORDER (user journey sweep, 7 October 2026). Meta's Graph API, on this computer.
 *
 * The API is started with WHATSAPP_GRAPH_BASE_URL pointing here, so every message Groundwork sends goes
 * here and to nobody's phone. It keeps what was sent, in order, and is read over HTTP by `bed.ts` and by
 * tests. It also serves media (a photo or a document a person "sends") the way Meta does, so the API can
 * fetch it.
 *
 *   POST /graph/<phoneNumberId>/messages      what the API calls to send (recorded)
 *   GET  /graph/<phoneNumberId>               "is it connected": the test number's name
 *   GET  /graph/<media id>, GET /file/<id>    media the API fetches
 *   GET  /_sent?to=+254...&since=<n>          what was sent (to one number, after sequence number n)
 *   GET  /_mark                               the sequence number now, to read "since" from
 *   POST /_clear                              forget everything
 *   POST /_media {name,mime,base64}           make a piece of media; answers its id
 *
 * Run by `bed.ts up`, or by hand:  SWEEP=a npx ts-node -T journey/sweep/recorder.ts
 */
import * as http from 'http';
import * as crypto from 'crypto';
import { TEMPLATES, fill } from '../../src/modules/whatsapp/a-message-outside-the-window';
import { TEST_WHATSAPP, theBed } from './the-test-bed';

export interface Recorded { n: number; at: string; to: string; kind: 'text' | 'template' | 'interactive' | 'image' | 'document' | 'other'; text: string; template?: string; phoneNumberId: string; authorizedAs: string; raw: unknown }

export function startRecorder(port: number): Promise<http.Server> {
  const sent: Recorded[] = [];
  const media = new Map<string, { buffer: Buffer; mime: string }>();
  const read = (req: http.IncomingMessage) => new Promise<string>((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => ok(b)); });
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const json = (code: number, v: unknown) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(v)); };
    try {
      if (req.method === 'POST' && /\/messages$/.test(url.pathname)) {
        const body = JSON.parse((await read(req)) || '{}');
        let kind: Recorded['kind'] = 'other'; let text = ''; let template: string | undefined;
        if (body.type === 'text') { kind = 'text'; text = body.text?.body ?? ''; }
        else if (body.type === 'template') {
          kind = 'template'; template = body.template?.name;
          const params: string[] = (body.template?.components?.[0]?.parameters ?? []).map((p: any) => p.text);
          const t = Object.values(TEMPLATES).find((x) => x.name === template);
          text = t ? fill(t.body, params) : `[template ${template}] ${params.join(' | ')}`;
        } else if (body.type === 'interactive') {
          kind = 'interactive';
          const rows = body.interactive?.action?.sections?.flatMap((s: any) => s.rows) ?? [];
          const buttons = body.interactive?.action?.buttons?.map((b: any) => ({ title: b.reply?.title })) ?? [];
          text = `${body.interactive?.body?.text ?? ''}\n${[...rows, ...buttons].map((r: any) => `[${r.title}]`).join(' ')}`.trim();
        } else if (body.type === 'image' || body.type === 'document') { kind = body.type; text = body[body.type]?.caption ?? ''; }
        const n = sent.length + 1;
        sent.push({ n, at: new Date().toISOString(), to: `+${String(body.to).replace(/^\+/, '')}`, kind, text, template, phoneNumberId: url.pathname.split('/').slice(-2)[0], authorizedAs: String(req.headers.authorization ?? ''), raw: body });
        return json(200, { messaging_product: 'whatsapp', messages: [{ id: `wamid.out.${n}` }] });
      }
      if (req.method === 'GET' && url.pathname === '/_sent') {
        const to = url.searchParams.get('to'); const since = Number(url.searchParams.get('since') ?? 0);
        const digits = (v: string) => v.replace(/\D/g, '');
        return json(200, sent.filter((s) => s.n > since && (!to || digits(s.to) === digits(to))));
      }
      if (req.method === 'GET' && url.pathname === '/_mark') return json(200, { mark: sent.length });
      if (req.method === 'POST' && url.pathname === '/_clear') { const n = sent.length; sent.length = 0; return json(200, { cleared: n }); }
      if (req.method === 'POST' && url.pathname === '/_media') {
        const b = JSON.parse((await read(req)) || '{}');
        const id = `media-${crypto.randomBytes(6).toString('hex')}`;
        media.set(id, { buffer: Buffer.from(b.base64, 'base64'), mime: b.mime ?? 'application/octet-stream' });
        return json(200, { id });
      }
      if (req.method === 'GET' && url.pathname === '/_health') return json(200, { ok: true, sent: sent.length });
      const asked = url.pathname.match(/\/graph\/(media-[\w-]+)$/);
      if (req.method === 'GET' && asked) {
        const f = media.get(asked[1]);
        return f ? json(200, { url: `http://127.0.0.1:${port}/file/${asked[1]}`, mime_type: f.mime, file_size: f.buffer.length }) : json(404, {});
      }
      const file = url.pathname.match(/\/file\/(media-[\w-]+)$/);
      if (req.method === 'GET' && file && media.get(file[1])) { res.setHeader('content-type', media.get(file[1])!.mime); return void res.end(media.get(file[1])!.buffer); }
      const number = url.pathname.match(/\/graph\/(\d+)$/);
      if (req.method === 'GET' && number) {
        return json(200, { display_phone_number: TEST_WHATSAPP.displayNumber, verified_name: 'Groundwork', id: number[1] });
      }
      json(404, {});
    } catch (e: any) { json(500, { error: String(e?.message ?? e) }); }
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

if (require.main === module) {
  const bed = theBed();
  startRecorder(bed.recorderPort).then(() => console.log(`WhatsApp recorder for copy ${bed.name} on ${bed.recorder}`));
}
