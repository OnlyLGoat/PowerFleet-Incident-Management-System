"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { Sparkles, Check, Loader2, X, AlertCircle, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestedTask {
  title: string;
  description: string;
  requiresProof: boolean;
  estimatedMinutes: number;
  selected: boolean;
}

interface AiTaskSuggestModalProps {
  incidentId: number;
  incidentTitle: string;
  incidentDescription: string;
  vehicleName?: string;
  isOpen: boolean;
  onClose: () => void;
  onTasksApproved: () => void;
}

export default function AiTaskSuggestModal({
  incidentId,
  incidentTitle,
  incidentDescription,
  vehicleName,
  isOpen,
  onClose,
  onTasksApproved,
}: Readonly<AiTaskSuggestModalProps>) {
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [approving, setApproving] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Fetch AI task suggestions from Gemini Pro
  const handleFetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    setError(null);
    try {
      const res = await axios.post<{
        tasks: Array<{ title: string; description: string; requiresProof: boolean; estimatedMinutes: number }>;
      }>("/api/ai/suggest-tasks", {
        incidentId,
        incidentTitle,
        incidentDescription,
        vehicleName,
      });

      const resData = res.data as {
        tasks?: Array<{ title: string; description: string; requiresProof: boolean; estimatedMinutes: number }>;
        data?: { tasks?: Array<{ title: string; description: string; requiresProof: boolean; estimatedMinutes: number }> };
      };
      const rawTasks = resData?.tasks || resData?.data?.tasks || [];

      const mapped: SuggestedTask[] = rawTasks.map((t) => ({
        ...t,
        selected: true, // Default select all
      }));

      setSuggestions(mapped);
    } catch (err: unknown) {
      console.error("Failed to generate AI task suggestions:", err);
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to generate AI task suggestions.");
    } finally {
      setLoadingSuggestions(false);
    }
  }, [incidentId, incidentTitle, incidentDescription, vehicleName]);

  // Trigger fresh fetch whenever modal opens or incidentId changes
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setError(null);
      handleFetchSuggestions();
    }
  }, [isOpen, incidentId, handleFetchSuggestions]);

  // Toggle selection check
  const toggleSelect = (index: number) => {
    setSuggestions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  // Modify task title in-place
  const handleTitleChange = (index: number, newTitleText: string) => {
    setSuggestions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, title: newTitleText } : item))
    );
  };

  // Approve & Save selected tasks
  const handleApproveSelectedTasks = async () => {
    const selected = suggestions.filter((s) => s.selected);
    if (selected.length === 0) return;

    setApproving(true);
    setError(null);
    try {
      const formattedTasks = selected.map((t) => ({
        title: t.title,
        description: t.description,
        requiresProof: t.requiresProof,
        estimatedMinutes: t.estimatedMinutes,
      }));

      await axios.post("/api/ai/approve", {
        incidentId,
        acceptedTasks: formattedTasks,
        approvedTasks: formattedTasks,
      });

      onTasksApproved();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to approve tasks:", err);
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to approve and commit tasks.");
    } finally {
      setApproving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-[100000]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                AI Diagnostic Task Suggestions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review and select sub-tasks to accept for Incident #{incidentId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-slate-400 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {(() => {
            if (loadingSuggestions) {
              return (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="size-8 animate-spin text-emerald-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Analyzing Incident #{incidentId} & Repair Blueprints...
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Evaluating symptoms, past resolved tickets, and existing tasks.
                  </p>
                </div>
              );
            }
            if (suggestions.length === 0) {
              return (
                <div className="py-12 text-center space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    No new sub-tasks generated for this incident.
                  </p>
                </div>
              );
            }
            return (
              <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold uppercase tracking-wider">
                <span>Select & Edit Tasks to Accept</span>
                <span>
                  {suggestions.filter((s) => s.selected).length} of {suggestions.length} selected
                </span>
              </div>

              {suggestions.map((task, index) => (
                <div
                  key={task.title + index}
                  className={cn(
                    "p-4 rounded-2xl border transition-all space-y-2",
                    task.selected
                      ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 opacity-60 bg-white dark:bg-slate-900"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSelect(index)}
                      className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                    >
                      {task.selected ? (
                        <CheckSquare className="size-5 text-emerald-500 fill-emerald-500/10" />
                      ) : (
                        <Square className="size-5" />
                      )}
                    </button>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 mt-1 shrink-0">
                          Step #{index + 1}
                        </span>
                        <textarea
                          rows={1}
                          value={task.title}
                          onChange={(e) => {
                            handleTitleChange(index, e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = e.target.scrollHeight + "px";
                          }}
                          onFocus={(e) => {
                            e.target.style.height = "auto";
                            e.target.style.height = e.target.scrollHeight + "px";
                          }}
                          className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-emerald-500 focus:outline-none text-xs font-bold text-slate-900 dark:text-white py-0.5 resize-none leading-normal overflow-hidden"
                        />
                        {task.requiresProof && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-semibold flex items-center gap-1 shrink-0 mt-0.5">
                            📷 Proof Needed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {task.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            );
          })()}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApproveSelectedTasks}
            disabled={approving || loadingSuggestions || suggestions.filter((s) => s.selected).length === 0}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {approving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            <span>Accept & Save Selected Tasks</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
