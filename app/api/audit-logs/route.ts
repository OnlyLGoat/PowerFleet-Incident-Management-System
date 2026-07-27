import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { db } from "@/db";
import { security_audit_events, incident_events, incidents, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { withAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  return withAudit(req, 'GET /audit-logs', async () => {
    try {
      // 1. Fetch Security Audit Events with User Info
      const securityLogs = await db
        .select({
          id: security_audit_events.id,
          ipAddress: security_audit_events.ipAddress,
          attemptedEndpoint: security_audit_events.attemptedEndpoint,
          statusCode: security_audit_events.statusCode,
          message: security_audit_events.message,
          incidentTargetId: security_audit_events.incidentTragetId,
          userId: security_audit_events.userId,
          createdAt: security_audit_events.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(security_audit_events)
        .leftJoin(users, eq(security_audit_events.userId, users.id))
        .orderBy(desc(security_audit_events.createdAt))
        .limit(100);

      // 2. Fetch Incident Timeline & Event Logs (Place of Incident Events)
      const incidentEventsList = await db
        .select({
          id: incident_events.id,
          incidentId: incident_events.incidentId,
          eventType: incident_events.eventType,
          oldValue: incident_events.oldValue,
          newValue: incident_events.newValue,
          message: incident_events.message,
          createdAt: incident_events.createdAt,
          incidentTitle: incidents.title,
          actorName: users.name,
          actorEmail: users.email,
        })
        .from(incident_events)
        .leftJoin(incidents, eq(incident_events.incidentId, incidents.id))
        .leftJoin(users, eq(incident_events.userId, users.id))
        .orderBy(desc(incident_events.createdAt))
        .limit(150);

      // Filter out automated system calculation messages
      const filteredEvents = incidentEventsList.filter(
        (e) => !e.message.startsWith("Impact Map calculated:")
      );

      // 3. Calculate Security Analytics & Health Metrics
      const totalSecurityAudits = securityLogs.length;
      const criticalViolations = securityLogs.filter((l) => l.statusCode >= 400);
      const successfulRequests = securityLogs.filter((l) => l.statusCode >= 200 && l.statusCode < 300);
      const uniqueIps = new Set(securityLogs.map((l) => l.ipAddress)).size;

      // Group by endpoint for analytics
      const endpointCounts: Record<string, number> = {};
      securityLogs.forEach((l) => {
        const ep = l.attemptedEndpoint;
        endpointCounts[ep] = (endpointCounts[ep] || 0) + 1;
      });

      const topEndpoints = Object.entries(endpointCounts)
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Group by Status Code Distribution
      const statusCounts: Record<string, number> = { "2xx OK": 0, "4xx Client Error": 0, "5xx Server Error": 0 };
      securityLogs.forEach((l) => {
        if (l.statusCode >= 200 && l.statusCode < 300) statusCounts["2xx OK"]++;
        else if (l.statusCode >= 400 && l.statusCode < 500) statusCounts["4xx Client Error"]++;
        else if (l.statusCode >= 500) statusCounts["5xx Server Error"]++;
      });

      return NextResponse.json({
        securityLogs,
        incidentEvents: filteredEvents,
        analytics: {
          totalSecurityAudits,
          criticalViolationsCount: criticalViolations.length,
          successfulRequestsCount: successfulRequests.length,
          uniqueIps,
          totalIncidentEvents: filteredEvents.length,
          topEndpoints,
          statusDistribution: [
            { name: "2xx Success", count: statusCounts["2xx OK"], color: "#10b981" },
            { name: "4xx Client Errors", count: statusCounts["4xx Client Error"], color: "#f59e0b" },
            { name: "5xx Server Errors", count: statusCounts["5xx Server Error"], color: "#f43f5e" },
          ],
        },
      });
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}, "Admin");
