#!/usr/bin/env python3
"""Re-run only the agents that failed due to textarea timeout: 21, 23, 24, 28, 42"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

# Import the fixed script
import importlib.util
spec = importlib.util.spec_from_file_location("run_session3", os.path.join(os.path.dirname(__file__), "run_session3.py"))
mod = importlib.util.load_from_spec(spec)
spec.loader.exec_module(mod)

import time
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

SCREENSHOTS_DIR = mod.SCREENSHOTS_DIR
STATE_DIR = mod.STATE_DIR
BASE_URL = mod.BASE_URL
findings = mod.findings

log = mod.log
ss = mod.ss
get_text = mod.get_text
make_context = mod.make_context
save_state = mod.save_state
wait_for_app = mod.wait_for_app
go = mod.go
find_ground = mod.find_ground
do_checkin = mod.do_checkin
read_report = mod.read_report
assess_report_quality = mod.assess_report_quality

if __name__ == "__main__":
    print("=" * 60)
    print("SESSION 3 RETRY: agents 21, 23, 24, 28, 42 (textarea fix)")
    print("=" * 60)

    agents = [
        (mod.agent_21,  "A21  Zainab  returning_admin"),
        (mod.agent_23,  "A23  Tom     returning_participant"),
        (mod.agent_24,  "A24  Priya   returning_admin"),
        (mod.agent_28,  "A28  Kwame   lead"),
        (mod.agent_42,  "A42  Priya   thin input test"),
    ]

    for func, label in agents:
        print(f"\n{'─'*60}\nRunning: {label}\n{'─'*60}", flush=True)
        try:
            func()
        except Exception as e:
            import traceback
            print(f"EXCEPTION in {label}: {e}", flush=True)
            traceback.print_exc()

    print("\n" + "=" * 60)
    print("RETRY FINDINGS")
    print("=" * 60)
    for f in mod.findings:
        print(f)

    os.makedirs("/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/results", exist_ok=True)
    with open("/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/results/session3_retry.txt", "w") as fh:
        fh.write("\n".join(mod.findings))
    print("\nFindings written to results/session3_retry.txt")
