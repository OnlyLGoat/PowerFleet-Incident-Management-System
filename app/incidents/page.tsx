"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useAuth } from "@/app/context/AuthContext";
import { 
  Search, 
  Filter, 
  Plus, 
  ArrowUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import AdminIncidentTable from "@/components/incidents/AdminIncidentTable";
import TechnicianIncidentList from "@/components/incidents/TechnicianIncidentList";

import { IncidentListItem, DBTechnician } from "@/types/incident";

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
  const [userToggleMyTickets, setUserToggleMyTickets] = useState<boolean | null>(null);

  // Derived filter state
  const myTicketsOnly = userToggleMyTickets ?? isTechnician;



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
              onClick={() => setUserToggleMyTickets(!myTicketsOnly)}
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

      {/* 3. Render View Based on Role */}
      {role === "Technician" ? (
        <TechnicianIncidentList 
          incidents={incidents.filter((item) => {
            if (!myTicketsOnly) return true;
            const assignedName = typeof item.assignedTo === "string" ? item.assignedTo : item.assignedTo?.internalUser?.user?.name;
            if (!assignedName) return false;
            if (!user?.name) return true;
            return assignedName.toLowerCase().includes(user.name.toLowerCase()) || user.role === "Technician";
          })}
          loading={loading}
          error={error}
        />
      ) : (
        <AdminIncidentTable 
          incidents={incidents.filter((item) => {
            if (!myTicketsOnly) return true;
            const assignedName = typeof item.assignedTo === "string" ? item.assignedTo : item.assignedTo?.internalUser?.user?.name;
            if (!assignedName) return false;
            if (!user?.name) return true;
            return assignedName.toLowerCase().includes(user.name.toLowerCase());
          })}
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
