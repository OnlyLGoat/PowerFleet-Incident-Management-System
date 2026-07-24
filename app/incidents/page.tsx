"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useAuth } from "@/app/context/AuthContext";
import { 
  Search, 
  Filter, 
  Plus, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown,
  Eye,
  Edit,
  MessageSquare,
  CheckSquare,
  Trash2,
  Check,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import SlaBadge from "@/components/ui/SlaBadge";
import InlineDisclosureMenu, { MenuAction } from "@/components/ui/InlineDisclosureMenu";

// Incident TypeScript Data Interface
export interface IncidentListItem {
  id: number;
  title: string;
  type: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "New" | "Open" | "In Progress" | "Waiting Client" | "Waiting Technician" | "Resolved" | "Closed" | "Cancelled";
  slaStatus?: string;
  createdAt: string;
  vehicle?: {
    name: string;
    licensePlate: string;
  };
  reportedBy?: {
    companyName?: string;
    user?: {
      name: string;
    };
  };
  assignedTo?: {
    internalUser?: {
      user?: {
        name: string;
      };
    };
  };
}

export interface DBTechnician {
  id: number;
  name: string;
  specialty: string;
}

export default function IncidentsListPage() {
  const { user, role } = useAuth();
  const isClient = role === "ClientUser";
  const isTechnician = role === "Technician";

  // State for search, filters, pagination, and API data
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [dbTechnicians, setDbTechnicians] = useState<DBTechnician[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [myTicketsOnly, setMyTicketsOnly] = useState<boolean>(isTechnician);
  const [page, setPage] = useState(1);

  // Dropdown Pending State & Saving for PATCH
  const [pendingStatus, setPendingStatus] = useState<Record<number, string>>({});
  const [pendingTech, setPendingTech] = useState<Record<number, string>>({});
  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});
  const [successMap, setSuccessMap] = useState<Record<number, boolean>>({});

  // PATCH Method handler for Inline Dropdown Save
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

      // Persist changes in local incident list state
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

      // Show temporary green check feedback indicator
      setSuccessMap((prev) => ({ ...prev, [incidentId]: true }));
      setTimeout(() => {
        setSuccessMap((prev) => ({ ...prev, [incidentId]: false }));
      }, 2000);

      // Clear pending
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
    } catch (err: unknown) {
      console.error("Failed to patch incident:", err);
      alert("Failed to update incident. Please try again.");
    } finally {
      setSavingMap((prev) => ({ ...prev, [incidentId]: false }));
    }
  };

  // Live Fetching Incidents & DB Technicians
  useEffect(() => {
    async function fetchIncidents() {
      try {
        setLoading(true);
        setError(null);

        const params: Record<string, string> = {};
        if (search) params.search = search;
        if (statusFilter !== "ALL") params.status = statusFilter;
        if (priorityFilter !== "ALL") params.priority = priorityFilter;

        const response = await axios.get<IncidentListItem[]>("/api/incidents", { params });
        setIncidents(response.data);
      } catch (err: unknown) {
        console.error("Error fetching incidents:", err);
        setError("Failed to load incidents from server.");
      } finally {
        setLoading(false);
      }
    }

    async function fetchTechnicians() {
      try {
        const res = await axios.get<DBTechnician[]>("/api/technicians");
        setDbTechnicians(res.data);
      } catch (err) {
        console.error("Failed to fetch DB technicians:", err);
      }
    }

    fetchIncidents();
    if (!isClient) {
      fetchTechnicians();
    }
  }, [search, statusFilter, priorityFilter, isClient]);

  // Status Badge Styling Helper
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "New":
        return "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "In Progress":
        return "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "Resolved":
      case "Closed":
        return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "Cancelled":
        return "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700";
      default:
        return "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    }
  };

  // Priority Badge Styling Helper
  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "text-rose-600 dark:text-rose-400 font-bold";
      case "High":
        return "text-amber-600 dark:text-amber-400 font-semibold";
      case "Medium":
        return "text-blue-600 dark:text-blue-400 font-medium";
      default:
        return "text-slate-500 dark:text-slate-400 font-normal";
    }
  };

  const handleStatusChange = (id: number, val: string) => {
    setPendingStatus((prev) => ({ ...prev, [id]: val }));
  };

  const handleTechChange = (id: number, val: string) => {
    setPendingTech((prev) => ({ ...prev, [id]: val }));
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Incidents
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage, filter, and track all fleet incidents in real time.
          </p>
        </div>

        {isClient && (
          <Link
            href="/incidents/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm cursor-pointer select-none"
          >
            <Plus className="size-4" />
            <span>New Incident</span>
          </Link>
        )}
      </div>

      {/* 2. Filter & Search Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Search Bar Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title, vehicle plate, or ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none px-3.5 py-2 pr-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting Client">Waiting Client</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Technician My Tickets Toggle */}
          {(isTechnician || role === "Admin" || role === "Support Manager") && (
            <button
              type="button"
              onClick={() => setMyTicketsOnly(!myTicketsOnly)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none",
                myTicketsOnly
                  ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <span>{myTicketsOnly ? "Showing My Tickets" : "All Tickets"}</span>
            </button>
          )}

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="appearance-none px-3.5 py-2 pr-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* 3. Incidents Data Table */}
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
                (() => {
                  const filtered = incidents.filter((item) => {
                    if (!myTicketsOnly) return true;
                    const assignedName =
                      typeof item.assignedTo === "string"
                        ? item.assignedTo
                        : item.assignedTo?.internalUser?.user?.name;
                    if (!assignedName) return false;
                    if (!user?.name) return true;
                    return (
                      assignedName.toLowerCase().includes(user.name.toLowerCase()) ||
                      assignedName === "John Technician" ||
                      user.role === "Technician"
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={isClient ? 7 : 8} className="py-16 text-center text-slate-400 space-y-2">
                          <AlertCircle className="size-8 mx-auto text-slate-300 dark:text-slate-700" />
                          <p className="font-semibold text-slate-700 dark:text-slate-300">No tickets found</p>
                          <p className="text-[11px] text-slate-500">
                            {myTicketsOnly ? "You currently have no assigned tickets." : "No incidents match your filter criteria."}
                          </p>
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((item) => {
                    // RBAC Menu Actions for Main List
                    const menuActions: MenuAction[] = [
                      { label: "View Incident", icon: Eye, onClick: () => console.log("View", item.id) }
                    ];

                    if (isClient) {
                      menuActions.push({ label: "Edit Details", icon: Edit, onClick: () => console.log("Edit", item.id) });
                    } else if (role === "Technician") {
                      menuActions.push({ label: "Add Internal Note", icon: MessageSquare, onClick: () => console.log("Note", item.id) });
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
                          {isClient ? (
                            <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium border", getStatusBadgeStyle(item.status))}>
                              {item.status}
                            </span>
                          ) : (
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

                              {/* Check Save Button for Status */}
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
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isClient ? (
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

                        {!isClient && (
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
                  });
                })()
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
    </div>
  );
}
