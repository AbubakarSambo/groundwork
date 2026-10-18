import { readFileSync } from 'fs';
import { join } from 'path';
import { PartyType } from '@prisma/client';
import { ConversationService } from './conversation.service';

/**
 * A COLLEAGUE'S HIDDEN TARGET IS NOT GIVEN TO THE MODEL THAT TALKS TO YOU (week 0 of
 * docs/weekly-plan.md). Found by mapping every place a target reaches a model: on a check-in where
 * people see only their own targets, each person's check-in was given everybody's, so the model
 * could say a colleague's number to them. Removing it from what they are served after the model
 * wrote it is a second net; this is the first.
 */

const OBJECTIVES = [
  { name: 'Approved facilities, the team', target: 40, ownerParticipantId: null },
  { name: 'Approved facilities, Ngozi', target: 14, ownerParticipantId: 'p-ngozi' },
  { name: 'Approved facilities, Kwame', target: 17, ownerParticipantId: 'p-kwame' },
];
const svc: any = Object.create(ConversationService.prototype);
const as = (participantId: string, partyType: string = PartyType.PARTICIPANT) => ({ participantId, participant: { partyType } });

describe('the targets a person\'s own check-in is given', () => {
  it('where people see only their own: the team\'s and their own, never a colleague\'s', () => {
    const got = svc.theTargetsThisPersonMaySee({ objectives: OBJECTIVES, whoSeesTargets: 'THEIR_OWN' }, as('p-ngozi'));
    expect(got.map((o: any) => o.target)).toEqual([40, 14]);
  });
  it('and when nobody has said, the same', () => {
    const got = svc.theTargetsThisPersonMaySee({ objectives: OBJECTIVES, whoSeesTargets: null }, as('p-kwame'));
    expect(got.map((o: any) => o.target)).toEqual([40, 17]);
  });
  it('where the lead shared them with everybody: all of them', () => {
    const got = svc.theTargetsThisPersonMaySee({ objectives: OBJECTIVES, whoSeesTargets: 'EVERYBODY' }, as('p-ngozi'));
    expect(got).toHaveLength(3);
  });
  it('the lead: all of them', () => {
    const got = svc.theTargetsThisPersonMaySee({ objectives: OBJECTIVES, whoSeesTargets: 'THEIR_OWN' }, as('p-lead', PartyType.INITIATOR));
    expect(got).toHaveLength(3);
  });
});

describe('both places the conversation used every target', () => {
  const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  it('the prompt\'s objectives, and what the invention check treats as already said', () => {
    /* Since 1 October 2026 both also leave out a goal the lead has not told them about (decision 56, `untoldHere`). */
    /* Changed 8 October (anchor walk): on an anchor check-in a team member's model is given none of the lead's aims; every other check-in passes the targets this person may see, as before. */
    /* Changed 19 October (Release 1, pull request 5): the same targets this person may see, with a deal's units or a count of places they set left out (notADealsFigure, on Release 1's sales check-in only; Drop Access run 1, item 27). */
    expect(src).toContain('objectives: this.theLeadsOwnWordsStayHers(ground, checkIn) ? [] : this.theTargetsAsSentences((this.theTargetsThisPersonMaySee(ground as any, checkIn as any, untoldHere) as any[]).filter(notADealsFigure), ground as any, checkIn.participantId),');
    expect(src).toContain('...this.theTargetsThisPersonMaySee(ground as any, checkIn as any, untoldHere).map((o: any) => `${o.name ?? \'\'} ${o.target ?? \'\'}`),');
    expect(src).not.toContain("objectives: (ground as any).objectives ?? [],");
    expect(src).not.toContain("...((ground as any).objectives ?? []).map((o: any) => `${o.name ?? ''} ${o.target ?? ''}`),");
  });
});
