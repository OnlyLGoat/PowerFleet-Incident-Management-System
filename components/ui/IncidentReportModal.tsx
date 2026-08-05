"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  FileText,
  X,
  Loader2,
  Download,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  UserCheck,
  ShieldCheck,
  Copy,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import SlaBadge from "@/components/ui/SlaBadge";
import jsPDF from "jspdf";

interface ReportStatsPayload {
  incidentId: number;
  ticketCode: string;
  type: string;
  priority: string;
  status: string;
  slaStatus: string;
  clientCompany: string;
  clientPhone: string;
  vehicleName: string;
  vehicleImei: string;
  vehiclePlate: string;
  assignedTechnician: string;
  completedTasksCount: number;
  totalTasksCount: number;
  taskCompletionRate: number;
  activityEventsCount: number;
  reportedAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  tasksList: Array<{
    id: number;
    title: string;
    isCompleted: boolean;
    requiresProof: boolean;
    hasProof: boolean;
  }>;
}

interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: number;
  incidentTitle?: string;
}

export default function IncidentReportModal({
  isOpen,
  onClose,
  incidentId,
  incidentTitle,
}: IncidentReportModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<{
    reportId: number;
    title: string;
    summary: string;
    generatedAt: string;
    stats: ReportStatsPayload;
  } | null>(null);

  const [copied, setCopied] = useState<boolean>(false);

  const generateReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`/api/incidents/${incidentId}/report`);
      setReportData(response.data);
    } catch (err: unknown) {
      console.error("Failed to generate incident report:", err);
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      setError(msg || "Failed to generate executive report.");
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    if (isOpen && incidentId) {
      generateReport();
    }
  }, [isOpen, incidentId, generateReport]);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    if (!reportData) return;
    navigator.clipboard.writeText(reportData.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    if (!reportData || !reportData.stats) return;

    try {
      setDownloadingPdf(true);

      const stats = reportData.stats;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const ticketCode = `INC-${String(incidentId).padStart(3, "0")}`;

      // Page dimensions
      const pageWidth = 210;
      const margin = 14;
      const contentWidth = pageWidth - margin * 2; // 182mm

      // Top Indigo Accent Line
      doc.setFillColor(79, 70, 229); // #4f46e5
      doc.rect(0, 0, pageWidth, 5, "F");

      // Title & Branding
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // #0f172a
      doc.text("POWERFLEET IMS", margin, 18);

      doc.setFontSize(11);
      doc.setTextColor(79, 70, 229); // #4f46e5
      doc.text("OFFICIAL EXECUTIVE INCIDENT REPORT", margin, 25);

      // Metadata Header Box (Right aligned)
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139); // #64748b
      doc.text(`REF CODE: ${ticketCode}-RPT`, pageWidth - margin, 18, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`, pageWidth - margin, 24, { align: "right" });

      // Divider Line
      doc.setDrawColor(226, 232, 240); // #e2e8f0
      doc.setLineWidth(0.4);
      doc.line(margin, 29, pageWidth - margin, 29);

      // Executive Summary Box with Generous Padding
      let y = 33;
      doc.setFillColor(248, 250, 252); // #f8fafc
      doc.setDrawColor(226, 232, 240);
      
      const splitSummary = doc.splitTextToSize(reportData.summary, contentWidth - 10);
      const summaryBoxHeight = 15 + splitSummary.length * 5;
      doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 2.5, 2.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(67, 56, 202); // #4338ca
      doc.text("OFFICIAL EXECUTIVE SUMMARY", margin + 5, y + 6.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85); // #334155
      doc.text(splitSummary, margin + 5, y + 13, { lineHeightFactor: 1.3 });

      // Key Metrics Section
      y += summaryBoxHeight + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("KEY OPERATIONAL METRICS", margin, y);

      y += 4;
      const cardWidth = (contentWidth - 9) / 4; // ~43.25mm per card

      // Metric 1: Status & Priority
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, cardWidth, 18, 2, 2, "FD");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("STATUS & PRIORITY", margin + 4, y + 6);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`${stats.status} (${stats.priority})`, margin + 4, y + 13);

      // Metric 2: SLA State
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin + cardWidth + 3, y, cardWidth, 18, 2, 2, "FD");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("SLA STATE", margin + cardWidth + 7, y + 6);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(4, 120, 87); // Emerald Green #047857
      doc.text(stats.slaStatus, margin + cardWidth + 7, y + 13);

      // Metric 3: Sub-Task Progress
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin + (cardWidth + 3) * 2, y, cardWidth, 18, 2, 2, "FD");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("TASK PROGRESS", margin + (cardWidth + 3) * 2 + 4, y + 6);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(4, 120, 87);
      doc.text(`${stats.completedTasksCount}/${stats.totalTasksCount} (${stats.taskCompletionRate}%)`, margin + (cardWidth + 3) * 2 + 4, y + 13);

      // Metric 4: Activity Logs
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin + (cardWidth + 3) * 3, y, cardWidth, 18, 2, 2, "FD");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("ACTIVITY LOGS", margin + (cardWidth + 3) * 3 + 4, y + 6);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`${stats.activityEventsCount} Events`, margin + (cardWidth + 3) * 3 + 4, y + 13);

      // Specifications Section
      y += 26;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("ASSET & ACCOUNT SPECIFICATIONS", margin, y);

      y += 4;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "FD");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("Vehicle Asset:", margin + 5, y + 7);
      doc.text("Client Account:", margin + 5, y + 14);
      doc.text("Lead Technician:", margin + 5, y + 21);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(`${stats.vehicleName} (IMEI: ${stats.vehicleImei} | License Plate: ${stats.vehiclePlate})`, margin + 34, y + 7);
      doc.text(`${stats.clientCompany} (Contact Phone: ${stats.clientPhone})`, margin + 34, y + 14);
      doc.text(`${stats.assignedTechnician} (Reported: ${new Date(stats.reportedAt).toLocaleDateString()})`, margin + 34, y + 21);

      // Resolution Note (if available)
      if (stats.resolutionNote) {
        y += 30;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text("PROVEN RESOLUTION NOTE", margin, y);

        y += 4;
        const splitNote = doc.splitTextToSize(stats.resolutionNote, contentWidth - 10);
        const noteBoxHeight = 12 + splitNote.length * 4.5;

        doc.setFillColor(236, 253, 245); // #ecfdf5
        doc.setDrawColor(167, 243, 208); // #a7f3d0
        doc.roundedRect(margin, y, contentWidth, noteBoxHeight, 2, 2, "FD");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(6, 95, 70); // #065f46
        doc.text(splitNote, margin + 5, y + 7, { lineHeightFactor: 1.3 });
        y += noteBoxHeight;
      } else {
        y += 26;
      }

      // Checklist Section
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("DIAGNOSTIC SUB-TASK AUDIT CHECKLIST", margin, y);

      y += 5;
      // Header Table Row
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 6, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("#", margin + 4, y + 4.5);
      doc.text("TASK TITLE", margin + 14, y + 4.5);
      doc.text("REQUIREMENT", margin + 120, y + 4.5);
      doc.text("STATUS", margin + 155, y + 4.5);

      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      stats.tasksList.forEach((task, idx) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + 5, margin + contentWidth, y + 5);

        doc.text(`${idx + 1}`, margin + 4, y + 4);
        const cleanTitle = task.title.length > 55 ? task.title.slice(0, 52) + "..." : task.title;
        doc.text(cleanTitle, margin + 14, y + 4);

        doc.text(task.requiresProof ? (task.hasProof ? "Proof Uploaded" : "Proof Required") : "Standard Step", margin + 120, y + 4);

        if (task.isCompleted) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(4, 120, 87);
          doc.text("COMPLETED", margin + 155, y + 4);
          doc.setFont("helvetica", "normal");
        } else {
          doc.setTextColor(148, 163, 184);
          doc.text("PENDING", margin + 155, y + 4);
        }
        doc.setTextColor(51, 65, 85);
        y += 6;
      });

      // Footer
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text("PowerFleet Incident Management System — Confidential & Proprietary Document", pageWidth / 2, 288, { align: "center" });

      doc.save(`Executive_Report_${ticketCode}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const stats = reportData?.stats;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <FileText className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Executive Incident Report
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold border border-indigo-500/20">
                  INC-{String(incidentId).padStart(3, "0")}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {incidentTitle || "Fleet Maintenance Executive Audit"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {reportData && (
              <>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  <span>{copied ? "Copied" : "Copy Summary"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {downloadingPdf ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  <span>{downloadingPdf ? "Generating PDF..." : "Download PDF"}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Modal Display Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 animate-spin text-indigo-600" />
              <p className="text-xs font-medium text-slate-500">Compiling executive fleet report data...</p>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 border border-rose-200 dark:border-rose-900/50">
                <AlertCircle className="size-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{error}</p>
            </div>
          ) : stats ? (
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl space-y-6 border border-slate-100 dark:border-slate-800">
              
              {/* Report Document Title Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    PowerFleet IMS — Executive Incident Report
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Ref Code: INC-{String(incidentId).padStart(3, "0")} | Generated: {new Date(reportData.generatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold font-mono">
                  OFFICIAL AUDIT REPORT
                </div>
              </div>

              {/* Executive Summary Banner */}
              <div className="p-4.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                  <ShieldCheck className="size-4" />
                  <span>Official Executive Summary</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {reportData.summary}
                </p>
              </div>

              {/* Core Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Status & Priority
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">{stats.status}</span>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      {stats.priority}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    SLA State
                  </span>
                  <div className="mt-0.5">
                    <SlaBadge status={stats.slaStatus} />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Task Progress
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    {stats.completedTasksCount} / {stats.totalTasksCount} ({stats.taskCompletionRate}%)
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Activity Logs
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {stats.activityEventsCount} Events
                  </span>
                </div>
              </div>

              {/* Details Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Truck className="size-4 text-slate-400" />
                    <span>Fleet Asset Info</span>
                  </div>
                  <div className="space-y-1 text-slate-600 dark:text-slate-400">
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Vehicle:</span> {stats.vehicleName}</p>
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">IMEI:</span> {stats.vehicleImei}</p>
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">License Plate:</span> {stats.vehiclePlate}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Building2 className="size-4 text-slate-400" />
                    <span>Client Account</span>
                  </div>
                  <div className="space-y-1 text-slate-600 dark:text-slate-400">
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Company:</span> {stats.clientCompany}</p>
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Contact Phone:</span> {stats.clientPhone}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <UserCheck className="size-4 text-slate-400" />
                    <span>Assigned Personnel</span>
                  </div>
                  <div className="space-y-1 text-slate-600 dark:text-slate-400">
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Lead Tech:</span> {stats.assignedTechnician}</p>
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Reported At:</span> {new Date(stats.reportedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Proven Resolution Note */}
              {stats.resolutionNote && (
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-1">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Proven Resolution Note:</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{stats.resolutionNote}</p>
                </div>
              )}

              {/* Sub-Task Diagnostic Checklist Audit */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Diagnostic Sub-Task Audit Checklist
                </h4>
                {stats.tasksList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No sub-tasks logged on this ticket.</p>
                ) : (
                  <div className="space-y-1.5">
                    {stats.tasksList.map((task, idx) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={cn("size-4 shrink-0", task.isCompleted ? "text-emerald-500" : "text-slate-300")}
                          />
                          <span className={cn("font-medium", task.isCompleted ? "text-slate-900 dark:text-white line-through opacity-70" : "text-slate-700 dark:text-slate-300")}>
                            {idx + 1}. {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {task.requiresProof && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-semibold">
                              {task.hasProof ? "Proof Uploaded" : "Proof Required"}
                            </span>
                          )}
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", task.isCompleted ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400")}>
                            {task.isCompleted ? "Done" : "Pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Document Footer Note */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center flex items-center justify-between">
                <span>PowerFleet Incident Management System &copy; {new Date().getFullYear()}</span>
                <span>CONFIDENTIAL & PROPRIETARY</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
