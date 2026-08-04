import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { UserService } from "@/lib/services/user.service";
import { withAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const handler = async (req: AuthenticatedRequest) => {
    return withAudit(req, "PATCH /users/[id]", async () => {
      const { id } = await context.params;
      const targetUserId = Number(id);

      if (Number.isNaN(targetUserId)) {
        return NextResponse.json({ error: "Invalid User ID" }, { status: 400 });
      }

      let body;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const result = await UserService.updateUser(targetUserId, body, req.user!.userId);
      return NextResponse.json(result, { status: 200 });
    });
  };

  return withAuth(handler, "Admin")(request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const handler = async (req: AuthenticatedRequest) => {
    return withAudit(req, "DELETE /users/[id]", async () => {
      const { id } = await context.params;
      const targetUserId = Number(id);

      if (Number.isNaN(targetUserId)) {
        return NextResponse.json({ error: "Invalid User ID" }, { status: 400 });
      }

      const result = await UserService.deleteUser(targetUserId, req.user!.userId);
      return NextResponse.json(result, { status: 200 });
    });
  };

  return withAuth(handler, "Admin")(request, context);
}
