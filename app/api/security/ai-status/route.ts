import { NextRequest, NextResponse } from 'next/server';
import { aiSecurity } from '@/utils/ai-security';
import securityLogger from '@/utils/security-logger';
import {
  evaluateAdminRequest,
  extractClientIp,
} from '@/utils/security-admin-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type AiSecurityAction = 'analyze_request' | 'block_ip' | 'get_threat_patterns';

type AiActionPayload = {
  ip?: string;
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: string;
  userAgent?: string;
  recaptchaToken?: string;
  reason?: string;
  duration?: number;
};

const handleAiSecurityAction = async (
  action: AiSecurityAction,
  data: AiActionPayload | undefined
) => {
  const payload = data ?? {};
  switch (action) {
    case 'analyze_request':
      if (payload.ip && payload.method && payload.path) {
        const analysis = await aiSecurity.analyzeRequest(
          payload.ip,
          payload.method,
          payload.path,
          payload.headers || {},
          payload.body || '',
          payload.userAgent || '',
          payload.recaptchaToken
        );
        return NextResponse.json({ analysis });
      }
      break;

    case 'block_ip':
      if (payload.ip && payload.reason) {
        aiSecurity.blockIP(payload.ip, payload.reason, payload.duration || 60);
        return NextResponse.json({
          success: true,
          message: 'IP blocked by AI',
        });
      }
      break;

    case 'get_threat_patterns':
      return NextResponse.json({
        patterns: aiSecurity.getThreatPatterns
          ? aiSecurity.getThreatPatterns()
          : [],
      });

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
};

export async function GET(req: NextRequest) {
  try {
    const auth = evaluateAdminRequest(req);

    // Get AI security statistics
    const stats = aiSecurity.getSecurityStats();
    const baseStatus =
      stats.eventsLastHour > 50
        ? stats.threatsDetected > 5
          ? 'alert'
          : 'warning'
        : 'operational';

    if (!auth.authorized) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    }

    const aiStatus = {
      status: baseStatus,
      timestamp: new Date().toISOString(),
      aiSystem: {
        accuracy: stats.aiAccuracy,
        threatsDetected: stats.threatsDetected,
        falsePositives: stats.falsePositives,
        totalEvents: stats.totalEvents,
        eventsLastHour: stats.eventsLastHour,
        blockedIPs: stats.blockedIPs,
      },
      recentActivity: {
        threats: stats.threatsDetected,
        suspicious: stats.falsePositives,
        blocked: stats.blockedIPs,
      },
      systemHealth: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };

    return NextResponse.json(aiStatus, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-AI-Security-Status': aiStatus.status,
      },
    });
  } catch (error) {
    const ip = extractClientIp(req);
    securityLogger.logAttackAttempt(
      ip,
      'ai_security_get_failure',
      { message: error instanceof Error ? error.message : 'unknown' },
      req.headers.get('user-agent') || undefined
    );
    return NextResponse.json(
      { error: 'Failed to get AI security status' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const ip = extractClientIp(req);
  const auth = evaluateAdminRequest(req);

  if (!auth.authorized) {
    securityLogger.logAttackAttempt(
      ip,
      'unauthorized_ai_security_access',
      {
        path: req.nextUrl.pathname,
        failureReason: auth.failureReason,
      },
      req.headers.get('user-agent') || undefined
    );

    return NextResponse.json(
      {
        error: auth.tokenConfigured
          ? 'Unauthorized'
          : 'Security service unavailable',
      },
      { status: auth.tokenConfigured ? 401 : 503 }
    );
  }

  try {
    const body = await req.json();
    const schema = z.object({
      action: z.enum(['analyze_request', 'block_ip', 'get_threat_patterns']),
      data: z
        .object({
          ip: z.string().optional(),
          method: z.string().optional(),
          path: z.string().optional(),
          headers: z.record(z.string()).optional(),
          body: z.string().optional(),
          userAgent: z.string().optional(),
          recaptchaToken: z.string().optional(),
          reason: z.string().optional(),
          duration: z.number().optional(),
        })
        .optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { action, data } = parsed.data;
    const cleanData = data
      ? (Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== undefined)
        ) as AiActionPayload)
      : undefined;
    return handleAiSecurityAction(action as AiSecurityAction, cleanData);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    securityLogger.logAttackAttempt(
      ip,
      'ai_security_post_failure',
      { message },
      req.headers.get('user-agent') || undefined
    );
    return NextResponse.json(
      { error: 'Failed to process AI security action' },
      { status: 500 }
    );
  }
}
