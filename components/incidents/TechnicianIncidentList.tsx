"use client";

import React from "react";
import { AlertCircle, Clock, MapPin, Truck, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import SlaBadge from "@/components/ui/SlaBadge";
import { IncidentListItem } from "@/types/incident";
import Link from "next/link";

interface TechnicianIncidentListProps {
  incidents: IncidentListItem[];
  loading: boolean;
  error: string | null;
}

export default function TechnicianIncidentList({
  incidents,
  loading,
  error,
}: TechnicianIncidentListProps) {
  
  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case "Critical": return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400";
      case "High": return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400";
      case "Medium": return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400";
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "New": return "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50";
      case "In Progress": return "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/50";
      case "Resolved":
      case "Closed": return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50";
      case "Cancelled": return "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700";
      default: return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-6 animate-spin text-emerald-500" />
        <span className="text-sm text-slate-500 font-medium">Loading your assignments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-sm font-medium border border-rose-200 dark:border-rose-900/50">
          {error}
        </div>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center px-4">
        <div className="size-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
          <AlertCircle className="size-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No Active Tickets</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          You currently have no incidents assigned to you. Enjoy the downtime!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {incidents.map((item) => (
        <Link 
          key={item.id}
          href={`/incidents/${item.id}`}
          className="group block bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all hover:border-emerald-500/30 active:scale-[0.98]"
        >
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">
                Ticket #{item.id}
              </span>
              <h4 className="font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {item.title}
              </h4>
            </div>
            
            <div className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", getPriorityBadgeStyle(item.priority))}>
              {item.priority}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Truck className="size-3.5 opacity-70" />
              <span className="truncate">
                {item.vehicle ? `${item.vehicle.name} (${item.vehicle.licensePlate})` : 'No Vehicle Assigned'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <MapPin className="size-3.5 opacity-70" />
              <span className="truncate">
                {item.type} Issue
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Clock className="size-3.5 opacity-70" />
              <span>
                {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border", getStatusBadgeStyle(item.status))}>
                {item.status}
              </span>
              {item.slaStatus && (
                <SlaBadge status={item.slaStatus} />
              )}
            </div>
            
            <div className="size-7 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/50 transition-colors">
              <ChevronRight className="size-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
