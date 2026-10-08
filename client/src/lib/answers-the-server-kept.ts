/**
 * HOW MANY ANSWERS THE SERVER KEPT, FOR THE "FINISH MY CHECK-IN NOW" OFFER (release check, 9 October).
 *
 * The word "finish" typed on its own before there is enough is a command, not an answer: the server keeps nothing for it
 * (`isTheWordFinish`, api/src/modules/conversation/close-readiness.ts) and its floor counts only what it kept. The screen counted it
 * as an answer, so Kito, with four answers and two "finish", was offered "Finish my check-in now" and then refused by the server.
 * Counted the server's way, the offer appears only when the server will accept it.
 */
export function isTheWordFinish(message: string | null | undefined): boolean {
  return /^\s*["“”']?\s*finish(?:ed)?\s*["“”']?\s*[.!]*\s*$/i.test(message ?? '')
}

export function answersTheServerKept(msgs: { id: string; role: string; content?: string | null }[]): number {
  return msgs.filter((m) => m.role === 'PERSON' && !m.id.startsWith('local-') && !isTheWordFinish(m.content)).length
}
