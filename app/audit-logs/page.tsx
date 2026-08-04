"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Activity, 
  Search, 
  Filter, 
  RefreshCw, 
  Loader2, 
  Globe, 
  CheckCircle2, 
  ArrowRight,
  User,
  History,
  Layers
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SecurityLogItem {
  id: number;
  ipAddress: string;
  attemptedEndpoint: string;
  statusCode: number;
  message: string;
  incidentTargetId?: number | null;
  userId?: number | null;
  createdAt: string;
  userName?: string | null;
  userEmail?: string | null;
}

interface IncidentEventItem {
  id: number;
  incidentId: number;
  eventType: string;
  oldValue?: string | null;
  newValue?: string | null;
  message: string;
  createdAt: string;
  incidentTitle?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
}

interface AuditLogsResponse {
  securityLogs: SecurityLogItem[];
  incidentEvents: IncidentEventItem[];
  analytics: {
    totalSecurityAudits: number;
    criticalViolationsCount: number;
    successfulRequestsCount: number;
    uniqueIps: number;
    totalIncidentEvents: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    statusDistribution: Array<{ name: string; count: number; color: string }>;
  };
}

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tab & Filter States
  const [activeFeed, setActiveFeed] = useState<"security" | "incidents">("security");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get<AuditLogsResponse>("/api/audit-logs");
      setData(res.data);
    } catch (err: unknown) {
      console.error("Failed to load audit logs:", err);
      setError("Failed to load security audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadLogs() {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get<AuditLogsResponse>("/api/audit-logs");
        if (!ignore) {
          setData(res.data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Failed to load audit logs:", err);
          setError("Failed to load security audit logs.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadLogs();
    return () => {
      ignore = true;
    };
  }, []);

  // Filtered Security Logs
  const filteredSecurityLogs = useMemo(() => {
    if (!data?.securityLogs) return [];
    return data.securityLogs.filter((log) => {
      // Status Filter
      if (statusFilter === "success" && !(log.statusCode >= 200 && log.statusCode < 300)) return false;
      if (statusFilter === "client_error" && !(log.statusCode >= 400 && log.statusCode < 500)) return false;
      if (statusFilter === "server_error" && log.statusCode < 500) return false;

      // Search Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesEp = log.attemptedEndpoint.toLowerCase().includes(q);
        const matchesIp = log.ipAddress.toLowerCase().includes(q);
        const matchesMsg = log.message.toLowerCase().includes(q);
        const matchesUser = log.userName?.toLowerCase().includes(q) || log.userEmail?.toLowerCase().includes(q);
        const matchesStatus = String(log.statusCode).includes(q);
        if (!matchesEp && !matchesIp && !matchesMsg && !matchesUser && !matchesStatus) return false;
      }
      return true;
    });
  }, [data, statusFilter, searchQuery]);

  // Filtered Incident Events
  const filteredIncidentEvents = useMemo(() => {
    if (!data?.incidentEvents) return [];
    return data.incidentEvents.filter((event) => {
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesTitle = event.incidentTitle?.toLowerCase().includes(q);
        const matchesType = event.eventType.toLowerCase().includes(q);
        const matchesMsg = event.message.toLowerCase().includes(q);
        const matchesActor = event.actorName?.toLowerCase().includes(q);
        const matchesId = String(event.incidentId).includes(q);
        if (!matchesTitle && !matchesType && !matchesMsg && !matchesActor && !matchesId) return false;
      }
      return true;
    });
  }, [data, searchQuery]);

  if (loading && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
        <p className="text-xs font-semibold tracking-wide">Fetching live security audit logs & incident events...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-3xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-center space-y-3 max-w-xl mx-auto my-12">
        <ShieldAlert className="size-8 text-rose-500 mx-auto" />
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error ?? "Failed to load audit logs."}</p>
        <button
          type="button"
          onClick={fetchAuditLogs}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw className="size-3.5" /> Retry Connection
        </button>
      </div>
    );
  }

  const { analytics } = data;

  return (
    <div className="space-y-8 max-w-[1720px] mx-auto pb-16 w-full">

      {/* 2. Hero Security Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Lock className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Audit Events</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{analytics.totalSecurityAudits}</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Critical Violations</p>
            <p className="text-2xl font-extrabold text-rose-500 mt-0.5">{analytics.criticalViolationsCount}</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Globe className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Unique IP Sources</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{analytics.uniqueIps}</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            <History className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Incident Events Tracked</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{analytics.totalIncidentEvents}</p>
          </div>
        </div>

      </div>

      {/* 3. Analytics Visualizers (Top Targeted Endpoints & HTTP Status Code Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Monitored API Endpoints */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-emerald-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Top Targeted API Endpoints</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Real-time hit frequency</span>
          </div>

          <div className="space-y-3">
            {analytics.topEndpoints.map((item) => {
              const maxCount = analytics.topEndpoints[0]?.count || 1;
              const percentage = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.endpoint} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-slate-900 dark:text-white">{item.endpoint}</span>
                    <span className="text-slate-400 font-bold">{item.count} hits</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* HTTP Status Code Distribution */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-emerald-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Status Code Breakdown</h3>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {analytics.statusDistribution.map((item) => (
              <div key={item.name} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-center justify-between border border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center gap-2.5">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Log Feeds Navigation & Filter Controls */}
      <div className="space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          
          {/* Feed Selector Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFeed("security")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                activeFeed === "security"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <ShieldCheck className="size-4" />
              <span>Security Audit Logs ({filteredSecurityLogs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFeed("incidents")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                activeFeed === "incidents"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <History className="size-4" />
              <span>Incident Events Timeline ({filteredIncidentEvents.length})</span>
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-2">
            
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={activeFeed === "security" ? "Filter IP, endpoint, user..." : "Filter title, event type..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {activeFeed === "security" && (
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-xl text-xs">
                <Filter className="size-3 text-slate-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-slate-700 dark:text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">2xx Success</option>
                  <option value="client_error">4xx Client Errors</option>
                  <option value="server_error">5xx Server Errors</option>
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={fetchAuditLogs}
              title="Refresh Audit Stream"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer select-none"
            >
              <RefreshCw className="size-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

          </div>

        </div>

        {/* FEED 1: Security Audit Log Table Stream */}
        {activeFeed === "security" && (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm overflow-hidden">
            {filteredSecurityLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <CheckCircle2 className="size-8 text-emerald-500 mx-auto" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No Security Logs Matching Filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="font-semibold py-3 px-3">Status</th>
                      <th className="font-semibold py-3 px-3">Attempted Endpoint</th>
                      <th className="font-semibold py-3 px-3">Message</th>
                      <th className="font-semibold py-3 px-3">User & IP Address</th>
                      <th className="font-semibold py-3 px-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredSecurityLogs.map((log) => {
                      const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
                      const isClientErr = log.statusCode >= 400 && log.statusCode < 500;
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          
                          <td className="py-3 px-3">
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border",
                                isSuccess ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "",
                                isClientErr ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : "",
                                !isSuccess && !isClientErr ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" : ""
                              )}
                            >
                              HTTP {log.statusCode}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {log.attemptedEndpoint}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <p className="text-slate-600 dark:text-slate-300 max-w-md truncate">{log.message}</p>
                          </td>

                          <td className="py-3 px-3">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {log.userName || "Anonymous / Unauthenticated"}
                              </p>
                              <p className="text-[10px] font-mono text-slate-400">IP: {log.ipAddress}</p>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <span className="text-[11px] text-slate-400 font-mono">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* FEED 2: Incident Events Timeline ("Place of Incident Events") */}
        {activeFeed === "incidents" && (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm overflow-hidden space-y-4">
            {filteredIncidentEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <History className="size-8 text-emerald-500 mx-auto" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No Incident Events Matching Filter</p>
              </div>
            ) : (
              <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredIncidentEvents.map((event) => (
                  <div key={event.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 p-3 rounded-2xl transition-colors">
                    
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                          #{event.incidentId}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {event.incidentTitle || "Incident Ticket"}
                        </span>
                      {(() => {
                        const getEventTypeBadge = (type: string) => {
                          switch (type) {
                            case "create_incident":
                              return {
                                label: "Incident Created",
                                className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              };
                            case "status_changed":
                              return {
                                label: "Status Changed",
                                className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              };
                            case "priority_changed":
                              return {
                                label: "Priority Changed",
                                className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              };
                            case "technician_assigned":
                              return {
                                label: "Technician Assigned",
                                className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                              };
                            case "add_attachment":
                              return {
                                label: "Attachment Added",
                                className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                              };
                            case "comment":
                              return {
                                label: "Comment Posted",
                                className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                              };
                            default:
                              return {
                                label: type.replaceAll("_", " "),
                                className: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                              };
                          }
                        };
                        const badge = getEventTypeBadge(event.eventType);
                        return (
                          <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider", badge.className)}>
                            {badge.label}
                          </span>
                        );
                      })()}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {event.message}
                      </p>

                      {/* Old Value ➔ New Value Diff Badges */}
                      {(event.oldValue || event.newValue) && (
                        <div className="flex items-center gap-2 text-[11px] font-mono pt-1">
                          {event.oldValue && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              - {event.oldValue}
                            </span>
                          )}
                          <ArrowRight className="size-3 text-slate-400" />
                          {event.newValue && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              + {event.newValue}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                        <User className="size-3" />
                        <span>Actor: {event.actorName || event.actorEmail || "System Automation"}</span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                      <Link
                        href={`/incidents/${event.incidentId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <span>View Ticket</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
