// Minimal Claude (Anthropic) client for text generation

export class ClaudeClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private version: string;

  constructor(params?: { apiKey?: string; baseUrl?: string; model?: string; version?: string }) {
    // Prefer explicit CLAUDE_API_KEY; allow user-provided runtime override via CLAUDE_RUNTIME_KEY
    const runtimeKey = (process.env.CLAUDE_RUNTIME_KEY || '').trim();
    this.apiKey = (params?.apiKey || runtimeKey || process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '').trim();
    this.baseUrl = (params?.baseUrl || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
    this.model = params?.model || process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620';
    this.version = params?.version || process.env.ANTHROPIC_VERSION || '2023-06-01';
    if (!this.apiKey) {
      console.warn('⚠️ CLAUDE_API_KEY not set. ClaudeClient will throw on calls.');
    }
  }

  async generate(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<string> {
    if (!this.apiKey) throw new Error('Missing CLAUDE_API_KEY');
    const body = {
      model: this.model,
      max_tokens: options?.maxTokens ?? 1200,
      temperature: options?.temperature ?? 0.6,
      messages: [
        { role: 'user', content: prompt }
      ],
    } as Record<string, unknown>;

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.version,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Claude generate failed: ${res.status} ${await res.text()}`);
    const data = await res.json() as { content?: Array<{ type: string; text?: string }>; };
    const parts = Array.isArray(data.content) ? data.content : [];
    const text = parts.map(p => p.text || '').join('\n').trim();
    return text;
  }
}


