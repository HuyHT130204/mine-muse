import { NextRequest, NextResponse } from 'next/server';

type GenStore = {
  logs: string[];
  done: boolean;
  result: unknown | null;
};

const g = globalThis as unknown as { __gen__?: GenStore };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  const state = g.__gen__ || { logs: [], done: true, result: null };
  return NextResponse.json({ success: true, logs: state.logs, done: state.done, result: state.result });
}



