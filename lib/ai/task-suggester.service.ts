/**
 * @file lib/ai/task-suggester.service.ts
 * @description Dynamic AI Sub-Task Suggester Service powered by Google Gemini and Drizzle ORM.
 * Takes target incident information + RAG similar incident intelligence (root cause, proven fix, completed flow)
 * and generates 100% custom, incident-specific sub-tasks (minimum 3 tasks, scaled by complexity).
 */

import { db } from "@/db";
import { incident_tasks } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { getGeminiModel, safeCallGemini, SafeCallGeminiResult } from "./ai.config";
import { AiSimilarIntelligenceService, SimilarIntelligenceResult } from "./similar-intelligence.service";

/**
 * Zod validation schema defining an individual suggested sub-task step item.
 */
export const SuggestedTaskItemSchema = z.object({
  title: z.string().describe("Dynamic, incident-specific step title e.g. Inspect fuel level probe wiring harness pin B"),
  description: z.string().describe("Detailed technician instruction tailored specifically to this incident's symptoms"),
  requiresProof: z.boolean().describe("True if step involves component replacement or critical safety check needing photo proof"),
  estimatedMinutes: z.number().describe("Estimated minutes to perform step"),
});

/**
 * Zod validation schema defining the output list of suggested sub-tasks.
 */
export const TaskSuggestionListSchema = z.object({
  tasks: z.array(SuggestedTaskItemSchema).min(3).describe("List of dynamic sub-tasks based on incident information and similar resolved ticket intelligence. MINIMUM 3 tasks required."),
});

/**
 * TypeScript type inferred from SuggestedTaskItemSchema.
 */
export type SuggestedTaskItem = z.infer<typeof SuggestedTaskItemSchema>;

/**
 * Input payload interface for requesting AI sub-task suggestions.
 */
export interface TaskSuggesterInput {
  incidentId: number;
  incidentTitle: string;
  incidentDescription: string;
  vehicleName?: string;
  category?: string;
}

/**
 * Service class handling dynamic AI-generated sub-task suggestions.
 */
export class AiTaskSuggesterService {
  /**
   * Sends target incident information and similar resolved incident intelligence to Gemini.
   * Dynamically synthesizes custom sub-tasks tailored to the incident's symptoms and proven fixes.
   *
   * @param {TaskSuggesterInput} input - Target incident details.
   * @returns {Promise<SafeCallGeminiResult<{ tasks: SuggestedTaskItem[] }>>} Dynamic sub-tasks payload.
   */
  static async suggestSubtasks(input: TaskSuggesterInput): Promise<SafeCallGeminiResult<{ tasks: SuggestedTaskItem[] }>> {
    // 1. Fetch current existing tasks on this incident to prevent any duplication
    const existingTasks = await db.query.incident_tasks.findMany({
      where: and(
        eq(incident_tasks.incidentId, input.incidentId),
        isNull(incident_tasks.deletedAt)
      ),
    });

    const existingTitles = existingTasks.map((t) => t.title);

    // 2. Fetch high-precision similar incident intelligence (RAG)
    let similarIntelInfo = "No similar resolved incident matched in historical database.";
    let similarMatchData: SimilarIntelligenceResult | null = null;

    if (input.incidentId > 0) {
      const intelRes = await AiSimilarIntelligenceService.getIncidentIntelligence(input.incidentId);
      if (intelRes.data && intelRes.data.hasMatch) {
        similarMatchData = intelRes.data;
        similarIntelInfo = `MATCHED SIMILAR RESOLVED TICKET: ${intelRes.data.relevantPastTicketCode} (Match Score: ${intelRes.data.similarityMatchScore}%)
• Historical Root Cause: ${intelRes.data.historicalRootCause}
• Proven Fix Summary: ${intelRes.data.provenFixSummary}
• Recommended Spare Parts / Tools Used: ${intelRes.data.suggestedParts?.join(", ") || "Standard Fleet Kit"}`;
      }
    }

    // 3. Construct 100% dynamic incident-tailored fallback
    const fallbackTasks = AiTaskSuggesterService.generateDynamicFallbackTasks(input, similarMatchData, existingTitles);
    const fallback: { tasks: SuggestedTaskItem[] } = { tasks: fallbackTasks };

    return safeCallGemini<{ tasks: SuggestedTaskItem[] }>(
      async () => {
        const model = getGeminiModel(0.2);
        const structuredLlm = model.withStructuredOutput(TaskSuggestionListSchema);

        const prompt = `YOU ARE AN EXPERT FLEET DIAGNOSTIC ENGINEER. DO NOT RETURN STATIC OR READY-MADE TEMPLATE TASKS.

TARGET INCIDENT INFORMATION:
• Incident ID: #${input.incidentId}
• Vehicle: ${input.vehicleName || "Fleet Vehicle"}
• Category: ${input.category || "General Repair"}
• Title: ${input.incidentTitle}
• Description: ${input.incidentDescription}

EXISTING TASKS ALREADY LOGGED ON THIS TICKET (DO NOT DUPLICATE THESE):
${existingTitles.length > 0 ? existingTitles.map((t) => `- ${t}`).join("\n") : "None logged yet"}

SIMILAR RESOLVED INCIDENT INTELLIGENCE:
${similarIntelInfo}

REQUIREMENTS & THINKING DIRECTIVE:
1. Analyze ALL the information provided about this target incident (Title, Description, Category, Vehicle, and Existing Tasks).
2. Analyze the "SIMILAR RESOLVED INCIDENT INTELLIGENCE" section:
   - IF A SIMILAR INCIDENT WAS RESOLVED: Look at its proven fix summary, historical root cause, and suggested spare parts. INSPIRE your suggested tasks from how that similar incident was solved, adapting the steps specifically to this target incident's symptoms.
   - IF NO SIMILAR INCIDENT WAS RESOLVED: Analyze the target incident's specific failure narrative and think step-by-step to design a dynamic repair workflow (Inspection -> Diagnostic/Voltage Test -> Repair/Part Replacement -> Load Test & ECU Clearance).
3. SUGGEST A MINIMUM OF 3 (OR MORE ACCORDING TO COMPLEXITY) BESPOKE SUB-TASKS. Do not limit the count if the issue requires more steps (4, 5, 6+ steps).
4. EVERY TASK MUST BE CUSTOMIZED AND DYNAMIC. Do not use generic copy-paste strings.
5. DO NOT duplicate any tasks listed under "EXISTING TASKS ALREADY LOGGED".
6. Set requiresProof=true for steps involving part replacements, voltage readings, or critical safety checks.`;

        const result = await structuredLlm.invoke([
          ["system", "You are an expert fleet maintenance director creating dynamic, highly customized technician sub-tasks based on live incident data."],
          ["user", prompt],
        ]);

        // Filter out any accidental duplicates against existing titles
        result.tasks = result.tasks.filter(
          (t) => !existingTitles.some((e) => e.toLowerCase().trim() === t.title.toLowerCase().trim())
        );

        return result;
      },
      fallback,
      "AI Sub-Task Suggestion"
    );
  }

