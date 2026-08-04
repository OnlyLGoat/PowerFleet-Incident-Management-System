import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";

export const dynamic = "force-dynamic";
import { db } from "@/db";
import { incidents, clients, vehicles, security_audit_events } from "@/db/schema";
import { eq, ne, or, inArray, count, isNull, and, desc, SQL } from "drizzle-orm";
import { withAudit } from "@/lib/utils/audit";

function createZeroStatsResponse() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return NextResponse.json({
    total: 0,
    active: 0,
    resolved: 0,
    vehiclesCount: 0,
    slaWarnings: 0,
    slaOverdue: 0,
    categoryDistribution: [],
    dailySlaBreakdown: days.map(day => ({ day, healthy: 0, warning: 0, overdue: 0 })),
    dailyCategoryBreakdown: days.map(day => ({ day, gps: 0, vehicle: 0, fuel: 0, accident: 0 })),
    dailyStatusBreakdown: days.map(day => ({ day, open: 0, inProgress: 0, resolved: 0 })),
    recentIncidents: [],
    recentAuditLogs: [],
  });
}

function processSlaBreakdown(sla: string | null, dayName: string, map: Record<string, { healthy: number; warning: number; overdue: number }>) {
  const status = sla || "Healthy";
  if (status.startsWith("Overdue")) {
    map[dayName].overdue += 1;
  } else if (status.startsWith("Warning")) {
    map[dayName].warning += 1;
  } else {
    map[dayName].healthy += 1;
  }
}

function processCategoryBreakdown(typeStr: string | null, dayName: string, map: Record<string, { gps: number; vehicle: number; fuel: number; accident: number }>) {
  const type = (typeStr || "").toLowerCase();
  if (type.includes("gps")) {
    map[dayName].gps += 1;
  } else if (type.includes("vehicle") || type.includes("defect") || type.includes("engine")) {
    map[dayName].vehicle += 1;
  } else if (type.includes("fuel")) {
    map[dayName].fuel += 1;
  } else if (type.includes("accident") || type.includes("crash")) {
    map[dayName].accident += 1;
  } else {
    map[dayName].gps += 1;
  }
}

