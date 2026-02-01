import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleCSPReport } from '@/utils/csp-monitor';

export const dynamic = 'force-dynamic';

const CspReportSchema = z
  .object({
    'csp-report': z
      .object({
        'document-uri': z.string().optional(),
        'violated-directive': z.string().optional(),
        'original-policy': z.string().optional(),
        'blocked-uri': z.string().optional(),
        'source-file': z.string().optional(),
        'line-number': z.number().optional(),
        'column-number': z.number().optional(),
      })
      .optional(),
  })
  .optional();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CspReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid CSP report payload' },
        { status: 400 }
      );
    }
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Handle CSP violation report
    handleCSPReport(body, ip, userAgent);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('CSP report error:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to process CSP report' },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'CSP Report endpoint - POST only' },
    { status: 405 }
  );
}
