"use client";

import React, { useState } from "react";
import { 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  Edit,
  Trash2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import SlaBadge from "@/components/ui/SlaBadge";
import InlineDisclosureMenu, { MenuAction } from "@/components/ui/InlineDisclosureMenu";
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
  const [page, setPage] = useState(1);

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
                incidents.map((item) => {
                  const menuActions: MenuAction[] = [
                    { label: "View Incident", icon: Eye, onClick: () => window.location.href = `/incidents/${item.id}` }
                  ];

                  if (isClient) {
                    menuActions.push({ label: "Edit Details", icon: Edit, onClick: () => console.log("Edit", item.id) });
                  } else if (role === "Admin" || role === "Support Manager") {
                    if (role === "Admin") {
                      menuActions.push({ label: "Delete Ticket", icon: Trash2, onClick: () => console.log("Delete", item.id), destructive: true });
                    }
                  }

                  return (
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
                        {role === "ClientUser" ? (
                          <span className="text-slate-400 italic font-medium text-[11px]">N/A</span>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                            {typeof item.assignedTo === "string" ? item.assignedTo : item.assignedTo?.internalUser?.user?.name || "Unassigned"}
                          </span>
                        )}
                      </td>

                      {(role === "Admin" || role === "Support Manager" || role === "Technician") && (
                        <td className="py-3.5 px-4">
                          <SlaBadge status={item.slaStatus ?? "Healthy"} />
                        </td>
                      )}

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end">
                          <InlineDisclosureMenu actions={menuActions} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
        <span>Showing {incidents.length} incident(s)</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            disabled
            onClick={() => setPage((p) => p + 1)}
            className="p-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
