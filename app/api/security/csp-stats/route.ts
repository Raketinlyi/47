import { NextResponse } from 'next/server';
import { cspMonitor } from '@/utils/csp-monitor';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = cspMonitor.getStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(
      { error: 'Failed to get CSP stats' },
      { status: 500 }
    );
  }
}
