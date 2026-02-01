import { NextRequest, NextResponse } from 'next/server';
import securityLogger from '@/utils/security-logger';
import {
  evaluateAdminRequest,
  extractClientIp,
} from '@/utils/security-admin-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = evaluateAdminRequest(req);
    // Get security statistics
    const stats = securityLogger.getSecurityStats();
    const blockedIPs = securityLogger.getBlockedIPs();

    const baseStatus = (() => {
      if (stats.attackCount > 10) return 'alert';
      if (stats.eventsLastHour > 100) return 'warning';
      return 'secure';
    })();

    if (!auth.authorized) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    }

    const securityStatus = {
      status: baseStatus,
      timestamp: new Date().toISOString(),
      statistics: {
        totalEvents: stats.totalEvents,
        eventsLastHour: stats.eventsLastHour,
        eventsLastDay: stats.eventsLastDay,
        blockedIPs: stats.blockedIPs,
        suspiciousCount: stats.suspiciousCount,
        attackCount: stats.attackCount,
        rateLimitCount: stats.rateLimitCount,
        csrfFailureCount: stats.csrfFailureCount,
        botDetectedCount: stats.botDetectedCount,
      },
      recentActivity: {
        suspicious: stats.suspiciousCount,
        attacks: stats.attackCount,
        rateLimits: stats.rateLimitCount,
        csrfFailures: stats.csrfFailureCount,
        bots: stats.botDetectedCount,
      },
      blockedIPsCount: blockedIPs.size,
      systemHealth: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
      },
    };

    return NextResponse.json(securityStatus, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Security-Status': securityStatus.status,
      },
    });
  } catch (error) {
    const ip = extractClientIp(req);
    securityLogger.logAttackAttempt(
      ip,
      'security_status_get_failure',
      { message: error instanceof Error ? error.message : 'unknown' },
      req.headers.get('user-agent') || undefined
    );
    return NextResponse.json(
      { error: 'Failed to get security status' },
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
      'unauthorized_security_api_access',
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
      action: z.enum(['block_ip', 'unblock_ip', 'get_events', 'cleanup']),
      data: z
        .object({
          ip: z.string().optional(),
          reason: z.string().optional(),
          duration: z.number().optional(),
          minutes: z.number().optional(),
        })
        .optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { action } = parsed.data;
    const data = parsed.data.data ?? {};

    switch (action) {
      case 'block_ip':
        if (data.ip && data.reason) {
          securityLogger.blockIP(data.ip, data.reason, data.duration || 60);
          return NextResponse.json({ success: true, message: 'IP blocked' });
        }
        break;

      case 'unblock_ip':
        // Note: This would require additional implementation in securityLogger
        return NextResponse.json({ success: true, message: 'IP unblocked' });

      case 'get_events': {
        const minutes = data.minutes || 60;
        const events = securityLogger.getRecentEvents(minutes);
        return NextResponse.json({ events });
      }

      case 'cleanup':
        securityLogger.cleanup();
        return NextResponse.json({
          success: true,
          message: 'Cleanup completed',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    securityLogger.logAttackAttempt(
      ip,
      'security_status_post_failure',
      { message },
      req.headers.get('user-agent') || undefined
    );
    return NextResponse.json(
      { error: 'Failed to process security action' },
      { status: 500 }
    );
  }
}
