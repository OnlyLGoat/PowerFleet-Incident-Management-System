import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { db } from "@/db";
import { incidents, clients, vehicles, internal_users, technicians, users } from "@/db/schema";
import { eq, and, isNull, inArray, desc } from "drizzle-orm";
import { withAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  return withAudit(req, 'GET /my-tasks', async () => {
    const currentUser = req.user!;
    const role = currentUser.role;
    const isClient = role === "ClientUser";
    const isTech = role === "Technician";
    const isManagerOrAdmin = role === "Support Manager" || role === "Admin";

    try {
      type RawTaskRecord = {
        id: number;
        title: string;
        description: string;
        type: string;
        priority: string;
        status: string;
        address: string;
        slaStatus?: string | null;
        responseDueAt?: Date | null;
        resolutionDueAt?: Date | null;
        createdAt: Date | null;
        assignedToId?: number | null;
        assignedTo?: {
          internalUser?: { user?: { name?: string; email?: string } | null } | null;
        } | null;
        vehicle?: { name: string; licensePlate: string; imei?: string | null } | null;
        client?: { companyName: string; phone: string; user?: { name?: string; email?: string } | null } | null;
      };

      let tasks: RawTaskRecord[] = [];
      const summary = {
        total: 0,
        assignedToMe: 0,
        inProgress: 0,
        slaUrgent: 0,
        unassigned: 0,
      };

      let availableTechnicians: Array<{ id: number; name: string; email: string; specialty: string }> = [];

      // If Manager/Admin, fetch available technicians list for assignment dropdown
      if (isManagerOrAdmin) {
        const techRecords = await db
          .select({
            id: internal_users.userId,
            name: users.name,
            email: users.email,
            specialty: technicians.specialty,
          })
          .from(internal_users)
          .innerJoin(users, eq(internal_users.userId, users.id))
          .innerJoin(technicians, eq(internal_users.userId, technicians.internalUserId))
          .where(and(eq(internal_users.isActive, true), eq(technicians.isAvailable, true)));

        availableTechnicians = techRecords;
      }

      if (isClient) {
        // Fetch client profile
        const clientRecord = await db.query.clients.findFirst({
          where: eq(clients.userId, currentUser.userId),
        });

        if (clientRecord) {
          const clientVehicles = await db
            .select({ id: vehicles.id })
            .from(vehicles)
            .where(and(eq(vehicles.clientId, clientRecord.userId), isNull(vehicles.deletedAt)));

          const vehicleIds = clientVehicles.map(v => v.id);

          if (vehicleIds.length > 0) {
            tasks = await db.query.incidents.findMany({
              where: inArray(incidents.vehicleId, vehicleIds),
              orderBy: [desc(incidents.createdAt)],
              with: {
                vehicle: { columns: { name: true, licensePlate: true, imei: true } },
                client: {
                  columns: { companyName: true, phone: true },
                  with: { user: { columns: { name: true, email: true } } }
                }
              }
            });
          }
        }
      } else if (isTech) {
        // Fetch incidents assigned to this technician
        tasks = await db.query.incidents.findMany({
          where: eq(incidents.assignedToId, currentUser.userId),
          orderBy: [desc(incidents.createdAt)],
          with: {
            vehicle: { columns: { name: true, licensePlate: true, imei: true } },
            client: {
              columns: { companyName: true, phone: true },
              with: { user: { columns: { name: true, email: true } } }
            }
          }
        });
      } else {
        // Support Manager / Admin: Fetch all active incidents + unassigned queue
        tasks = await db.query.incidents.findMany({
          orderBy: [desc(incidents.createdAt)],
          with: {
            vehicle: { columns: { name: true, licensePlate: true, imei: true } },
            client: {
              columns: { companyName: true, phone: true },
              with: { user: { columns: { name: true, email: true } } },
            },
            assignedTo: {
              with: {
                internalUser: {
                  with: { user: { columns: { name: true, email: true } } }
                }
              }
            }
          }
        });
      }

      // Compute summary stats
      summary.total = tasks.length;
      summary.assignedToMe = tasks.filter(t => t.assignedToId === currentUser.userId).length;
      summary.inProgress = tasks.filter(t => t.status === "In Progress").length;
      summary.slaUrgent = tasks.filter(t => 
        t.slaStatus === "Warning_Response" || 
        t.slaStatus === "Breached_Response" || 
        t.priority === "Critical"
      ).length;
      summary.unassigned = tasks.filter(t => !t.assignedToId && t.status !== "Resolved" && t.status !== "Closed").length;

      return NextResponse.json({
        tasks: tasks.map(t => ({
          id: t.id,
          ticketCode: `INC-${t.id}`,
          title: t.title,
          description: t.description,
          type: t.type,
          priority: t.priority,
          status: t.status,
          address: t.address,
          slaStatus: t.slaStatus,
          responseDueAt: t.responseDueAt,
          resolutionDueAt: t.resolutionDueAt,
          createdAt: t.createdAt,
          assignedToId: t.assignedToId,
          assignedToName: t.assignedTo?.internalUser?.user?.name || null,
          assignedToEmail: t.assignedTo?.internalUser?.user?.email || null,
          vehicle: t.vehicle ? {
            name: t.vehicle.name,
            licensePlate: t.vehicle.licensePlate,
            imei: t.vehicle.imei
          } : null,
          client: t.client ? {
            companyName: t.client.companyName,
            contactName: t.client.user?.name || "Client",
            phone: t.client.phone,
            email: t.client.user?.email || null
          } : null
        })),
        summary,
        availableTechnicians,
        userRole: role
      });
    } catch (error) {
      console.error("Failed to fetch my-tasks:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}, "InternalUser");
