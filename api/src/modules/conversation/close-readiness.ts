/**
 * WHETHER A PERSON ASKED TO FINISH. Their session, their call: honoured at any point, with no count (Hafsah, 2 November 2026).
 */
/** Someone declining, or asking to stop. Always honoured immediately. */
/*
 * THE WAYS PEOPLE SAY THEY ARE FINISHED. Widened 22 Sep 2026: "That is everything from my side" was
 * answered with "One more before this closes" on a live participant session. The short forms were
 * here and the long ones were not - "that is everything", "that is all from me", "I have nothing else
 * to add". Bare "nothing else" is deliberately NOT here: that is an answer about the work.
 */
/*
 * AND SOMEBODY ASKING IN PLAIN WORDS TO END IT.
 *
 * Read on a live check-in, 23 September 2026. "you are repeating yourself, please end the session"
 * - the conversation carried on. "can you have the session end please" - it asked another
 * question. Neither sentence matched anything here: the list had "can we stop" and "can we finish"
 * and nothing at all for the word people actually use, which is END.
 *
 * Hafsah: "it also doesnt end naturally." She asked three times.
 */
/*
 * "THAT'S ALL I CAN DO FOR NOW" IS ABOUT THE WORK, NOT LEAVING (messages test, fourth run). Mercy, asked on Wednesday 14 October what she
 * had done about Joseph's samples, said "I called Joseph on Tuesday, and he said he'd have them for me on Thursday. That's all I can do for
 * now." and her check-in closed after two questions: "Thanks. I have what you said so far, and you can add more later today." "That's all"
 * followed by what they can do, have or know is about the work.
 */
/* "later" only about the check-in itself ("can we talk later", "later."): Joseph's "She'll send the M-Pesa later." closed his check-in after
   three questions, before he could say anything about Juja Hardware (final real-model check, item 21). */
export const WANTS_OUT =
  /\b(that'?s (it|me|all)(?!\s+(?:i|we|they|he|she|you)\s+(?:can|could|have|had|did|do|know|need|got|was|am|is)\b)|that is (it|all|everything)(?!\s+(?:i|we|they|he|she|you)\s+(?:can|could|have|had|did|do|know|need|got|was|am|is)\b)|(that'?s|that is) (everything|all)( from (me|my side))?(?!\s+(?:i|we|they|he|she|you)\s+(?:can|could|have|had|did|do|know|need|got|was|am|is)\b)|i'?m done|i am done|we'?(re| are) done|i have nothing (else|more)( to add)?|i'?ve nothing (else|more)|done for (?:now|today|the day)|need to go|got to go|have to go|can we (stop|finish)|(?:talk|speak|continue|chat|catch up|come back|finish|do (?:this|it|the rest))(?:\s+(?:to you|with you|on this|this|it|again))?\s+later|^\s*(?:maybe\s+|ok(?:ay)?,?\s+)?later\s*[.!]*\s*$|another time|skip this|end (the|this) (session|check-?in|conversation)|(session|check-?in|conversation) end|(?:please )?(?:finish|end|stop|close) (?:the|this|my) (?:session|check-?in|conversation)|^\s*(?:please\s+)?(?:finish|end it|stop|close it)(?:\s+(?:it|this|now|please))*\s*[.!]*\s*$|wrap (this |it )?up|stop (the|this) (session|check-?in)|no more questions)/i;

/**
 * Did this person ask to finish?
 *
 * Exported because BOTH ends of the close have to agree about it. The engine
 * honours it here and lets somebody out below the turn floor, which is right -
 * it is their session. complete() did not, so the person who said "that's
 * everything from me" was shown a completion button by the engine and then
 * refused by the server for being one turn short. The screen offered and the
 * server declined, on the exact sentence the engine had just accepted.
 *
 * Around forty times in one six-person run.
 */
export function askedToFinish(personTurns: string[]): boolean {
  return WANTS_OUT.test(personTurns[personTurns.length - 1] ?? '');
}

/**
 * A BARE "FINISH" TYPED IN THE APP BEFORE THERE IS ENOUGH TO FINISH WITH (user journeys, F-10). On WhatsApp the word is a command, and too early it
 * is answered with one plain sentence. In the app it was read as an answer, and the person was asked a question about "finished". It is the same
 * command in the app now, with the same sentence, and it is not kept as an answer.
 */
export function isTheWordFinish(message: string): boolean {
  return /^\s*["“”']?\s*finish(?:ed)?\s*["“”']?\s*[.!]*\s*$/i.test(message ?? '');
}

