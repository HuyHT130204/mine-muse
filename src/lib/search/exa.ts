// Lightweight Exa.ai client for web/news search and trend harvesting
// Uses EXA_API_KEY from env. Falls back to provided runtime key if present via process.env.EXA_FALLBACK_KEY

export type ExaSearchResult = {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  score?: number;
  highlights?: string[];
  author?: string;
  siteName?: string;
};

export class ExaClient {
  private apiKey: string;
  private baseUrl = 'https://api.exa.ai';

  constructor(apiKey?: string) {
    const envKey = (process.env.EXA_API_KEY || process.env.EXA_FALLBACK_KEY || '').trim();
    this.apiKey = (apiKey || envKey);
    if (!this.apiKey) {
      console.warn('⚠️ EXA_API_KEY not set. ExaClient will throw on calls.');
    }
  }

  async searchWeb(
    query: string,
    opts?: {
      numResults?: number;
      startPublishedDate?: string;
      includeHighlights?: boolean;
      includeDomains?: string[];
      excludeDomains?: string[];
      sortBy?: 'relevance' | 'recency';
      type?: 'neural' | 'keyword' | 'auto';
    }
  ): Promise<ExaSearchResult[]> {
    if (!this.apiKey) throw new Error('Missing EXA_API_KEY');
    const body = {
      query,
      numResults: opts?.numResults ?? 10,
      type: opts?.type && opts.type !== 'auto' ? opts.type : 'neural',
      includeDomains: Array.isArray(opts?.includeDomains) && opts?.includeDomains?.length ? opts.includeDomains : undefined,
      excludeDomains: Array.isArray(opts?.excludeDomains) && opts?.excludeDomains?.length ? opts.excludeDomains : undefined,
      startPublishedDate: opts?.startPublishedDate,
      useAutoprompt: true,
      includeHighlights: opts?.includeHighlights ?? true,
      sortBy: opts?.sortBy || 'recency',
    } as Record<string, unknown>;

    // Retry/backoff for 429 and reduce numResults progressively
    let attempts = 0;
    let lastText = '';
    while (attempts < 3) {
      const res = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ ...body, numResults: Math.max(3, Math.floor((opts?.numResults ?? 10) / (attempts + 1))) }),
      });
      if (res.ok) {
        type RawResult = { id?: unknown; title?: unknown; url?: unknown; publishedDate?: unknown; score?: unknown; highlights?: unknown; author?: unknown; siteName?: unknown };
        const data = await res.json() as { results?: RawResult[] };
        const results = (data.results || []).map((r) => ({
          id: String(r.id ?? ''),
          title: String(r.title ?? ''),
          url: String(r.url ?? ''),
          publishedDate: r.publishedDate ? String(r.publishedDate) : undefined,
          score: typeof r.score === 'number' ? r.score : undefined,
          highlights: Array.isArray(r.highlights) ? r.highlights.map(String) : undefined,
          author: r.author ? String(r.author) : undefined,
          siteName: r.siteName ? String(r.siteName) : undefined,
        })) as ExaSearchResult[];
        return results;
      }
      lastText = await res.text();
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 400 * (attempts + 1)));
        attempts++;
        continue;
      }
      throw new Error(`Exa search failed: ${res.status} ${lastText}`);
    }
    throw new Error(`Exa rate limited after retries: ${lastText}`);
  }

  // Helper for running many queries and getting a unique, recency-biased set
  async batchSearchUnique(params: {
    queries: string[];
    numResults?: number;
    startPublishedDate?: string;
    includeDomains?: string[];
    excludeDomains?: string[];
  }): Promise<ExaSearchResult[]> {
    const arrays = await Promise.all(
      params.queries.map(q => this.searchWeb(q, {
        numResults: params.numResults ?? 5,
        startPublishedDate: params.startPublishedDate,
        includeHighlights: false,
        includeDomains: params.includeDomains,
        excludeDomains: params.excludeDomains,
        sortBy: 'recency',
      }).catch(() => []))
    );

    // Dedupe by URL; prefer newer then higher score
    const map = new Map<string, ExaSearchResult>();
    for (const list of arrays) {
      for (const r of list) {
        const existing = map.get(r.url);
        if (!existing) {
          map.set(r.url, r);
          continue;
        }
        const existingTs = existing.publishedDate ? Date.parse(existing.publishedDate) : 0;
        const currentTs = r.publishedDate ? Date.parse(r.publishedDate) : 0;
        if (currentTs > existingTs || ((currentTs === existingTs) && ((r.score ?? 0) > (existing.score ?? 0)))) {
          map.set(r.url, r);
        }
      }
    }
    const merged = Array.from(map.values());
    merged.sort((a, b) => (Date.parse(b.publishedDate || '0') - Date.parse(a.publishedDate || '0')) || ((b.score ?? 0) - (a.score ?? 0)));
    return merged;
  }

  // Optional: fetch extracted page contents if your Exa plan supports it
  async extractContent(url: string): Promise<string | null> {
    if (!this.apiKey) return null;
    try {
      const res = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body: JSON.stringify({ url })
      });
      if (!res.ok) return null;
      const data = await res.json() as { text?: string };
      return typeof data.text === 'string' ? data.text : null;
    } catch {
      return null;
    }
  }
}


