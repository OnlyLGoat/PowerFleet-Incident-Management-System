import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { ImpactService } from "@/lib/services/impact.service";
import { withAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  return withAudit(req, 'GET /incidents/[id]/impact', async () => {
    const { id } = await params;
    const rawId = (id || "").replace(/^INC-/i, "");
    const incidentId = Number(rawId);

    if (Number.isNaN(incidentId)) {
      return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
    }

    if (req.user?.role !== "Admin" && req.user?.role !== "Support Manager") {
      return NextResponse.json({ error: "Forbidden: Only Admin and Support Manager can view Impact Map data" }, { status: 403 });
    }

    const impactData = await ImpactService.calculateAndSaveImpact(incidentId);

    if (!impactData) {
      return NextResponse.json({ error: "Incident or Impact Data not found" }, { status: 404 });
    }

    return NextResponse.json(impactData, { status: 200 });
  });
});
