#!/bin/bash
# The test bed's command line. From anywhere:  SWEEP=a api/journey/sweep/bed.sh <command> ...
# (SWEEP=b for the other copy; a is the default.) Run it with no command to see every command.
cd "$(dirname "$0")/../.." && exec npx ts-node -T journey/sweep/bed.ts "$@"
