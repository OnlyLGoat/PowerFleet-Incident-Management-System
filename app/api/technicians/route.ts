import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth";

export const dynamic = "force-dynamic";
import { db } from "@/db";
import { technicians, internal_users, users } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export interface TechnicianItem {
  id: number;
  name: string;
  specialty: string;
  isAvailable: boolean;
}

export const GET = withAuth(async () => {
  try {
    const techList = await db
      .select({
        id: technicians.internalUserId,
        name: users.name,
        specialty: technicians.specialty,
        isAvailable: technicians.isAvailable,
      })
      .from(technicians)
      .innerJoin(internal_users, eq(technicians.internalUserId, internal_users.userId))
      .innerJoin(users, eq(internal_users.userId, users.id))
      .where(
        and(
          eq(technicians.isAvailable, true),
          eq(internal_users.isActive, true),
          isNull(users.deletedAt)
        )
      );

    return NextResponse.json(techList);
  } catch (error: unknown) {
    console.error("Error fetching technicians:", error);
    return NextResponse.json({ error: "Failed to fetch technicians" }, { status: 500 });
  }
});