  /**
   * Helper generating 100% dynamic, symptom-tailored fallback sub-tasks based on incident metadata & proven fixes.
   */
  private static generateDynamicFallbackTasks(
    input: TaskSuggesterInput,
    similarMatch: SimilarIntelligenceResult | null,
    existingTitles: string[]
  ): SuggestedTaskItem[] {
    const title = input.incidentTitle || "Reported Failure";
    const desc = input.incidentDescription || "symptoms requiring technical diagnosis";
    const cat = (input.category || "").toLowerCase();
    const vehicle = input.vehicleName || "Fleet Vehicle";

    const tasks: SuggestedTaskItem[] = [];

    // Step 1: Symptom-Specific Initial Visual & Physical Inspection
    tasks.push({
      title: `Inspect ${title.split("&")[0].trim()} hardware on ${vehicle}`,
      description: `Perform physical diagnostic inspection focused on reported symptoms: "${desc.slice(0, 110)}..."`,
      requiresProof: false,
      estimatedMinutes: 15,
    });

    // Step 2: Symptom-Specific Diagnostic & Voltage Test
    if (cat.includes("gps") || title.toLowerCase().includes("gps") || desc.toLowerCase().includes("telemetry") || desc.toLowerCase().includes("antenna")) {
      tasks.push({
        title: `Test RG-58 coaxial antenna harness & SMA connector voltage`,
        description: `Measure signal voltage at telematics gateway receiver pin, inspect coaxial cable for oxidation, and check chassis ground.`,
        requiresProof: false,
        estimatedMinutes: 20,
      });
    } else if (cat.includes("fuel") || title.toLowerCase().includes("fuel") || desc.toLowerCase().includes("probe") || desc.toLowerCase().includes("can-bus")) {
      tasks.push({
        title: `Check fuel probe CAN-bus Line B voltage (5.0V standard vs 0.2V short)`,
        description: `Inspect fuel level probe wire harness pin connections, check CAN-bus line B voltage, and check for pinched wires against chassis.`,
        requiresProof: false,
        estimatedMinutes: 20,
      });
    } else if (cat.includes("brake") || title.toLowerCase().includes("brake") || desc.toLowerCase().includes("hydraulic") || desc.toLowerCase().includes("fluid")) {
      tasks.push({
        title: `Inspect hydraulic line pressure & master cylinder fitting seals`,
        description: `Test brake line pressure (verify > 60 PSI standard), inspect master cylinder fitting O-rings for fluid leaks, and check pedal travel.`,
        requiresProof: false,
        estimatedMinutes: 25,
      });
    } else {
      tasks.push({
        title: `Test electrical wiring harness and signal line continuity`,
        description: `Check terminal voltage levels, verify fuse box integrity, and test ground continuity across ${title}.`,
        requiresProof: false,
        estimatedMinutes: 20,
      });
    }

    // Step 3: Proven Fix or Custom Component Repair
    if (similarMatch && similarMatch.provenFixSummary) {
      tasks.push({
        title: `Execute proven repair from ${similarMatch.relevantPastTicketCode}: ${similarMatch.provenFixSummary}`,
        description: `Apply past historical solution: ${similarMatch.provenFixSummary}. Required tools/parts: ${similarMatch.suggestedParts?.join(", ") || "Fleet Kit"}.`,
        requiresProof: true,
        estimatedMinutes: 35,
      });
    } else {
      tasks.push({
        title: `Replace / repair faulty ${input.category || "component"} assembly on ${vehicle}`,
        description: `Execute component replacement or wiring repair for ${title}, ensuring proper torque and secure mounting.`,
        requiresProof: true,
        estimatedMinutes: 30,
      });
    }

    // Step 4: System Recalibration & ECU Log Clearance
    tasks.push({
      title: `Conduct operational load test & clear OBD-II ECU fault logs`,
      description: `Perform active road functional test, confirm live telemetry signals on dashboard, and clear stored ECU error memory.`,
      requiresProof: true,
      estimatedMinutes: 15,
    });

    return tasks.filter((t) => !existingTitles.some((e) => e.toLowerCase().trim() === t.title.toLowerCase().trim()));
  }
}
