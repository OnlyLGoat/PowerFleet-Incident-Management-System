import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { GET as getImpactGET } from "@/app/api/incidents/[id]/impact/route";
import { db } from "@/db";
import { users, internal_users, support_managers, clients, vehicles, incidents, impact_links, incident_events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ImpactService } from "@/lib/services/impact.service";

describe("Impact Map System", () => {
  let clientUser: { id: number };
  let clientToken: string;
  let managerUser: { id: number };
  let managerToken: string;
  let vehicleRecord: { id: number };
  let testIncidentId: number;

  beforeAll(async () => {
    // 1. Create test Client User
    const [cUser] = await db.insert(users).values({
      name: "Impact Client User",
      email: "impact_client_test@example.com",
      password: "HashedPassword123!"
    }).returning();
    clientUser = cUser;

    await db.insert(clients).values({
      userId: cUser.id,
      companyName: "Impact TransLogistics Ltd",
      phone: "+1234567890"
    });

    clientToken = jwt.sign({ userID: cUser.id, tokenVersion: 1, userROLE: "ClientUser" }, process.env.JWT_SECRET!);

    // 2. Create test Support Manager User
    const [mUser] = await db.insert(users).values({
      name: "Impact Manager User",
      email: "impact_manager_test@example.com",
      password: "HashedPassword123!"
    }).returning();
    managerUser = mUser;

    await db.insert(internal_users).values({
      userId: mUser.id,
      department: "Oversight",
      isActive: true
    });

    await db.insert(support_managers).values({
      internalUserId: mUser.id,
      canAssign: true
    });

    managerToken = jwt.sign({ userID: mUser.id, tokenVersion: 1, userROLE: "Support Manager" }, process.env.JWT_SECRET!);

    // 3. Create vehicle
    const [veh] = await db.insert(vehicles).values({
      name: "Impact Truck 01",
      licensePlate: "IMP-999-XP",
      imei: "86753090099",
      clientId: cUser.id
    }).returning();
    vehicleRecord = veh;

    // 4. Create incident
    const [inc] = await db.insert(incidents).values({
      title: "Engine Overheating on Highway",
      description: "Severe engine temp spike observed during transit.",
      type: "Vehicle",
      priority: "Critical",
      status: "New",
      address: "Route 66",
      vehicleId: veh.id,
      clientId: cUser.id,
      reportedById: cUser.id
    }).returning();
    testIncidentId = inc.id;
  });

  afterAll(async () => {
    if (testIncidentId) {
      await db.delete(impact_links).where(eq(impact_links.incidentId, testIncidentId));
      await db.delete(incident_events).where(eq(incident_events.incidentId, testIncidentId));
      await db.delete(incidents).where(eq(incidents.id, testIncidentId));
    }
    if (vehicleRecord) {
      await db.delete(vehicles).where(eq(vehicles.id, vehicleRecord.id));
    }
    if (clientUser) {
      await db.delete(clients).where(eq(clients.userId, clientUser.id));
      await db.delete(users).where(eq(users.id, clientUser.id));
    }
    if (managerUser) {
      await db.delete(users).where(eq(users.id, managerUser.id));
    }
  });

  it("should calculate and save impact data with High risk for Critical incident", async () => {
    const impactData = await ImpactService.calculateAndSaveImpact(testIncidentId);

    expect(impactData).not.toBeNull();
    expect(impactData?.incident.id).toBe(testIncidentId);
    expect(impactData?.client.companyName).toBe("Impact TransLogistics Ltd");
    expect(impactData?.vehicle.licensePlate).toBe("IMP-999-XP");
    expect(impactData?.impact.impactLevel).toBe("High");
    expect(impactData?.impact.clientOpenTickets).toBeGreaterThanOrEqual(1);

    // Verify DB insertion in impact_links
    const savedLink = await db.query.impact_links.findFirst({
      where: eq(impact_links.incidentId, testIncidentId)
    });
    expect(savedLink).toBeDefined();
    expect(savedLink?.impactLevel).toBe("High");
  });

  it("should return impact payload via GET /api/incidents/[id]/impact for Support Manager", async () => {
    const req = new NextRequest(`http://localhost:3000/api/incidents/${testIncidentId}/impact`, {
      method: "GET",
      headers: { cookie: `auth_token=${managerToken}` }
    });

    const res = await getImpactGET(req, { params: Promise.resolve({ id: testIncidentId.toString() }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.incident.id).toBe(testIncidentId);
    expect(json.client.companyName).toBe("Impact TransLogistics Ltd");
    expect(json.impact.impactLevel).toBe("High");
  });

  it("should reject ClientUser from accessing Impact API with 403 Forbidden", async () => {
    const req = new NextRequest(`http://localhost:3000/api/incidents/${testIncidentId}/impact`, {
      method: "GET",
      headers: { cookie: `auth_token=${clientToken}` }
    });

    const res = await getImpactGET(req, { params: Promise.resolve({ id: testIncidentId.toString() }) });
    expect(res.status).toBe(403);
  });
});
