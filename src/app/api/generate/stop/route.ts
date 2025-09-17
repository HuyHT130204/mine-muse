import { NextResponse } from 'next/server';

type GenStore = {
  logs: string[];
  done: boolean;
  result: any | null;
};

const g = globalThis as unknown as { __gen__?: GenStore };

export async function POST() {
  try {
    if (g.__gen__) {
      g.__gen__!.logs.push('User requested stop');
      g.__gen__!.done = true;
      g.__gen__!.result = { success: false, cancelled: true };
    }
    return NextResponse.json({ success: true, stopped: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}



