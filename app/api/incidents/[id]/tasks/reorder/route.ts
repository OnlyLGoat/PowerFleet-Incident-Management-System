import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { TaskService } from "@/lib/services/task.service";
import { withAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export const POST = withAuth(
  async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    return withAudit(req, "POST /incidents/[id]/tasks/reorder", async () => {
      const { id } = await params;
      const rawId = (id || "").replace(/^INC-/i, "");
      const incidentId = Number(rawId);

      if (Number.isNaN(incidentId)) {
        return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
      }

      const body = await req.json().catch(() => null);
      if (!body || !Array.isArray(body.taskIds)) {
        return NextResponse.json({ error: "taskIds array is required" }, { status: 400 });
      }

      const updatedTasks = await TaskService.reorderIncidentTasks(incidentId, body.taskIds);
      return NextResponse.json(updatedTasks, { status: 200 });
    });
  }
);
