/**
 * @file app/api/incidents/[id]/report/route.ts
 * @description API Endpoint: POST /api/incidents/[id]/report
 * Generates and persists an executive incident report into the `generated_reports` table.
 * Protected by authentication middleware (`withAuth`) and security audit logging (`withAudit`).
 * Restricted strictly to `Admin` and `Support Manager` roles.
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { withAudit } from "@/lib/utils/audit";
import { db } from "@/db";
import { incidents, generated_reports, incident_tasks, incident_events } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Handles POST requests to generate an executive report for a specific incident.
 *
 * @param {AuthenticatedRequest} req - Next.js request object containing authenticated user token.
 * @param {Object} props - Route parameter context.
 * @param {Promise<{ id: string }>} props.params - Incident ID parameter promise.
 * @returns {Promise<NextResponse>} JSON response containing generated report object.
 */
export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  return withAudit(req, "POST /api/incidents/[id]/report", async () => {
    const role = req.user?.role;
    if (role !== "Support Manager" && role !== "Admin") {
      return NextResponse.json(
        { error: "Forbidden: Only Support Managers and Admins can generate executive incident reports." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const rawId = (id || "").replace(/^INC-/i, "");
    const incidentId = Number(rawId);

    if (Number.isNaN(incidentId)) {
      return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
    }

    // 1. Fetch full incident details with client, vehicle, and assigned technician
    const incident = await db.query.incidents.findFirst({
      where: and(eq(incidents.id, incidentId), isNull(incidents.deletedAt)),
      with: {
        client: {
          with: {
            user: true,
          },
        },
        vehicle: true,
        assignedTo: {
          with: {
            internalUser: {
              with: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // 2. Fetch diagnostic sub-tasks
    const tasks = await db.query.incident_tasks.findMany({
      where: and(eq(incident_tasks.incidentId, incidentId), isNull(incident_tasks.deletedAt)),
    });

    // 3. Fetch activity events count
    const events = await db.query.incident_events.findMany({
      where: eq(incident_events.incidentId, incidentId),
    });

    const completedTasksCount = tasks.filter((t) => t.isCompleted).length;
    const totalTasksCount = tasks.length;
    const taskCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 100;

    const reportTitle = `Executive Incident Report INC-${String(incidentId).padStart(3, "0")}`;
    const reportSummary = `Incident #${incidentId} (${incident.title}) reported for vehicle ${
      incident.vehicle?.name || "N/A"
    } [${incident.type}] under ${incident.priority} priority. Current status: ${incident.status}. SLA State: ${
      incident.slaStatus || "Healthy"
    }. Task Completion Rate: ${taskCompletionRate}% (${completedTasksCount}/${totalTasksCount} sub-tasks completed).`;

    const reportStats = {
      incidentId,
      ticketCode: `INC-${String(incidentId).padStart(3, "0")}`,
      type: incident.type,
      priority: incident.priority,
      status: incident.status,
      slaStatus: incident.slaStatus || "Healthy",
      clientCompany: incident.client?.companyName || "Unknown Client",
      clientPhone: incident.client?.phone || "N/A",
      vehicleName: incident.vehicle?.name || "N/A",
      vehicleImei: incident.vehicle?.imei || "N/A",
      vehiclePlate: incident.vehicle?.licensePlate || "N/A",
      assignedTechnician: incident.assignedTo?.internalUser?.user?.name || "Unassigned",
      completedTasksCount,
      totalTasksCount,
      taskCompletionRate,
      activityEventsCount: events.length,
      reportedAt: incident.createdAt,
      resolvedAt: incident.resolvedAt,
      resolutionNote: incident.resolutionNote || null,
      tasksList: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        isCompleted: t.isCompleted,
        requiresProof: t.requiresProof,
        hasProof: Boolean(t.proofFileUrl),
      })),
    };

    // 4. Persist into generated_reports PostgreSQL table
    const [insertedReport] = await db
      .insert(generated_reports)
      .values({
        title: reportTitle,
        summary: reportSummary,
        stats: reportStats,
        generatedById: req.user!.userId,
        generatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        reportId: insertedReport.id,
        title: insertedReport.title,
        summary: insertedReport.summary,
        generatedAt: insertedReport.generatedAt,
        stats: reportStats,
      },
      { status: 201 }
    );
  });
});
