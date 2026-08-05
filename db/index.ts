import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres"; 
import * as schema from "./schema";
import * as relations from "./relations";

const connectionString = process.env.DATABASE_URL!;
const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { 
    // Spreading both ensures Drizzle registers how the tables hook together in memory
    schema: { ...schema, ...relations } 
});