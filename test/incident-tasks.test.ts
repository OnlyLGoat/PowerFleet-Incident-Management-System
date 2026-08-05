import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as getTasksGET, POST as createTaskPOST } from "@/app/api/incidents/[id]/tasks/route";
import { POST as reorderTasksPOST } from "@/app/api/incidents/[id]/tasks/reorder/route";
import { PATCH as updateTaskPATCH, DELETE as deleteTaskDELETE } from "@/app/api/incidents/[id]/tasks/[taskId]/route";
import { PATCH as updateIncidentPATCH } from "@/app/api/incidents/[id]/route";
import { db } from "@/db";
import { users, internal_users, technicians, support_managers, clients, vehicles, incidents, incident_tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

describe("Incident Sub-Tasks Checklist & Resolution Guard API", () => {
  let techUserId: number;
  let techToken: string;
  let vehicleId: number;
  let incidentId: number;
  const createdTaskIds: number[] = [];

  beforeAll(async () => {
    // 1. Create Support Manager User
    const [userRecord] = await db
      .insert(users)
      .values({
        name: "Test Task Manager",
        email: `manager_tasks_${Date.now()}@example.com`,
        password: "HashedPassword123!",
      })
      .returning();

    techUserId = userRecord.id;

    await db.insert(internal_users).values({
      userId: techUserId,
      department: "Field Support",
      isActive: true,
    });

    await db.insert(support_managers).values({
      internalUserId: techUserId,
      canAssign: true,
    });

    await db.insert(technicians).values({
      internalUserId: techUserId,
      specialty: "Telemetry Systems",
      isAvailable: true,
    });

    techToken = jwt.sign(
      { userID: techUserId, tokenVersion: 1 },
      process.env.JWT_SECRET || "default_jwt_secret_key_for_powerfleet_ims_2026"
    );

    // 2. Create Client & Vehicle
    const [clientUser] = await db
      .insert(users)
      .values({
        name: "Test Task Client",
        email: `client_tasks_${Date.now()}@example.com`,
        password: "HashedPassword123!",
      })
      .returning();

    await db.insert(clients).values({
      userId: clientUser.id,
      companyName: "Task Fleet Corp",
      phone: "+1234567890",
    });

    const [v] = await db
      .insert(vehicles)
      .values({
        name: "Task Truck #1",
        imei: `888${Date.now()}`,
        licensePlate: `TASK-${Date.now().toString().slice(-4)}`,
        clientId: clientUser.id,
      })
      .returning();

    vehicleId = v.id;

    // 3. Create Incident assigned to Tech
    const [inc] = await db
      .insert(incidents)
      .values({
        title: "GPS Wiring Damage",
        description: "Intermittent connection loss",
        type: "GPS Device",
        priority: "High",
        status: "In Progress",
        address: "777 Fleet Ave",
        clientId: clientUser.id,
        vehicleId: vehicleId,
        reportedById: clientUser.id,
        assignedToId: techUserId,
      })
      .returning();

    incidentId = inc.id;
  });

  afterAll(async () => {
    // Cleanup tasks, incident, tech, client, vehicle
    if (createdTaskIds.length > 0) {
      for (const tid of createdTaskIds) {
        await db.delete(incident_tasks).where(eq(incident_tasks.id, tid));
      }
    }
    if (incidentId) {
      await db.delete(incidents).where(eq(incidents.id, incidentId));
    }
    if (vehicleId) {
      await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
    }
    if (techUserId) {
      await db.delete(support_managers).where(eq(support_managers.internalUserId, techUserId));
      await db.delete(technicians).where(eq(technicians.internalUserId, techUserId));
      await db.delete(internal_users).where(eq(internal_users.userId, techUserId));
      await db.delete(users).where(eq(users.id, techUserId));
    }
  });

  it("should create sub-tasks via POST /api/incidents/[id]/tasks", async () => {
    const req = new NextRequest(`http://localhost/api/incidents/${incidentId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_token=${techToken}`,
      },
      body: JSON.stringify({ title: "Inspect wire harness" }),
    });

    const res = await createTaskPOST(req, { params: Promise.resolve({ id: String(incidentId) }) });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe("Inspect wire harness");
    expect(data.isCompleted).toBe(false);
    createdTaskIds.push(data.id);
  });

  it("should fetch sub-tasks list via GET /api/incidents/[id]/tasks", async () => {
    const req = new NextRequest(`http://localhost/api/incidents/${incidentId}/tasks`, {
      method: "GET",
      headers: { Cookie: `auth_token=${techToken}` },
    });

    const res = await getTasksGET(req, { params: Promise.resolve({ id: String(incidentId) }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it("should block resolving incident when sub-tasks remain uncompleted (400 Bad Request)", async () => {
    const req = new NextRequest(`http://localhost/api/incidents/${incidentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_token=${techToken}`,
      },
      body: JSON.stringify({
        status: "Resolved",
        message: "Attempting resolution with open tasks",
      }),
    });

    const res = await updateIncidentPATCH(req, { params: Promise.resolve({ id: String(incidentId) }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("sub-task");
  });

  it("should block completing sub-task out of order (400 Bad Request)", async () => {
    // Create second task
    const reqCreate = new NextRequest(`http://localhost/api/incidents/${incidentId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_token=${techToken}`,
      },
      body: JSON.stringify({ title: "Second diagnostic step" }),
    });

    const resCreate = await createTaskPOST(reqCreate, { params: Promise.resolve({ id: String(incidentId) }) });
    const dataCreate = await resCreate.json();
    createdTaskIds.push(dataCreate.id);

    // Attempt to mark second task as completed while first task is incomplete
    const secondTaskId = dataCreate.id;
    const reqOut = new NextRequest(`http://localhost/api/incidents/${incidentId}/tasks/${secondTaskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_token=${techToken}`,
      },
      body: JSON.stringify({ isCompleted: true }),
    });

    const resOut = await updateTaskPATCH(reqOut, {
      params: Promise.resolve({ id: String(incidentId), taskId: String(secondTaskId) }),
    });

    expect(resOut.status).toBe(400);
    const dataOut = await resOut.json();
    expect(dataOut.error).toContain("Strict Sequential Order");
  });

  it("should toggle task completion sequentially in order via PATCH /api/incidents/[id]/tasks/[taskId]", async () => {
    // Complete first task first
    const firstTaskId = createdTaskIds[0];
    const req1 = new NextRequest(`http://localhost/api/incidents/${incidentId}/tasks/${firstTaskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_token=${techToken}`,
      },
      body: JSON.stringify({ isCompleted: true }),
    });

    const res1 = await updateTaskPATCH(req1, {
      params: Promise.resolve({ id: String(incidentId), taskId: String(firstTaskId) }),
    });
    expect(res1.status).toBe(200);

    // Complete second task second
    const secondTaskId = createdTaskIds[1];
    const req2 = new NextRequest(`http://localhost/api/incidents/${incidentId}/tasks/${secondTaskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_token=${techToken}`,
      },
      body: JSON.stringify({ isCompleted: true }),
    });

    const res2 = await updateTaskPATCH(req2, {
      params: Promise.resolve({ id: String(incidentId), taskId: String(secondTaskId) }),
    });
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.isCompleted).toBe(true);
  });

  it("should reorder sub-tasks via POST /api/incidents/[id]/tasks/reorder", async () => {
    const req = new NextRequest(`http://localhost/api/incidents/${incidentId}/tasks/reorder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_token=${techToken}`,
      },
      body: JSON.stringify({ taskIds: createdTaskIds }),
    });

    const res = await reorderTasksPOST(req, { params: Promise.resolve({ id: String(incidentId) }) });
    expect(res.status).toBe(200);
  });

  it("should allow resolving incident once 100% of sub-tasks are completed", async () => {
    const req = new NextRequest(`http://localhost/api/incidents/${incidentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_token=${techToken}`,
      },
      body: JSON.stringify({
        status: "Resolved",
        message: "All sub-tasks completed and verified",
      }),
    });

    const res = await updateIncidentPATCH(req, { params: Promise.resolve({ id: String(incidentId) }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("Resolved");
  });

  it("should soft-delete sub-task via DELETE /api/incidents/[id]/tasks/[taskId]", async () => {
    const taskId = createdTaskIds[0];
    const req = new NextRequest(`http://localhost/api/incidents/${incidentId}/tasks/${taskId}`, {
      method: "DELETE",
      headers: { Cookie: `auth_token=${techToken}` },
    });

    const res = await deleteTaskDELETE(req, {
      params: Promise.resolve({ id: String(incidentId), taskId: String(taskId) }),
    });
    expect(res.status).toBe(200);
  });
});
