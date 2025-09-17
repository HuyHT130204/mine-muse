import { NextResponse } from 'next/server';
import { ContentPipeline } from '@/lib/pipeline';

type GenResult = {
  success: boolean;
  contentPackages?: unknown;
  errors?: string[];
  metadata?: unknown;
};

type GenStore = {
  logs: string[];
  done: boolean;
  result: GenResult | null;
};

// Simple in-memory store for progress
const g = globalThis as unknown as { __gen__?: GenStore };

export async function POST(): Promise<NextResponse> {
  try {
    if (!g.__gen__ || g.__gen__!.done) {
      g.__gen__ = { logs: [], done: false, result: null };
      const pipeline = new ContentPipeline();
      // Kick off without awaiting to allow immediate response
      void pipeline
        .generateContentWithProgress((msg) => {
          g.__gen__!.logs.push(msg);
        })
        .then((res) => {
          g.__gen__!.result = res as GenResult;
          g.__gen__!.done = true;
        })
        .catch((err) => {
          g.__gen__!.logs.push(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
          g.__gen__!.result = { success: false };
          g.__gen__!.done = true;
        });
    }

    return NextResponse.json({ success: true, started: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}


