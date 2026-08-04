"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/context/AuthContext";
import { 
  Search, 
  Plus, 
  LayoutList, 
  LayoutGrid,
  Loader2,
  Filter,
  Flame,
  ArrowUp,
  Rows3
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

  // Pagination & Display States
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageSizeInput, setPageSizeInput] = useState<string>("10");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // View Mode: Table vs Cards (Default: Cards for Technician, Table for others)
  const [viewMode, setViewMode] = useState<"table" | "cards">(isTechnician ? "cards" : "table");

  // Search & Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  // Derived filter state
  const myTicketsOnly = myTicketsParam === "true" || isTechnician;

  // Adjust page number when filters change
  const currentFilterKey = `${search}-${statusFilter}-${priorityFilter}-${myTicketsOnly}-${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState<string>(currentFilterKey);
  if (currentFilterKey !== prevFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setCurrentPage(1);
  }

  // Scroll to top listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  // Calculate Paginated Subset
  const totalIncidentsCount = filteredIncidents.length;
  const totalPages = Math.max(1, Math.ceil(totalIncidentsCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalIncidentsCount);
  const paginatedIncidents = filteredIncidents.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 relative">
      {/* Filter & Search Controls Toolbar */}
      <div className="space-y-3 bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Top Row: Search Input + Action Controls + View Mode Switcher Toggle */}
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
            {isClient && (
              <Link
                href="/incidents/new"
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm cursor-pointer select-none whitespace-nowrap"
              >
                <Plus className="size-4" />
                <span>New Incident</span>
              </Link>
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

        {/* Bottom Row: Status Dropdown, Priority Dropdown & Items Per Page Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Status Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Filter className="size-3" /> Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer select-none"
              >
                {STATUS_FILTERS.map((st) => (
                  <option key={st.key} value={st.key}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Flame className="size-3 text-amber-500" /> Priority:
              </span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer select-none"
              >
                {PRIORITY_FILTERS.map((pr) => (
                  <option key={pr.key} value={pr.key}>
                    {pr.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Items Per Page Numeric Input */}
          <div className="flex items-center gap-2">
            <Rows3 className="size-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Show:
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={1000}
                value={pageSizeInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setPageSizeInput(val);
                  const parsed = parseInt(val, 10);
                  if (!Number.isNaN(parsed) && parsed > 0) {
                    setPageSize(parsed);
                  }
                }}
                className="w-16 px-2.5 py-1.5 rounded-xl text-xs font-bold text-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

        </div>

      </div>

      {/* 3. Render View Based on View Mode (Table vs Cards) */}
      {viewMode === "cards" ? (
        <TechnicianIncidentList 
          incidents={paginatedIncidents}
          loading={loading}
          error={error}
          role={role || ""}
        />
      ) : (
        <AdminIncidentTable 
          incidents={paginatedIncidents}
          loading={loading}
          error={error}
          role={role || ""}
          isClient={isClient}
          dbTechnicians={dbTechnicians}
          setIncidents={setIncidents}
        />
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Showing <span className="text-slate-900 dark:text-slate-100 font-bold">{startIndex + 1}</span> to <span className="text-slate-900 dark:text-slate-100 font-bold">{endIndex}</span> of <span className="text-slate-900 dark:text-slate-100 font-bold">{totalIncidentsCount}</span> incidents
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Prev
            </button>
            
            <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border cursor-pointer",
                    safeCurrentPage === pageNum 
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20" 
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* 4. Smooth Floating Back-to-Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll back to top"
            title="Scroll to Top"
            className="fixed bottom-7 right-7 z-50 flex size-11 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl hover:bg-emerald-600 hover:scale-110 active:scale-95 transition-all border border-emerald-400/40 cursor-pointer"
          >
            <ArrowUp className="size-5 stroke-[2.5]" />
          </motion.button>
        )}
      </AnimatePresence>
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
