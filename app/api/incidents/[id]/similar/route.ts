import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { SimilarIncidentService } from "@/lib/services/similar-incidents.service";
import { withAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withAudit(req, 'GET /incidents/[id]/similar', async () => {
    const { id } = await params;
    const rawId = (id || "").replace(/^INC-/i, "");
    const incidentId = Number(rawId);

    if (Number.isNaN(incidentId)) {
      return NextResponse.json({ error: "Invalid incident ID format" }, { status: 400 });
    }

    const currentUser = req.user!;
    const similarIncidents = await SimilarIncidentService.getSimilarIncidents(
      incidentId,
      currentUser.userId,
      currentUser.role
    );

    return NextResponse.json(similarIncidents, { status: 200 });
  });
}, "InternalUser");
