/**
 * @file app/api/ai/approve/route.ts
 * @description API Endpoint: POST /api/ai/approve
 * Accepts, validates, and batch-inserts selected AI-generated sub-task suggestions into the `incident_tasks`
 * database table with automatic order sequence positioning and user attribution.
 * Protected by authentication middleware (`withAuth`) and audit logging (`withAudit`).
 * Restricted to `Support Manager` and `Admin` management roles.
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { withAudit } from "@/lib/utils/audit";
import { db } from "@/db";
import { incident_tasks, incidents } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Task item structure expected in approval payload.
 *
 * @interface AcceptedTaskInput
 * @property {string} title - Task title string.
 * @property {string} [description] - Optional detailed diagnostic instruction.
 * @property {boolean} [requiresProof] - Flag indicating photo evidence requirement.
 */
interface AcceptedTaskInput {
  title: string;
  description?: string;
  requiresProof?: boolean;
}

/**
 * Handles POST requests for batch committing approved AI sub-tasks to PostgreSQL.
 *
 * @param {AuthenticatedRequest} req - Next.js request object containing incidentId and acceptedTasks/approvedTasks array.
 * @returns {Promise<NextResponse>} JSON response containing status code 201 and inserted task records.
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  return withAudit(req, "POST /api/ai/approve", async () => {
    const role = req.user?.role;
    if (role !== "Support Manager" && role !== "Admin") {
      return NextResponse.json(
        { error: "Forbidden: Only Support Managers and Admins can approve AI suggestions." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const tasksArray = body?.acceptedTasks || body?.approvedTasks;

    if (!body || !body.incidentId || !Array.isArray(tasksArray)) {
      return NextResponse.json(
        { error: "incidentId and acceptedTasks (or approvedTasks) array are required." },
        { status: 400 }
      );
    }

    const incidentId = Number(body.incidentId);
    if (Number.isNaN(incidentId)) {
      return NextResponse.json({ error: "Invalid incidentId" }, { status: 400 });
    }

    const incident = await db.query.incidents.findFirst({
      where: eq(incidents.id, incidentId),
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident Not Found" }, { status: 404 });
    }

    const acceptedTasks: AcceptedTaskInput[] = tasksArray;
    if (acceptedTasks.length === 0) {
      return NextResponse.json({ message: "No tasks selected. None committed." }, { status: 200 });
    }

    // Determine starting order index based on existing tasks
    const existingTasks = await db.query.incident_tasks.findMany({
      where: and(eq(incident_tasks.incidentId, incidentId), isNull(incident_tasks.deletedAt)),
    });

    let currentOrder = existingTasks.reduce((max, t) => Math.max(max, t.order ?? 0), -1) + 1;

    const insertedRecords = [];
    for (const task of acceptedTasks) {
      if (!task.title || !task.title.trim()) continue;

      const [newTask] = await db
        .insert(incident_tasks)
        .values({
          incidentId,
          title: task.title.trim(),
          isCompleted: false,
          order: currentOrder++,
          requiresProof: task.requiresProof ?? false,
          createdByUserId: req.user!.userId,
        })
        .returning();

      insertedRecords.push(newTask);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully approved and committed ${insertedRecords.length} sub-tasks to incident #${incidentId}.`,
        insertedCount: insertedRecords.length,
        tasks: insertedRecords,
      },
      { status: 201 }
    );
  });
});
