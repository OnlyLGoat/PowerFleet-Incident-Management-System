'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import Bento2 from './Bento2';

export default function DiscoverCTA() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 space-y-12 pb-12">
      {/* Header Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h2 className="text-slate-900 dark:text-white text-3xl md:text-5xl font-extrabold tracking-tight">
          Transform your fleet ops
        </h2>

        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed">
          Harness real-time data to automate incident management, reduce fuel consumption, and empower your dispatchers and technicians to move at the speed of thought.
        </p>
      </div>

      {/* The New Bento2 Grid */}
      <div className="w-full pt-4">
        <Bento2 />
      </div>

      {/* Action CTA Button */}
      <div className="flex justify-center pt-8">
        <a
          href="https://www.powerfleet.ma/"
          target="_blank"
          rel="noreferrer"
          className="bg-emerald-500 text-white hover:bg-emerald-600 inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
        >
          Discover PowerFleet.ma
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
