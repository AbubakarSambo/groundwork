import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import * as path from 'path';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private client: GoogleGenAI;
  private model: string;
  private maxTokens: number;

  constructor(private config: ConfigService) {
    const keyPath = path.resolve(process.cwd(), 'credentials/service-account.json');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

    this.client = new GoogleGenAI({
      vertexai: true,
      project: this.config.get<string>('gemini.projectId') || 'groundwork-500011',
      location: this.config.get<string>('gemini.location') || 'us-central1',
    });
    this.model = this.config.get<string>('gemini.model') || 'gemini-2.5-pro';
    this.maxTokens = this.config.get<number>('gemini.maxTokens') || 2048;
  }

  async respond(systemPrompt: string, history: ChatTurn[]): Promise<string> {
    const contents = history.map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.content }],
    }));

    let res: Awaited<ReturnType<typeof this.client.models.generateContent>>;
    try {
      res = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: { systemInstruction: systemPrompt, maxOutputTokens: this.maxTokens },
      });
    } catch (err: any) {
      this.logger.error(`respond() Gemini call failed: ${err.message}`);
      throw err;
    }

    const text = res.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('').trim() ?? '';
    if (!text) {
      throw new Error('AI returned an empty response');
    }
    return text;
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
          maxOutputTokens: this.maxTokens,
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
    // Enum values are passed through untouched — only schema.type is uppercased.
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
