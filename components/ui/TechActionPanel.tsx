"use client";

import React, { useState, useRef } from "react";
import axios from "axios";
import { Camera, CheckCircle, Clock, Loader2, PlayCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TechActionPanelProps {
  incidentId: number;
  currentStatus: string;
  onUpdate: () => void;
}

export default function TechActionPanel({ incidentId, currentStatus, onUpdate }: TechActionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [resolutionNote, setResolutionNote] = useState("");
  const [showResolveForm, setShowResolveForm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === "Resolved" && !resolutionNote.trim()) {
      setError("Please provide a resolution note before resolving.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, string> = {
        status: newStatus,
        message: `Technician updated status to ${newStatus}`
      };
      
      if (newStatus === "Resolved") {
        payload.resolutionNote = resolutionNote;
      }

      await axios.patch(`/api/incidents/${incidentId}`, payload);
      setShowResolveForm(false);
      onUpdate();
      
      toast.success(newStatus === "Resolved" ? 'Incident Resolved' : 'Status Updated', {
        description: `The ticket status has been updated to ${newStatus}.`,
        style: {
          '--normal-bg': 'color-mix(in oklab, light-dark(var(--color-green-600), var(--color-green-400)) 10%, var(--background))',
          '--normal-text': 'light-dark(var(--color-green-600), var(--color-green-400))',
          '--normal-border': 'light-dark(var(--color-green-600), var(--color-green-400))',
          borderRadius: '16px',
        } as React.CSSProperties,
        className: 'shadow-xl shadow-emerald-500/5',
      });
      
    } catch (err: unknown) {
      setError("Failed to update status");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await axios.post(`/api/incidents/${incidentId}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      onUpdate();
      
      toast.success('File Uploaded Successfully', {
        description: 'Your document is now available in the dashboard.',
        style: {
          '--normal-bg': 'color-mix(in oklab, light-dark(var(--color-green-600), var(--color-green-400)) 10%, var(--background))',
          '--normal-text': 'light-dark(var(--color-green-600), var(--color-green-400))',
          '--normal-border': 'light-dark(var(--color-green-600), var(--color-green-400))',
          borderRadius: '16px',
        } as React.CSSProperties,
        className: 'shadow-xl shadow-emerald-500/5',
      });
      
    } catch (err: unknown) {
      setError("Failed to upload image");
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
        <Clock className="size-4 text-emerald-500" />
        Technician Controls
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium flex items-center gap-2 border border-rose-200 dark:border-rose-900/50">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}

      {showResolveForm ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
          <textarea
            placeholder="Describe what was fixed..."
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            className="w-full h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusChange("Resolved")}
              disabled={loading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
              Confirm Resolution
            </button>
            <button
              onClick={() => setShowResolveForm(false)}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Status Actions */}
          {currentStatus !== "In Progress" && currentStatus !== "Resolved" && currentStatus !== "Closed" && (
            <button
              onClick={() => handleStatusChange("In Progress")}
              disabled={loading}
              className="col-span-2 sm:col-span-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
              Start Work
            </button>
          )}

          {currentStatus !== "Resolved" && currentStatus !== "Closed" && (
            <button
              onClick={() => setShowResolveForm(true)}
              disabled={loading}
              className="col-span-2 sm:col-span-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckCircle className="size-4" />
              Resolve Incident
            </button>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {/* Upload Action */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors active:scale-95 border-2 border-dashed",
              (currentStatus === "Resolved" || currentStatus === "Closed") ? "col-span-2" : "col-span-2 sm:col-span-1",
              "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-900"
            )}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
            Upload Photo
          </button>
        </div>
      )}
    </div>
  );
}
