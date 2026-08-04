"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/context/AuthContext";
import { 
  ArrowLeft, 
  MessageSquare, 
  Lock, 
  AlertCircle, 
  Send, 
  User, 
  ShieldCheck, 
  Truck, 
  MapPin, 
  Clock, 
  Tag, 
  FileText,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Zap,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import SlaBadge from "@/components/ui/SlaBadge";
import AssignTechnicianPanel from "@/components/incidents/AssignTechnicianPanel";
import IncidentStatusPriorityPanel from "@/components/incidents/IncidentStatusPriorityPanel";
import IncidentSubTasksWidget from "@/components/incidents/IncidentSubTasksWidget";
import Image from "next/image";
import { toast } from "sonner";

interface AttachmentItem {
  id: number;
  filename: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
  deletedAt?: string | null;
}

interface CommentUser {
  id: number;
  name: string;
  email: string;
  clientProfile?: {
    companyName?: string;
  };
}

interface CommentItem {
  id: number;
  body?: string;
  content?: string;
  visibility: "Public" | "Private";
  createdAt: string;
  user: CommentUser;
}

interface InternalNoteAuthor {
  user: {
    name: string;
    email: string;
  };
}

interface InternalNoteItem {
  id: number;
  authorId?: number;
  title?: string;
  body?: string;
  note?: string;
  priority?: "Low" | "Medium" | "High" | "Critical";
  visibility: "Public" | "Private";
  isPinned: boolean;
  createdAt: string;
  author: InternalNoteAuthor;
}

interface VehicleInfo {
  id: number;
  name: string;
  licensePlate: string;
  imei?: string;
}

interface IncidentDetail {
  id: number;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  address: string;
  latitude?: number;
  longitude?: number;
  slaStatus?: string;
  assignedToId?: number | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: VehicleInfo;
  comments: CommentItem[];
  internalNotes?: InternalNoteItem[];
  attachments: AttachmentItem[];
}

export default function IncidentDetailPage() {
  const params = useParams();
  const { role } = useAuth();

  const rawId = (params.id as string || "").replace(/^INC-/i, "");
  const incidentId = rawId;
  const isInternal = role === "Admin" || role === "Support Manager" || role === "Technician";
  const canViewImpactMap = role === "Admin" || role === "Support Manager";

  // Incident State
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Comment Modal / Form State
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Internal Note Modal / Form State
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"Public" | "Private">("Private");
  const [isPinned, setIsPinned] = useState(false);
  const [postingNote, setPostingNote] = useState(false);
  const [notePageIndex, setNotePageIndex] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<number>(1);

  // Fetch Incident Details
  const fetchIncidentDetails = useCallback(async () => {
    if (!incidentId || Number.isNaN(Number(incidentId))) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get<IncidentDetail>(`/api/incidents/${incidentId}`);
      setIncident(res.data);
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching incident detail:", err);
      setError("Failed to load incident details. Ticket may not exist or you lack permission.");
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    try {
      await axios.delete(`/api/incidents/${incidentId}/attachment/${attachmentId}`);
      toast.success("Attachment deleted successfully.");
      fetchIncidentDetails();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Failed to delete attachment.");
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      if (!incidentId || Number.isNaN(Number(incidentId))) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get<IncidentDetail>(`/api/incidents/${incidentId}`);
        if (!ignore) {
          setIncident(res.data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Error fetching incident detail:", err);
          setError("Failed to load incident details. Ticket may not exist or you lack permission.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [incidentId]);

  // Submit New Comment (All Roles)
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setPostingComment(true);
      const targetId = incident?.id || Number(incidentId);
      await axios.post(`/api/incidents/${targetId}/comments`, {
        body: newComment.trim(),
        visibility: "Public",
      });
      setNewComment("");
      setShowCommentForm(false);
      
      toast.success('Comment Posted', {
        description: 'Your public comment has been successfully added.',
        style: {
          '--normal-bg': 'color-mix(in oklab, light-dark(var(--color-green-600), var(--color-green-400)) 10%, var(--background))',
          '--normal-text': 'light-dark(var(--color-green-600), var(--color-green-400))',
          '--normal-border': 'light-dark(var(--color-green-600), var(--color-green-400))',
          borderRadius: '16px',
        } as React.CSSProperties,
        className: 'shadow-xl shadow-emerald-500/5',
      });
      
      await fetchIncidentDetails();
    } catch (err) {
      console.error("Failed to post comment:", err);
      alert("Failed to submit comment. Please try again.");
    } finally {
      setPostingComment(false);
    }
  };

  // Submit New Internal Note (Internal Staff Only)
  const handlePostInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setPostingNote(true);
      await axios.post(`/api/incidents/${incidentId}/notes`, {
        title: noteTitle.trim() || "Internal Note",
        body: newNote.trim(),
        priority: "Medium",
        visibility: noteVisibility,
        isPinned,
      });
      setNewNote("");
      setNoteTitle("");
      setIsPinned(false);
      setShowNoteForm(false);
      setNotePageIndex(0);
      
      toast.success('Internal Note Saved', {
        description: 'Your internal note has been securely logged.',
        style: {
          '--normal-bg': 'color-mix(in oklab, light-dark(var(--color-green-600), var(--color-green-400)) 10%, var(--background))',
          '--normal-text': 'light-dark(var(--color-green-600), var(--color-green-400))',
          '--normal-border': 'light-dark(var(--color-green-600), var(--color-green-400))',
          borderRadius: '16px',
        } as React.CSSProperties,
        className: 'shadow-xl shadow-emerald-500/5',
      });
      
      await fetchIncidentDetails();
    } catch (err) {
      console.error("Failed to post internal note:", err);
      alert("Failed to submit internal note. Please check inputs and try again.");
    } finally {
      setPostingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
        <p className="text-sm font-medium">Loading ticket details...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="size-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Incident Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{error ?? "Unable to view incident."}</p>
        <Link
          href="/incidents"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 transition-all"
        >
          <ArrowLeft className="size-4" /> Back to Incidents
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1720px] mx-auto pb-12 w-full">
      {/* 1. Top Breadcrumb & Modern Hero Card */}
      <div className="space-y-4">
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer select-none"
        >
          <ArrowLeft className="size-4" />
          <span>Back to All Incidents</span>
        </Link>

        {/* Hero Incident Header Card */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm space-y-5">
          
          {/* Header Title Row */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs">
                  #INC-{incident.id}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {incident.status}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {incident.priority} Priority
                </span>
                {incident.slaStatus && <SlaBadge status={incident.slaStatus} />}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                {incident.title}
              </h1>

              {/* Description directly after Title */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans font-medium mt-3">
                {incident.description}
              </div>
            </div>

            {/* Quick Actions (e.g. Impact Map link) */}
            {canViewImpactMap && (
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/incidents/${incidentId}/impact`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer select-none whitespace-nowrap"
                >
                  <Zap className="size-4" />
                  <span>Impact Analysis</span>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Metadata Chip Strip */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/80 font-semibold">
              <Tag className="size-3.5 text-emerald-500" />
              <span>{incident.type}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/80 font-semibold">
              <Truck className="size-3.5 text-emerald-500" />
              <span>{incident.vehicle ? `${incident.vehicle.name} (${incident.vehicle.licensePlate})` : "Vehicle N/A"}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/80 font-semibold">
              <MapPin className="size-3.5 text-emerald-500" />
              <span>{incident.address}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/80 font-semibold ml-auto">
              <Clock className="size-3.5 text-slate-400" />
              <span>Reported {new Date(incident.createdAt).toLocaleString()}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Responsive Grid Layout: Left Main Column & Right Internal Notes Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Prominent Incident Description, Details & Workflow Cards */}
        <div className={cn("space-y-6", isInternal ? "lg:col-span-2" : "lg:col-span-3")}>
          
          {/* Assign Technician Panel (Rendered for Admin & Support Manager) */}
          {canViewImpactMap && (
            <AssignTechnicianPanel
              incidentId={Number(incidentId)}
              currentAssignedId={incident.assignedToId}
              onUpdate={fetchIncidentDetails}
            />
          )}

          {/* Status & Priority Management Panel (Rendered for Admin & Support Manager - Direct Resolution) */}
          {canViewImpactMap && (
            <IncidentStatusPriorityPanel
              incidentId={Number(incidentId)}
              currentStatus={incident.status}
              currentPriority={incident.priority}
              onUpdate={fetchIncidentDetails}
            />
          )}

          {/* Attachments Section */}
          {incident.attachments && incident.attachments.length > 0 && (
            <div className="space-y-3 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="size-3.5" /> Attachments ({incident.attachments.filter(att => role === "Admin" || !att.deletedAt).length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {incident.attachments.map(att => {
                  const isDeleted = Boolean(att.deletedAt);
                  if (isDeleted && role !== "Admin") return null;

                  return (
                    <div 
                      key={att.id} 
                      className={cn(
                        "relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 transition-all",
                        isDeleted && "opacity-60 grayscale-[40%]"
                      )}
                    >
                      {/* X Delete Button */}
                      {!isDeleted && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteAttachment(att.id);
                          }}
                          className="absolute top-1.5 right-1.5 z-30 p-1.5 rounded-full bg-slate-950/80 text-white hover:bg-rose-600 transition-colors shadow-md cursor-pointer opacity-80 hover:opacity-100"
                          title="Soft Delete Attachment"
                        >
                          <X className="size-3.5 stroke-[2.5]" />
                        </button>
                      )}

                      {/* Admin Deleted Badge */}
                      {isDeleted && (
                        <span className="absolute top-1.5 left-1.5 z-30 px-2 py-0.5 rounded bg-rose-600 text-white text-[9px] font-extrabold uppercase tracking-wider shadow">
                          Deleted
                        </span>
                      )}

                      {att.fileType.startsWith('image/') ? (
                        <a href={att.fileUrl.startsWith('/uploads/') ? `/api${att.fileUrl}` : att.fileUrl} target="_blank" rel="noreferrer" className="relative block w-full h-full">
                          <Image 
                            src={att.fileUrl.startsWith('/uploads/') ? `/api${att.fileUrl}` : att.fileUrl} 
                            alt={att.filename} 
                            fill 
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                        </a>
                      ) : (
                        <a 
                          href={att.fileUrl.startsWith('/uploads/') ? `/api${att.fileUrl}` : att.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex flex-col items-center justify-center h-full w-full p-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-center"
                        >
                          <FileText className="size-8 text-slate-400 mb-2" />
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate w-full px-1">{att.filename}</span>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Bar & Discussion Section Container */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-6">
            {/* Action Bar (Add Comment) */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setShowCommentForm(!showCommentForm)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer select-none"
              >
                <MessageSquare className="size-4" />
                <span>Add Public Comment</span>
              </button>

              <span className="text-[11px] text-slate-400">
                {incident.comments.length} comment(s)
              </span>
            </div>

            {/* Expandable Comment Form */}
            {showCommentForm && (
              <form onSubmit={handlePostComment} className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MessageSquare className="size-3.5 text-emerald-500" />
                    Post a Public Comment
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowCommentForm(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type your update or response to this incident ticket..."
                  required
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={postingComment || !newComment.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {postingComment ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    <span>Post Comment</span>
                  </button>
                </div>
              </form>
            )}

            {/* Clean Platform Discussion & Comments Feed */}
            <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <MessageSquare className="size-4 text-emerald-500" /> Ticket Activity & Comments ({incident.comments.length})
                </h3>
                <span className="text-[11px] text-slate-400">Public Communication</span>
              </div>

              {incident.comments.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2">
                  <MessageSquare className="size-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No discussion items yet</p>
                  <p className="text-[11px]">Click &quot;Add Public Comment&quot; above to leave an update or response.</p>
                </div>
              ) : (
                /* Clean Thread Timeline Feed */
                <div className="relative pl-4 sm:pl-6 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {incident.comments.map((comment) => (
                    <div key={comment.id} className="relative flex items-start gap-3 sm:gap-4 group">
                      
                      {/* Timeline Avatar Icon */}
                      <div className="size-7 sm:size-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center shrink-0 ring-4 ring-slate-50 dark:ring-slate-950 shadow-sm z-10">
                        <User className="size-3.5 sm:size-4" />
                      </div>

                      {/* Comment Content Card */}
                      <div className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-2xs space-y-2.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                        
                        {/* Card Header Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {comment.user?.name ?? "User"}
                            </span>
                            
                            {comment.user?.clientProfile?.companyName && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {comment.user.clientProfile.companyName}
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {/* Comment Text Body */}
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {comment.body ?? comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: TOP-RIGHT INTERNAL NOTES WIDGET (Internal Staff Only - Clean Minimal Design) */}
        {isInternal && (
          <div className="lg:col-span-1 space-y-4 sticky top-6">
            
            {/* Widget Container Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 shadow-2xs space-y-3">
              
              {/* Widget Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-slate-700 dark:text-slate-300" />
                  <h3 className="font-semibold text-xs text-slate-900 dark:text-white">
                    Internal Notes
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {incident.internalNotes?.length || 0}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNoteForm(!showNoteForm)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>New</span>
                </button>
              </div>

              {/* Form inside Widget */}
              {showNoteForm && (
                <form onSubmit={handlePostInternalNote} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Add Internal Note</span>
                    <button
                      type="button"
                      onClick={() => setShowNoteForm(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>

                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Title..."
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                  />

                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Content..."
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                  />

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <label className="flex items-center gap-1 text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                        className="rounded text-slate-900 dark:text-slate-100"
                      />
                      <span>Pin</span>
                    </label>

                    <select
                      value={noteVisibility}
                      onChange={(e) => setNoteVisibility(e.target.value as "Public" | "Private")}
                      className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px]"
                    >
                      <option value="Private">Private</option>
                      <option value="Public">Public</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={postingNote || !newNote.trim() || !noteTitle.trim()}
                    className="w-full py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {postingNote ? <Loader2 className="size-3 animate-spin" /> : <Lock className="size-3" />}
                    <span>Save Note</span>
                  </button>
                </form>
              )}

              {/* Single-Note Paginated View with Smooth Slide Animation */}
              {!incident.internalNotes || incident.internalNotes.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-1">
                  <p className="font-medium text-slate-600 dark:text-slate-400">No internal notes</p>
                  <p className="text-[11px]">Click &quot;New&quot; to create a note.</p>
                </div>
              ) : (() => {
                const totalNotes = incident.internalNotes.length;
                const safeIndex = Math.min(notePageIndex, totalNotes - 1);
                const currentMemo = incident.internalNotes[safeIndex];

                if (!currentMemo) return null;

                const isPrivate = currentMemo.visibility === "Private";

                return (
                  <div className="space-y-3">
                    
                    {/* Animated Slide Container */}
                    <div className="overflow-hidden min-h-[130px] relative">
                      <AnimatePresence mode="wait" custom={slideDirection}>
                        <motion.div
                          key={currentMemo.id}
                          custom={slideDirection}
                          initial={{ opacity: 0, x: slideDirection > 0 ? 30 : -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: slideDirection > 0 ? -30 : 30 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 space-y-2 flex flex-col justify-between"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                {currentMemo.title || "Internal Note"}
                              </h4>

                              <div className="flex items-center gap-1 shrink-0">
                                {currentMemo.isPinned && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    Pinned
                                  </span>
                                )}
                                {isPrivate && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950">
                                    Private
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal whitespace-pre-wrap">
                              {currentMemo.body ?? currentMemo.note}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-[10px] text-slate-400 flex items-center justify-between">
                            <span>{currentMemo.author?.user?.name ?? "Staff"}</span>
                            <span>{new Date(currentMemo.createdAt).toLocaleDateString()}</span>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        type="button"
                        disabled={safeIndex <= 0}
                        onClick={() => {
                          setSlideDirection(-1);
                          setNotePageIndex((prev) => Math.max(0, prev - 1));
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-20 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:cursor-not-allowed"
                        title="Previous Note"
                      >
                        <ChevronLeft className="size-4" />
                      </button>

                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono">
                        {safeIndex + 1} / {totalNotes}
                      </span>

                      <button
                        type="button"
                        disabled={safeIndex >= totalNotes - 1}
                        onClick={() => {
                          setSlideDirection(1);
                          setNotePageIndex((prev) => Math.min(totalNotes - 1, prev + 1));
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-20 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:cursor-not-allowed"
                        title="Next Note"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Sub-Tasks Checklist Widget (Right Sidebar below Internal Notes) */}
            <IncidentSubTasksWidget incidentId={Number(incidentId)} />
          </div>
        )}
      </div>
    </div>
  );
}
