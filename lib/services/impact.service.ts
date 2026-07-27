import { db } from "@/db";
import { incidents, impact_links } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export type ImpactRiskLevel = "Low" | "Medium" | "High";

export interface ImpactMapData {
  incident: {
    id: number;
    title: string;
    priority: string;
    status: string;
    type: string;
  };
  vehicle: {
    id: number;
    name: string;
    licensePlate: string;
    imei?: string | null;
  };
  client: {
    id: number;
    companyName: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  impact: {
    impactLevel: ImpactRiskLevel;
    relationship: "Primary" | "Secondary" | "Dependent";
    clientTicketsCount: number;
    clientOpenTickets: number;
    statusBreakdown: {
      open: number;
      inProgress: number;
      resolved: number;
      closed: number;
    };
  };
}

export class ImpactService {
  /**
   * Calculates the impact of an incident, updates impact_links table,
   * creates timeline event if needed, and returns the full impact map payload.
   */
  static async calculateAndSaveImpact(incidentId: number): Promise<ImpactMapData | null> {
    // 1. Fetch incident with vehicle & client
    const incident = await db.query.incidents.findFirst({
      where: eq(incidents.id, incidentId),
      with: {
        vehicle: true,
        client: {
          with: {
            user: {
              columns: { name: true, email: true }
            }
          }
        }
      }
    });

    if (!incident?.vehicle || !incident?.client) {
      return null;
    }

    const clientId = incident.clientId;

    // 2. Fetch all incidents belonging to this client
    const clientIncidents = await db.query.incidents.findMany({
      where: and(
        eq(incidents.clientId, clientId),
        isNull(incidents.deletedAt)
      )
    });

    const totalTickets = clientIncidents.length;
    
    // Active / Open statuses
    const openStatuses = new Set(["New", "Open", "In Progress", "Waiting Client", "Waiting Technician"]);
    const openIncidents = clientIncidents.filter(inc => openStatuses.has(inc.status));
    const clientOpenTickets = openIncidents.length;

    // Status breakdown
    const statusBreakdown = {
      open: clientIncidents.filter(i => i.status === "New" || i.status === "Open").length,
      inProgress: clientIncidents.filter(i => i.status === "In Progress" || i.status.startsWith("Waiting")).length,
      resolved: clientIncidents.filter(i => i.status === "Resolved").length,
      closed: clientIncidents.filter(i => i.status === "Closed" || i.status === "Cancelled").length
    };

    // 3. Compute Impact Risk Level (Matrix)
    // - Red (High): >= 3 open tickets OR any open ticket with Critical priority
    // - Orange (Medium): 2 open tickets OR any open ticket with High priority
    // - Green (Low): <= 1 open ticket with Low/Medium priority
    let impactLevel: ImpactRiskLevel;
    const hasCritical = openIncidents.some(i => i.priority === "Critical");
    const hasHigh = openIncidents.some(i => i.priority === "High");

    if (clientOpenTickets >= 3 || hasCritical) {
      impactLevel = "High";
    } else if (clientOpenTickets === 2 || hasHigh) {
      impactLevel = "Medium";
    } else {
      impactLevel = "Low";
    }

    const relationship = "Primary";

    // 4. Upsert / Save into impact_links table
    const existingImpactLink = await db.query.impact_links.findFirst({
      where: eq(impact_links.incidentId, incidentId)
    });

    const dbImpactLevel: "High" | "Medium" | "Low" = impactLevel;

    if (existingImpactLink) {
      await db.update(impact_links)
        .set({
          impactLevel: dbImpactLevel,
          relationship: relationship,
          clientOpenTickets: clientOpenTickets,
          vehicleId: incident.vehicleId
        })
        .where(eq(impact_links.id, existingImpactLink.id));
    } else {
      await db.insert(impact_links).values({
        incidentId: incidentId,
        vehicleId: incident.vehicleId,
        impactLevel: dbImpactLevel,
        relationship: relationship,
        clientOpenTickets: clientOpenTickets
      });
    }

    return {
      incident: {
        id: incident.id,
        title: incident.title,
        priority: incident.priority,
        status: incident.status,
        type: incident.type
      },
      vehicle: {
        id: incident.vehicle.id,
        name: incident.vehicle.name,
        licensePlate: incident.vehicle.licensePlate,
        imei: incident.vehicle.imei
      },
      client: {
        id: incident.client.userId,
        companyName: incident.client.companyName,
        name: incident.client.user?.name || "Client",
        phone: incident.client.phone,
        email: incident.client.user?.email || null
      },
      impact: {
        impactLevel: impactLevel,
        relationship: relationship,
        clientTicketsCount: totalTickets,
        clientOpenTickets: clientOpenTickets,
        statusBreakdown: statusBreakdown
      }
    };
  }
}
