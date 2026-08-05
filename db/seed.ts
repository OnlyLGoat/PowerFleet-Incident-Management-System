import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import * as relations from "./relations";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL is not set in environment.");
  process.exit(1);
}

const queryClient = postgres(connectionString);
const db = drizzle(queryClient, { schema: { ...schema, ...relations } });

async function seed() {
  console.log("🌱 Starting PowerFleet IMS database seeding...");

  console.log("🧹 Cleaning existing data...");
  await db.execute(sql`TRUNCATE TABLE users, vehicles, incidents, incident_comments, incident_events, incident_internal_notes, incident_tasks, security_audit_events RESTART IDENTITY CASCADE;`);

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // 1. Create Users
  console.log("👤 Creating Users...");

  // Admin
  const [adminUser] = await db.insert(schema.users).values({
    name: "Alex Mercer",
    email: "admin@powerfleet.com",
    password: hashedPassword,
  }).returning();

  const [adminInternal] = await db.insert(schema.internal_users).values({
    userId: adminUser.id,
    department: "Executive & Systems Administration",
  }).returning();

  await db.insert(schema.admins).values({
    internalUserId: adminInternal.userId,
    canManageUsers: true,
  });

  // Support Manager
  const [managerUser] = await db.insert(schema.users).values({
    name: "Sarah Jenkins",
    email: "manager@powerfleet.com",
    password: hashedPassword,
  }).returning();

  const [managerInternal] = await db.insert(schema.internal_users).values({
    userId: managerUser.id,
    department: "Customer Support & Dispatch",
  }).returning();

  await db.insert(schema.support_managers).values({
    internalUserId: managerInternal.userId,
    canAssign: true,
  });

  // Technicians
  const techData = [
    { name: "David Miller", email: "tech.david@powerfleet.com", specialty: "GPS & Telematics Hardware" },
    { name: "Elena Rostova", email: "tech.elena@powerfleet.com", specialty: "Engine & OBD Diagnostics" },
    { name: "Marcus Vance", email: "tech.marcus@powerfleet.com", specialty: "Fuel Sensors & Calibration" },
    { name: "Claire Dupont", email: "tech.claire@powerfleet.com", specialty: "Electrical Systems & Batteries" },
  ];

  const techInternalIds: number[] = [];

  for (const t of techData) {
    const [u] = await db.insert(schema.users).values({
      name: t.name,
      email: t.email,
      password: hashedPassword,
    }).returning();

    const [iu] = await db.insert(schema.internal_users).values({
      userId: u.id,
      department: "Fleet Operations Field Tech",
    }).returning();

    await db.insert(schema.technicians).values({
      internalUserId: iu.userId,
      specialty: t.specialty,
      isAvailable: true,
    });

    techInternalIds.push(iu.userId);
  }

  // Clients
  const clientData = [
    { name: "Robert Vance", email: "client.logistics@transcorp.com", company: "TransCorp Logistics Ltd", phone: "+1 (555) 019-2831" },
    { name: "Samantha Reed", email: "client.fleet@metrotransport.com", company: "Metro Transport Inc", phone: "+1 (555) 038-1920" },
    { name: "Daniel Hayes", email: "client.ops@apexexpress.com", company: "Apex Express Global", phone: "+1 (555) 084-2731" },
  ];

  const clientUserIds: number[] = [];

  for (const c of clientData) {
    const [u] = await db.insert(schema.users).values({
      name: c.name,
      email: c.email,
      password: hashedPassword,
    }).returning();

    await db.insert(schema.clients).values({
      userId: u.id,
      companyName: c.company,
      phone: c.phone,
    });

    clientUserIds.push(u.id);
  }

  console.log("🚚 Creating Fleet Vehicles...");
  const vehicleList = [
    { name: "Heavy Duty Hauler T-800", imei: "867543091827364", licensePlate: "FLT-8921-X", clientId: clientUserIds[0] },
    { name: "Delivery Van V-40", imei: "867543091827365", licensePlate: "VAN-3391-B", clientId: clientUserIds[0] },
    { name: "Express Cargo Truck C-12", imei: "867543091827366", licensePlate: "TRK-5542-C", clientId: clientUserIds[1] },
    { name: "Refrigerated Transport R-09", imei: "867543091827367", licensePlate: "REF-7712-D", clientId: clientUserIds[1] },
    { name: "City Shuttle S-05", imei: "867543091827368", licensePlate: "SHT-1124-E", clientId: clientUserIds[2] },
    { name: "Urban Fleet Hauler H-15", imei: "867543091827369", licensePlate: "HUR-9943-F", clientId: clientUserIds[2] },
  ];

  const vehicleIds: number[] = [];

  for (const v of vehicleList) {
    const [veh] = await db.insert(schema.vehicles).values({
      name: v.name,
      imei: v.imei,
      licensePlate: v.licensePlate,
      clientId: v.clientId,
      createdBy: adminInternal.userId,
    }).returning();
    vehicleIds.push(veh.id);
  }

  console.log("⚠️ Creating Fleet Incidents (6 incidents, 3 similar pairs)...");
  const baseTime = Date.now();

  const incidentList: Array<typeof schema.incidents.$inferInsert> = [
    // --- PAIR 1: GPS & Telematics Signal Loss ---
    {
      // INC-001 (Resolved Past Ticket)
      title: "GPS Telematics Unit Complete Cellular & Satellite Disconnection",
      description: `INCIDENT SUMMARY:
During interstate cargo transport on I-95 North, telematics unit #86754309 experienced a total loss of cellular telemetry and GPS location pings at Mile Marker 42.

DIAGNOSTIC FINDINGS & ROOT CAUSE:
• Primary GPS receiver stopped pinging server due to oxidized coaxial antenna connector pin and loose wiring harness behind dashboard.
• Cellular telemetry signal frequency dropped to 0 dBm.

PROVEN RESOLUTION & REPAIR STEPS:
1. Replaced RG-58 antenna coaxial cable and cleaned chassis ground terminal.
2. Re-seated SMA connector and performed remote diagnostic reboot.
3. Restored signal strength to 100% capacity.`,
      type: "GPS Device",
      priority: "Critical",
      status: "Resolved",
      address: "I-95 North, Mile Marker 42, Philadelphia, PA",
      latitude: 39.9526,
      longitude: -75.1652,
      slaStatus: "Met",
      resolvedAt: new Date(baseTime - 5 * 24 * 60 * 60 * 1000),
      resolutionNote: "Replaced RG-58 antenna coaxial cable, cleaned grounding points, and re-seated SMA connector.",
      clientId: clientUserIds[0],
      vehicleId: vehicleIds[0],
      reportedById: clientUserIds[0],
      assignedToId: techInternalIds[0],
    },
    {
      // INC-002 (In Progress - Similar to INC-001)
      title: "Telematics Unit Signal Loss & GPS Disconnection on I-95",
      description: `INCIDENT SUMMARY:
During scheduled cargo transit on I-95 North near Mile Marker 45, telematics unit lost all cellular telemetry connection and GPS location tracking.

OBSERVATIONS:
• Telemetry pings halted suddenly while vehicle was traveling at 65 mph.
• Diagnostic readings show 0 dBm signal voltage, indicating potential oxidized antenna cable connector or loose wiring harness.
• Field technician required to inspect antenna cabling and reset unit.`,
      type: "GPS Device",
      priority: "Critical",
      status: "In Progress",
      address: "I-95 North, Mile Marker 45, Philadelphia, PA",
      latitude: 39.9550,
      longitude: -75.1600,
      slaStatus: "Healthy",
      clientId: clientUserIds[0],
      vehicleId: vehicleIds[1],
      reportedById: clientUserIds[0],
      assignedToId: techInternalIds[0],
    },

    // --- PAIR 2: Fuel Sensor Anomaly & Short Circuit ---
    {
      // INC-003 (Resolved Past Ticket)
      title: "Fuel Level Sensor Telemetry Drop & Short Circuit",
      description: `INCIDENT SUMMARY:
Fuel probe sensor reading abruptly dropped from 85% capacity down to 10% in under 2 minutes at Newark Container Terminal.

DIAGNOSTIC FINDINGS & ROOT CAUSE:
• Physical inspection revealed CAN-bus Line B grounding short circuit (voltage dropped from 5.0V to 0.2V flat line).
• No actual fuel leakage; sensor probe wire harness was pinched against engine frame.

PROVEN RESOLUTION & REPAIR STEPS:
1. Replaced fuel level probe wire harness and insulated CAN-bus line B.
2. Cleaned grounding terminal bolt and cleared sensor fault code in ECU.
3. Verified stable 5.0V telemetry output.`,
      type: "Fuel",
      priority: "High",
      status: "Resolved",
      address: "Port Newark Container Terminal, Newark, NJ",
      latitude: 40.6892,
      longitude: -74.1687,
      slaStatus: "Met",
      resolvedAt: new Date(baseTime - 8 * 24 * 60 * 60 * 1000),
      resolutionNote: "Replaced fuel level probe wire harness, insulated CAN-bus line B, cleaned grounding terminal.",
      clientId: clientUserIds[1],
      vehicleId: vehicleIds[2],
      reportedById: clientUserIds[1],
      assignedToId: techInternalIds[2],
    },
    {
      // INC-004 (In Progress - Similar to INC-003)
      title: "Sudden Fuel Level Telemetry Drop & Voltage Failure",
      description: `INCIDENT SUMMARY:
The fleet monitoring portal flagged an instant fuel telemetry drop from 90% to 12% while idling at Newark Port.

OBSERVATIONS:
• Engine fuel consumption rates remain completely normal with zero physical fuel leaks.
• CAN-bus line voltage dropped down to 0.2V flat line, suspecting fuel probe wire harness short circuit or grounding fault.
• Technician assigned to test analog output voltage and probe wiring.`,
      type: "Fuel",
      priority: "High",
      status: "In Progress",
      address: "Port Newark Container Terminal, Newark, NJ",
      latitude: 40.6900,
      longitude: -74.1700,
      slaStatus: "Warning_Resolution",
      clientId: clientUserIds[1],
      vehicleId: vehicleIds[3],
      reportedById: clientUserIds[1],
      assignedToId: techInternalIds[2],
    },

    // --- PAIR 3: Hydraulic Brake Pressure Loss & Fluid Leak ---
    {
      // INC-005 (Resolved Past Ticket)
      title: "Hydraulic Brake Pressure Warning & Master Cylinder Fitting Leak",
      description: `INCIDENT SUMMARY:
Brake system low pressure warning alert activated on vehicle dashboard with brake line pressure dropping below 40 PSI threshold.

DIAGNOSTIC FINDINGS & ROOT CAUSE:
• Found hydraulic brake fluid leak near master cylinder fitting due to worn O-ring seal.
• Driver reported soft brake pedal travel and reduced braking efficiency.

PROVEN RESOLUTION & REPAIR STEPS:
1. Replaced master cylinder hydraulic line fitting and dual O-ring seals.
2. Flushed brake fluid system and refilled with DOT-4 heavy duty brake fluid.
3. Re-pressurized system to 65 PSI and conducted full emergency braking road test.`,
      type: "Vehicle",
      priority: "Critical",
      status: "Resolved",
      address: "Distribution Center 4, Baltimore, MD",
      latitude: 39.2904,
      longitude: -76.6122,
      slaStatus: "Met",
      resolvedAt: new Date(baseTime - 12 * 24 * 60 * 60 * 1000),
      resolutionNote: "Replaced master cylinder line fitting and O-rings, flushed DOT-4 fluid, re-pressurized to 65 PSI.",
      clientId: clientUserIds[2],
      vehicleId: vehicleIds[4],
      reportedById: clientUserIds[2],
      assignedToId: techInternalIds[1],
    },
    {
      // INC-006 (Open - Similar to INC-005)
      title: "Brake Line Hydraulic Pressure Loss & Low Fluid Alert",
      description: `INCIDENT SUMMARY:
Low brake pressure indicator triggered on Heavy Duty Hauler vehicle dashboard. Hydraulic line pressure reads 35 PSI (normal > 60 PSI).

OBSERVATIONS:
• Driver noticed soft brake pedal response during cargo delivery stop.
• Initial check suggests hydraulic fluid leakage around master cylinder fitting or line seal.
• Requires technician dispatch to replace cylinder seals, flush line fluid, and test pressure.`,
      type: "Vehicle",
      priority: "Critical",
      status: "Open",
      address: "Apex Hub Warehouse 12, Brooklyn, NY",
      latitude: 40.6782,
      longitude: -73.9442,
      slaStatus: "Healthy",
      clientId: clientUserIds[2],
      vehicleId: vehicleIds[5],
      reportedById: clientUserIds[2],
      assignedToId: techInternalIds[1],
    },
  ];

  const createdIncidentIds: number[] = [];

  for (let i = 0; i < incidentList.length; i++) {
    const inc = incidentList[i];
    const daysAgo = (i + 1) * 2;
    const historicalDate = new Date(baseTime - daysAgo * 24 * 60 * 60 * 1000);

    const [created] = await db.insert(schema.incidents).values({
      ...inc,
      createdAt: inc.createdAt || historicalDate,
      updatedAt: inc.updatedAt || historicalDate,
    }).returning();
    createdIncidentIds.push(created.id);
  }

  console.log("📋 Adding Sequential Tasks Checklist to Active Incidents...");
  const sampleTasks = [
    { title: "Perform OBD-II diagnostic scan and capture fault codes", order: 1, isCompleted: true },
    { title: "Inspect physical wiring harness and ground connectors", order: 2, isCompleted: true },
    { title: "Replace faulty sensor / telematics hardware module", order: 3, isCompleted: false },
    { title: "Recalibrate signal receiver and conduct road test verification", order: 4, isCompleted: false },
  ];

  for (const t of sampleTasks) {
    await db.insert(schema.incident_tasks).values({
      incidentId: createdIncidentIds[0],
      title: t.title,
      order: t.order,
      isCompleted: t.isCompleted,
      createdByUserId: techInternalIds[0],
    });
  }

  for (const t of sampleTasks.slice(0, 2)) {
    await db.insert(schema.incident_tasks).values({
      incidentId: createdIncidentIds[2],
      title: t.title,
      order: t.order,
      isCompleted: t.isCompleted,
      createdByUserId: techInternalIds[1],
    });
  }

  console.log("💬 Adding Discussion Comments & Internal Notes...");
  await db.insert(schema.incident_comments).values([
    {
      incidentId: createdIncidentIds[0],
      userId: clientUserIds[0],
      body: "Driver reported signal dropped right near Exit 42. Could this be a loose cellular antenna cable?",
      visibility: "Public",
    },
    {
      incidentId: createdIncidentIds[0],
      userId: techInternalIds[0],
      body: "Field technician dispatched to Pennsylvania depot. I will test the antenna cable continuity first.",
      visibility: "Public",
    },
    {
      incidentId: createdIncidentIds[1],
      userId: clientUserIds[0],
      body: "Please check if the fuel probe replacement is covered under warranty.",
      visibility: "Public",
    },
  ]);

  await db.insert(schema.incident_internal_notes).values([
    {
      incidentId: createdIncidentIds[0],
      authorId: managerInternal.userId,
      title: "SLA Priority Escalation",
      body: "High priority client TransCorp. Dispatched tech David Miller with high urgency kit.",
      priority: "High",
      visibility: "Private",
      isPinned: true,
    },
    {
      incidentId: createdIncidentIds[1],
      authorId: techInternalIds[2],
      title: "Probe Testing Protocol",
      body: "Tested voltage output: 0.2V flat line. Transmitter board component replacement required.",
      priority: "Medium",
      visibility: "Private",
      isPinned: false,
    },
  ]);

  console.log("📜 Adding Audit Events...");
  await db.insert(schema.incident_events).values([
    {
      incidentId: createdIncidentIds[0],
      userId: clientUserIds[0],
      eventType: "create_incident",
      message: "Incident created by client Robert Vance",
    },
    {
      incidentId: createdIncidentIds[0],
      userId: managerUser.id,
      eventType: "technician_assigned",
      oldValue: "Unassigned",
      newValue: "David Miller",
      message: "Technician David Miller assigned to incident",
    },
    {
      incidentId: createdIncidentIds[0],
      userId: techInternalIds[0],
      eventType: "status_changed",
      oldValue: "New",
      newValue: "In Progress",
      message: "Status updated to In Progress",
    },
  ]);

  await db.insert(schema.security_audit_events).values([
    {
      ipAddress: "192.168.1.104",
      attemptedEndpoint: "/api/incidents",
      statusCode: 200,
      message: "Successfully retrieved fleet incidents stream",
      userId: adminUser.id,
    },
    {
      ipAddress: "192.168.1.112",
      attemptedEndpoint: "/api/technicians",
      statusCode: 200,
      message: "Retrieved technician roster",
      userId: managerUser.id,
    },
    {
      ipAddress: "198.51.100.42",
      attemptedEndpoint: "/api/audit-logs",
      statusCode: 403,
      message: "Access forbidden: insufficient administrative scope",
      userId: clientUserIds[0],
    },
  ]);

  console.log("✅ Database seeding completed successfully!");
  console.log("\n🔑 Test Account Credentials:");
  console.log("-------------------------------------------------------");
  console.log("1. Admin:            admin@powerfleet.com            / Password123!");
  console.log("2. Support Manager:  manager@powerfleet.com          / Password123!");
  console.log("3. Tech (GPS):       tech.david@powerfleet.com       / Password123!");
  console.log("4. Tech (Engine):    tech.elena@powerfleet.com       / Password123!");
  console.log("5. Client (Logistics): client.logistics@transcorp.com / Password123!");
  console.log("-------------------------------------------------------");

  await queryClient.end();
}

seed().catch((err) => {
  console.error("❌ Error seeding database:", err);
  process.exit(1);
});
