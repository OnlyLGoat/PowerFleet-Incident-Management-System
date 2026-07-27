"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  Building2, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  RefreshCw, 
  ShieldAlert,
  ShieldCheck,
  Zap,
  Info,
  ArrowRight,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImpactMapData, ImpactRiskLevel } from "@/lib/services/impact.service";

interface ImpactMapProps {
  incidentId: number;
}

export default function ImpactMap({ incidentId }: ImpactMapProps) {
  const [data, setData] = useState<ImpactMapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImpact = async () => {
    if (!incidentId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get<ImpactMapData>(`/api/incidents/${incidentId}/impact`);
      setData(res.data);
    } catch (err: unknown) {
      console.error("Failed to load impact map:", err);
      setError("Failed to calculate operational impact graph.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadImpactData() {
      if (!incidentId) return;
      try {
        const res = await axios.get<ImpactMapData>(`/api/incidents/${incidentId}/impact`);
        if (!ignore) {
          setData(res.data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Failed to load impact map:", err);
          setError("Failed to calculate operational impact graph.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadImpactData();
    return () => {
      ignore = true;
    };
  }, [incidentId]);

  if (loading) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="size-7 animate-spin text-emerald-500" />
        <p className="text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300">
          Calculating Operational Impact Graph...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-center space-y-3">
        <AlertTriangle className="size-6 text-rose-500 mx-auto" />
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error ?? "Impact data unavailable."}</p>
        <button
          type="button"
          onClick={fetchImpact}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-colors shadow-sm"
        >
          <RefreshCw className="size-3.5" /> Retry Calculation
        </button>
      </div>
    );
  }

  const { client, vehicle, incident, impact } = data;
  const riskLevel: ImpactRiskLevel = impact.impactLevel;

  const getRiskBadge = (level: ImpactRiskLevel) => {
    switch (level) {
      case "High":
        return {
          title: "HIGH OPERATIONAL IMPACT",
          bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
          glow: "border-rose-500/60 dark:border-rose-500/50 shadow-xl shadow-rose-500/10 bg-rose-500/5",
          badgeBg: "bg-rose-500 text-white",
          icon: ShieldAlert,
          dotColor: "bg-rose-500"
        };
      case "Medium":
        return {
          title: "MODERATE IMPACT",
          bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
          glow: "border-amber-500/60 dark:border-amber-500/50 shadow-xl shadow-amber-500/10 bg-amber-500/5",
          badgeBg: "bg-amber-500 text-white",
          icon: Zap,
          dotColor: "bg-amber-500"
        };
      default:
        return {
          title: "LOW IMPACT",
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          glow: "border-emerald-500/60 dark:border-emerald-500/50 shadow-xl shadow-emerald-500/10 bg-emerald-500/5",
          badgeBg: "bg-emerald-500 text-white",
          icon: ShieldCheck,
          dotColor: "bg-emerald-500"
        };
    }
  };

  const riskStyle = getRiskBadge(riskLevel);
  const RiskIcon = riskStyle.icon;

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900/80 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 backdrop-blur-xl shadow-md transition-colors w-full">
      
      {/* 1. Top Section: Header & Risk Indicator Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-400">
              Operational Impact Analyzer
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className={cn("px-3 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1.5", riskStyle.bg)}>
              <span className={cn("size-2 rounded-full animate-pulse", riskStyle.dotColor)} />
              {riskStyle.title}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <RiskIcon className="size-5 text-emerald-500" />
            Client Fleet Propagation Graph
          </h2>
        </div>

        <button
          type="button"
          onClick={fetchImpact}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw className="size-3.5" /> Re-calculate Risk
        </button>
      </div>

      {/* 2. Responsive 3-Node Architecture Canvas (Grid layout guarantees equal widths & NO overflow) */}
      <div className="relative p-6 bg-slate-50/80 dark:bg-slate-950/70 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
        
        {/* Subtle Decorative Background Mesh */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch relative z-10">
          
          {/* NODE 1: CENTRAL CLIENT (The Core Entity) */}
          <div className={cn("flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all space-y-4 shadow-sm", riskStyle.glow)}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <Building2 className="size-5" />
                </div>
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  Central Entity
                </span>
              </div>

              <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight truncate">
                {client.companyName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{client.name}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Tickets</span>
                <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{impact.clientTicketsCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider">Open Tickets</span>
                <p className="text-base font-extrabold text-rose-500 mt-0.5">{impact.clientOpenTickets}</p>
              </div>
            </div>
          </div>

          {/* NODE 2: AFFECTED VEHICLE */}
          <div className="flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 relative">
            
            {/* Horizontal Arrow Indicator for Desktop */}
            <div className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 size-7 rounded-full bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-300 border border-slate-700 items-center justify-center shadow-md z-20">
              <ArrowRight className="size-3.5" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                  <Truck className="size-5" />
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                  {vehicle.licensePlate}
                </span>
              </div>

              <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{vehicle.name}</h4>
              {vehicle.imei && (
                <p className="text-[11px] text-slate-400 font-mono mt-1">IMEI: {vehicle.imei}</p>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 border border-slate-200/50 dark:border-slate-800/50">
              <Info className="size-3.5 text-blue-500 shrink-0" />
              <span className="text-[11px] font-medium truncate">Target Vehicle in Fleet</span>
            </div>
          </div>

          {/* NODE 3: TARGET INCIDENT TICKET */}
          <div className="flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 relative">
            
            {/* Horizontal Arrow Indicator for Desktop */}
            <div className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 size-7 rounded-full bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-300 border border-slate-700 items-center justify-center shadow-md z-20">
              <ArrowRight className="size-3.5" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold font-mono text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  #{incident.id}
                </span>
                <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                  {incident.priority}
                </span>
              </div>

              <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 leading-snug">{incident.title}</h4>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <FileText className="size-3 text-slate-400" />
                {incident.type}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs flex items-center justify-between border border-slate-200/50 dark:border-slate-800/50">
              <span className="text-[11px] text-slate-400 font-medium">Status:</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{incident.status}</span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Status Scorecards Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
          <div className="size-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Clock className="size-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">New / Open</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{impact.statusBreakdown.open}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
          <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Zap className="size-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">In Progress</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{impact.statusBreakdown.inProgress}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
          <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <CheckCircle2 className="size-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Resolved</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{impact.statusBreakdown.resolved}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
          <div className="size-9 rounded-xl bg-slate-500/10 text-slate-400 flex items-center justify-center shrink-0 border border-slate-500/20">
            <CheckCircle2 className="size-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Closed</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{impact.statusBreakdown.closed}</p>
          </div>
        </div>

      </div>

      {/* 4. Textual Risk Assessment Footer */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-3">
        <Info className="size-4 text-emerald-500 shrink-0" />
        <p className="leading-relaxed">
          Client <strong className="text-slate-900 dark:text-white font-bold">{client.companyName}</strong> currently has{" "}
          <strong className="text-rose-500 font-bold">{impact.clientOpenTickets} open tickets</strong> out of{" "}
          <strong className="text-slate-900 dark:text-white font-bold">{impact.clientTicketsCount} total tickets</strong> across their fleet.
          Impact Risk Assessment: <strong className="text-emerald-500 font-bold uppercase">{riskLevel} Impact</strong>.
        </p>
      </div>

    </div>
  );
}
