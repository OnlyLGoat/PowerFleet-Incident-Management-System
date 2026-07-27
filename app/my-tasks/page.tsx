"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useAuth } from "@/app/context/AuthContext";
import { 
  CheckSquare, 
  Clock, 
  Zap, 
  AlertCircle, 
  UserCheck, 
  UserPlus, 
  Search, 
  Filter, 
  Building2, 
  Truck, 
  MapPin, 
  Eye, 
  Loader2, 
  RefreshCw,
  CheckCircle2,
  X,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import SlaBadge from "@/components/ui/SlaBadge";
import { cn } from "@/lib/utils";

interface TaskItem {
  id: number;
  ticketCode: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  address: string;
  slaStatus?: string;
  responseDueAt?: string;
  resolutionDueAt?: string;
  createdAt: string;
  assignedToId?: number | null;
  assignedToName?: string | null;
  assignedToEmail?: string | null;
  vehicle?: {
    name: string;
    licensePlate: string;
    imei?: string;
  } | null;
  client?: {
    companyName: string;
    contactName: string;
    phone: string;
    email?: string | null;
  } | null;
}

interface AvailableTech {
  id: number;
  name: string;
  email: string;
  specialty: string;
}

interface MyTasksResponse {
  tasks: TaskItem[];
  summary: {
    total: number;
    assignedToMe: number;
    inProgress: number;
    slaUrgent: number;
    unassigned: number;
  };
  availableTechnicians: AvailableTech[];
  userRole: string;
}

export default function MyTasksPage() {
  const { user, role } = useAuth();
  const isTech = role === "Technician";
  const isManagerOrAdmin = role === "Support Manager" || role === "Admin";

  const [data, setData] = useState<MyTasksResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [activeTab, setActiveTab] = useState<"all" | "open" | "in_progress" | "sla_urgent" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Assign Tech Modal State
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<TaskItem | null>(null);
  const [assigningTechId, setAssigningTechId] = useState<number | null>(null);
  const [assigningLoading, setAssigningLoading] = useState<boolean>(false);

  // Status Action Loading State
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get<MyTasksResponse>("/api/my-tasks");
      setData(res.data);
    } catch (err: unknown) {
      console.error("Failed to load tasks:", err);
      setError("Failed to load personal work queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadTasks() {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get<MyTasksResponse>("/api/my-tasks");
        if (!ignore) {
          setData(res.data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Failed to load tasks:", err);
          setError("Failed to load personal work queue.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadTasks();
    return () => {
      ignore = true;
    };
  }, []);

  // Filtered Task List
  const filteredTasks = useMemo(() => {
    if (!data?.tasks) return [];
    return data.tasks.filter((task) => {
      // Tab Filter
      if (activeTab === "open" && !(task.status === "New" || task.status === "Open")) return false;
      if (activeTab === "in_progress" && task.status !== "In Progress") return false;
      if (activeTab === "sla_urgent" && !(task.slaStatus === "Warning_Response" || task.slaStatus === "Breached_Response" || task.priority === "Critical")) return false;
      if (activeTab === "completed" && !(task.status === "Resolved" || task.status === "Closed")) return false;

      // Priority Filter
      if (priorityFilter !== "all" && task.priority.toLowerCase() !== priorityFilter.toLowerCase()) return false;

      // Search Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesCode = task.ticketCode.toLowerCase().includes(q) || String(task.id).includes(q);
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesVehicle = task.vehicle?.name.toLowerCase().includes(q) || task.vehicle?.licensePlate.toLowerCase().includes(q);
        const matchesClient = task.client?.companyName.toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle && !matchesVehicle && !matchesClient) return false;
      }

      return true;
    });
  }, [data, activeTab, priorityFilter, searchQuery]);

  // Quick Action: Update Status (Start Repair / Resolve)
  const handleUpdateStatus = async (taskId: number, newStatus: string) => {
    try {
      setActionLoadingId(taskId);
      await axios.patch(`/api/incidents/${taskId}`, { status: newStatus });
      toast.success(`Task status updated to "${newStatus}"`, {
        description: `Incident #${taskId} successfully updated.`,
      });
      await fetchMyTasks();
    } catch (err: unknown) {
      console.error("Failed to update status:", err);
      toast.error("Failed to update task status");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Action: Assign Technician
  const handleAssignTechnician = async () => {
    if (!selectedTaskForAssign || !assigningTechId) return;
    try {
      setAssigningLoading(true);
      await axios.patch(`/api/incidents/${selectedTaskForAssign.id}`, {
        assignedToId: assigningTechId,
        status: "Open"
      });
      toast.success("Technician assigned successfully!", {
        description: `Incident #${selectedTaskForAssign.id} assigned to technician.`,
      });
      setSelectedTaskForAssign(null);
      setAssigningTechId(null);
      await fetchMyTasks();
    } catch (err: unknown) {
      console.error("Failed to assign technician:", err);
      toast.error("Failed to assign technician.");
    } finally {
      setAssigningLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
        <p className="text-xs font-semibold tracking-wide">Loading personal work queue...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-3xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-center space-y-3 max-w-xl mx-auto my-12">
        <AlertCircle className="size-8 text-rose-500 mx-auto" />
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error ?? "Failed to load workspace."}</p>
        <button
          type="button"
          onClick={fetchMyTasks}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-colors shadow-sm"
        >
          <RefreshCw className="size-3.5" /> Retry Loading
        </button>
      </div>
    );
  }

  const { summary, availableTechnicians } = data;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 w-full">
      
      {/* 1. Header Banner & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Personal Work Queue
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              {role ?? "User Workspace"}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CheckSquare className="size-6 text-emerald-500" />
            My Tasks & Field Operations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time assigned work queue, SLA countdowns, and quick dispatch controls.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMyTasks}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw className="size-3.5" /> Refresh Queue
        </button>
      </div>

      {/* 2. Hero Summary Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
            <CheckSquare className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Tasks</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{summary.total}</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Zap className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{summary.inProgress}</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">SLA Urgent / Critical</p>
            <p className="text-2xl font-extrabold text-rose-500 mt-0.5">{summary.slaUrgent}</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <UserCheck className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Unassigned Queue</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{summary.unassigned}</p>
          </div>
        </div>

      </div>

      {/* 3. Filter Navigation & Real-time Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer",
              activeTab === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            All Tasks ({summary.total})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("open")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer",
              activeTab === "open"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            Action Required
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("in_progress")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer",
              activeTab === "in_progress"
                ? "bg-amber-500 text-white font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            In Progress ({summary.inProgress})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sla_urgent")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer",
              activeTab === "sla_urgent"
                ? "bg-rose-500 text-white font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            SLA Urgent ({summary.slaUrgent})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer",
              activeTab === "completed"
                ? "bg-emerald-500 text-white font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            Completed
          </button>
        </div>

        {/* Search & Priority Controls */}
        <div className="flex items-center gap-2">
          
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search code, vehicle, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-xl text-xs">
            <Filter className="size-3 text-slate-400 shrink-0" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent border-none text-slate-700 dark:text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

        </div>

      </div>

      {/* 4. Task Cards Grid */}
      {filteredTasks.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Tasks Matching Filters</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            You currently have no tasks matching the selected filters or search query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => {
            const isAssignedToMe = task.assignedToId === user?.id;
            const isUnassigned = !task.assignedToId;

            return (
              <div
                key={task.id}
                className="flex flex-col justify-between p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-5 relative"
              >
                {/* Card Top Row: Code, Priority, SLA */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        {task.ticketCode}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 uppercase tracking-wider">
                        {task.priority}
                      </span>
                    </div>

                    {task.slaStatus && <SlaBadge status={task.slaStatus} />}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2">
                      {task.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {task.description}
                    </p>
                  </div>
                </div>

                {/* Card Middle Info: Client, Vehicle, Address */}
                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  
                  {task.client && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Building2 className="size-3.5 text-emerald-500 shrink-0" />
                      <span className="font-semibold truncate">{task.client.companyName}</span>
                      <span className="text-slate-400 text-[11px]">({task.client.contactName})</span>
                    </div>
                  )}

                  {task.vehicle && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Truck className="size-3.5 text-blue-500 shrink-0" />
                      <span className="font-semibold truncate">{task.vehicle.name}</span>
                      <span className="font-mono text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {task.vehicle.licensePlate}
                      </span>
                    </div>
                  )}

                  {task.address && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                      <MapPin className="size-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{task.address}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-medium">Assigned Tech:</span>
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded",
                      task.assignedToName
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                    )}>
                      {task.assignedToName || "Unassigned"}
                    </span>
                  </div>

                </div>

                {/* Card Action Controls Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  
                  {/* Inline Status Actions for Technicians */}
                  {isTech && isAssignedToMe && task.status !== "Resolved" && task.status !== "Closed" && (
                    <div className="flex items-center gap-1.5">
                      {task.status !== "In Progress" ? (
                        <button
                          type="button"
                          disabled={actionLoadingId === task.id}
                          onClick={() => handleUpdateStatus(task.id, "In Progress")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoadingId === task.id ? <Loader2 className="size-3 animate-spin" /> : <Wrench className="size-3" />}
                          <span>Start Repair</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={actionLoadingId === task.id}
                          onClick={() => handleUpdateStatus(task.id, "Resolved")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoadingId === task.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                          <span>Mark Resolved</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Inline Assign Action for Support Managers & Admins */}
                  {isManagerOrAdmin && isUnassigned && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTaskForAssign(task);
                        setAssigningTechId(availableTechnicians[0]?.id || null);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
                    >
                      <UserPlus className="size-3.5" />
                      <span>Assign Tech</span>
                    </button>
                  )}

                  <Link
                    href={`/incidents/${task.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-auto"
                  >
                    <Eye className="size-3.5" />
                    <span>Details</span>
                  </Link>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 5. Assign Technician Modal (For Support Managers & Admins) */}
      {selectedTaskForAssign && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="size-5 text-emerald-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Assign Technician</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForAssign(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{selectedTaskForAssign.ticketCode}: {selectedTaskForAssign.title}</p>
              <p className="text-slate-500 dark:text-slate-400">Vehicle: {selectedTaskForAssign.vehicle?.name} ({selectedTaskForAssign.vehicle?.licensePlate})</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Available Technician:
              </label>
              {availableTechnicians.length === 0 ? (
                <p className="text-xs text-rose-500 font-medium">No available technicians online currently.</p>
              ) : (
                <select
                  value={assigningTechId ?? ""}
                  onChange={(e) => setAssigningTechId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {availableTechnicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} ({tech.specialty}) - {tech.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTaskForAssign(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assigningLoading || !assigningTechId}
                onClick={handleAssignTechnician}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {assigningLoading ? <Loader2 className="size-3.5 animate-spin" /> : <UserCheck className="size-3.5" />}
                <span>Confirm Assignment</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
