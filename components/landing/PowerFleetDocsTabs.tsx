"use client";

import React, { useState, useEffect } from "react";
import { Download, Settings, CloudUpload, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

const documentation = [
  {
    name: "Installation & Onboarding",
    value: "installation",
    icon: Download,
    title: "Rapid Deployment & Fleet Onboarding",
    content:
      "Power Fleet IMS connects your vehicles, drivers, and dispatchers in real time. Sync vehicle telemetry, manage driver profiles, and onboard fleet operations effortlessly through our administrative wizard.",
    badge: "Plug & Play Telemetry",
    highlight: "Seamless Fleet Setup • Telemetry Sync • Operator Onboarding"
  },
  {
    name: "Configuration & SLA Rules",
    value: "config",
    icon: Settings,
    title: "Tailoring SLA & Dispatch Governance",
    content:
      "Configure automated incident escalation thresholds, response countdown timers, and background SLA enforcement. Define custom risk criteria for critical hardware faults and client SLA tier guarantees.",
    badge: "15-Min Auto Cron",
    highlight: "Automated Escalation • SLA Timers • Role-Based RBAC"
  },
  {
    name: "Impact Analysis & Live Sync",
    value: "deployment",
    icon: CloudUpload,
    title: "Real-Time Impact Mapping & Dispatch",
    content:
      "Monitor vehicle health, client fleet risk scores, and active incident timeline events live. Automatically link critical vehicle faults with affected enterprise accounts and dispatch available technicians in 1 click.",
    badge: "Operational Impact Engine",
    highlight: "Live Audit Stream • Risk Map • 1-Click Field Dispatch"
  },
];

export default function PowerFleetDocsTabs() {
  const [activeTab, setActiveTab] = useState<string>("installation");
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  // Auto-scroll / Auto-cycle interval (cycles every 4 seconds unless hovered)
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveTab((prev) => {
        const currentIndex = documentation.findIndex((item) => item.value === prev);
        return documentation[(currentIndex + 1) % documentation.length].value;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const activeDoc = documentation.find((doc) => doc.value === activeTab) || documentation[0];

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div className="text-center mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="size-3.5" />
          PowerFleet Platform Architecture
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Engineered for Enterprise Fleet Operations
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Explore how PowerFleet IMS automates dispatch workflows, SLA guarantees, and fleet impact tracking.
        </p>
      </div>

      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="p-8 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-950/5 relative overflow-hidden"
      >
        {/* Top Progress Auto-Scroll Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800">
          <motion.div
            key={activeTab}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: isPaused ? 0 : 4, ease: "linear" }}
            className="h-full bg-emerald-500"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
          
          {/* Vertical Tab Triggers with Tooltip Hover */}
          <div className="flex md:flex-col gap-3 shrink-0 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {documentation.map(({ icon: Icon, name, value }) => {
              const isActive = activeTab === value;
              return (
                <div key={value} className="relative group">
                  <button
                    type="button"
                    onClick={() => setActiveTab(value)}
                    className={cn(
                      "relative flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer select-none",
                      isActive
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold shadow-md"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    )}
                    onMouseEnter={() => setHoveredTab(value)}
                    onMouseLeave={() => setHoveredTab(null)}
                  >
                    <Icon className={cn("size-5 shrink-0", isActive ? "text-emerald-400 dark:text-emerald-600" : "text-slate-400")} />
                    <span className="whitespace-nowrap font-medium">{name}</span>
                  </button>

                  {/* Tooltip Hover Overlay */}
                  <AnimatePresence>
                    {hoveredTab === value && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-3 z-30 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-xl border border-slate-800 pointer-events-none"
                      >
                        {name}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Tab Content Display */}
          <div className="flex-1 w-full min-h-[220px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeDoc.value}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    {activeDoc.badge}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">• Automated Lifecycle</span>
                </div>

                <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {activeDoc.title}
                </h3>

                <div className="bg-emerald-500 h-1 w-12 rounded-full" />

                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                  {activeDoc.content}
                </p>

                <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                    <span>{activeDoc.highlight}</span>
                  </div>

                  <Link
                    href="/incidents/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>Launch PowerFleet Console</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>

              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
