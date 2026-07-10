"""
Local mail catcher.

Point your app's SMTP at localhost:1025. Every email it sends lands here instead of
a real inbox. Read them over HTTP at localhost:1080.

Why this exists: a persona invited by email cannot complete their journey without the
link in that email. Without a catcher, every invite, verification, and reset flow stops
at "check your email" and everything downstream is untestable.

    python mailcatcher.py

    GET  /messages                 all captured mail (newest first)
    GET  /messages?to=tom@x.test   filtered by recipient
    GET  /latest?to=tom@x.test     the newest message for one recipient
    GET  /link?to=tom@x.test       the first URL in the newest message (the invite link)
    GET  /link?to=tom@x.test&match=invite   first URL containing "invite"
    POST /clear                    wipe (call between agents)

Decodes quoted-printable and base64, which is where invite links normally get mangled
(a long URL gets soft-wrapped with =\\n and a naive regex grabs half of it).
"""

import asyncio
import email
import email.policy
import json
import re
import threading
from datetime import datetime, timezone
from email.header import decode_header, make_header
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from aiosmtpd.controller import Controller

SMTP_PORT = 1025
HTTP_PORT = 1080

MESSAGES = []
LOCK = threading.Lock()

URL_RE = re.compile(r'https?://[^\s"\'<>)\]]+')


def _decode_hdr(v):
    if not v:
        return ""
    try:
        return str(make_header(decode_header(v)))
    except Exception:
        return str(v)


def _bodies(msg):
    """Return (text, html). Handles multipart, quoted-printable, base64."""
    text, html = "", ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_maintype() == "multipart":
                continue
            disp = str(part.get("Content-Disposition") or "")
            if "attachment" in disp:
                continue
            try:
                payload = part.get_payload(decode=True)
                if payload is None:
                    continue
                charset = part.get_content_charset() or "utf-8"
                body = payload.decode(charset, errors="replace")
            except Exception:
                continue
            ctype = part.get_content_type()
            if ctype == "text/plain":
                text += body
            elif ctype == "text/html":
                html += body
    else:
        try:
            payload = msg.get_payload(decode=True)
            charset = msg.get_content_charset() or "utf-8"
            body = payload.decode(charset, errors="replace") if payload else ""
        except Exception:
            body = str(msg.get_payload())
        if msg.get_content_type() == "text/html":
            html = body
        else:
            text = body
    return text, html


def _links(text, html):
    found = list(URL_RE.findall(text))
    # href="..." is more reliable than a bare regex over HTML
    found += re.findall(r'href=["\']([^"\']+)["\']', html)
    found += URL_RE.findall(re.sub(r"<[^>]+>", " ", html))
    seen, out = set(), []
    for u in found:
        u = u.rstrip(".,;)>\"'")
        if u.startswith("http") and u not in seen:
            seen.add(u)
            out.append(u)
    return out


class Handler:
    async def handle_DATA(self, server, session, envelope):
        raw = envelope.content.decode("utf8", errors="replace")
        msg = email.message_from_string(raw, policy=email.policy.default)
        text, html = _bodies(msg)
        rec = {
            "id": len(MESSAGES) + 1,
            "received": datetime.now(timezone.utc).isoformat(),
            "from": _decode_hdr(msg.get("From")) or envelope.mail_from,
            "to": [str(r) for r in envelope.rcpt_tos],
            "to_header": _decode_hdr(msg.get("To")),
            "subject": _decode_hdr(msg.get("Subject")),
            "text": text.strip(),
            "html": html.strip(),
            "links": _links(text, html),
        }
        with LOCK:
            MESSAGES.append(rec)
        print(
            f"[mail] -> {rec['to']}  {rec['subject'][:60]!r}  "
            f"({len(rec['links'])} link{'s' if len(rec['links']) != 1 else ''})",
            flush=True,
        )
        return "250 Message accepted"


def _for(to):
    with LOCK:
        msgs = list(MESSAGES)
    if not to:
        return list(reversed(msgs))
    to = to.lower()
    hits = [
        m
        for m in msgs
        if any(to in r.lower() for r in m["to"]) or to in (m["to_header"] or "").lower()
    ]
    return list(reversed(hits))


