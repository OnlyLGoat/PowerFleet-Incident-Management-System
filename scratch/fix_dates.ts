import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
import * as relations from "../db/relations";
import { eq } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL;
const queryClient = postgres(connectionString as string);
const db = drizzle(queryClient, { schema: { ...schema, ...relations } });

async function fixDates() {
  const allIncidents = await db.query.incidents.findMany();
  
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 5); // 5 days ago
  
  for (let i = 0; i < allIncidents.length; i++) {
    const inc = allIncidents[i];
    // stagger by roughly 12 hours each
    const newDate = new Date(baseDate.getTime() + (i * 12 * 60 * 60 * 1000));
    
    await db.update(schema.incidents)
      .set({ createdAt: newDate })
      .where(eq(schema.incidents.id, inc.id));
  }
  
  console.log("Staggered dates for all incidents.");
  process.exit(0);
}

fixDates();
