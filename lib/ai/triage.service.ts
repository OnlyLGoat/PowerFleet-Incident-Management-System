/**
 * @file lib/ai/triage.service.ts
 * @description Automated AI Incident Triage Service powered by Google Gemini and Zod schema enforcement.
 * Evaluates reported vehicle failure symptoms, classifies technical failure categories, assesses
 * operational urgency, calculates estimated vehicle downtime, and generates immediate on-scene driver safety advice.
 */

import { z } from "zod";
import { getGeminiModel, safeCallGemini, SafeCallGeminiResult } from "./ai.config";

/**
 * Zod validation schema defining the structured AI Triage output model.
 */
export const IncidentTriageSchema = z.object({
  category: z.enum([
    "Engine",
    "Electrical",
    "Brakes_Transmission",
    "Fuel_Leak",
    "Tire_Wheel",
    "GPS_Hardware",
    "Accident_Body",
    "Other",
  ]).describe("Primary technical category of the incident"),
  urgency: z.enum(["Low", "Medium", "High", "Critical"]).describe("Assessed operational urgency level"),
  suggestedPriority: z.enum(["Low", "Medium", "High", "Critical"]).describe("Recommended ticket SLA priority"),
  estimatedDowntimeHours: z.number().describe("Estimated vehicle repair downtime in hours"),
  driverSafetyAdvice: z.string().describe("Immediate actionable safety instructions for driver on scene"),
  summary: z.string().describe("Brief 1-sentence executive summary of root issue"),
});

/**
 * TypeScript type inferred from IncidentTriageSchema.
 */
export type IncidentTriageResult = z.infer<typeof IncidentTriageSchema>;

/**
 * Input payload interface for AI incident triage analysis.
 *
 * @interface TriageInput
 * @property {string} title - The incident title or brief failure headline.
 * @property {string} description - Detailed problem narrative reported by driver or client.
 * @property {string} [vehicleName] - Name or designation of fleet vehicle (e.g. Heavy Duty Hauler T-800).
 * @property {string} [type] - Failure classification type selected during intake.
 */
export interface TriageInput {
  title: string;
  description: string;
  vehicleName?: string;
  type?: string;
}

/**
 * Service class handling automated AI incident triage.
 */
export class AiTriageService {
  /**
   * Evaluates incident title and description narrative using Gemini AI with structured Zod output.
   *
   * @param {TriageInput} input - Incident intake details including title, description, and vehicle metadata.
   * @returns {Promise<SafeCallGeminiResult<IncidentTriageResult>>} Structured triage output object or fallback payload.
   */
  static async analyzeIncident(input: TriageInput): Promise<SafeCallGeminiResult<IncidentTriageResult>> {
    const fallback: IncidentTriageResult = {
      category: "Other",
      urgency: "Medium",
      suggestedPriority: "Medium",
      estimatedDowntimeHours: 2.0,
      driverSafetyAdvice: "Inspect vehicle safely and await technician guidance.",
      summary: input.title || "Incident under technical review.",
    };

    return safeCallGemini<IncidentTriageResult>(
      async () => {
        const model = getGeminiModel(0.1);
        const structuredLlm = model.withStructuredOutput(IncidentTriageSchema);

        const prompt = `Analyze the following fleet incident and extract a structured triage report:
Vehicle: ${input.vehicleName || "Unspecified Fleet Vehicle"}
Incident Type: ${input.type || "General Incident"}
Title: ${input.title}
Description: ${input.description}`;

        return await structuredLlm.invoke([
          ["system", "You are an expert fleet maintenance engineer and safety analyst."],
          ["user", prompt],
        ]);
      },
      fallback,
      "Incident AI Triage"
    );
  }
}
