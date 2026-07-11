import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Groundwork house style: no em/en dashes, straight quotes only, no ellipsis
 * character, no non-breaking spaces, no double hyphens. The model tends to echo
 * en-dashes back (our own prompts contain "3-5 sentence" phrasing), so we
 * normalize every AI response at the output boundary. This text is shown to
 * customers in check-ins and reports.
 */
export function houseStyle(text: string): string {
  if (!text) return text;
  return text
    .replace(/[—–]/g, '-') // em/en dash -> hyphen
    .replace(/[“”]/g, '"') // curly double quotes -> straight
    .replace(/[‘’]/g, "'") // curly single quotes/apostrophes -> straight
    .replace(/…/g, '...') // ellipsis char -> three dots
    .replace(/ /g, ' ') // non-breaking space -> space
    .replace(/--+/g, '-'); // collapse double hyphens
}

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private client: GoogleGenAI;
  private model: string;
  private maxTokens: number;

  constructor(private config: ConfigService) {
    const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (inlineJson) {
      const keyPath = path.join(os.tmpdir(), 'gcp-service-account.json');
      fs.writeFileSync(keyPath, inlineJson, { encoding: 'utf8' });
      process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
    } else {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.cwd(), 'credentials/service-account.json');
    }

    this.client = new GoogleGenAI({
      vertexai: true,
      project: this.config.get<string>('gemini.projectId') || 'groundwork-500011',
      location: this.config.get<string>('gemini.location') || 'us-central1',
    });
    this.model = this.config.get<string>('gemini.model') || 'gemini-2.5-pro';
    this.maxTokens = this.config.get<number>('gemini.maxTokens') || 2048;
  }

  /**
   * Streaming variant of respond(). Yields answer text deltas as they arrive.
   * The caller accumulates the full text and applies houseStyle() once at the
   * end (a dash can straddle two chunks, so we do not sanitize per-delta).
   */
  async *respondStream(systemPrompt: string, history: ChatTurn[]): AsyncGenerator<string, void, unknown> {
    const contents = history.map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.content }],
    }));
    const stream = await this.client.models.generateContentStream({
      model: this.model,
      contents,
      config: { systemInstruction: systemPrompt, maxOutputTokens: this.maxTokens },
    });
    for await (const chunk of stream) {
      const parts = (chunk as any).candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        // Skip thought parts here; the answer is what we stream to the user.
        if (part?.thought) continue;
        if (part?.text) yield part.text as string;
      }
    }
  }

  async respond(systemPrompt: string, history: ChatTurn[]): Promise<string> {
    const contents = history.map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.content }],
    }));

    const TIMEOUT_MS = 90_000;
    let res: Awaited<ReturnType<typeof this.client.models.generateContent>>;
    try {
      const call = this.client.models.generateContent({
        model: this.model,
        contents,
        config: { systemInstruction: systemPrompt, maxOutputTokens: this.maxTokens },
      });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini respond() timed out after 90s')), TIMEOUT_MS),
      );
      res = await Promise.race([call, timeout]);
    } catch (err: any) {
      this.logger.error(`respond() Gemini call failed: ${err.message}`);
      throw err;
    }

    const text = res.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('').trim() ?? '';
    if (!text) {
      throw new Error('AI returned an empty response');
    }
    return houseStyle(text);
  }

  /**
   * Multimodal call: send Gemini a piece of raw media (image, PDF-as-image,
   * etc.) alongside a text prompt in the same turn. Used for document
   * assessment - Gemini can read images and PDFs directly rather than going
   * through separate OCR/parsing libraries.
   */
  async respondWithMedia(systemPrompt: string, prompt: string, media: { mimeType: string; base64: string }): Promise<string> {
    const TIMEOUT_MS = 90_000;
    let res: Awaited<ReturnType<typeof this.client.models.generateContent>>;
    try {
      const call = this.client.models.generateContent({
        model: this.model,
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: media.mimeType, data: media.base64 } },
            { text: prompt },
          ],
        }],
        config: { systemInstruction: systemPrompt, maxOutputTokens: this.maxTokens },
      });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini respondWithMedia() timed out after 90s')), TIMEOUT_MS),
      );
      res = await Promise.race([call, timeout]);
    } catch (err: any) {
      this.logger.error(`respondWithMedia() Gemini call failed: ${err.message}`);
      throw err;
    }
    const text = res.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('').trim() ?? '';
    if (!text) throw new Error('AI returned an empty response');
    return houseStyle(text);
  }

  async extract<T = any>(systemPrompt: string, history: ChatTurn[], tool: { name: string; description: string; input_schema: any }): Promise<T | null> {
    const contents = history.map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.content }],
    }));

    let res: Awaited<ReturnType<typeof this.client.models.generateContent>>;
    try {
      res = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 8192,
          tools: [{ functionDeclarations: [this.convertTool(tool)] }],
          toolConfig: {
            functionCallingConfig: {
              mode: 'ANY' as any,
              allowedFunctionNames: [tool.name],
            },
          },
        },
      });
    } catch (err: any) {
      this.logger.error(`extract() Gemini call failed: ${err.message}`);
      throw err;
    }

    const fnCall = res.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall);
    if (!fnCall?.functionCall) {
      this.logger.warn(`extract(): model did not call tool ${tool.name}`);
      return null;
    }
    // Enum values are passed through untouched - only schema.type is uppercased.
    const args = fnCall.functionCall.args;
    if (args === null || args === undefined) {
      this.logger.warn(`extract(): tool ${tool.name} returned null/undefined args`);
      return null;
    }
    return args as T;
  }

  private convertTool(tool: { name: string; description: string; input_schema: any }) {
    return {
      name: tool.name,
      description: tool.description,
      parameters: this.convertSchema(tool.input_schema),
    };
  }

  private convertSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema;
    const out: any = {};
    if (schema.type) out.type = schema.type.toUpperCase();
    if (schema.description) out.description = schema.description;
    if (schema.enum) out.enum = schema.enum;
    if (schema.required) out.required = schema.required;
    if (schema.properties) {
      out.properties = {};
      for (const [k, v] of Object.entries(schema.properties)) {
        out.properties[k] = this.convertSchema(v);
      }
    }
    if (schema.items) out.items = this.convertSchema(schema.items);
    return out;
  }
}
