#!/bin/sh
# Rebuilds audit_findings.md from the per-pass files. Re-run after any pass file changes.
cd "$(dirname "$0")"
{
echo "# Groundwork code audit: the findings"
echo
echo "Assembled from the per-pass files in this directory. Each pass file stays the source of truth;"
echo "this is the single register to work through. The browser and notifications audits are separate"
echo "registers, in browser_findings.md and notify_findings.md, and are not repeated here."
echo
for f in findings_pass0_urgent.md findings_pass1.md findings_pass2_3.md findings_pass4_5.md \
         findings_pass4_flows_a_b.md findings_pass4_flows_c_d_e_f.md findings_pass4_flows_g_h.md \
         findings_pass6_7.md findings_pass6b.md findings_pass6c.md; do
  echo; echo "---"; echo; echo "<!-- from $f -->"; echo; cat "$f"; echo
done
} > audit_findings.md
wc -l audit_findings.md