function processStatusBreakdown(st: string | null, dayName: string, map: Record<string, { open: number; inProgress: number; resolved: number }>) {
  const status = st || "New";
  if (status === "Resolved" || status === "Closed") {
    map[dayName].resolved += 1;
  } else if (status === "In Progress" || status === "Waiting Client" || status === "Waiting Technician") {
    map[dayName].inProgress += 1;
  } else {
    map[dayName].open += 1;
  }
}

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  return withAudit(req, 'GET /incidents/stats', async () => {
    const currentUser = req.user!;
    const isClient = currentUser.role === "ClientUser";

    try {
      let clientVehicleIds: number[] = [];

      // If ClientUser, fetch only their company's vehicle IDs
      if (isClient) {
        const clientRecord = await db.query.clients.findFirst({
          where: eq(clients.userId, currentUser.userId),
        });

        if (clientRecord) {
          const clientVehicles = await db
            .select({ id: vehicles.id })
            .from(vehicles)
            .where(and(eq(vehicles.clientId, clientRecord.userId), isNull(vehicles.deletedAt)));

          clientVehicleIds = clientVehicles.map((v) => v.id);
        }

        // If client has no vehicles, return zeroed metrics immediately
        if (clientVehicleIds.length === 0) {
          return createZeroStatsResponse();
        }
      }

      // Base query filter
      let baseFilter: SQL | undefined = isClient
        ? inArray(incidents.vehicleId, clientVehicleIds)
        : undefined;

      if (currentUser.role === "Technician") {
        baseFilter = eq(incidents.assignedToId, currentUser.userId);
      }

      // 1. Total Incidents Count
      const [totalResult] = await db
        .select({ total: count() })
        .from(incidents)
        .where(baseFilter);

      // 2. Active Incidents Count
      const [activeResult] = await db
        .select({ active: count() })
        .from(incidents)
        .where(
          and(
            baseFilter,
            inArray(incidents.status, ["New", "Open", "In Progress", "Waiting Client", "Waiting Technician"])
          )
        );

      // 3. Resolved Incidents Count
      const [resolvedResult] = await db
        .select({ resolved: count() })
        .from(incidents)
        .where(
          and(
            baseFilter,
            inArray(incidents.status, ["Resolved", "Closed"])
          )
        );

      // 4. SLA Warnings & Breaches (for internal users)
      const [slaWarningResult] = await db
        .select({ count: count() })
        .from(incidents)
        .where(
          and(
            baseFilter,
            inArray(incidents.slaStatus, ["Warning_Response", "Warning_Resolution"])
          )
        );

      const [slaOverdueResult] = await db
        .select({ count: count() })
        .from(incidents)
        .where(
          and(
            baseFilter,
            inArray(incidents.slaStatus, ["Overdue_Response", "Overdue_Resolution", "Overdue_Both"])
          )
        );

      // 5. Category Distribution (Group by type)
      const categoryRows = await db
        .select({
          category: incidents.type,
          count: count(),
        })
        .from(incidents)
        .where(baseFilter)
        .groupBy(incidents.type);

      // 6. Fetch All Incidents for Daily SLA, Category & Status Breakdown calculations
      const allIncidents = await db
        .select({
          slaStatus: incidents.slaStatus,
          status: incidents.status,
          type: incidents.type,
          createdAt: incidents.createdAt,
        })
        .from(incidents)
        .where(baseFilter);

      const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      
      const dailySlaMap: Record<string, { healthy: number; warning: number; overdue: number }> = {
        Mon: { healthy: 0, warning: 0, overdue: 0 },
        Tue: { healthy: 0, warning: 0, overdue: 0 },
        Wed: { healthy: 0, warning: 0, overdue: 0 },
        Thu: { healthy: 0, warning: 0, overdue: 0 },
        Fri: { healthy: 0, warning: 0, overdue: 0 },
        Sat: { healthy: 0, warning: 0, overdue: 0 },
        Sun: { healthy: 0, warning: 0, overdue: 0 },
      };

      const dailyCatMap: Record<string, { gps: number; vehicle: number; fuel: number; accident: number }> = {
        Mon: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
        Tue: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
        Wed: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
        Thu: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
        Fri: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
        Sat: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
        Sun: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
      };

      const dailyStatusMap: Record<string, { open: number; inProgress: number; resolved: number }> = {
        Mon: { open: 0, inProgress: 0, resolved: 0 },
        Tue: { open: 0, inProgress: 0, resolved: 0 },
        Wed: { open: 0, inProgress: 0, resolved: 0 },
        Thu: { open: 0, inProgress: 0, resolved: 0 },
        Fri: { open: 0, inProgress: 0, resolved: 0 },
        Sat: { open: 0, inProgress: 0, resolved: 0 },
        Sun: { open: 0, inProgress: 0, resolved: 0 },
      };

      allIncidents.forEach((inc) => {
        const d = inc.createdAt ? new Date(inc.createdAt) : new Date();
        const dayName = daysOfWeek[d.getDay()];
        if (!dailySlaMap[dayName]) return;

        processSlaBreakdown(inc.slaStatus, dayName, dailySlaMap);
        processCategoryBreakdown(inc.type, dayName, dailyCatMap);
        processStatusBreakdown(inc.status, dayName, dailyStatusMap);
      });

      const dailySlaBreakdown = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
        day,
        healthy: dailySlaMap[day].healthy,
        warning: dailySlaMap[day].warning,
        overdue: dailySlaMap[day].overdue,
      }));

      const dailyCategoryBreakdown = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
        day,
        gps: dailyCatMap[day].gps,
        vehicle: dailyCatMap[day].vehicle,
        fuel: dailyCatMap[day].fuel,
        accident: dailyCatMap[day].accident,
      }));

      const dailyStatusBreakdown = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
        day,
        open: dailyStatusMap[day].open,
        inProgress: dailyStatusMap[day].inProgress,
        resolved: dailyStatusMap[day].resolved,
      }));

      // 7. Recent Active/Critical Incidents (Limit 1 for Tech/Client, Limit 5 for Admin/Manager)
      const recentLimit = (isClient || currentUser.role === "Technician") ? 1 : 5;
      const recentIncidents = await db.query.incidents.findMany({
        where: baseFilter,
        orderBy: [desc(incidents.createdAt)],
        limit: recentLimit,
        with: {
          vehicle: {
            columns: { name: true, licensePlate: true },
          },
        },
      });

      // 8. Recent Security Audit Events (Only accessible by Admin)
      const isAdmin = currentUser.role === "Admin";
      const recentAuditLogs = isAdmin
        ? await db
            .select()
            .from(security_audit_events)
            .where(
              and(
                ne(security_audit_events.attemptedEndpoint, "GET /incidents/stats"),
                or(
                  isNull(security_audit_events.userId),
                  ne(security_audit_events.userId, currentUser.userId)
                )
              )
            )
            .orderBy(desc(security_audit_events.createdAt))
            .limit(4)
        : [];

      // 9. Top Impacted Clients Summary (For Internal Users: Support Manager, Admin, Technician)
      let topImpactedClients: Array<{
        clientId: number;
        companyName: string;
        contactName: string;
        openTickets: number;
        totalTickets: number;
        impactLevel: "Low" | "Medium" | "High";
        latestIncidentId: number | null;
      }> = [];

      if (!isClient) {
        const clientList = await db.query.clients.findMany({
          with: {
            user: { columns: { name: true } }
          }
        });

        for (const c of clientList) {
          const clientVehicles = await db
            .select({ id: vehicles.id })
            .from(vehicles)
            .where(and(eq(vehicles.clientId, c.userId), isNull(vehicles.deletedAt)));
          
          const vehicleIds = clientVehicles.map(v => v.id);
          if (vehicleIds.length === 0) continue;

          const clientIncidents = await db.query.incidents.findMany({
            where: inArray(incidents.vehicleId, vehicleIds),
            orderBy: [desc(incidents.createdAt)]
          });

          const totalCount = clientIncidents.length;
          const openIncidents = clientIncidents.filter(i => 
            i.status !== "Resolved" && i.status !== "Closed"
          );
          const openCount = openIncidents.length;

          if (totalCount === 0) continue;

          let impactLevel: "Low" | "Medium" | "High" = "Low";
          const hasCritical = openIncidents.some(i => i.priority === "Critical");
          const hasHigh = openIncidents.some(i => i.priority === "High");

          if (openCount >= 3 || hasCritical) {
            impactLevel = "High";
          } else if (openCount === 2 || hasHigh) {
            impactLevel = "Medium";
          }

          topImpactedClients.push({
            clientId: c.userId,
            companyName: c.companyName,
            contactName: c.user?.name || "Client",
            openTickets: openCount,
            totalTickets: totalCount,
            impactLevel: impactLevel,
            latestIncidentId: clientIncidents[0]?.id || null
          });
        }

        topImpactedClients.sort((a, b) => {
          const order = { High: 3, Medium: 2, Low: 1 };
          return order[b.impactLevel] - order[a.impactLevel];
        });

        topImpactedClients = topImpactedClients.slice(0, 4);
      }

      return NextResponse.json({
        total: totalResult?.total ?? 0,
        active: activeResult?.active ?? 0,
        resolved: resolvedResult?.resolved ?? 0,
        vehiclesCount: clientVehicleIds.length,
        slaWarnings: slaWarningResult?.count ?? 0,
        slaOverdue: slaOverdueResult?.count ?? 0,
        categoryDistribution: categoryRows.map((r) => ({
          category: r.category,
          count: Number(r.count),
        })),
        dailySlaBreakdown,
        dailyCategoryBreakdown,
        dailyStatusBreakdown,
        recentIncidents: recentIncidents.map((inc) => ({
          id: inc.id,
          ticketCode: `INC-${inc.id}`,
          title: inc.title,
          type: inc.type,
          priority: inc.priority,
          status: inc.status,
          slaStatus: inc.slaStatus,
          createdAt: inc.createdAt,
          vehicle: inc.vehicle ? `${inc.vehicle.name} (${inc.vehicle.licensePlate})` : "N/A",
        })),
        recentAuditLogs: recentAuditLogs.map((log) => ({
          id: log.id,
          attemptedEndpoint: log.attemptedEndpoint,
          message: log.message,
          statusCode: log.statusCode,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt,
        })),
        topImpactedClients,
      });
    } catch (error) {
      console.error("Failed to compute dashboard stats:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
});
