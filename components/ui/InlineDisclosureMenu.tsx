"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
}

interface InlineDisclosureMenuProps {
  actions: MenuAction[];
}

export default function InlineDisclosureMenu({ actions }: InlineDisclosureMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number; openUpward: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => {
    if (!isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < 200;

      setMenuPos({
        top: openUpward ? undefined : rect.bottom + 6,
        bottom: openUpward ? window.innerHeight - rect.top + 6 : undefined,
        right: window.innerWidth - rect.right,
        openUpward,
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close when clicking outside, scrolling, or resizing
  useEffect(() => {
    const handleClose = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("mousedown", handleClose);
      window.addEventListener("scroll", handleClose, true);
      window.addEventListener("resize", handleClose);
    }
    return () => {
      window.removeEventListener("mousedown", handleClose);
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, [isOpen]);

  if (!actions || actions.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={toggleMenu}
        className={cn(
          "flex items-center justify-center size-8 rounded-lg transition-colors",
          isOpen
            ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:text-slate-300 dark:hover:bg-slate-800/50"
        )}
      >
        <MoreHorizontal className="size-4" />
      </button>

      <AnimatePresence>
        {isOpen && menuPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: menuPos.openUpward ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: menuPos.openUpward ? 6 : -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: "fixed",
              top: menuPos.top,
              bottom: menuPos.bottom,
              right: menuPos.right,
            }}
            className={cn(
              "w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xl z-[99999]",
              menuPos.openUpward ? "origin-bottom-right" : "origin-top-right"
            )}
          >
            <div className="flex flex-col gap-0.5">
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left",
                    action.destructive
                      ? "text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <action.icon className="size-4" />
                  {action.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
