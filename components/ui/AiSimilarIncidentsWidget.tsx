"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { Sparkles, History, Wrench, ShieldAlert, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { SimilarIntelligenceResult } from "@/lib/ai/similar-intelligence.service";

interface AiSimilarIncidentsWidgetProps {
  incidentId: number;
}

export default function AiSimilarIncidentsWidget({ incidentId }: Readonly<AiSimilarIncidentsWidgetProps>) {
  const [data, setData] = useState<SimilarIntelligenceResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadIntelligence() {
      if (!incidentId || Number.isNaN(incidentId)) return;
      try {
        setLoading(true);
        const res = await axios.post<SimilarIntelligenceResult>("/api/ai/similar-incidents", {
          incidentId,
        });
        setData(res.data);
        setError(null);
      } catch (err: unknown) {
        console.error("Failed to load AI historical intelligence:", err);
        setError("Unable to load AI historical intelligence.");
      } finally {
        setLoading(false);
      }
    }
    loadIntelligence();
  }, [incidentId]);

  if (loading) {
    return (
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Loader2 className="size-4 animate-spin text-emerald-500" />
          <span>Analyzing historical fleet intelligence...</span>
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  // Render clean empty state when no past tickets match with >= 60% precision
  if (!data.hasMatch || data.similarityMatchScore < 60) {
    return (
      <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Historical Repair Intelligence
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              No past resolved incidents match this specific failure with high confidence (&ge; 60%).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-white border border-emerald-500/20 dark:border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
      
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 relative z-10 border-b border-slate-200/80 dark:border-slate-800/80 pb-3.5 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Historical Repair Intelligence
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Matched with ticket</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{data.relevantPastTicketCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View Matched Ticket Link Button */}
          <Link
            href={`/incidents/${data.relevantPastTicketId ?? data.relevantPastTicketCode.replace(/^INC-/i, "")}`}
            target="_blank"
            className="px-3 py-1 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Open matched past ticket details in a new tab"
          >
            <span>View Ticket</span>
            <ExternalLink className="size-3 text-emerald-400 dark:text-emerald-600" />
          </Link>

          {/* Score Badge */}
          <div className="px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="size-3.5" />
            <span>{data.similarityMatchScore}% Match</span>
          </div>
        </div>
      </div>

      {/* Root Cause & Proven Fix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 relative z-10">
        
        {/* Root Cause Card */}
        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1 shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <ShieldAlert className="size-3 text-amber-500 dark:text-amber-400" /> Historical Root Cause
          </span>
          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            {data.historicalRootCause}
          </p>
        </div>

        {/* Proven Fix Card */}
        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1 shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <History className="size-3 text-emerald-500 dark:text-emerald-400" /> Proven Fix Summary
          </span>
          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            {data.provenFixSummary}
          </p>
        </div>
      </div>

      {/* Suggested Parts */}
      {data.suggestedParts && data.suggestedParts.length > 0 && (
        <div className="relative z-10 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
            <Wrench className="size-3.5 text-emerald-500 dark:text-emerald-400" /> Suggested Tools/Parts:
          </span>
          {data.suggestedParts.map((part, idx) => (
            <span
              key={idx}
              className="px-2.5 py-0.5 rounded-lg bg-emerald-50/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[11px] border border-emerald-500/20 dark:border-slate-700/60 font-medium"
            >
              {part}
            </span>
          ))}
        </div>
      )}

    </div>
  );
}
