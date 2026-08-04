"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  CheckSquare, 
  Square, 
  Plus, 
  GripVertical, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldAlert,
  ListCheck,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IncidentTaskItem {
  id: number;
  incidentId: number;
  title: string;
  isCompleted: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  createdByUser?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

interface IncidentSummary {
  id: number;
  title: string;
  status: string;
  priority: string;
  type: string;
  address: string;
  vehicle?: {
    name: string;
    licensePlate: string;
  };
}

export default function IncidentTasksPage() {
  const params = useParams();
  const router = useRouter();

  const rawId = (params.id as string || "").replace(/^INC-/i, "");
  const incidentId = Number(rawId);

  const [incident, setIncident] = useState<IncidentSummary | null>(null);
  const [tasks, setTasks] = useState<IncidentTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [addingTask, setAddingTask] = useState<boolean>(false);

  // Resolution state
  const [resolutionNote, setResolutionNote] = useState<string>("");
  const [resolving, setResolving] = useState<boolean>(false);

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState<boolean>(false);

  // Resolution handler
  const handleResolveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNote.trim()) {
      toast.error("Resolution Note Required", {
        description: "Please enter details of how the issue was resolved.",
      });
      return;
    }

    try {
      setResolving(true);
      await axios.patch(`/api/incidents/${incidentId}`, {
        status: "Resolved",
        message: "Technician completed all sub-tasks and resolved incident",
        resolutionNote: resolutionNote.trim(),
      });

      toast.success("Incident Resolved!", {
        description: `Ticket #${incidentId} has been successfully resolved.`,
      });

      router.push(`/incidents/${incidentId}`);
    } catch (err: unknown) {
      console.error("Failed to resolve incident:", err);
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error("Resolution Error", {
        description: errorMsg || "Failed to resolve incident. Ensure all sub-tasks are completed.",
      });
    } finally {
      setResolving(false);
    }
  };

  // Fetch incident and tasks
  const fetchData = useCallback(async () => {
    if (!incidentId || Number.isNaN(incidentId)) {
      return;
    }

    try {
      const [incRes, tasksRes] = await Promise.all([
        axios.get<IncidentSummary>(`/api/incidents/${incidentId}`),
        axios.get<IncidentTaskItem[]>(`/api/incidents/${incidentId}/tasks`),
      ]);

      setIncident(incRes.data);
      setTasks(tasksRes.data);
      setError(null);
    } catch (err: unknown) {
      console.error("Failed to load incident tasks data:", err);
      setError("Failed to load sub-tasks. Ticket may not exist or you lack permission.");
    }
  }, [incidentId]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!incidentId || Number.isNaN(incidentId)) {
        setLoading(false);
        return;
      }
      try {
        const [incRes, tasksRes] = await Promise.all([
          axios.get<IncidentSummary>(`/api/incidents/${incidentId}`),
          axios.get<IncidentTaskItem[]>(`/api/incidents/${incidentId}/tasks`),
        ]);
        if (!ignore) {
          setIncident(incRes.data);
          setTasks(tasksRes.data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Failed to load incident tasks data:", err);
          setError("Failed to load sub-tasks. Ticket may not exist or you lack permission.");
        }
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

  // Create new task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      toast.error("Task Title Required", {
        description: "Please enter a diagnostic or repair step title first.",
      });
      return;
    }

    try {
      setAddingTask(true);
      const res = await axios.post<IncidentTaskItem>(`/api/incidents/${incidentId}/tasks`, {
        title: newTaskTitle.trim(),
      });

      setTasks((prev) => [...prev, res.data]);
      setNewTaskTitle("");
      toast.success("Sub-Task Added", {
        description: `"${res.data.title}" added to checklist.`,
      });
    } catch (err: unknown) {
      console.error("Failed to add sub-task:", err);
      toast.error("Failed to add sub-task. Please try again.");
    } finally {
      setAddingTask(false);
    }
  };

  // Toggle task completion (strictly in order)
  const handleToggleTask = async (taskId: number, currentCompleted: boolean, index: number) => {
    // If completing out of order, block
    if (!currentCompleted) {
      const firstIncompleteIndex = tasks.findIndex((t, i) => i < index && !t.isCompleted);
      if (firstIncompleteIndex !== -1) {
        const priorTask = tasks[firstIncompleteIndex];
        toast.error("Strict Sequential Order Required", {
          description: `You must complete Step #${firstIncompleteIndex + 1}: "${priorTask.title}" before checking off Step #${index + 1}.`,
        });
        return;
      }
    }

    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, isCompleted: !currentCompleted } : t))
      );

      const res = await axios.patch<IncidentTaskItem>(
        `/api/incidents/${incidentId}/tasks/${taskId}`,
        { isCompleted: !currentCompleted }
      );

      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
    } catch (err: unknown) {
      console.error("Failed to toggle task:", err);
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      // Revert optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, isCompleted: currentCompleted } : t))
      );
      toast.error("Order Violation Error", {
        description: errorMsg || "Failed to update task completion status.",
      });
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: number) => {
    try {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      await axios.delete(`/api/incidents/${incidentId}/tasks/${taskId}`);
      toast.success("Sub-Task Deleted");
    } catch (err: unknown) {
      console.error("Failed to delete task:", err);
      toast.error("Failed to delete sub-task.");
      fetchData();
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = async (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newTasks = [...tasks];
    const [draggedTask] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(index, 0, draggedTask);

    setTasks(newTasks);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Save new reordered IDs to backend
    try {
      setReordering(true);
      const taskIds = newTasks.map((t) => t.id);
      const res = await axios.post<IncidentTaskItem[]>(
        `/api/incidents/${incidentId}/tasks/reorder`,
        { taskIds }
      );
      setTasks(res.data);
      toast.success("Task Sequence Updated", {
        description: "New sub-task execution order saved.",
      });
    } catch (err: unknown) {
      console.error("Failed to reorder tasks:", err);
      toast.error("Failed to save reordered task sequence.");
      fetchData();
    } finally {
      setReordering(false);
    }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.isCompleted).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isFullyCompleted = totalTasks > 0 && completedTasks === totalTasks;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
        <p className="text-xs font-semibold">Loading Incident Tasks Checklist...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-center space-y-3">
        <ShieldAlert className="size-8 mx-auto text-rose-500" />
        <h3 className="font-bold text-rose-900 dark:text-rose-300 text-sm">Unable to Load Tasks</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400">{error || "Incident not found"}</p>
        <Link
          href="/incidents"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
        >
          <ArrowLeft className="size-4" /> Return to Incidents List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <Link
            href={`/incidents/${incidentId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-500 transition-colors mb-2"
          >
            <ArrowLeft className="size-3.5" /> Back to Ticket #{incidentId}
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ListCheck className="size-6 text-emerald-500 shrink-0" />
            Diagnostic & Repair Sub-Tasks
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ticket #{incident.id}: <span className="font-semibold text-slate-700 dark:text-slate-300">{incident.title}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/incidents/${incidentId}`}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="size-4" /> Ticket Overview
          </Link>
        </div>
      </div>

      {/* Progress Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={cn("size-5", isFullyCompleted ? "text-emerald-500" : "text-slate-400")} />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                Resolution Readiness Checklist
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {totalTasks === 0
                  ? "Create sub-tasks below to document repair steps."
                  : `${completedTasks} of ${totalTasks} steps completed (${progressPercent}%)`}
              </p>
            </div>
          </div>
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-bold border",
            isFullyCompleted
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
          )}>
            {progressPercent}% Ready
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Status Callout */}
        {!isFullyCompleted && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-medium flex items-center gap-2 border border-amber-200 dark:border-amber-900/50">
            <AlertCircle className="size-4 shrink-0 text-amber-500" />
            <span>
              {totalTasks === 0
                ? "Incident resolution is locked. Add at least 1 sub-task and complete all steps before resolving this ticket."
                : `Complete remaining ${totalTasks - completedTasks} sub-task(s) to enable ticket resolution.`}
            </span>
          </div>
        )}
      </div>

      {/* Add Task Input Form */}
      <form onSubmit={handleAddTask} className="flex gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add diagnostic / repair step (e.g. Inspect wire harness, Test GPS module)..."
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm"
        />
        <button
          type="submit"
          disabled={addingTask}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4.5 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm shrink-0 active:scale-95 cursor-pointer"
        >
          {addingTask ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          <span>Add Task</span>
        </button>
      </form>

      {/* Task List with Drag and Drop Reordering */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold uppercase tracking-wider">
          <span>Action Item Checklist</span>
          {reordering && (
            <span className="flex items-center gap-1 text-emerald-500">
              <Loader2 className="size-3 animate-spin" /> Saving order...
            </span>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <CheckSquare className="size-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No sub-tasks added yet</p>
            <p className="text-[11px] text-slate-400">Enter a diagnostic or repair action step above to begin.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {tasks.map((task, index) => {
              const isLocked = !task.isCompleted && tasks.slice(0, index).some((t) => !t.isCompleted);

              return (
                <motion.div
                  key={task.id}
                  layout
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  className={cn(
                    "group flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all bg-white dark:bg-slate-900 shadow-sm cursor-grab active:cursor-grabbing",
                    task.isCompleted
                      ? "border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 text-slate-400"
                      : isLocked
                      ? "border-slate-200 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-950/20 text-slate-400"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-900 dark:text-white",
                    draggedIndex === index && "opacity-40 scale-95 border-emerald-500",
                    dragOverIndex === index && "border-2 border-emerald-500 bg-emerald-500/5"
                  )}
                >
                  {/* Drag Grip Handle */}
                  <div className="text-slate-300 dark:text-slate-700 group-hover:text-slate-400 transition-colors shrink-0 flex items-center gap-2">
                    <GripVertical className="size-4" />
                    <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-600">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Checkbox Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id, task.isCompleted, index)}
                    className={cn(
                      "shrink-0 transition-colors cursor-pointer",
                      isLocked ? "text-slate-300 dark:text-slate-700 hover:text-amber-500" : "text-slate-400 hover:text-emerald-500"
                    )}
                    title={isLocked ? `Step #${index + 1} Locked - Complete prior steps first` : `Toggle Step #${index + 1}`}
                  >
                    {task.isCompleted ? (
                      <CheckSquare className="size-5 text-emerald-500 fill-emerald-500/10" />
                    ) : isLocked ? (
                      <Lock className="size-4.5 text-slate-400 dark:text-slate-600" />
                    ) : (
                      <Square className="size-5" />
                    )}
                  </button>

                  {/* Task Title */}
                  <span
                    className={cn(
                      "flex-1 text-xs font-medium transition-all select-none",
                      task.isCompleted && "line-through text-slate-400 dark:text-slate-500",
                      isLocked && "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {task.title}
                  </span>

                  {/* Lock status pill */}
                  {isLocked && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1 shrink-0">
                      <Lock className="size-3" /> Locked
                    </span>
                  )}

                {/* Task Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Delete Sub-Task"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        )}
      </div>

      {/* Ticket Resolution Section */}
      {isFullyCompleted && (
        <form
          onSubmit={handleResolveIncident}
          className="p-5 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
            <span>All sub-tasks completed (100%)! Enter resolution note to complete ticket.</span>
          </div>

          <textarea
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder="Describe resolution details (e.g. Replaced faulty wiring, re-calibrated telemetry unit, verified operational status)..."
            className="w-full h-24 rounded-xl border border-emerald-500/30 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
          />

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={resolving || !resolutionNote.trim()}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
            >
              {resolving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              <span>Confirm & Resolve Ticket</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
