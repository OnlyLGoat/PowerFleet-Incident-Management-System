import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString);

async function main() {
    try {
        console.log("Truncating tables to allow schema updates...");
        await sql`TRUNCATE TABLE incidents CASCADE`;
        console.log("Tables truncated.");
        
        // Just in case it's easy to just drop the type and let drizzle recreate it
        await sql`DROP TYPE IF EXISTS incident_slaStatus_enum CASCADE`;
        console.log("Dropped enum type.");
    } catch (e) {
        console.error("Cleanup failed:", e);
    } finally {
        await sql.end();
    }
}

main();
