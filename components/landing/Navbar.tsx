"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-3 shadow-sm"
          : "bg-transparent py-5"
      )}
    >
      <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/logo.jpg"
            alt="PowerFleet Logo"
            className="size-9 rounded-xl object-cover shadow-md group-hover:scale-105 transition-transform border border-slate-200/50 dark:border-slate-800/50"
          />
          <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Power Fleet <span className="text-emerald-500">IMS</span>
          </span>
        </Link>

        {/* Login Action */}
        <Link
          href="/auth?mode=login"
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all",
            isScrolled
              ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              : "bg-white text-slate-900 shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:hover:bg-slate-800"
          )}
        >
          Login
          <LogIn className="size-4" />
        </Link>
      </div>
    </nav>
  );
}
