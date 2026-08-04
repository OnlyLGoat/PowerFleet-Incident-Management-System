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

  console.log("⚠️ Creating Fleet Incidents...");
  const incidentList: Array<typeof schema.incidents.$inferInsert> = [
    {
      title: "GPS Tracking Signal Lost in Transit",
      description: `INCIDENT SUMMARY:
During scheduled interstate cargo transport on I-95 North, telematics unit #867543091827364 experienced a complete loss of cellular telemetry connection at 10:42 AM EST.

INITIAL OBSERVATIONS & TELEMETRY DIAGNOSTICS:
• Primary GPS receiver stopped pinging server at Mile Marker 42 (Philadelphia region).
• Last recorded speed was 68 mph before sudden disconnection.
• Backup satellite heartbeat failed to trigger within the 5-minute failover threshold.

REQUIRED ACTION & TECHNICAL STEPS:
1. Field technician assigned to verify physical cable harness and antenna mount integrity.
2. Execute remote firmware diagnostic boot sequence upon re-establishing local cellular link.
3. Calibrate signal frequency and log full system diagnostic report.`,
      type: "GPS Device",
      priority: "Critical",
      status: "In Progress",
      address: "I-95 North, Mile Marker 42, Philadelphia, PA",
      latitude: 39.9526,
      longitude: -75.1652,
      slaStatus: "Healthy",
      clientId: clientUserIds[0],
      vehicleId: vehicleIds[0],
      reportedById: clientUserIds[0],
      assignedToId: techInternalIds[0],
    },
    {
      title: "Fuel Sensor Anomaly & Sudden Drop Reading",
      description: `INCIDENT SUMMARY:
The fleet monitoring system flagged an alarming fuel anomaly at 08:15 AM EST. Fuel probe reading plummeted from 85% capacity down to 12% in less than 3 minutes, despite no physical leak alarms being registered by environmental sensors.

TECHNICAL INVESTIGATION NOTES:
• Vehicle was idling at Port Newark Container Terminal during cargo staging.
• Fuel flow rate sensor indicates normal injector consumption (0.8 gal/hr).
• Electrical telemetry voltage on CAN-bus line B dropped from 5.0V to 0.2V flat line, indicating sensor grounding short circuit or hardware component failure.

NEXT STEPS:
Dispatched field specialist Marcus Vance to inspect probe wiring, test analog output voltage, and replace probe hardware if voltage short is confirmed.`,
      type: "Fuel",
      priority: "High",
      status: "Open",
      address: "Port Newark Container Terminal, Newark, NJ",
      latitude: 40.6892,
      longitude: -74.1687,
      slaStatus: "Warning_Resolution",
      clientId: clientUserIds[0],
      vehicleId: vehicleIds[1],
      reportedById: clientUserIds[0],
      assignedToId: techInternalIds[2],
    },
    {
      title: "Engine Check Indicator & Loss of Acceleration",
      description: `INCIDENT DETAILED REPORT:
While ascending Route 7 West incline carrying 14.2 tons of dry freight, driver reported sudden engine light activation accompanied by a noticeable reduction in engine torque output. The vehicle ECU automatically defaulted to Limp-Home Mode.

ECU FAULT CODES & DIAGNOSTIC SCAN:
• OBD-II Diagnostic Scan: P0300 (Random/Multiple Cylinder Misfire Detected).
• Engine Coolant Temp: 92°C (Normal operational range).
• Turbo Boost Pressure: Dropped from 22 PSI to 6 PSI during acceleration load.

FIELD RECOMMENDATIONS:
Technician Elena Rostova instructed to inspect ignition coils, fuel injector delivery pressure, and check intake manifold hose connections before approving vehicle return to active service.`,
      type: "Vehicle",
      priority: "High",
      status: "In Progress",
      address: "Route 7 West, Alexandria, VA",
      latitude: 38.8048,
      longitude: -77.0469,
      slaStatus: "Healthy",
      clientId: clientUserIds[1],
      vehicleId: vehicleIds[2],
      reportedById: clientUserIds[1],
      assignedToId: techInternalIds[1],
    },
    {
      title: "Refrigeration Unit Temperature Spike",
      description: `URGENT COLD CHAIN ALERT:
Refrigerated trailer R-09 temperature sensor recorded a thermal deviation, rising from target setpoint (-18°C) to +8°C within a 45-minute delivery window.

CARGO RISKS & ENVIRONMENTAL STATS:
• Cargo Type: High-value perishable pharmaceuticals requiring strict +2°C max threshold.
• Compressor status: Running, but condenser fan RPM dropped by 65% due to belt slippage.
• Ambient outside temperature: 31°C.

IMMEDIATE EMERGENCY PROTOCOL:
Vehicle directed to nearest cold storage facility at Distribution Center 4. Emergency backup cooling unit activated pending technician dispatch.`,
      type: "Maintenance",
      priority: "Critical",
      status: "New",
      address: "Distribution Center 4, Baltimore, MD",
      latitude: 39.2904,
      longitude: -76.6122,
      slaStatus: "Warning_Response",
      clientId: clientUserIds[1],
      vehicleId: vehicleIds[3],
      reportedById: clientUserIds[1],
      assignedToId: null,
    },
    {
      title: "Minor Fender Bending Incident at Loading Bay",
      description: `ACCIDENT REPORT & DAMAGE ASSESSMENT:
While performing low-speed reversing maneuver into Loading Bay 12 at Apex Hub Warehouse, vehicle rear bumper made light contact with the protective rubber dock buffer.

INSPECTION & SAFETY CHECK:
• Vehicle Body: Minor paint scuffing on lower tailgate assembly; no frame deformation or structural integrity issues.
• Driver Status: Safe, uninjured, cleared standard sobriety check.
• Fleet Status: Vehicle remains fully drivable and operationally certified.

PENDING STEPS:
Awaiting client photo submission for bodywork insurance processing.`,
      type: "Accident",
      priority: "Medium",
      status: "Waiting Client",
      address: "Apex Hub Warehouse 12, Brooklyn, NY",
      latitude: 40.6782,
      longitude: -73.9442,
      slaStatus: "Healthy",
      clientId: clientUserIds[2],
      vehicleId: vehicleIds[4],
      reportedById: clientUserIds[2],
      assignedToId: techInternalIds[3],
    },
    {
      title: "Battery Voltage Depletion Warning",
      description: `ELECTRICAL SYSTEM DIAGNOSTIC REPORT:
Automated battery health monitor triggered a low voltage threshold alert (11.4V resting capacity) while the vehicle was idling at Shuttle Station 8.

DIAGNOSTIC SUMMARY:
• Alternator Output: Fluctuating between 12.1V and 13.8V under electrical load.
• Battery Age: 28 months in active service.
• Starter Current Draw: 240A during ignition turn (within tolerance).

RESOLVED ACTIONS:
Technician Claire Dupont replaced auxiliary battery unit, cleaned ground terminals, and verified stable 14.2V alternator charging output.`,
      type: "Vehicle",
      priority: "Medium",
      status: "Resolved",
      address: "Metro Shuttle Station 8, Queens, NY",
      latitude: 40.7282,
      longitude: -73.7949,
      slaStatus: "Met",
      clientId: clientUserIds[2],
      vehicleId: vehicleIds[5],
      reportedById: clientUserIds[2],
      assignedToId: techInternalIds[3],
    },
    {
      title: "Scheduled 50,000 KM Preventative Service",
      description: `PREVENTATIVE MAINTENANCE LOG:
Routine scheduled preventative maintenance completed for Heavy Duty Hauler T-800 at Central Depot.

COMPLETED WORK ITEMS:
1. Replaced front and rear heavy-duty brake pads and flushed hydraulic line fluid.
2. Synthetic engine oil filter replacement (15W-40 API CK-4).
3. 10-point tire pressure balancing and tread depth inspection (all tires > 6mm).
4. Full telematics firmware patch upgrade applied.`,
      type: "Maintenance",
      priority: "Low",
      status: "Closed",
      address: "PowerFleet Central Depot, Jersey City, NJ",
      latitude: 40.7178,
      longitude: -74.0431,
      slaStatus: "Met",
      clientId: clientUserIds[0],
      vehicleId: vehicleIds[0],
      reportedById: clientUserIds[0],
      assignedToId: techInternalIds[1],
    },
    {
      title: "Client Complaint regarding Telematics Portal Delay",
      description: "Client reported 5-minute latency in live dashboard vehicle location refresh rate during peak traffic.",
      type: "Client Complaint",
      priority: "Low",
      status: "Resolved",
      address: "TransCorp Regional Office, Stamford, CT",
      latitude: 41.0534,
      longitude: -73.5387,
      slaStatus: "Met",
      clientId: clientUserIds[0],
      vehicleId: vehicleIds[1],
      reportedById: clientUserIds[0],
      assignedToId: techInternalIds[0],
    },
    {
      title: "Unresponsive Tachograph Unit",
      description: "Digital tachograph fails to log driver duty hours properly. LCD screen displays error code E-14.",
      type: "GPS Device",
      priority: "High",
      status: "Waiting Technician",
      address: "Cargo Depot South, Wilmington, DE",
      latitude: 39.7391,
      longitude: -75.5398,
      slaStatus: "Overdue_Resolution",
      clientId: clientUserIds[1],
      vehicleId: vehicleIds[2],
      reportedById: clientUserIds[1],
      assignedToId: techInternalIds[0],
    },
    {
      title: "Driver Speed Governor Threshold Exceeded",
      description: "Automated alert triggered: vehicle exceeded 115 km/h limit on downhill segment for over 3 minutes.",
      type: "Driver",
      priority: "Medium",
      status: "Open",
      address: "I-80 Turnpike Exit 14, Stroudsburg, PA",
      latitude: 40.9868,
      longitude: -75.1946,
      slaStatus: "Healthy",
      clientId: clientUserIds[2],
      vehicleId: vehicleIds[4],
      reportedById: clientUserIds[2],
      assignedToId: techInternalIds[1],
    },
  ];

  const createdIncidentIds: number[] = [];
  const baseTime = Date.now();

  for (let i = 0; i < incidentList.length; i++) {
    const inc = incidentList[i];
    // Stagger reported dates into realistic past dates (e.g. 1.5 to 20 days ago)
    const daysAgo = (i + 1) * 2.2;
    const historicalDate = new Date(baseTime - daysAgo * 24 * 60 * 60 * 1000);

    const [created] = await db.insert(schema.incidents).values({
      ...inc,
      createdAt: historicalDate,
      updatedAt: historicalDate,
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
