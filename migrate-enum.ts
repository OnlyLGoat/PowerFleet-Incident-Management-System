import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString);

async function main() {
    try {
        console.log("Renaming enum values...");
        await sql`ALTER TYPE "incident_slaStatus_enum" RENAME VALUE 'Breached_Response' TO 'Overdue_Response'`;
        await sql`ALTER TYPE "incident_slaStatus_enum" RENAME VALUE 'Breached_Resolution' TO 'Overdue_Resolution'`;
        await sql`ALTER TYPE "incident_slaStatus_enum" RENAME VALUE 'Breached_Both' TO 'Overdue_Both'`;
        await sql`ALTER TYPE "incident_slaStatus_enum" RENAME VALUE 'Met_With_Response_Breached' TO 'Met_With_Response_Overdue'`;
        await sql`ALTER TYPE "incident_slaStatus_enum" RENAME VALUE 'Met_With_Resolution_Breached' TO 'Met_With_Resolution_Overdue'`;
        console.log("Enum values renamed successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await sql.end();
    }
}

main();
