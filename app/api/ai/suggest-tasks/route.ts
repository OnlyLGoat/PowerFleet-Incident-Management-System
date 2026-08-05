/**
 * @file app/api/ai/suggest-tasks/route.ts
 * @description API Endpoint: POST /api/ai/suggest-tasks
 * Generates context-aware, non-duplicative technician sub-task action plans (minimum 3 steps, scaled by complexity).
 * Protected by authentication middleware (`withAuth`) and audit logging (`withAudit`).
 * Restricted to `Support Manager` and `Admin` management roles.
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { withAudit } from "@/lib/utils/audit";
import { AiTaskSuggesterService } from "@/lib/ai/task-suggester.service";

/**
 * Handles POST requests for generating AI sub-task recommendations.
 *
 * @param {AuthenticatedRequest} req - Next.js request object wrapped with authenticated user token.
 * @returns {Promise<NextResponse>} JSON response containing array of suggested sub-tasks.
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  return withAudit(req, "POST /api/ai/suggest-tasks", async () => {
    const role = req.user?.role;
    if (role !== "Support Manager" && role !== "Admin") {
      return NextResponse.json(
        { error: "Forbidden: Only Support Managers and Admins can request task suggestions." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.incidentTitle || !body.incidentDescription) {
      return NextResponse.json(
        { error: "incidentTitle and incidentDescription are required." },
        { status: 400 }
      );
    }

    const result = await AiTaskSuggesterService.suggestSubtasks({
      incidentId: Number(body.incidentId || 0),
      incidentTitle: body.incidentTitle,
      incidentDescription: body.incidentDescription,
      vehicleName: body.vehicleName,
      category: body.category,
    });

    return NextResponse.json(result.data, { status: 200 });
  });
});
