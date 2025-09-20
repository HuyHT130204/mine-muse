import { NextResponse } from 'next/server';
import { ComprehensiveDataCollector } from '../../../../lib/comprehensive-data-collector';

export async function GET() {
  const collector = new ComprehensiveDataCollector();
  try {
    const data = await collector.collectComprehensiveData();
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      sustainability: data.sustainability,
      trends: data.trends,
      provenance: data.provenance || null,
    }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, { status: 500 });
  }
}














