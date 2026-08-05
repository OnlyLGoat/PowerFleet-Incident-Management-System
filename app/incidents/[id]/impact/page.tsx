"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import ImpactMap from "@/components/incidents/ImpactMap";

export default function IncidentImpactPage() {
  const params = useParams();
  const { role } = useAuth();

  const rawId = (params.id as string || "").replace(/^INC-/i, "");
  const incidentId = Number(rawId);

  const canViewImpact = role === "Admin" || role === "Support Manager";

  if (!canViewImpact) {
    return (
      <div className="max-w-[1720px] mx-auto py-12 px-4 space-y-6">
        <Link
          href={`/incidents/${rawId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors select-none"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Ticket #{rawId}</span>
        </Link>

        <div className="rounded-3xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center space-y-4">
          <ShieldAlert className="size-12 mx-auto text-rose-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Access Restricted
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Operational impact analysis maps are restricted strictly to Administrators and Support Managers.
          </p>
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold hover:bg-slate-800 transition-all select-none"
          >
            Return to Incidents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1720px] mx-auto pb-12 w-full">
      {/* Navigation Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href={`/incidents/${rawId}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors select-none"
            >
              <ArrowLeft className="size-4" />
              <span>Back to Ticket #{rawId}</span>
            </Link>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            Operational Impact Analysis
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              #INC-{rawId}
            </span>
          </h1>
        </div>

        <Link
          href={`/incidents/${rawId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all select-none self-start sm:self-auto"
        >
          View Ticket Details
        </Link>
      </div>

      {/* Render Impact Map System */}
      <ImpactMap incidentId={incidentId} />
    </div>
  );
}
