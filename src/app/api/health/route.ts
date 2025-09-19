import { NextResponse } from 'next/server';
import { ExaClient } from '../../../lib/search/exa';
import { ClaudeClient } from '../../../lib/llm/claude';

export async function GET() {
  const result: { exa: { ok: boolean; detail?: string }; claude: { ok: boolean; detail?: string }; timestamp: string } = {
    exa: { ok: false },
    claude: { ok: false },
    timestamp: new Date().toISOString(),
  };

  // Check Exa
  try {
    const exa = new ExaClient();
    const r = await exa.searchWeb('bitcoin mining sustainability 2025', { numResults: 1, includeHighlights: false, startPublishedDate: new Date(Date.now() - 1000*60*60*24*14).toISOString() });
    result.exa.ok = Array.isArray(r) && r.length >= 0;
    if (!result.exa.ok) result.exa.detail = 'no results';
  } catch (e) {
    result.exa.ok = false;
    result.exa.detail = e instanceof Error ? e.message : 'unknown error';
  }

  // Check Claude
  try {
    const claude = new ClaudeClient();
    const text = await claude.generate('Reply exactly with: OK', { maxTokens: 5, temperature: 0 });
    result.claude.ok = typeof text === 'string' && text.toUpperCase().includes('OK');
    if (!result.claude.ok) result.claude.detail = `unexpected response: ${text?.slice(0,80)}`;
  } catch (e) {
    result.claude.ok = false;
    result.claude.detail = e instanceof Error ? e.message : 'unknown error';
  }

  return NextResponse.json(result, { status: 200 });
}








