import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { TaskService } from "@/lib/services/task.service";
import { withAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  const handler = async (req: AuthenticatedRequest) => {
    return withAudit(req, "PATCH /incidents/[id]/tasks/[taskId]", async () => {
      const { taskId: taskIdStr } = await context.params;
      const taskId = Number(taskIdStr);

      if (Number.isNaN(taskId)) {
        return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
      }

      const body = await req.json().catch(() => null);
      if (!body) {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const updatedTask = await TaskService.updateIncidentTask(
        taskId,
        {
          isCompleted: typeof body.isCompleted === "boolean" ? body.isCompleted : undefined,
          title: typeof body.title === "string" ? body.title : undefined,
          proofFileUrl: typeof body.proofFileUrl === "string" ? body.proofFileUrl : undefined,
        },
        req.user!.userId
      );

      return NextResponse.json(updatedTask, { status: 200 });
    });
  };

  return withAuth(handler)(request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  const handler = async (req: AuthenticatedRequest) => {
    return withAudit(req, "DELETE /incidents/[id]/tasks/[taskId]", async () => {
      const { taskId: taskIdStr } = await context.params;
      const taskId = Number(taskIdStr);

      if (Number.isNaN(taskId)) {
        return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
      }

      const deletedTask = await TaskService.deleteIncidentTask(taskId);
      return NextResponse.json(deletedTask, { status: 200 });
    });
  };

  return withAuth(handler)(request, context);
}
