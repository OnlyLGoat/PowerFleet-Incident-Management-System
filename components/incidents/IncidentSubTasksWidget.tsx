"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Paperclip, 
  Lock, 
  Loader2, 
  FileCheck,
  Upload,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";
import AiTaskSuggestModal from "@/components/ui/AiTaskSuggestModal";

export interface IncidentTaskItem {
  id: number;
  title: string;
  isCompleted: boolean;
  order: number;
  requiresProof: boolean;
  proofFileUrl?: string | null;
  createdAt: string;
  createdByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

interface IncidentSubTasksWidgetProps {
  incidentId: number;
  incidentTitle?: string;
  incidentDescription?: string;
  vehicleName?: string;
}

export default function IncidentSubTasksWidget({ 
  incidentId,
  incidentTitle = "Incident Investigation",
  incidentDescription = "Fleet incident technical repair checklist.",
  vehicleName,
}: Readonly<IncidentSubTasksWidgetProps>) {
  const { role } = useAuth();
  const isManagerOrAdmin = role === "Support Manager" || role === "Admin";

  const [tasks, setTasks] = useState<IncidentTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New task form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newRequiresProof, setNewRequiresProof] = useState<boolean>(false);
  const [addingTask, setAddingTask] = useState<boolean>(false);

  // AI Task Suggestion Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Proof file modal / input state per task
  const [activeProofTaskId, setActiveProofTaskId] = useState<number | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  // Fetch sub-tasks
  const fetchTasks = useCallback(async () => {
    if (!incidentId || Number.isNaN(incidentId)) return;
    try {
      const res = await axios.get<IncidentTaskItem[]>(`/api/incidents/${incidentId}/tasks`);
      setTasks(res.data);
    } catch (err) {
      console.error("Failed to load sub-tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!incidentId || Number.isNaN(incidentId)) return;
      try {
        const res = await axios.get<IncidentTaskItem[]>(`/api/incidents/${incidentId}/tasks`);
        if (!ignore) {
          setTasks(res.data);
        }
      } catch (err) {
        console.error("Failed to load sub-tasks:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [incidentId]);

  // Create Sub-task (Support Manager & Admin Only)
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setAddingTask(true);
      await axios.post(`/api/incidents/${incidentId}/tasks`, {
        title: newTitle.trim(),
        requiresProof: newRequiresProof,
      });

      setNewTitle("");
      setNewRequiresProof(false);
      setShowAddForm(false);
      toast.success("Sub-Task Created", { description: "Sub-task added to checklist successfully." });
      await fetchTasks();
    } catch (err: unknown) {
      const errorMsg = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : "Failed to create sub-task.";
      toast.error(errorMsg);
    } finally {
      setAddingTask(false);
    }
  };

  // Toggle Completion
  const handleToggleTask = async (task: IncidentTaskItem) => {
    // If completing and requires proof but no proof uploaded, prompt for proof
    if (!task.isCompleted && task.requiresProof && !task.proofFileUrl) {
      setActiveProofTaskId(task.id);
      setProofFile(null);
      return;
    }

    try {
      setUpdatingTaskId(task.id);
      await axios.patch(`/api/incidents/${incidentId}/tasks/${task.id}`, {
        isCompleted: !task.isCompleted,
      });
      await fetchTasks();
    } catch (err: unknown) {
      const errorMsg = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : "Failed to update sub-task status.";
      toast.error("Sequential Constraint", { description: errorMsg });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Submit Proof & Complete Task
  const handleCompleteWithProof = async (taskId: number) => {
    if (!proofFile) {
      toast.error("Proof Required", { description: "Please attach a valid proof file (image or PDF)." });
      return;
    }

    try {
      setUpdatingTaskId(taskId);
      
      // 1. Upload the file to the incident attachments API
      const formData = new FormData();
      formData.append("file", proofFile);
      const uploadRes = await axios.post(`/api/incidents/${incidentId}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const fileUrl = uploadRes.data.fileUrl;

      // 2. Mark the sub-task complete and link the uploaded proof URL
      await axios.patch(`/api/incidents/${incidentId}/tasks/${taskId}`, {
        isCompleted: true,
        proofFileUrl: fileUrl,
      });

      setActiveProofTaskId(null);
      setProofFile(null);
      toast.success("Task Completed with Proof", { description: "Proof logged and task marked complete." });
      await fetchTasks();
    } catch (err: unknown) {
      const errorMsg = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : "Failed to submit proof and complete task.";
      toast.error("Execution Error", { description: errorMsg });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Reorder Tasks (Support Manager & Admin Only)
  const handleReorder = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === tasks.length - 1) return;

    const newTasks = [...tasks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const [moved] = newTasks.splice(index, 1);
    newTasks.splice(targetIndex, 0, moved);

    setTasks(newTasks);

    try {
      const taskIds = newTasks.map((t) => t.id);
      await axios.post(`/api/incidents/${incidentId}/tasks/reorder`, { taskIds });
    } catch {
      toast.error("Reorder Error", { description: "Failed to update sub-task sequence." });
      await fetchTasks();
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: number) => {
    try {
      await axios.delete(`/api/incidents/${incidentId}/tasks/${taskId}`);
      toast.success("Task Deleted");
      await fetchTasks();
    } catch {
      toast.error("Failed to delete sub-task");
    }
  };

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <CheckSquare className="size-4 text-emerald-500" />
          <h3 className="font-semibold text-xs text-slate-900 dark:text-white">
            Repair Sub-Tasks
          </h3>
        </div>

        <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
          {completedCount}/{tasks.length} ({progressPercent}%)
        </span>
      </div>

      {/* Progress Bar */}
      {tasks.length > 0 && (
        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Add Sub-Task Form & AI Suggestion Button for Support Manager / Admin */}
      {isManagerOrAdmin && (
        <div>
          {!showAddForm ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-dashed border-slate-200 dark:border-slate-800 transition-all cursor-pointer select-none"
              >
                <Plus className="size-3.5 text-emerald-500" />
                <span>Add Diagnostic Sub-Task</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                title="Use AI to suggest repair sub-tasks"
              >
                <Sparkles className="size-3.5" />
                <span>AI Suggest Tasks</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateTask} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter sub-task step description..."
                required
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newRequiresProof}
                  onChange={(e) => setNewRequiresProof(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500 size-3.5 cursor-pointer"
                />
                <Paperclip className="size-3.5 text-purple-500" />
                <span>Require Proof Attachment to End Task</span>
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingTask || !newTitle.trim()}
                  className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {addingTask ? <Loader2 className="size-3 animate-spin" /> : "Save Step"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Task List Items */}
      {(() => {
        if (loading) {
          return (
            <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="size-3.5 animate-spin text-emerald-500" />
              <span>Loading tasks...</span>
            </div>
          );
        }
        if (tasks.length === 0) {
          return (
            <div className="py-6 text-center text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-500 dark:text-slate-400">No sub-tasks logged</p>
              {isManagerOrAdmin ? (
                <p className="text-[11px]">Click &quot;Add Diagnostic Sub-Task&quot; above to create steps.</p>
              ) : (
                <p className="text-[11px]">Support Manager has not logged sub-tasks yet.</p>
              )}
            </div>
          );
        }
        return (
          <div className="space-y-2">
          {tasks.map((task, idx) => {
            const isPriorIncomplete = tasks.slice(0, idx).some((t) => !t.isCompleted);
            const isDisabled = isPriorIncomplete && !task.isCompleted;

            return (
              <div
                key={task.id}
                className={cn(
                  "p-3 rounded-xl border transition-all text-xs space-y-2",
                  (() => {
                    if (task.isCompleted) return "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 text-slate-400";
                    if (isDisabled) return "bg-slate-100/40 dark:bg-slate-950/20 border-slate-200/40 dark:border-slate-800/40 opacity-70";
                    return "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white";
                  })()
                )}
              >
                {/* Task Title Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    {/* Completion Checkbox */}
                    <button
                      type="button"
                      disabled={isDisabled || updatingTaskId === task.id}
                      onClick={() => handleToggleTask(task)}
                      className={cn(
                        "mt-0.5 shrink-0 transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                        task.isCompleted ? "text-emerald-500" : "text-slate-400 hover:text-emerald-500"
                      )}
                      title={isDisabled ? "Sequential constraint: Complete prior tasks first" : "Toggle Task Completion"}
                    >
                      {(() => {
                        if (updatingTaskId === task.id) return <Loader2 className="size-4 animate-spin text-emerald-500" />;
                        if (task.isCompleted) return <CheckSquare className="size-4" />;
                        return <Square className="size-4" />;
                      })()}
                    </button>

                    <div className="space-y-1 flex-1">
                      <p className={cn("font-semibold leading-snug", task.isCompleted && "line-through text-slate-400")}>
                        <span className="font-mono text-slate-400 mr-1.5">{idx + 1}.</span>
                        {task.title}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        {task.requiresProof && (
                          <span className={cn(
                            "px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border",
                            task.proofFileUrl
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                          )}>
                            <Paperclip className="size-2.5" />
                            {task.proofFileUrl ? "Proof Uploaded" : "Proof Required"}
                          </span>
                        )}

                        {isDisabled && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20 flex items-center gap-1">
                            <Lock className="size-2.5" />
                            Locked (Sequential)
                          </span>
                        )}
                      </div>

                      {/* Proof File Link */}
                      {task.proofFileUrl && (
                        <a
                          href={task.proofFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
                        >
                          <FileCheck className="size-3" />
                          <span>View Proof File</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Manager Controls: Reorder & Delete */}
                  {isManagerOrAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleReorder(idx, "up")}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === tasks.length - 1}
                        onClick={() => handleReorder(idx, "down")}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Delete Sub-Task"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline Proof File Input Modal when triggered */}
                {activeProofTaskId === task.id && (
                  <div className="mt-2 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-2 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold text-[11px]">
                      <Upload className="size-3.5" />
                      <span>Attach Proof File (Image) to Complete Task</span>
                    </div>

                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-700 dark:text-slate-300
                        file:mr-4 file:py-1.5 file:px-3
                        file:rounded-lg file:border-0
                        file:text-xs file:font-semibold
                        file:bg-purple-100 file:text-purple-700
                        dark:file:bg-purple-900 dark:file:text-purple-300
                        hover:file:bg-purple-200 dark:hover:file:bg-purple-800
                        transition-all cursor-pointer"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProofTaskId(null);
                          setProofFile(null);
                        }}
                        className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCompleteWithProof(task.id)}
                        disabled={!proofFile || updatingTaskId === task.id}
                        className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {updatingTaskId === task.id ? <Loader2 className="size-3 animate-spin" /> : "Upload & Complete Task"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        );
      })()}

      {/* AI Task Suggestion Modal */}
      <AiTaskSuggestModal
        incidentId={incidentId}
        incidentTitle={incidentTitle}
        incidentDescription={incidentDescription}
        vehicleName={vehicleName}
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onTasksApproved={fetchTasks}
      />
    </div>
  );
}