class API(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload, indent=2).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, code, html_body):
        body = html_body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        to = (q.get("to") or [None])[0]

        if u.path in ("/", "/inbox"):
            import html as _h
            with LOCK:
                msgs = list(reversed(MESSAGES))
            rows = []
            for m in msgs:
                links = "".join(
                    f'<a href="{_h.escape(l)}" style="display:block;color:#0C447C;font-size:13px;margin:2px 0;word-break:break-all">{_h.escape(l)}</a>'
                    for l in m.get("links", [])
                )
                rows.append(f"""
                <div style="border:1px solid #E2E0DB;border-radius:10px;padding:14px 16px;margin-bottom:12px;background:#fff">
                  <div style="font-size:12px;color:#9B9590">To: {_h.escape(", ".join(m.get("to", [])))}</div>
                  <div style="font-size:16px;font-weight:700;color:#1A1916;margin:2px 0 8px">{_h.escape(m.get("subject") or "(no subject)")}</div>
                  <div style="font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#9B9590;font-weight:700;margin-bottom:3px">Links</div>
                  {links or '<div style="font-size:12px;color:#9B9590">(none)</div>'}
                  <details style="margin-top:10px"><summary style="cursor:pointer;font-size:12px;color:#6B6560">Body</summary>
                  <pre style="white-space:pre-wrap;font-size:12px;color:#1A1916;background:#F7F6F3;padding:10px;border-radius:6px;margin-top:6px">{_h.escape(m.get("text") or "")}</pre></details>
                </div>""")
            page = f"""<!doctype html><html><head><meta charset="utf-8"><title>Groundwork test inbox</title>
            <meta http-equiv="refresh" content="5"></head>
            <body style="font-family:-apple-system,system-ui,sans-serif;max-width:760px;margin:0 auto;padding:24px;background:#FAF9F6">
            <h1 style="font-size:20px;color:#1A1916">Test inbox <span style="font-size:13px;color:#9B9590;font-weight:400">({len(msgs)} message{'s' if len(msgs)!=1 else ''}, auto-refreshes every 5s)</span></h1>
            <p style="font-size:12px;color:#9B9590">Participant invites, sign-in links and password emails land here. Click a link to act as that participant.</p>
            {''.join(rows) or '<p style="color:#9B9590">No mail yet. Invite a participant to see it here.</p>'}
            </body></html>"""
            return self._send_html(200, page)

        if u.path == "/messages":
            return self._send(200, _for(to))

        if u.path == "/latest":
            m = _for(to)
            return self._send(200, m[0]) if m else self._send(404, {"error": "no mail", "to": to})

        if u.path == "/link":
            m = _for(to)
            if not m:
                return self._send(404, {"error": "no mail for that recipient", "to": to})
            match = (q.get("match") or [None])[0]
            links = m[0]["links"]
            if match:
                links = [l for l in links if match.lower() in l.lower()]
            if not links:
                return self._send(
                    404,
                    {
                        "error": "no matching link in the newest message",
                        "subject": m[0]["subject"],
                        "all_links": m[0]["links"],
                    },
                )
            return self._send(200, {"link": links[0], "subject": m[0]["subject"], "all_links": links})

        if u.path == "/health":
            with LOCK:
                return self._send(200, {"ok": True, "count": len(MESSAGES)})

        return self._send(404, {"error": "GET /messages /latest /link /health"})

    def do_POST(self):
        if urlparse(self.path).path == "/clear":
            with LOCK:
                n = len(MESSAGES)
                MESSAGES.clear()
            return self._send(200, {"cleared": n})
        return self._send(404, {"error": "POST /clear"})

    def log_message(self, *a):
        pass


def main():
    c = Controller(Handler(), hostname="127.0.0.1", port=SMTP_PORT)
    c.start()
    print(f"[mail] SMTP  on 127.0.0.1:{SMTP_PORT}")
    print(f"[mail] HTTP  on http://127.0.0.1:{HTTP_PORT}")
    print("[mail] point your app's SMTP host/port at 127.0.0.1:1025 with no auth, no TLS")
    srv = ThreadingHTTPServer(("127.0.0.1", HTTP_PORT), API)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        c.stop()


if __name__ == "__main__":
    main()
