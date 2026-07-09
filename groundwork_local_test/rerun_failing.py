#!/usr/bin/env python3
"""Re-run just the 5 agents that timed out due to StrictMode openedRef bug."""
import sys, importlib.util, os

spec = importlib.util.spec_from_file_location(
    "run_session3",
    "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/run_session3.py"
)
mod = spec.loader.load_module("run_session3")

agents = [
    (mod.agent_21,  "A21  Zainab  returning_admin - run session 3"),
    (mod.agent_23,  "A23  Tom     returning_participant - session 3"),
    (mod.agent_24,  "A24  Priya   returning_admin - team alignment"),
    (mod.agent_28,  "A28  Kwame   lead - compare over time"),
    (mod.agent_42,  "A42  Priya   thin input test"),
]

print("=" * 60)
print("RE-RUN: agents that failed with textarea timeout (StrictMode fix)")
print("=" * 60)

for func, label in agents:
    print(f"\n{'─'*60}\nRunning: {label}\n{'─'*60}", flush=True)
    try:
        func()
    except Exception as e:
        import traceback
        print(f"EXCEPTION in {label}: {e}", flush=True)
        traceback.print_exc()

print("\nDone.")
