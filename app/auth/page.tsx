"use client";

import React from "react";
import SlidingAuth from "@/components/auth/SlidingAuth";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Top Navigation for Auth Page */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-50 flex items-center justify-between">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Home
        </Link>
        <ThemeToggle />
      </div>

      {/* Auth Container */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 pt-16 sm:pt-6">
        <div className="w-full max-w-6xl">
          <SlidingAuth />
        </div>
      </div>
    </div>
  );
}
