import * as net from 'net';

/**
 * A mail catcher of the sweep's own, on 127.0.0.1:1025, for specs that only reuse kept sign-ins
 * (privacy-sign-in-once.ts) and so never start the shared one in sign-in-by-email.ts. It keeps every
 * message the local API sends, so a spec can read what a person was actually told.
 */
const mail: string[] = [];
let started: Promise<void> | null = null;

export function startMail(): Promise<void> {
  if (started) return started;
  started = new Promise((ok, no) => {
    const s = net.createServer((sock) => {
      let data = false; let buf = '';
      sock.write('220 localhost\r\n');
      sock.on('data', (c) => {
        const t = c.toString('utf8');
        if (data) { buf += t; if (buf.includes('\r\n.\r\n')) { mail.push(buf); buf = ''; data = false; sock.write('250 OK\r\n'); } return; }
        for (const line of t.split('\r\n').filter(Boolean)) {
          const cmd = line.slice(0, 4).toUpperCase();
          if (cmd === 'EHLO' || cmd === 'HELO') sock.write('250 localhost\r\n');
          else if (cmd === 'DATA') { data = true; sock.write('354 go\r\n'); }
          else if (cmd === 'QUIT') { sock.write('221 bye\r\n'); sock.end(); }
          else sock.write('250 OK\r\n');
        }
      });
      sock.on('error', () => {});
    });
    s.once('error', no);
    s.listen(1025, '127.0.0.1', () => { s.unref(); ok(); });
  });
  return started;
}

export function mailCount(): number { return mail.length; }

/** Every message since `since`, with quoted-printable soft breaks undone so it reads as sent. */
export function mailSince(since: number): string[] {
  return mail.slice(since).map((m) => m.replace(/=\r\n/g, '').replace(/=3D/gi, '='));
}
