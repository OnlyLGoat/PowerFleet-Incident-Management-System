import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { TaskService } from "@/lib/services/task.service";
import { withAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const handler = async (req: AuthenticatedRequest) => {
    return withAudit(req, "GET /incidents/[id]/tasks", async () => {
      const { id } = await context.params;
      const rawId = (id || "").replace(/^INC-/i, "");
      const incidentId = Number(rawId);

      if (Number.isNaN(incidentId)) {
        return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
      }

      const tasks = await TaskService.getIncidentTasks(incidentId);
      return NextResponse.json(tasks, { status: 200 });
    });
  };
  return withAuth(handler)(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const handler = async (req: AuthenticatedRequest) => {
    return withAudit(req, "POST /incidents/[id]/tasks", async () => {
      const userRole = req.user?.role;
      if (userRole !== "Support Manager" && userRole !== "Admin") {
        return NextResponse.json({ error: "Only Support Managers can create sub-tasks." }, { status: 403 });
      }

      const { id } = await context.params;
      const rawId = (id || "").replace(/^INC-/i, "");
      const incidentId = Number(rawId);

      if (Number.isNaN(incidentId)) {
        return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
      }

      const body = await req.json().catch(() => null);
      if (!body || typeof body.title !== "string" || !body.title.trim()) {
        return NextResponse.json({ error: "Sub-task title is required" }, { status: 400 });
      }

      const newTask = await TaskService.createIncidentTask(
        incidentId,
        body.title.trim(),
        req.user!.userId,
        Boolean(body.requiresProof)
      );

      return NextResponse.json(newTask, { status: 201 });
    });
  };
  return withAuth(handler)(request, context);
}
