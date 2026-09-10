#!/bin/sh
# Proves the fix plan accounts for every finding in the register, once.
cd "$(dirname "$0")"
grep -hoE "\b(BR|NL|P[0-9][A-C]?|P6B|P6C)-[A-Z]?[0-9]{2,3}\b" fixplan_part_*.md fix_plan.md 2>/dev/null | sort -u > /tmp/planned.txt
echo "in the register: $(wc -l < all_finding_ids.txt)"
echo "in the plan:     $(wc -l < /tmp/planned.txt)"
echo "MISSING from the plan:"; comm -23 all_finding_ids.txt /tmp/planned.txt | tr '\n' ' '; echo
echo "IN THE PLAN BUT NOT THE REGISTER:"; comm -13 all_finding_ids.txt /tmp/planned.txt | tr '\n' ' '; echo
