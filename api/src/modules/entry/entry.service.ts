import { Injectable } from '@nestjs/common';
import { AnthropicService, ChatTurn } from '../conversation/anthropic.service';

const MODE_OPENING: Record<string, string> = {
  something_new: 'What is starting? Name the person or people involved and what you understand is beginning.',
  look_back: 'What is the situation you want to look at? Name the person or people involved and what specifically happened.',
  look_forward: 'What is coming up that you want to prepare for? Name who is involved and what the conversation or decision is.',
  both: 'What is the situation? Name who is involved, what has happened, and what needs to happen next.',
};

function buildEntryPrompt(mode: string): string {
  const opening = MODE_OPENING[mode] ?? MODE_OPENING['both'];
  return `You are Groundwork running an entry intake conversation.

The person has not yet created an account. Your job is to help them name what they are dealing with clearly enough to open a ground for it.

You are running a five to seven exchange intake that establishes:
1. What the situation is in their words, specifically
2. Who else is involved, named with their role
3. What the person wants to happen

OPENING: ${opening}

VOICE:
Direct, warm, specific. One question per response. No therapy language. No filler.
If the person has been specific, acknowledge what is specific before the next question.
Never use dashes as punctuation. Never use em dashes or en dashes. Use commas or periods instead.

After five to seven exchanges, when you have the situation, who is involved, and what the person wants, close with this exact format and nothing after it:

Here is what you have described: [2 to 3 sentences capturing the situation in their exact words, who is involved, and what they want to happen.]

Save this and open a ground. The conversation continues from here.

[SESSION_COMPLETE]

Only deliver the closing when you have enough context. Never place [SESSION_COMPLETE] before the closing summary.`;
}

@Injectable()
export class EntryService {
  constructor(private readonly anthropic: AnthropicService) {}

  async chat(mode: string, messages: ChatTurn[]): Promise<{ reply: string; sessionComplete: boolean }> {
    const prompt = buildEntryPrompt(mode);
    const history: ChatTurn[] = messages.length > 0 ? messages : [{ role: 'user', content: 'Begin.' }];
    let reply = await this.anthropic.respond(prompt, history);
    const sessionComplete = reply.includes('[SESSION_COMPLETE]');
    if (sessionComplete) {
      reply = reply.replace(/\[SESSION_COMPLETE\]/g, '').trim();
    }
    return { reply, sessionComplete };
  }
}
