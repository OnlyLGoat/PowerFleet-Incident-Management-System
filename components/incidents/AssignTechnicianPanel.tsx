"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { UserCheck, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { TechnicianItem } from "@/app/api/technicians/route";

interface AssignTechnicianPanelProps {
  incidentId: number;
  currentAssignedId?: number | null;
  onUpdate: () => void;
}

export default function AssignTechnicianPanel({
  incidentId,
  currentAssignedId,
  onUpdate,
}: AssignTechnicianPanelProps) {
  const [technicians, setTechnicians] = useState<TechnicianItem[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<number | "">(currentAssignedId || "");
  const [assignmentNote, setAssignmentNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTechnicians() {
      try {
        setLoading(true);
        const res = await axios.get<TechnicianItem[]>("/api/technicians");
        setTechnicians(res.data);
        setError(null);
      } catch (err: unknown) {
        console.error("Failed to load available technicians:", err);
        setError("Failed to fetch available technicians list.");
      } finally {
        setLoading(false);
      }
    }
    fetchTechnicians();
  }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedTechId) {
      setError("Please select a technician to assign.");
      return;
    }

    if (!assignmentNote.trim()) {
      const msgErr = "Reason/message is required when assigning a technician.";
      setError(msgErr);
      toast.error(msgErr);
      return;
    }

    try {
      setAssigning(true);
      const chosenTech = technicians.find((t) => t.id === Number(selectedTechId));

      await axios.patch(`/api/incidents/${incidentId}`, {
        assignedToId: Number(selectedTechId),
        message: assignmentNote.trim(),
      });

      toast.success("Technician Assigned", {
        description: `${chosenTech?.name || "Technician"} has been assigned to this ticket.`,
        style: {
          "--normal-bg": "color-mix(in oklab, light-dark(var(--color-green-600), var(--color-green-400)) 10%, var(--background))",
          "--normal-text": "light-dark(var(--color-green-600), var(--color-green-400))",
          "--normal-border": "light-dark(var(--color-green-600), var(--color-green-400))",
          borderRadius: "16px",
        } as React.CSSProperties,
        className: "shadow-xl shadow-emerald-500/5",
      });

      setAssignmentNote("");
      onUpdate();
    } catch (err: unknown) {
      console.error("Failed to assign technician:", err);
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || "Failed to assign technician. Ensure they are active and available.");
    } finally {
      setAssigning(false);
    }
  };

  const selectedTech = technicians.find((t) => t.id === Number(selectedTechId));

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
          <UserCheck className="size-4 text-emerald-500" />
          Assign Technician
        </h3>
        {selectedTech && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {selectedTech.specialty}
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium flex items-center gap-2 border border-rose-200 dark:border-rose-900/50">
          <ShieldAlert className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin text-emerald-500" />
          <span>Loading available technicians...</span>
        </div>
      ) : (
        <form onSubmit={handleAssign} className="space-y-3">
          <div>
            <label htmlFor="detail-assign-technician-select" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Select Field Technician
            </label>
            <select
              id="detail-assign-technician-select"
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">-- Choose an Available Technician --</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name} ({tech.specialty})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Dispatch Instruction / Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Dispatch instruction / reason for assignment (Required)..."
              value={assignmentNote}
              onChange={(e) => setAssignmentNote(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={assigning || !selectedTechId}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 shadow-sm"
          >
            {assigning ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Confirm Technician Assignment
          </button>
        </form>
      )}
    </div>
  );
}
