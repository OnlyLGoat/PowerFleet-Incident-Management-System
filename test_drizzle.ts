import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./db/schema";
import * as relations from "./db/relations";

const connectionString = process.env.DATABASE_URL;
const queryClient = postgres(connectionString as string);
const db = drizzle(queryClient, { schema: { ...schema, ...relations } });

async function test() {
  const incident = await db.query.incidents.findFirst({
    where: (i, { eq }) => eq(i.id, 1),
    with: {
      vehicle: true
    }
  });
  console.log(JSON.stringify(incident, null, 2));
  process.exit(0);
}
test();
