"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  AlertCircle, 
  Eye,
  Loader2,
  Zap,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import SlaBadge from "@/components/ui/SlaBadge";
import IncidentReportModal from "@/components/ui/IncidentReportModal";
import { IncidentListItem, DBTechnician } from "@/types/incident";

interface AdminIncidentTableProps {
  incidents: IncidentListItem[];
  loading: boolean;
  error: string | null;
  role: string;
  isClient: boolean;
  dbTechnicians?: DBTechnician[];
  setIncidents?: React.Dispatch<React.SetStateAction<IncidentListItem[]>>;
}

export default function AdminIncidentTable({
  incidents,
  loading,
  error,
  role,
  isClient
}: AdminIncidentTableProps) {
  const [selectedReportIncident, setSelectedReportIncident] = useState<{ id: number; title: string } | null>(null);

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case "Critical": return "text-rose-600 dark:text-rose-400 font-bold";
      case "High": return "text-amber-600 dark:text-amber-400 font-semibold";
      case "Medium": return "text-blue-600 dark:text-blue-400 font-medium";
      default: return "text-slate-500 dark:text-slate-400 font-normal";
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "New": return "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "In Progress": return "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "Resolved":
      case "Closed": return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "Cancelled": return "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700";
      default: return "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
      <div className="overflow-x-auto rounded-2xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="py-3.5 px-4">Ticket ID</th>
              <th className="py-3.5 px-4">Title / Vehicle</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Priority</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Assigned Tech</th>
              {!isClient && <th className="py-3.5 px-4">SLA State</th>}
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading && (
              <tr>
                <td colSpan={isClient ? 7 : 8} className="py-12 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin text-emerald-500" />
                    <span>Loading incidents...</span>
                  </div>
                </td>
              </tr>
            )}

            {error && (
              <tr>
                <td colSpan={isClient ? 7 : 8} className="py-8 text-center text-rose-500 font-medium">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && (
              incidents.length === 0 ? (
                <tr>
                  <td colSpan={isClient ? 7 : 8} className="py-16 text-center text-slate-400 space-y-2">
                    <AlertCircle className="size-8 mx-auto text-slate-300 dark:text-slate-700" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No tickets found</p>
                  </td>
                </tr>
              ) : (
                incidents.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      #{item.id}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">{item.title}</p>
                      {item.vehicle && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {item.vehicle.name} ({item.vehicle.licensePlate})
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {item.type}
                    </td>

                    <td className={cn("py-3.5 px-4 font-medium", getPriorityBadgeStyle(item.priority))}>
                      {item.priority}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium border", getStatusBadgeStyle(item.status))}>
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                        {typeof item.assignedTo === "string" ? item.assignedTo : item.assignedTo?.internalUser?.user?.name || "Unassigned"}
                      </span>
                    </td>

                    {(role === "Admin" || role === "Support Manager" || role === "Technician") && (
                      <td className="py-3.5 px-4">
                        <SlaBadge status={item.slaStatus ?? "Healthy"} />
                      </td>
                    )}

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {(role === "Admin" || role === "Support Manager") && (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedReportIncident({ id: item.id, title: item.title })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/40 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 hover:border-indigo-600 transition-all cursor-pointer select-none shadow-2xs"
                              title="Generate Executive Incident Report"
                            >
                              <FileText className="size-3.5" />
                              <span>Report</span>
                            </button>

                            <Link
                              href={`/incidents/${item.id}/impact`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-600 hover:text-white dark:bg-purple-950/40 dark:hover:bg-purple-600 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800 hover:border-purple-600 transition-all cursor-pointer select-none shadow-2xs"
                            >
                              <Zap className="size-3.5" />
                              <span>Impact</span>
                            </Link>
                          </>
                        )}
                        <Link
                          href={`/incidents/${item.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-500 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all cursor-pointer select-none shadow-2xs"
                        >
                          <Eye className="size-3.5" />
                          <span>View</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>

      {selectedReportIncident && (
        <IncidentReportModal
          isOpen={selectedReportIncident !== null}
          onClose={() => setSelectedReportIncident(null)}
          incidentId={selectedReportIncident.id}
          incidentTitle={selectedReportIncident.title}
        />
      )}
    </div>
  );
}
