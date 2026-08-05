/**
 * @file app/api/ai/triage/route.ts
 * @description API Endpoint: POST /api/ai/triage
 * Triggers autonomous AI triage analysis for incident intake.
 * Protected by authentication middleware (`withAuth`) and audit logging (`withAudit`).
 * Restricted to internal staff roles (`Support Manager`, `Admin`, `Technician`).
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { withAudit } from "@/lib/utils/audit";
import { AiTriageService } from "@/lib/ai/triage.service";

/**
 * Handles POST requests for automated incident AI triage.
 *
 * @param {AuthenticatedRequest} req - Next.js request object wrapped with authenticated user token.
 * @returns {Promise<NextResponse>} JSON response containing category, priority, downtime, and driver safety instructions.
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  return withAudit(req, "POST /api/ai/triage", async () => {
    // RBAC: Only internal staff can request AI triage
    if (req.user?.role === "ClientUser") {
      return NextResponse.json({ error: "Forbidden: Internal staff only." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.title || !body.description) {
      return NextResponse.json(
        { error: "Title and description are required for AI Triage" },
        { status: 400 }
      );
    }

    const result = await AiTriageService.analyzeIncident({
      title: body.title,
      description: body.description,
      vehicleName: body.vehicleName,
      type: body.type,
    });

    return NextResponse.json(result.data, { status: 200 });
  });
});
