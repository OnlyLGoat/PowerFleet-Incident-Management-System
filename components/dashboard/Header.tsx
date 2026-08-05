"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sun, 
  Moon, 
  LogOut, 
  User, 
  Building2, 
  ChevronDown,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  /** Optional current page or section title */
  title?: string;
}

function getRouteTitle(pathname: string): string {
  if (!pathname || pathname === "/") return "Home";
  if (pathname === "/incidents/dashboard") return "Dashboard";
  if (pathname === "/incidents") return "Incidents";
  if (pathname === "/incidents/new") return "New Incident";
  if (pathname === "/vehicles") return "Vehicles Management";
  if (pathname === "/users") return "User Accounts";

  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "incidents" && parts[1]) {
    const rawId = parts[1].replace(/^INC-/i, "");
    if (!Number.isNaN(Number(rawId))) {
      if (parts[2] === "impact") {
        return `Ticket #${rawId} Operational Impact`;
      }
      return `Ticket #${rawId}`;
    }
  }

  const lastSegment = parts.at(-1) || "Workspace";
  return lastSegment.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Header({
  title,
}: Readonly<HeaderProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen]);

  const activeTitle = title && title !== "Overview" ? title : getRouteTitle(pathname);

  // Handle Logout Execution
  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch {
      // Ignore logout API failures and force redirect
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  // Role Badge Color Mapping
  const getRoleBadgeStyle = (userRole?: string | null) => {
    switch (userRole) {
      case "Admin":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "Support Manager":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Technician":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-16 max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        
        {/* 1. Left Section: Logo & Page Title */}
        <div className="flex items-center gap-6">
          <Link href="/incidents/dashboard" className="flex items-center gap-3 select-none group">
            <img
              src="/logo.jpg"
              alt="PowerFleet Logo"
              className="h-9 w-auto rounded-lg object-contain shadow-md group-hover:scale-105 transition-transform border border-slate-200/50 dark:border-slate-800/50"
            />
          </Link>

          <div className="hidden h-5 w-px bg-slate-200 dark:bg-slate-800 md:block" />

          {/* Dynamic Active Section Title */}
          <h1 className="text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-300 capitalize">
            {activeTitle}
          </h1>
        </div>

        {/* 2. Right Section: Controls & Profile Menu */}
        <div className="flex items-center gap-3">

          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex size-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            aria-label="Toggle Theme"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>

          {/* User Profile Dropdown Menu */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 rounded-full p-1 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50 transition-all cursor-pointer select-none"
            >
              {/* User icon */}
              <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm">
                <User className="size-4" />
              </div>
              <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform duration-200 mr-1", isProfileOpen && "rotate-180")} />
            </button>

            {/* Profile Dropdown Content */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl z-50 text-xs"
                >
                  {/* User Profile Summary Header */}
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 mb-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                        {user?.name ?? "User Account"}
                      </p>
                      <span className={cn("px-2 py-0.5 rounded-full font-bold text-[10px] border", getRoleBadgeStyle(role))}>
                        {role ?? "User"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>

                    {/* Role-Specific Detail Highlights */}
                    {user?.details?.companyName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 dark:text-emerald-400 font-medium pt-1">
                        <Building2 className="size-3 shrink-0" />
                        <span className="truncate">{user.details.companyName}</span>
                      </div>
                    )}
                    {user?.details?.specialty && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-500 font-medium pt-1">
                        <Sparkles className="size-3 shrink-0" />
                        <span className="truncate">{user.details.specialty}</span>
                      </div>
                    )}
                  </div>



                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors font-semibold cursor-pointer"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </header>
  );
}
