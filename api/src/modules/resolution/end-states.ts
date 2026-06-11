import { GroundScenario } from '@prisma/client';

/**
 * The end states each scenario builds toward (Part 8 / moment selector). The
 * ground closes only when BOTH parties confirm the same end state — no single
 * party has unilateral authority over it (especially cofounder grounds).
 */
export const END_STATES: Record<GroundScenario, { value: string; label: string; description?: string }[]> = {
  NEW_HIRE: [
    { value: 'KEEP', label: 'Keep the hire' },
    { value: 'RESTRUCTURE', label: 'Restructure the role' },
    { value: 'EXIT', label: 'Let them go' },
    { value: 'EXTEND', label: 'Extend evaluation period', description: 'Both parties agree the evaluation period should continue with a defined extension timeline.' },
    { value: 'NOT_YET', label: 'Not yet — revisit with a named gap' },
  ],
  NEW_COFOUNDER: [
    { value: 'CONTINUE', label: 'Continue the partnership' },
    { value: 'RESTRUCTURE', label: 'Restructure the arrangement' },
    { value: 'SEPARATE', label: 'Separate' },
    { value: 'NOT_YET', label: 'Not yet — revisit with a named gap' },
  ],
  NEW_ADVISOR: [
    { value: 'RENEW', label: 'Renew the engagement' },
    { value: 'RESTRUCTURE', label: 'Restructure the engagement' },
    { value: 'END', label: 'End the engagement' },
    { value: 'NOT_YET', label: 'Not yet — revisit with a named gap' },
  ],
  NEW_PROJECT: [
    { value: 'COMPLETE', label: 'Mark complete' },
    { value: 'CONTINUE', label: 'Continue' },
    { value: 'DESCOPE', label: 'Descope' },
    { value: 'STOP', label: 'Stop the project' },
  ],
  NEW_MANAGER: [
    { value: 'CONTINUE', label: 'Extend the engagement' },
    { value: 'RESTRUCTURE', label: 'Restructure the scope or terms' },
    { value: 'END', label: 'End the engagement' },
    { value: 'NOT_YET', label: 'Not yet — revisit with a named gap' },
  ],
  CONTRACT_RENEWAL: [
    { value: 'RENEW', label: 'Renew on current terms' },
    { value: 'RENEGOTIATE', label: 'Renew on revised terms' },
    { value: 'EXIT', label: 'Do not renew' },
    { value: 'NOT_YET', label: 'Extend evaluation period' },
  ],
  RECOGNITION: [
    { value: 'YES', label: 'Grant the ask' },
    { value: 'NO', label: 'Decline' },
    { value: 'NOT_YET', label: 'Not yet — with a named gap and milestone' },
  ],
  DRIFT: [
    { value: 'CONTINUE', label: 'Continue' },
    { value: 'RESTRUCTURE', label: 'Restructure' },
    { value: 'DESCOPE', label: 'Descope' },
    { value: 'SEPARATE', label: 'Separate' },
    { value: 'EXIT', label: 'Exit' },
    { value: 'STOP', label: 'Stop' },
    { value: 'NOT_YET', label: 'Not yet — revisit with a named gap' },
  ],
  CRISIS_ALIGNMENT: [
    { value: 'ALIGNED', label: 'Shared picture established — team aligned' },
    { value: 'RESTRUCTURE', label: 'Structure or priorities need to change' },
    { value: 'ESCALATE', label: 'Requires external support or intervention' },
    { value: 'NOT_YET', label: 'Not yet — revisit when more information is available' },
  ],
};

export function endStatesFor(scenario: GroundScenario) {
  return END_STATES[scenario] ?? [];
}

export function isValidEndState(scenario: GroundScenario, value: string): boolean {
  return endStatesFor(scenario).some((o) => o.value === value);
}
