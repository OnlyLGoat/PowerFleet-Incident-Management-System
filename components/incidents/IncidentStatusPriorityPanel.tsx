"use client";

import React, { useState } from "react";
import axios from "axios";
import { Settings2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IncidentStatusPriorityPanelProps {
  incidentId: number;
  currentStatus: string;
  currentPriority: string;
  onUpdate: () => void;
}

const STATUS_OPTIONS = [
  "New",
  "Open",
  "In Progress",
  "Waiting Client",
  "Waiting Technician",
  "Resolved",
  "Closed",
  "Cancelled",
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

export default function IncidentStatusPriorityPanel({
  incidentId,
  currentStatus,
  currentPriority,
  onUpdate,
}: IncidentStatusPriorityPanelProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus);
  const [selectedPriority, setSelectedPriority] = useState<string>(currentPriority);
  const [updateMessage, setUpdateMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleApplyChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!updateMessage.trim()) {
      const msgErr = "Reason/message is required when changing status or priority.";
      setError(msgErr);
      toast.error(msgErr);
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, string> = {
        status: selectedStatus,
        priority: selectedPriority,
        message: updateMessage.trim(),
      };

      await axios.patch(`/api/incidents/${incidentId}`, payload);

      toast.success("Incident Updated", {
        description: `Status changed to ${selectedStatus} & Priority to ${selectedPriority}.`,
        style: {
          "--normal-bg": "color-mix(in oklab, light-dark(var(--color-green-600), var(--color-green-400)) 10%, var(--background))",
          "--normal-text": "light-dark(var(--color-green-600), var(--color-green-400))",
          "--normal-border": "light-dark(var(--color-green-600), var(--color-green-400))",
          borderRadius: "16px",
        } as React.CSSProperties,
        className: "shadow-xl shadow-emerald-500/5",
      });

      setUpdateMessage("");
      onUpdate();
    } catch (err: unknown) {
      console.error("Failed to update status/priority:", err);
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || "Failed to update incident controls.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
          <Settings2 className="size-4 text-emerald-500" />
          Status & Priority Controls
        </h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Admin / Support
        </span>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium flex items-center gap-2 border border-rose-200 dark:border-rose-900/50">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleApplyChanges} className="space-y-4">
        {/* Status Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Ticket Status
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {STATUS_OPTIONS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={cn(
                  "py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all text-center truncate",
                  selectedStatus === st
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                    : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Ticket Priority Level
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {PRIORITY_OPTIONS.map((pr) => (
              <button
                key={pr}
                type="button"
                onClick={() => setSelectedPriority(pr)}
                className={cn(
                  "py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all text-center truncate",
                  selectedPriority === pr
                    ? pr === "Critical"
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : pr === "High"
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                    : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                )}
              >
                {pr}
              </button>
            ))}
          </div>
        </div>

        {/* Reason / Audit Note Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reason / Update Note <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Audit log note / reason for update (Required)..."
            value={updateMessage}
            onChange={(e) => setUpdateMessage(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || (selectedStatus === currentStatus && selectedPriority === currentPriority)}
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 shadow-sm cursor-pointer"
        >
          {loading ? <Loader2 className="size-4 animate-spin text-emerald-500" /> : <CheckCircle2 className="size-4" />}
          Apply Status & Priority Updates
        </button>
      </form>
    </div>
  );
}
