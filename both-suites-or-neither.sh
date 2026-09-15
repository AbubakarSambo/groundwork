#!/usr/bin/env bash
#
# TWENTY CLIENT SPECS READ THE API'S OWN SOURCE, SO THE API SUITE ALONE PROVES LESS THAN IT LOOKS.
#
# They are source-assertion specs and they are right to exist: the fault they catch is a screen
# and a server quietly disagreeing about a field name, which no amount of testing either side on
# its own will find. The cost is that an ordinary API edit can break a CLIENT test.
#
# It happened on 15 September 2026. A select in conversation.service.ts moved into a shared
# constant, the API suite stayed green at 7,738, and a spec under client/src/pages/chat went red
# for the rest of the day because nobody ran it. The spec did exactly what it was written to do.
#
# So: both, or neither. Runs the API suite first because it is the slower one to fix.
#
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> api"
(cd "$here/api" && npx jest "$@")

echo
echo "==> client"
(cd "$here/client" && npx vitest run --silent)

echo
echo "Both suites green."
