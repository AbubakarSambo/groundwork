"""
Typography checker.

House style: no em dashes, no en dashes, straight quotes only, sentence case headings.
This catches violations anywhere the user can see them: rendered pages, emails, and
generated reports.

Why a separate tool: a persona reading a page will not notice an em dash, and a code
grep will miss dashes that arrive from the model at runtime rather than sitting in a
source file. The only place to catch those is in the rendered output.

    python typography.py --text "some string"
    python typography.py --file report.md
    python typography.py --url http://localhost:3000 --crawl
    python typography.py --mail-api http://127.0.0.1:1080

Exit 1 if any violation is found, so it can gate a build.
"""

import argparse
import json
import re
import sys
import urllib.request

# The characters that must not appear in user-visible text.
BANNED = {
    "\u2014": ("em dash", "use a comma, a full stop, or a rewrite"),
    "\u2013": ("en dash", "use 'to' for ranges, or a rewrite"),
    "\u2015": ("horizontal bar", "remove"),
    "\u2012": ("figure dash", "remove"),
    "\u2018": ("curly open single quote", "use a straight '"),
    "\u2019": ("curly close single quote / apostrophe", "use a straight '"),
    "\u201c": ("curly open double quote", 'use a straight "'),
    "\u201d": ("curly close double quote", 'use a straight "'),
    "\u2026": ("ellipsis character", "use three full stops"),
    "\u00a0": ("non-breaking space", "use a normal space"),
    "\u2212": ("minus sign", "use a hyphen"),
}

# Two hyphens are usually an em dash the author did not commit to.
DOUBLE_HYPHEN = re.compile(r"(?<!-)--(?!-)")

# A banned character encoded UTF-8 then decoded as cp1252, which is what browsers
# actually do when a page serves UTF-8 without declaring a charset. Two bugs at once:
# the undeclared charset, and the banned character hiding underneath. Note the cp1252
# forms end in real curly-quote codepoints, so these MUST be matched before the
# single-character rules or they get misattributed.
MOJIBAKE = {
    "\u00e2\u20ac\u201d": "em dash (mojibake: page serves UTF-8 with no charset declared)",
    "\u00e2\u20ac\u201c": "en dash (mojibake: page serves UTF-8 with no charset declared)",
    "\u00e2\u20ac\u2122": "curly apostrophe (mojibake: page serves UTF-8 with no charset declared)",
    "\u00e2\u20ac\u0153": "curly open quote (mojibake: page serves UTF-8 with no charset declared)",
    "\u00e2\u20ac\u00a6": "ellipsis (mojibake: page serves UTF-8 with no charset declared)",
    "\u00e2\u20ac\u02dc": "curly open single quote (mojibake: page serves UTF-8 with no charset declared)",
    "\u00c2\u00a0": "non-breaking space (mojibake: page serves UTF-8 with no charset declared)",
}


def scan(text, where="text"):
    out = []
    for i, line in enumerate(text.splitlines(), 1):
        # Mojibake first: it contains bytes that would otherwise be misattributed.
        masked = line
        for seq, name in MOJIBAKE.items():
            col = masked.find(seq)
            while col != -1:
                start = max(0, col - 35)
                out.append({
                    "where": where, "line": i, "col": col + 1, "char": repr(seq),
                    "name": name,
                    "fix": "declare <meta charset=\"utf-8\"> AND remove the character",
                    "context": masked[start : col + 35].strip(),
                })
                masked = masked[:col] + ("\x00" * len(seq)) + masked[col + len(seq):]
                col = masked.find(seq)
        line = masked

        for ch, (name, fix) in BANNED.items():
            col = line.find(ch)
            while col != -1:
                start = max(0, col - 35)
                out.append(
                    {
                        "where": where,
                        "line": i,
                        "col": col + 1,
                        "char": repr(ch),
                        "name": name,
                        "fix": fix,
                        "context": line[start : col + 35].strip(),
                    }
                )
                col = line.find(ch, col + 1)
        for m in DOUBLE_HYPHEN.finditer(line):
            out.append(
                {
                    "where": where,
                    "line": i,
                    "col": m.start() + 1,
                    "char": "'--'",
                    "name": "double hyphen (an em dash in disguise)",
                    "fix": "rewrite the sentence",
                    "context": line[max(0, m.start() - 35) : m.start() + 35].strip(),
                }
            )
    return out


def from_url(url, crawl=False):
    """Scan rendered text, not HTML source. Requires playwright."""
    from playwright.sync_api import sync_playwright

    found, seen = [], set()
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        pg = b.new_page()

        todo = [url]
        while todo:
            u = todo.pop(0)
            if u in seen or not u.startswith(url.rstrip("/")):
                continue
            seen.add(u)
            try:
                pg.goto(u, wait_until="networkidle", timeout=20000)
            except Exception as e:
                found.append({"where": u, "line": 0, "col": 0, "char": "",
                              "name": f"could not load: {type(e).__name__}",
                              "fix": "", "context": ""})
                continue
            found += scan(pg.inner_text("body"), where=u)
            if crawl:
                for href in pg.eval_on_selector_all(
                    "a[href]", "els => els.map(e => e.href)"
                ):
                    if href.startswith(url.rstrip("/")) and href not in seen:
                        todo.append(href.split("#")[0])
        b.close()
    return found


def from_mail(api):
    msgs = json.loads(urllib.request.urlopen(f"{api}/messages").read())
    found = []
    for m in msgs:
        label = f"email to {m['to']} | {m['subject'][:40]}"
        found += scan(m["subject"], where=label + " (subject)")
        found += scan(m["text"], where=label + " (text)")
        # strip tags before scanning html so we check what a reader sees
        found += scan(re.sub(r"<[^>]+>", " ", m["html"]), where=label + " (html)")
    return found


def render(found):
    if not found:
        return "Typography: clean. No em dashes, en dashes, or curly quotes."
    by = {}
    for f in found:
        by.setdefault(f["name"], []).append(f)
    L = [f"Typography: {len(found)} violation{'s' if len(found) != 1 else ''}.", ""]
    for name, items in sorted(by.items(), key=lambda kv: -len(kv[1])):
        L.append(f"## {name} ({len(items)})")
        L.append(f"Fix: {items[0]['fix']}")
        for it in items[:12]:
            loc = f"{it['where']}:{it['line']}:{it['col']}" if it["line"] else it["where"]
            L.append(f"  {loc}")
            if it["context"]:
                L.append(f"    ...{it['context']}...")
        if len(items) > 12:
            L.append(f"  and {len(items) - 12} more")
        L.append("")
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text")
    ap.add_argument("--file")
    ap.add_argument("--url")
    ap.add_argument("--crawl", action="store_true")
    ap.add_argument("--mail-api")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    found = []
    if a.text:
        found += scan(a.text)
    if a.file:
        found += scan(open(a.file, encoding="utf-8").read(), where=a.file)
    if a.url:
        found += from_url(a.url, a.crawl)
    if a.mail_api:
        found += from_mail(a.mail_api.rstrip("/"))

    if not (a.text or a.file or a.url or a.mail_api):
        sys.exit("give me --text, --file, --url or --mail-api")

    print(json.dumps(found, indent=2) if a.json else render(found))
    sys.exit(1 if found else 0)


if __name__ == "__main__":
    main()
