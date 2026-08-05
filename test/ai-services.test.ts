import { describe, it, expect } from "vitest";
import { AiTriageService } from "../lib/ai/triage.service";
import { AiTaskSuggesterService } from "../lib/ai/task-suggester.service";
import { AiSimilarIntelligenceService } from "../lib/ai/similar-intelligence.service";
import { safeCallGemini } from "../lib/ai/ai.config";

describe("Google Gemini Pro AI Services Test Suite", () => {
  it("should handle missing GOOGLE_API_KEY gracefully via safeCallGemini fallback", async () => {
    const fallback = { status: "fallback_ok" };
    const res = await safeCallGemini(
      async () => {
        throw new Error("API Key missing");
      },
      fallback,
      "Test Call"
    );

    expect(res.isFallback).toBe(true);
    expect(res.data).toEqual(fallback);
  });

  it("should return valid triage result format or fallback", async () => {
    const res = await AiTriageService.analyzeIncident({
      title: "Engine Oil Warning Light",
      description: "Engine oil pressure gauge registered low pressure during highway trip.",
      vehicleName: "Volvo FH16",
    });

    expect(res.data).toBeDefined();
    expect(res.data.category).toBeDefined();
    expect(res.data.urgency).toBeDefined();
    expect(res.data.driverSafetyAdvice).toBeDefined();
  });

  it("should return valid task suggestions with proof requirement detection", async () => {
    const res = await AiTaskSuggesterService.suggestSubtasks({
      incidentId: 1,
      incidentTitle: "Brake Fluid Leak",
      incidentDescription: "Fluid leaking under front left brake caliper.",
      vehicleName: "Scania R500",
    });

    expect(res.data).toBeDefined();
    expect(Array.isArray(res.data.tasks)).toBe(true);
    expect(res.data.tasks.length).toBeGreaterThan(0);
    expect(typeof res.data.tasks[0].requiresProof).toBe("boolean");
  });

  it("should return historical RAG incident intelligence or null when no past resolved tickets exist", async () => {
    const res = await AiSimilarIntelligenceService.getIncidentIntelligence(1);

    if (res.data) {
      expect(typeof res.data.similarityMatchScore).toBe("number");
      expect(res.data.historicalRootCause).toBeDefined();
      expect(res.data.provenFixSummary).toBeDefined();
    } else {
      expect(res.data).toBeNull();
    }
  });
});
