import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth"; 
import { db } from "@/db";
import { incidents, vehicles, clients } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { VehicleService } from "@/lib/services/vehicle.service";
import { withAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const handler = async (req: AuthenticatedRequest) => {
    return withAudit(req, 'GET /vehicles/[id]', async () => {
      const { id } = await context.params;
      const vehicleId = Number(id);
      const currentUser = req.user!;
      
      if (Number.isNaN(vehicleId)) {
        return NextResponse.json({ error: "Invalid vehicle ID" }, { status: 400 });
      }
      
      const { resolveUserRole } = await import("@/lib/services/role");
      const resolvedRole = await resolveUserRole(currentUser.userId);
      const isAdmin = resolvedRole === "Admin";

      const vehicle = await db.query.vehicles.findFirst({
        where: and(
          eq(vehicles.id, vehicleId),
          isAdmin ? undefined : isNull(vehicles.deletedAt)
        ),
        with: {
          incidents: isAdmin ? true : {
            where: isNull(incidents.deletedAt)
          }
        }
      });
      
      if (!vehicle) {
        return NextResponse.json({ error: "Vehicle Not Found!" }, { status: 404 });
      }
      
      if (currentUser.role === "ClientUser") {
        const clientRecord = await db.query.clients.findFirst({
          where: eq(clients.userId, currentUser.userId),
        });
        
        if (!clientRecord || vehicle.clientId !== clientRecord.userId) {
          return NextResponse.json(
            { error: "Forbidden: You cannot access this vehicle!" }, 
            { status: 403 }
          );
        }
      }
      
      return NextResponse.json(vehicle);
    });
  };

  return withAuth(handler)(request, context);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const handler = async (req: AuthenticatedRequest) => {
    return withAudit(req, 'PATCH /vehicles/[id]', async () => {
      const { id } = await context.params;
      const vehicleId = Number(id);
      const currentUser = req.user!;

      if (Number.isNaN(vehicleId)) {
        return NextResponse.json({ error: "Invalid vehicle ID" }, { status: 400 });
      }

      let body;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const updated = await VehicleService.updateVehicle(vehicleId, body, currentUser.userId);
      return NextResponse.json(updated, { status: 200 });
    });
  };

  return withAuth(handler, "Admin")(request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const handler = async (req: AuthenticatedRequest) => {
    return withAudit(req, 'DELETE /vehicles/[id]', async () => {
      const { id } = await context.params;
      const vehicleId = Number(id);
      const currentUser = req.user!;
      
      if (Number.isNaN(vehicleId)) {
        return NextResponse.json({ error: "Invalid vehicle ID" }, { status: 400 });
      }
      
      await VehicleService.deleteVehicle(vehicleId, currentUser.userId);
      return NextResponse.json({ success: true, message: "Vehicle deleted successfully." });
    });
  };

  return withAuth(handler, "Admin")(request, context);
}