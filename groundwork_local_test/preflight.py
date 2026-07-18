"""
Run this BEFORE any agent. If it fails, the test cannot run and you must say so
rather than simulate.

    python preflight.py --base-url http://localhost:3000
"""
import argparse, json, smtplib, sys, urllib.request
from email.mime.text import MIMEText

def ok(m):   print(f"  PASS  {m}")
def bad(m):  print(f"  FAIL  {m}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True)
    a = ap.parse_args()
    fails = []

    print("1. mail catcher reachable")
    try:
        h = json.loads(urllib.request.urlopen("http://127.0.0.1:1080/health", timeout=5).read())
        ok(f"HTTP api up, {h['count']} messages held")
    except Exception as e:
        bad(f"cannot reach http://127.0.0.1:1080 ({e}). Start: python mailcatcher.py")
        fails.append("mail-http")

    print("2. mail catcher accepts SMTP")
    try:
        m = MIMEText("preflight http://example.test/x")
        m["Subject"] = "preflight"; m["From"] = "a@b.test"; m["To"] = "preflight@example-test.invalid"
        s = smtplib.SMTP("127.0.0.1", 1025, timeout=5); s.send_message(m); s.quit()
        r = json.loads(urllib.request.urlopen("http://127.0.0.1:1080/latest?to=preflight").read())
        ok(f"round trip works, captured {r['subject']!r}")
    except Exception as e:
        bad(f"SMTP round trip failed ({e})")
        fails.append("mail-smtp")

    print("3. app reachable")
    try:
        # The API serves routes under /api/v1 and health at /health - the bare
        # root 404s by design, which made this check fail against a healthy app.
        probe = a.base_url.rstrip('/') + '/health'
        with urllib.request.urlopen(probe, timeout=10) as r:
            ok(f"{probe} -> HTTP {r.status}")
    except Exception as e:
        bad(f"cannot reach {a.base_url} ({e})")
        fails.append("app")

    print("4. browser available")
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch(headless=True); b.close()
        ok("chromium launches")
    except Exception as e:
        bad(f"playwright/chromium unavailable ({e})")
        fails.append("browser")

    print("\n5. DOES THE APP ACTUALLY SEND MAIL HERE?")
    print("   Not checkable automatically. Trigger a signup or invite by hand,")
    print("   then: curl -s 'http://127.0.0.1:1080/messages'")
    print("   If nothing arrives, the app's SMTP is NOT pointed at 127.0.0.1:1025.")
    print("   Fix that before running any agent. Do not simulate the email step.")

    if fails:
        print(f"\nPREFLIGHT FAILED: {', '.join(fails)}")
        print("Report this and stop. Do not simulate the test.")
        sys.exit(1)
    print("\nPreflight passed. Verify step 5 by hand, then run agent 1.")

if __name__ == "__main__":
    main()
