import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { UserService } from "@/lib/services/user.service";
import { withAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const handler = async (req: AuthenticatedRequest) => {
    return withAudit(req, "GET /users", async () => {
      const url = new URL(req.url);
      const mode = url.searchParams.get("mode");

      if (mode === "clients") {
        const clientList = await UserService.getClients();
        return NextResponse.json(clientList, { status: 200 });
      }

      const allUsers = await UserService.getAllUsers(req.user!.userId);
      return NextResponse.json(allUsers, { status: 200 });
    });
  };

  return withAuth(handler, "Admin")(request);
}
