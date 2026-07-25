"use client";

import React, { useState } from "react";
import axios from "axios";
import { 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  Edit,
  CheckSquare,
  Trash2,
  Check,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import SlaBadge from "@/components/ui/SlaBadge";
import InlineDisclosureMenu, { MenuAction } from "@/components/ui/InlineDisclosureMenu";
import { IncidentListItem, DBTechnician } from "@/types/incident";
import { toast } from "sonner";

interface AdminIncidentTableProps {
  incidents: IncidentListItem[];
  loading: boolean;
  error: string | null;
  role: string;
  isClient: boolean;
  dbTechnicians: DBTechnician[];
  setIncidents: React.Dispatch<React.SetStateAction<IncidentListItem[]>>;
}

export default function AdminIncidentTable({
  incidents,
  loading,
  error,
  role,
  isClient,
  dbTechnicians,
  setIncidents
}: AdminIncidentTableProps) {
  const [page, setPage] = useState(1);
  
  // Dropdown Pending State & Saving for PATCH
  const [pendingStatus, setPendingStatus] = useState<Record<number, string>>({});
  const [pendingTech, setPendingTech] = useState<Record<number, string>>({});
  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});
  const [successMap, setSuccessMap] = useState<Record<number, boolean>>({});

  const handleStatusChange = (id: number, val: string) => {
    setPendingStatus((prev) => ({ ...prev, [id]: val }));
  };

  const handleTechChange = (id: number, val: string) => {
    setPendingTech((prev) => ({ ...prev, [id]: val }));
  };

  const handleSaveIncident = async (incidentId: number, currentStatus: string) => {
    const newStatus = pendingStatus[incidentId] ?? currentStatus;
    const newTechName = pendingTech[incidentId];

    setSavingMap((prev) => ({ ...prev, [incidentId]: true }));
    try {
      const payload: Record<string, unknown> = {
        status: newStatus,
        message: `Updated incident parameters from list`,
      };

      if (newTechName !== undefined) {
        if (newTechName === "") {
          payload.assignedToId = null;
        } else {
          const matchedTech = dbTechnicians.find((t) => t.name === newTechName);
          if (matchedTech) {
            payload.assignedToId = matchedTech.id;
          }
        }
      }

      await axios.patch(`/api/incidents/${incidentId}`, payload);

      setIncidents((prev) =>
        prev.map((item) =>
          item.id === incidentId
            ? {
                ...item,
                status: newStatus as IncidentListItem["status"],
                assignedTo: newTechName !== undefined
                  ? { internalUser: { user: { name: newTechName } } }
                  : item.assignedTo,
              }
            : item
        )
      );

      setSuccessMap((prev) => ({ ...prev, [incidentId]: true }));
      setTimeout(() => {
        setSuccessMap((prev) => ({ ...prev, [incidentId]: false }));
      }, 2000);

      setPendingStatus((prev) => {
        const copy = { ...prev };
        delete copy[incidentId];
        return copy;
      });
      setPendingTech((prev) => {
        const copy = { ...prev };
        delete copy[incidentId];
        return copy;
      });
      
      toast.success('Update Successful', {
        description: 'The incident details have been successfully updated.',
        style: {
          '--normal-bg': 'color-mix(in oklab, light-dark(var(--color-green-600), var(--color-green-400)) 10%, var(--background))',
          '--normal-text': 'light-dark(var(--color-green-600), var(--color-green-400))',
          '--normal-border': 'light-dark(var(--color-green-600), var(--color-green-400))',
          borderRadius: '16px',
        } as React.CSSProperties,
        className: 'shadow-xl shadow-emerald-500/5',
      });
      
    } catch (err: unknown) {
      console.error("Failed to patch incident:", err);
      alert("Failed to update incident. Please try again.");
    } finally {
      setSavingMap((prev) => ({ ...prev, [incidentId]: false }));
    }
  };

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
                    menuActions.push({ label: "Resolve Incident", icon: CheckSquare, onClick: () => console.log("Resolve", item.id) });
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
                        {role === "Admin" || role === "Support Manager" ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={pendingStatus[item.id] ?? item.status}
                              onChange={(e) => handleStatusChange(item.id, e.target.value)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer w-28"
                            >
                              <option value="New">New</option>
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Waiting Client">Waiting Client</option>
                              <option value="Resolved">Resolved</option>
                              <option value="Closed">Closed</option>
                            </select>

                            {pendingStatus[item.id] !== undefined && pendingStatus[item.id] !== item.status && (
                              <button
                                type="button"
                                disabled={savingMap[item.id]}
                                onClick={() => handleSaveIncident(item.id, item.status)}
                                className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center"
                                title="Save Status Change"
                              >
                                {savingMap[item.id] ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Check className="size-3.5 stroke-[2.5]" />
                                )}
                              </button>
                            )}

                            {successMap[item.id] && (
                              <span className="text-emerald-500 text-[10px] font-bold animate-fade-in flex items-center gap-0.5">
                                <Check className="size-3" /> Saved!
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium border", getStatusBadgeStyle(item.status))}>
                            {item.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {role === "ClientUser" ? (
                          <span className="text-slate-400 italic font-medium text-[11px]">N/A</span>
                        ) : role === "Admin" || role === "Support Manager" ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={pendingTech[item.id] ?? (item.assignedTo?.internalUser?.user?.name || "")}
                              onChange={(e) => handleTechChange(item.id, e.target.value)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer w-36"
                            >
                              <option value="">Unassigned</option>
                              {dbTechnicians.map((tech) => (
                                <option key={tech.id} value={tech.name}>
                                  {tech.name} ({tech.specialty})
                                </option>
                              ))}
                            </select>

                            {pendingTech[item.id] !== undefined && pendingTech[item.id] !== (item.assignedTo?.internalUser?.user?.name || "") && (
                              <button
                                type="button"
                                disabled={savingMap[item.id]}
                                onClick={() => handleSaveIncident(item.id, item.status)}
                                className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center"
                                title="Save Technician Assignment"
                              >
                                {savingMap[item.id] ? (
                                  <Loader2 className="size-3.5 animate-spin text-white" />
                                ) : (
                                  <Check className="size-3.5 stroke-[2.5]" />
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">{item.assignedTo?.internalUser?.user?.name || "Unassigned"}</span>
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
