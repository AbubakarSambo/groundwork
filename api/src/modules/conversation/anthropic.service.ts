import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Thin wrapper around the Anthropic SDK. The system prompt is large and static
 * across a session, so we mark it with cache_control to get prompt caching —
 * the single biggest cost/latency win for this product.
 */
@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(private config: ConfigService) {
    this.client = new Anthropic({ apiKey: this.config.get<string>('anthropic.apiKey') });
    this.model = this.config.get<string>('anthropic.model') || 'claude-opus-4-8';
    this.maxTokens = this.config.get<number>('anthropic.maxTokens') || 2048;
  }

  /**
   * Run one assistant turn given the (cached) system prompt and the transcript.
   * Returns the assistant's text.
   */
  async respond(systemPrompt: string, history: ChatTurn[]): Promise<string> {
    let res: Awaited<ReturnType<typeof this.client.messages.create>>;
    try {
      res = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            // Prompt caching — the system prompt rarely changes within a session.
            cache_control: { type: 'ephemeral' },
          } as any,
        ],
        messages: history.map((t) => ({ role: t.role, content: t.content })),
      });
    } catch (err) {
      this.logger.error('respond(): Anthropic generateContent failed', err);
      throw err;
    }

    // ISSUE 1: guard against safety blocks or empty responses
    const textBlocks = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text');
    if (res.content.length === 0 || textBlocks.length === 0) {
      throw new Error('AI returned an empty response');
    }

    const text = textBlocks
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (!text) {
      throw new Error('AI returned an empty response');
    }

    return text;
  }

  /**
   * Structured extraction. Forces a tool call so we get validated JSON back
   * (used to extract record entries and pattern signals from a transcript).
   */
  async extract<T = any>(systemPrompt: string, history: ChatTurn[], tool: { name: string; description: string; input_schema: any }): Promise<T | null> {
    let res: Awaited<ReturnType<typeof this.client.messages.create>>;
    try {
      res = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } } as any],
        messages: history.map((t) => ({ role: t.role, content: t.content })),
        tools: [tool as any],
        tool_choice: { type: 'tool', name: tool.name } as any,
      });
    } catch (err) {
      this.logger.error(`extract(): Anthropic generateContent failed for tool ${tool.name}`, err);
      throw err;
    }

    const toolUse = res.content.find((b) => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined;
    if (!toolUse) {
      this.logger.warn(`extract(): model did not call tool ${tool.name}`);
      return null;
    }

    // ISSUE 4: guard against null/undefined args before casting
    const args = toolUse.input;
    if (args === null || args === undefined) {
      this.logger.warn(`extract(): tool ${tool.name} returned null/undefined args`);
      return null;
    }

    // NOTE (ISSUE 3): enum values inside input_schema are passed through to the
    // Anthropic API as-is and must NOT be uppercased. Only schema.type is uppercased
    // by convertSchema() elsewhere; enum values are left untouched intentionally.
    return args as T;
  }
}
