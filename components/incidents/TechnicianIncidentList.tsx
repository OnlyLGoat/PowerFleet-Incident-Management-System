"use client";

import React, { useState } from "react";
import { AlertCircle, Clock, MapPin, Truck, Loader2, Eye, Zap, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import SlaBadge from "@/components/ui/SlaBadge";
import IncidentReportModal from "@/components/ui/IncidentReportModal";
import { IncidentListItem } from "@/types/incident";
import Link from "next/link";

interface TechnicianIncidentListProps {
  incidents: IncidentListItem[];
  loading: boolean;
  error: string | null;
  role?: string;
}

export default function TechnicianIncidentList({
  incidents,
  loading,
  error,
  role,
}: TechnicianIncidentListProps) {
  const [selectedReportIncident, setSelectedReportIncident] = useState<{ id: number; title: string } | null>(null);

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case "Critical": return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400";
      case "High": return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400";
      case "Medium": return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400";
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "New": return "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50";
      case "In Progress": return "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/50";
      case "Resolved":
      case "Closed": return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50";
      case "Cancelled": return "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700";
      default: return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-6 animate-spin text-emerald-500" />
        <span className="text-sm text-slate-500 font-medium">Loading your assignments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-sm font-medium border border-rose-200 dark:border-rose-900/50">
          {error}
        </div>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center px-4">
        <div className="size-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
          <AlertCircle className="size-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No Active Tickets</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          You currently have no incidents assigned to you. Enjoy the downtime!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {incidents.map((item) => (
          <div 
            key={item.id}
            className="group block bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-700"
          >
            {/* Header row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">
                  Ticket #{item.id}
                </span>
                <h4 className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                  {item.title}
                </h4>
              </div>
              
              <div className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", getPriorityBadgeStyle(item.priority))}>
                {item.priority}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Truck className="size-3.5 opacity-70" />
                <span className="truncate">
                  {item.vehicle ? `${item.vehicle.name} (${item.vehicle.licensePlate})` : 'No Vehicle Assigned'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <MapPin className="size-3.5 opacity-70" />
                <span className="truncate">
                  {item.type} Issue
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Clock className="size-3.5 opacity-70" />
                <span>
                  {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border", getStatusBadgeStyle(item.status))}>
                  {item.status}
                </span>
                {item.slaStatus && (
                  <SlaBadge status={item.slaStatus} />
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {(role === "Admin" || role === "Support Manager") && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedReportIncident({ id: item.id, title: item.title })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/40 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 hover:border-indigo-600 transition-all select-none shadow-2xs cursor-pointer"
                      title="Generate Executive Incident Report"
                    >
                      <FileText className="size-3.5" />
                      <span>Report</span>
                    </button>

                    <Link
                      href={`/incidents/${item.id}/impact`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-600 hover:text-white dark:bg-purple-950/40 dark:hover:bg-purple-600 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800 hover:border-purple-600 transition-all select-none shadow-2xs"
                    >
                      <Zap className="size-3.5" />
                      <span>Impact</span>
                    </Link>
                  </>
                )}
                <Link
                  href={`/incidents/${item.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-500 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all select-none shadow-2xs"
                >
                  <Eye className="size-3.5" />
                  <span>View</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedReportIncident && (
        <IncidentReportModal
          isOpen={selectedReportIncident !== null}
          onClose={() => setSelectedReportIncident(null)}
          incidentId={selectedReportIncident.id}
          incidentTitle={selectedReportIncident.title}
        />
      )}
    </>
  );
}
