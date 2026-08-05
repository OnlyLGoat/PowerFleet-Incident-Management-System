import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { GET as getMyTasksGET } from "@/app/api/my-tasks/route";
import { db } from "@/db";
import { users, internal_users, clients, vehicles, incidents, technicians, support_managers, impact_links, incident_events } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

describe("My Tasks API Workspace Queue", () => {
  let techUser: { id: number };
  let techToken: string;
  let managerUser: { id: number };
  let managerToken: string;
  let clientUser: { id: number };
  let vehicleRecord: { id: number };
  let testIncidentId: number;

  beforeAll(async () => {
    // Clean up stale test users if any
    const testEmails = [
      "mytasks_tech_test@example.com",
      "mytasks_manager_test@example.com",
      "mytasks_client_test@example.com"
    ];
    const existingUsers = await db.query.users.findMany({
      where: inArray(users.email, testEmails)
    });
    if (existingUsers.length > 0) {
      const userIds = existingUsers.map(u => u.id);
      await db.delete(impact_links);
      await db.delete(incident_events);
      await db.delete(incidents).where(inArray(incidents.clientId, userIds));
      await db.delete(vehicles).where(inArray(vehicles.clientId, userIds));
      for (const u of existingUsers) {
        await db.delete(users).where(eq(users.id, u.id));
      }
    }

    // 1. Create Tech User
    const [tUser] = await db.insert(users).values({
      name: "MyTasks Tech",
      email: "mytasks_tech_test@example.com",
      password: "HashedPassword123!"
    }).returning();
    techUser = tUser;

    await db.insert(internal_users).values({
      userId: tUser.id,
      department: "Hardware",
      isActive: true
    });

    await db.insert(technicians).values({
      internalUserId: tUser.id,
      specialty: "GPS Diagnostic",
      isAvailable: true
    });

    techToken = jwt.sign({ userID: tUser.id, tokenVersion: 1, userROLE: "Technician" }, process.env.JWT_SECRET!);

    // 2. Create Manager User
    const [mUser] = await db.insert(users).values({
      name: "MyTasks Manager",
      email: "mytasks_manager_test@example.com",
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

    // 3. Create Client User & Vehicle
    const [cUser] = await db.insert(users).values({
      name: "MyTasks Client",
      email: "mytasks_client_test@example.com",
      password: "HashedPassword123!"
    }).returning();
    clientUser = cUser;

    await db.insert(clients).values({
      userId: cUser.id,
      companyName: "MyTasks Express Logistics",
      phone: "+1999888777"
    });

    const [veh] = await db.insert(vehicles).values({
      name: "Express Delivery 01",
      licensePlate: "MT-100-EX",
      imei: "86753090011",
      clientId: cUser.id
    }).returning();
    vehicleRecord = veh;

    // 4. Create Incident assigned to Tech
    const [inc] = await db.insert(incidents).values({
      title: "GPS Tracking Signal Lost",
      description: "No telemetry reported from vehicle since morning.",
      type: "GPS Device",
      priority: "High",
      status: "In Progress",
      address: "Downtown Hub",
      vehicleId: veh.id,
      clientId: cUser.id,
      reportedById: cUser.id,
      assignedToId: tUser.id
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
    if (techUser) {
      await db.delete(users).where(eq(users.id, techUser.id));
    }
    if (managerUser) {
      await db.delete(users).where(eq(users.id, managerUser.id));
    }
    if (clientUser) {
      await db.delete(clients).where(eq(clients.userId, clientUser.id));
      await db.delete(users).where(eq(users.id, clientUser.id));
    }
  });

  it("should fetch assigned tasks for technician via GET /api/my-tasks", async () => {
    const req = new NextRequest("http://localhost:3000/api/my-tasks", {
      method: "GET",
      headers: { cookie: `auth_token=${techToken}` }
    });

    const res = await getMyTasksGET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.userRole).toBe("Technician");
    expect(json.tasks.length).toBeGreaterThanOrEqual(1);
    expect(json.summary.assignedToMe).toBeGreaterThanOrEqual(1);
    expect(json.tasks[0].id).toBe(testIncidentId);
  });

  it("should return available technicians list for Support Manager", async () => {
    const req = new NextRequest("http://localhost:3000/api/my-tasks", {
      method: "GET",
      headers: { cookie: `auth_token=${managerToken}` }
    });

    const res = await getMyTasksGET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.userRole).toBe("Support Manager");
    expect(json.availableTechnicians).toBeDefined();
    expect(json.availableTechnicians.some((t: { id: number }) => t.id === techUser.id)).toBe(true);
  });

  it("should reject ClientUser from accessing /api/my-tasks with 403 Forbidden", async () => {
    const clientToken = jwt.sign({ userID: clientUser.id, tokenVersion: 1, userROLE: "ClientUser" }, process.env.JWT_SECRET!);
    const req = new NextRequest("http://localhost:3000/api/my-tasks", {
      method: "GET",
      headers: { cookie: `auth_token=${clientToken}` }
    });

    const res = await getMyTasksGET(req);
    expect(res.status).toBe(403);
  });
});
