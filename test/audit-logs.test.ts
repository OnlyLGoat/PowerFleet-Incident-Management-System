import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { GET as getAuditLogsGET } from "@/app/api/audit-logs/route";
import { db } from "@/db";
import { users, internal_users, admins, clients, technicians, support_managers, security_audit_events } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("Audit Logs & Event Feed API", () => {
  let adminUser: { id: number };
  let adminToken: string;
  let clientUser: { id: number };
  let clientToken: string;
  let techUser: { id: number };
  let techToken: string;
  let managerUser: { id: number };
  let managerToken: string;

  beforeAll(async () => {
    // 1. Create Admin User
    const [admin] = await db.insert(users).values({
      name: "Audit Admin",
      email: "audit_admin_test@example.com",
      password: "HashedPassword123!"
    }).returning();
    adminUser = admin;

    const [adminInt] = await db.insert(internal_users).values({
      userId: admin.id,
      department: "Security",
      isActive: true
    }).returning();

    await db.insert(admins).values({
      internalUserId: adminInt.userId,
      canManageUsers: true
    });

    adminToken = jwt.sign({ userID: admin.id, tokenVersion: 1, userROLE: "Admin" }, process.env.JWT_SECRET!);

    // 2. Create Client User
    const [client] = await db.insert(users).values({
      name: "Audit Client",
      email: "audit_client_test@example.com",
      password: "HashedPassword123!"
    }).returning();
    clientUser = client;

    await db.insert(clients).values({
      userId: client.id,
      companyName: "Audit Test Corp",
      phone: "+12345"
    });

    clientToken = jwt.sign({ userID: client.id, tokenVersion: 1, userROLE: "ClientUser" }, process.env.JWT_SECRET!);

    // 3. Create Tech User
    const [tech] = await db.insert(users).values({
      name: "Audit Tech",
      email: "audit_tech_test@example.com",
      password: "HashedPassword123!"
    }).returning();
    techUser = tech;

    await db.insert(internal_users).values({
      userId: tech.id,
      department: "Field",
      isActive: true
    });

    await db.insert(technicians).values({
      internalUserId: tech.id,
      specialty: "Hardware",
      isAvailable: true
    });

    techToken = jwt.sign({ userID: tech.id, tokenVersion: 1, userROLE: "Technician" }, process.env.JWT_SECRET!);

    // 4. Create Manager User
    const [manager] = await db.insert(users).values({
      name: "Audit Manager",
      email: "audit_manager_test@example.com",
      password: "HashedPassword123!"
    }).returning();
    managerUser = manager;

    await db.insert(internal_users).values({
      userId: manager.id,
      department: "Oversight",
      isActive: true
    });

    await db.insert(support_managers).values({
      internalUserId: manager.id,
      canAssign: true
    });

    managerToken = jwt.sign({ userID: manager.id, tokenVersion: 1, userROLE: "Support Manager" }, process.env.JWT_SECRET!);

    // 5. Create dummy security audit log event
    await db.insert(security_audit_events).values({
      ipAddress: "127.0.0.1",
      attemptedEndpoint: "POST /api/incidents",
      statusCode: 201,
      message: "Incident Created",
      userId: admin.id
    });
  });

  afterAll(async () => {
    if (adminUser) await db.delete(users).where(eq(users.id, adminUser.id));
    if (clientUser) await db.delete(users).where(eq(users.id, clientUser.id));
    if (techUser) await db.delete(users).where(eq(users.id, techUser.id));
    if (managerUser) await db.delete(users).where(eq(users.id, managerUser.id));
  });

  it("should return security audit logs and analytics for Admin user", async () => {
    const req = new NextRequest("http://localhost:3000/api/audit-logs", {
      method: "GET",
      headers: { cookie: `auth_token=${adminToken}` }
    });

    const res = await getAuditLogsGET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.securityLogs).toBeDefined();
    expect(json.incidentEvents).toBeDefined();
    expect(json.analytics.totalSecurityAudits).toBeGreaterThanOrEqual(1);
  });

  it("should reject non-Admin users (Client, Tech, Support Manager) with 403 Forbidden", async () => {
    const reqClient = new NextRequest("http://localhost:3000/api/audit-logs", {
      method: "GET",
      headers: { cookie: `auth_token=${clientToken}` }
    });
    const reqTech = new NextRequest("http://localhost:3000/api/audit-logs", {
      method: "GET",
      headers: { cookie: `auth_token=${techToken}` }
    });
    const reqManager = new NextRequest("http://localhost:3000/api/audit-logs", {
      method: "GET",
      headers: { cookie: `auth_token=${managerToken}` }
    });

    expect((await getAuditLogsGET(reqClient)).status).toBe(403);
    expect((await getAuditLogsGET(reqTech)).status).toBe(403);
    expect((await getAuditLogsGET(reqManager)).status).toBe(403);
  });
});
