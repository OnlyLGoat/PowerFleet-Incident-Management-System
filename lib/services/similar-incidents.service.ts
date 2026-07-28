import { db } from "@/db";
import { incidents } from "@/db/schema";
import { eq, and, ne, isNull, desc } from "drizzle-orm";

export interface SimilarIncidentResult {
  id: number;
  ticketCode: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  createdAt: Date | string | null;
  resolvedAt: Date | string | null;
  similarityReason: string;
  vehicleName: string | null;
  clientCompanyName: string | null;
}

export class SimilarIncidentService {
  /**
   * Finds similar past incidents for a target incident ID.
   * Matches by:
   * 1. Same Vehicle (Highest relevance: 50 pts)
   * 2. Same Fault Category / Type (25 pts)
   * 3. Same Client Account (20 pts)
   * 4. Title Keyword Overlap (15 pts)
   * Enforces strict RBAC (Clients only see their own company tickets).
   */
  static async getSimilarIncidents(
    targetIncidentId: number,
    userId: number,
    role: string
  ): Promise<SimilarIncidentResult[]> {
    // 1. Fetch target incident
    const target = await db.query.incidents.findFirst({
      where: and(eq(incidents.id, targetIncidentId), isNull(incidents.deletedAt)),
      with: {
        vehicle: true,
        client: true
      }
    });

    if (!target) {
      return [];
    }

    // 2. Client RBAC Check: Restricted to Internal Users (Admin, Support Manager, Technician)
    if (role === "ClientUser") {
      return [];
    }

    // 3. Build query filters for potential candidate tickets
    const candidateConditions = [
      ne(incidents.id, targetIncidentId),
      isNull(incidents.deletedAt)
    ];

    if (role === "ClientUser") {
      candidateConditions.push(eq(incidents.clientId, userId));
    }

    const candidates = await db.query.incidents.findMany({
      where: and(...candidateConditions),
      with: {
        vehicle: true,
        client: true
      },
      orderBy: [desc(incidents.createdAt)],
      limit: 25
    });

    // 4. Calculate similarity score & reason
    const scoredResults: { incident: typeof candidates[0]; score: number; reason: string }[] = [];

    for (const cand of candidates) {
      let score = 0;
      const reasons: string[] = [];

      // Check 1: Same Vehicle ID (50 points)
      if (target.vehicleId && cand.vehicleId === target.vehicleId) {
        score += 50;
        reasons.push("Same Vehicle");
      }

      // Check 2: Same Fault Category / Type (25 points)
      if (target.type && cand.type.toLowerCase() === target.type.toLowerCase()) {
        score += 25;
        reasons.push(`Matching Type (${cand.type})`);
      }

      // Check 3: Same Client Account (20 points)
      if (target.clientId && cand.clientId === target.clientId) {
        score += 20;
        reasons.push("Same Client");
      }

      // Check 4: Title Keyword Overlap (15 points)
      const targetTitleWords = target.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const candTitle = cand.title.toLowerCase();
      const hasTitleKeywordMatch = targetTitleWords.some(w => candTitle.includes(w));
      if (hasTitleKeywordMatch) {
        score += 15;
        reasons.push("Title Pattern Match");
      }

      // Include if meaningful score >= 20
      if (score >= 20) {
        scoredResults.push({
          incident: cand,
          score,
          reason: reasons.join(" • ")
        });
      }
    }

    // Sort by highest score first and return top 5
    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.slice(0, 5).map(item => ({
      id: item.incident.id,
      ticketCode: `INC-${String(item.incident.id).padStart(3, "0")}`,
      title: item.incident.title,
      description: item.incident.description,
      type: item.incident.type,
      priority: item.incident.priority,
      status: item.incident.status,
      createdAt: item.incident.createdAt,
      resolvedAt: item.incident.resolvedAt,
      similarityReason: item.reason,
      vehicleName: item.incident.vehicle?.name || null,
      clientCompanyName: item.incident.client?.companyName || null,
    }));
  }
}
