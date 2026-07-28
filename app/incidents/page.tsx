"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/app/context/AuthContext";
import { 
  Search, 
  Plus, 
  LayoutList, 
  LayoutGrid,
  Loader2,
  Filter,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import AdminIncidentTable from "@/components/incidents/AdminIncidentTable";
import TechnicianIncidentList from "@/components/incidents/TechnicianIncidentList";

import { IncidentListItem, DBTechnician } from "@/types/incident";

const STATUS_FILTERS = [
  { key: "ALL", label: "All Statuses" },
  { key: "New", label: "New" },
  { key: "In Progress", label: "In Progress" },
  { key: "Waiting Client", label: "Waiting Client" },
  { key: "Resolved", label: "Resolved" },
  { key: "Closed", label: "Closed" },
];

const PRIORITY_FILTERS = [
  { key: "ALL", label: "All Priorities" },
  { key: "Low", label: "Low" },
  { key: "Medium", label: "Medium" },
  { key: "High", label: "High" },
  { key: "Critical", label: "Critical" },
];

function IncidentsContent() {
  const searchParams = useSearchParams();
  const myTicketsParam = searchParams.get("myTickets");

  const { user, role } = useAuth();
  const isClient = role === "ClientUser";
  const isTechnician = role === "Technician";

  // State for search, view mode, filters, and API data
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [dbTechnicians, setDbTechnicians] = useState<DBTechnician[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: Table vs Cards (Default: Cards for Technician, Table for others)
  const [viewMode, setViewMode] = useState<"table" | "cards">(isTechnician ? "cards" : "table");

  // Search & Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [userToggleMyTickets, setUserToggleMyTickets] = useState<boolean | null>(
    myTicketsParam === "true" ? true : null
  );

  // Derived filter state
  const myTicketsOnly = userToggleMyTickets ?? (myTicketsParam === "true" || isTechnician);

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

  // Filter incidents for "My Tickets"
  const filteredIncidents = incidents.filter((item) => {
    if (!myTicketsOnly) return true;
    const assignedName = typeof item.assignedTo === "string" ? item.assignedTo : item.assignedTo?.internalUser?.user?.name;
    if (!assignedName) return false;
    if (!user?.name) return true;
    return assignedName.toLowerCase().includes(user.name.toLowerCase()) || isTechnician;
  });

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
      <div className="space-y-3 bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Top Row: Search Input + View Mode Switcher Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

          <div className="flex items-center gap-2 flex-wrap">
            {/* My Tickets Toggle Button for Internal Users */}
            {(!isClient) && (
              <button
                type="button"
                onClick={() => setUserToggleMyTickets(!myTicketsOnly)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none",
                  myTicketsOnly
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <span>{myTicketsOnly ? "Showing My Tickets" : "All Fleet Tickets"}</span>
              </button>
            )}

            {/* Table / Cards View Switcher Toggle */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table View"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none",
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <LayoutList className="size-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                title="Cards Grid View"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none",
                  viewMode === "cards"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row: Restored Status & Priority Pill Filter Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter className="size-3" /> Status:
            </span>
            {STATUS_FILTERS.map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer select-none",
                  statusFilter === st.key
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Priority Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Flame className="size-3 text-amber-500" /> Priority:
            </span>
            {PRIORITY_FILTERS.map((pr) => (
              <button
                key={pr.key}
                type="button"
                onClick={() => setPriorityFilter(pr.key)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer select-none",
                  priorityFilter === pr.key
                    ? pr.key === "Critical"
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : pr.key === "High"
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                {pr.label}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* 3. Render View Based on View Mode (Table vs Cards) */}
      {viewMode === "cards" ? (
        <TechnicianIncidentList 
          incidents={filteredIncidents}
          loading={loading}
          error={error}
        />
      ) : (
        <AdminIncidentTable 
          incidents={filteredIncidents}
          loading={loading}
          error={error}
          role={role || ""}
          isClient={isClient}
          dbTechnicians={dbTechnicians}
          setIncidents={setIncidents}
        />
      )}
    </div>
  );
}

export default function IncidentsListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
        <p className="text-xs font-semibold">Loading Incidents Workspace...</p>
      </div>
    }>
      <IncidentsContent />
    </Suspense>
  );
}
