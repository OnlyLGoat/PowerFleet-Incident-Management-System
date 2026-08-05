/**
 * @file app/api/ai/similar-incidents/route.ts
 * @description API Endpoint: POST /api/ai/similar-incidents
 * Executes Retrieval-Augmented Generation (RAG) scanning across historical resolved PostgreSQL tickets
 * to match failure symptoms, extract proven fixes, suggest spare parts, and return matched ticket link.
 * Protected by authentication middleware (`withAuth`) and audit logging (`withAudit`).
 * Restricted to internal staff roles (`Support Manager`, `Admin`, `Technician`).
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { withAudit } from "@/lib/utils/audit";
import { AiSimilarIntelligenceService } from "@/lib/ai/similar-intelligence.service";

/**
 * Handles POST requests for RAG Historical Repair Intelligence retrieval.
 *
 * @param {AuthenticatedRequest} req - Next.js request object wrapped with authenticated user session.
 * @returns {Promise<NextResponse>} JSON response containing similarity score, proven fix summary, and matched past ticket ID.
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  return withAudit(req, "POST /api/ai/similar-incidents", async () => {
    const role = req.user?.role;
    if (role !== "Support Manager" && role !== "Admin" && role !== "Technician") {
      return NextResponse.json({ error: "Forbidden: Internal staff only." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.incidentId) {
      return NextResponse.json({ error: "incidentId is required." }, { status: 400 });
    }

    const incidentId = Number(body.incidentId);
    if (Number.isNaN(incidentId)) {
      return NextResponse.json({ error: "Invalid incidentId" }, { status: 400 });
    }

    const result = await AiSimilarIntelligenceService.getIncidentIntelligence(incidentId);

    return NextResponse.json(result.data, { status: 200 });
  });
});
