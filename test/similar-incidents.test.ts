import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { GET as getSimilarIncidentsGET } from "@/app/api/incidents/[id]/similar/route";
import { GET as getSimilarQueryGET } from "@/app/api/incidents/similar/route";
import { db } from "@/db";
import { users, internal_users, support_managers, clients, vehicles, incidents } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { SimilarIncidentService } from "@/lib/services/similar-incidents.service";

describe("Similar Incidents Detection API & Service", () => {
  let internalUser: { id: number };
  let internalToken: string;
  let clientUserA: { id: number };
  let clientTokenA: string;
  let clientUserB: { id: number };
  let clientTokenB: string;
  let vehicleA: { id: number };
  let vehicleB: { id: number };
  let createdIncidentIds: number[] = [];

  beforeAll(async () => {
    // 1. Create Internal Support Manager User
    const [manager] = await db.insert(users).values({
      name: "Similar Manager",
      email: "similar_manager@example.com",
      password: "HashedPassword123!"
    }).returning();
    internalUser = manager;

    await db.insert(internal_users).values({
      userId: manager.id,
      department: "Support",
      isActive: true
    });

    await db.insert(support_managers).values({
      internalUserId: manager.id,
      canAssign: true
    });

    internalToken = jwt.sign({ userID: manager.id, tokenVersion: 1, userROLE: "Support Manager" }, process.env.JWT_SECRET!);

    // 2. Create Client User A
    const [userA] = await db.insert(users).values({
      name: "Similar Client A",
      email: "similar_client_a@example.com",
      password: "HashedPassword123!"
    }).returning();
    clientUserA = userA;

    await db.insert(clients).values({
      userId: userA.id,
      companyName: "Logistics Company A",
      phone: "+111111111"
    });
    clientTokenA = jwt.sign({ userID: userA.id, tokenVersion: 1, userROLE: "ClientUser" }, process.env.JWT_SECRET!);

    // 3. Create Client User B
    const [userB] = await db.insert(users).values({
      name: "Similar Client B",
      email: "similar_client_b@example.com",
      password: "HashedPassword123!"
    }).returning();
    clientUserB = userB;

    await db.insert(clients).values({
      userId: userB.id,
      companyName: "Logistics Company B",
      phone: "+222222222"
    });
    clientTokenB = jwt.sign({ userID: userB.id, tokenVersion: 1, userROLE: "ClientUser" }, process.env.JWT_SECRET!);

    // 4. Create Vehicles
    const [vA] = await db.insert(vehicles).values({
      name: "Truck Alpha",
      licensePlate: "SIM-101-AA",
      imei: "990011223344",
      clientId: userA.id
    }).returning();
    vehicleA = vA;

    const [vB] = await db.insert(vehicles).values({
      name: "Truck Beta",
      licensePlate: "SIM-202-BB",
      imei: "990011223355",
      clientId: userB.id
    }).returning();
    vehicleB = vB;

    // 5. Create Incidents for Client A
    const [incA1] = await db.insert(incidents).values({
      title: "GPS Device Connection Failure",
      description: "GPS signal dropped during transport.",
      type: "GPS Device",
      priority: "High",
      status: "New",
      address: "Route 66, Logistics Hub A",
      vehicleId: vA.id,
      clientId: userA.id,
      reportedById: userA.id
    }).returning();

    const [incA2] = await db.insert(incidents).values({
      title: "GPS Device Intermittent Signal",
      description: "Loss of GPS signal on Truck Alpha.",
      type: "GPS Device",
      priority: "Medium",
      status: "Resolved",
      address: "Route 66, Logistics Hub A",
      vehicleId: vA.id,
      clientId: userA.id,
      reportedById: userA.id
    }).returning();

    // 6. Create Incident for Client B
    const [incB1] = await db.insert(incidents).values({
      title: "GPS Device Disconnected",
      description: "Truck Beta GPS offline.",
      type: "GPS Device",
      priority: "High",
      status: "Open",
      address: "Highway 10, Port B",
      vehicleId: vB.id,
      clientId: userB.id,
      reportedById: userB.id
    }).returning();

    createdIncidentIds = [incA1.id, incA2.id, incB1.id];
  });

  afterAll(async () => {
    if (createdIncidentIds.length > 0) {
      await db.delete(incidents).where(inArray(incidents.id, createdIncidentIds));
    }
    if (vehicleA) await db.delete(vehicles).where(eq(vehicles.id, vehicleA.id));
    if (vehicleB) await db.delete(vehicles).where(eq(vehicles.id, vehicleB.id));
    if (clientUserA) {
      await db.delete(clients).where(eq(clients.userId, clientUserA.id));
      await db.delete(users).where(eq(users.id, clientUserA.id));
    }
    if (clientUserB) {
      await db.delete(clients).where(eq(clients.userId, clientUserB.id));
      await db.delete(users).where(eq(users.id, clientUserB.id));
    }
    if (internalUser) {
      await db.delete(users).where(eq(users.id, internalUser.id));
    }
  });

  it("should calculate and return similar incidents for Internal User", async () => {
    const targetId = createdIncidentIds[0];
    const similar = await SimilarIncidentService.getSimilarIncidents(
      targetId,
      internalUser.id,
      "Support Manager"
    );

    expect(similar.length).toBeGreaterThanOrEqual(1);
    expect(similar[0].id).toBe(createdIncidentIds[1]);
    expect(similar[0].similarityReason).toContain("Same Vehicle");
    expect(similar[0].similarityReason).toContain("Matching Type");
  });

  it("should return similar incidents via GET /api/incidents/[id]/similar for Internal User", async () => {
    const targetId = createdIncidentIds[0];
    const req = new NextRequest(`http://localhost:3000/api/incidents/${targetId}/similar`, {
      method: "GET",
      headers: { cookie: `auth_token=${internalToken}` }
    });

    const res = await getSimilarIncidentsGET(req, { params: Promise.resolve({ id: targetId.toString() }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.some((i: { id: number }) => i.id === createdIncidentIds[1])).toBe(true);
  });

  it("should support query parameter GET /api/incidents/similar?incidentId=X for Internal User", async () => {
    const targetId = createdIncidentIds[0];
    const req = new NextRequest(`http://localhost:3000/api/incidents/similar?incidentId=${targetId}`, {
      method: "GET",
      headers: { cookie: `auth_token=${internalToken}` }
    });

    const res = await getSimilarQueryGET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  it("should reject ClientUser from accessing similar incidents routes with 403 Forbidden", async () => {
    const targetId = createdIncidentIds[0];
    const reqParam = new NextRequest(`http://localhost:3000/api/incidents/${targetId}/similar`, {
      method: "GET",
      headers: { cookie: `auth_token=${clientTokenA}` }
    });
    const reqQuery = new NextRequest(`http://localhost:3000/api/incidents/similar?incidentId=${targetId}`, {
      method: "GET",
      headers: { cookie: `auth_token=${clientTokenB}` }
    });

    const resParam = await getSimilarIncidentsGET(reqParam, { params: Promise.resolve({ id: targetId.toString() }) });
    const resQuery = await getSimilarQueryGET(reqQuery);

    expect(resParam.status).toBe(403);
    expect(resQuery.status).toBe(403);
  });
});
