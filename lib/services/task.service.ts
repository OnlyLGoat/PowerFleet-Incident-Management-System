import { db } from "@/db";
import { incident_tasks, incidents, incident_attachments } from "@/db/schema";
import { eq, and, isNull, asc, inArray, lt } from "drizzle-orm";

interface StatusError extends Error {
  status?: number;
}

function createStatusError(message: string, status: number): StatusError {
  const error = new Error(message) as StatusError;
  error.status = status;
  return error;
}

export class TaskService {
  /**
   * Fetch all active sub-tasks for an incident ordered by `order` ASC.
   */
  static async getIncidentTasks(incidentId: number) {
    if (!incidentId || Number.isNaN(incidentId)) {
      throw createStatusError("Invalid incident ID", 400);
    }

    const tasksList = await db.query.incident_tasks.findMany({
      where: and(
        eq(incident_tasks.incidentId, incidentId),
        isNull(incident_tasks.deletedAt)
      ),
      orderBy: [asc(incident_tasks.order), asc(incident_tasks.createdAt)],
      with: {
        createdByUser: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return tasksList;
  }

  /**
   * Create a new sub-task for an incident.
   */
  static async createIncidentTask(
    incidentId: number, 
    title: string, 
    userId: number,
    requiresProof = false
  ) {
    if (!incidentId || !title.trim()) {
      throw createStatusError("Missing required fields", 400);
    }

    const targetIncident = await db.query.incidents.findFirst({
      where: and(eq(incidents.id, incidentId), isNull(incidents.deletedAt)),
    });

    if (!targetIncident) {
      throw createStatusError("Incident Not Found!", 404);
    }

    // Get current highest order index
    const existingTasks = await db
      .select({ order: incident_tasks.order })
      .from(incident_tasks)
      .where(
        and(
          eq(incident_tasks.incidentId, incidentId),
          isNull(incident_tasks.deletedAt)
        )
      );

    const maxOrder = existingTasks.reduce((max, t) => Math.max(max, t.order ?? 0), -1);

    const [newTask] = await db
      .insert(incident_tasks)
      .values({
        incidentId,
        title: title.trim(),
        isCompleted: false,
        requiresProof: Boolean(requiresProof),
        order: maxOrder + 1,
        createdByUserId: userId,
      })
      .returning();

    return newTask;
  }

  /**
   * Update task completion or title.
   */
  static async updateIncidentTask(
    taskId: number, 
    data: { isCompleted?: boolean; title?: string; proofFileUrl?: string },
    userId?: number
  ) {
    if (!taskId || Number.isNaN(taskId)) {
      throw createStatusError("Invalid task ID", 400);
    }

    const taskRecord = await db.query.incident_tasks.findFirst({
      where: and(eq(incident_tasks.id, taskId), isNull(incident_tasks.deletedAt)),
    });

    if (!taskRecord) {
      throw createStatusError("Task Not Found!", 404);
    }

    if (data.isCompleted === true) {
      // 1. Enforce Proof Requirement
      const finalProofUrl = data.proofFileUrl || taskRecord.proofFileUrl;
      if (taskRecord.requiresProof && (!finalProofUrl || !finalProofUrl.trim())) {
        throw createStatusError(
          "Proof attachment is required to complete this sub-task. Please attach proof file first.",
          400
        );
      }

      // 2. Enforce strict sequential execution: check if any prior sub-task is incomplete
      const priorIncompleteTask = await db.query.incident_tasks.findFirst({
        where: and(
          eq(incident_tasks.incidentId, taskRecord.incidentId),
          lt(incident_tasks.order, taskRecord.order),
          eq(incident_tasks.isCompleted, false),
          isNull(incident_tasks.deletedAt)
        ),
        orderBy: [asc(incident_tasks.order)],
      });

      if (priorIncompleteTask) {
        throw createStatusError(
          `Strict Sequential Order: You must complete prior sub-task "${priorIncompleteTask.title}" before completing this step.`,
          400
        );
      }
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof data.isCompleted === "boolean") {
      updatePayload.isCompleted = data.isCompleted;
    }

    if (data.title && data.title.trim()) {
      updatePayload.title = data.title.trim();
    }

    if (typeof data.proofFileUrl === "string" && data.proofFileUrl.trim()) {
      const proofUrl = data.proofFileUrl.trim();
      updatePayload.proofFileUrl = proofUrl;

      // Automatically link proof file to incident_attachments table for the incident
      const existingAttachment = await db.query.incident_attachments.findFirst({
        where: and(
          eq(incident_attachments.incidentId, taskRecord.incidentId),
          eq(incident_attachments.fileUrl, proofUrl),
          isNull(incident_attachments.deletedAt)
        ),
      });

      if (!existingAttachment) {
        let fileType = "image/png";
        const lowerUrl = proofUrl.toLowerCase();
        if (lowerUrl.endsWith(".pdf")) fileType = "application/pdf";
        else if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) fileType = "image/jpeg";
        else if (lowerUrl.endsWith(".svg")) fileType = "image/svg+xml";

        const uploaderId = userId || taskRecord.createdByUserId || 1;
        await db.insert(incident_attachments).values({
          incidentId: taskRecord.incidentId,
          filename: `Sub-Task Proof: ${taskRecord.title}`,
          fileUrl: proofUrl,
          fileType: fileType,
          uploadedById: uploaderId,
        });
      }
    }

    const [updatedTask] = await db
      .update(incident_tasks)
      .set(updatePayload)
      .where(eq(incident_tasks.id, taskId))
      .returning();

    // After updating, check if all tasks are completed for this incident
    if (updatedTask && updatePayload.isCompleted === true) {
      const allTasks = await db.query.incident_tasks.findMany({
        where: and(
          eq(incident_tasks.incidentId, updatedTask.incidentId),
          isNull(incident_tasks.deletedAt)
        ),
        columns: {
          id: true,
          isCompleted: true,
        },
      });

      const allCompleted = allTasks.every((t) => t.isCompleted);
      
      if (allCompleted && allTasks.length > 0) {
        // Update the incident status to Resolved
        await db.update(incidents)
          .set({ 
            status: "Resolved", 
            resolvedAt: new Date(), 
            updatedAt: new Date() 
          })
          .where(eq(incidents.id, updatedTask.incidentId));
          
        // Note: In a production environment, you might also want to trigger
        // an incident_events insertion here to log the automatic status change.
      }
    }

    return updatedTask;
  }

  /**
   * Reorder task sequence for an incident.
   */
  static async reorderIncidentTasks(incidentId: number, taskIds: number[]) {
    if (!incidentId || !Array.isArray(taskIds) || taskIds.length === 0) {
      throw createStatusError("Invalid reorder payload", 400);
    }

    // Verify all tasks belong to the incident
    const tasks = await db
      .select({ id: incident_tasks.id })
      .from(incident_tasks)
      .where(
        and(
          eq(incident_tasks.incidentId, incidentId),
          inArray(incident_tasks.id, taskIds),
          isNull(incident_tasks.deletedAt)
        )
      );

    if (tasks.length !== taskIds.length) {
      throw createStatusError("Some tasks do not exist or belong to another incident", 400);
    }

    // Update order index for each ID sequentially
    for (let index = 0; index < taskIds.length; index++) {
      const id = taskIds[index];
      await db
        .update(incident_tasks)
        .set({ order: index, updatedAt: new Date() })
        .where(eq(incident_tasks.id, id));
    }

    return this.getIncidentTasks(incidentId);
  }

  /**
   * Delete a sub-task.
   */
  static async deleteIncidentTask(taskId: number) {
    if (!taskId || Number.isNaN(taskId)) {
      throw createStatusError("Invalid task ID", 400);
    }

    const taskRecord = await db.query.incident_tasks.findFirst({
      where: and(eq(incident_tasks.id, taskId), isNull(incident_tasks.deletedAt)),
    });

    if (!taskRecord) {
      throw createStatusError("Task Not Found!", 404);
    }

    const [deletedTask] = await db
      .update(incident_tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(incident_tasks.id, taskId))
      .returning();

    return deletedTask;
  }
}
