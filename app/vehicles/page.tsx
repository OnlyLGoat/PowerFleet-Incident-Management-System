"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { 
  Car, 
  Plus, 
  Search, 
  Trash2, 
  Building2, 
  Edit3, 
  Loader2, 
  X, 
  Check,
  UserCheck,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientOption {
  userId: number;
  companyName: string;
  phone: string;
  name: string;
  email: string;
}

interface VehicleItem {
  id: number;
  name: string;
  licensePlate: string;
  imei: string;
  clientId: number;
  createdAt?: string;
  deletedAt?: string | null;
  clientCompanyName?: string;
  clientName?: string;
  clientEmail?: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DELETED">("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    imei: "",
    licensePlate: "",
    clientId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [vRes, cRes] = await Promise.all([
        axios.get<VehicleItem[]>("/api/vehicles"),
        axios.get<ClientOption[]>("/api/users?mode=clients"),
      ]);
      setVehicles(vRes.data || []);
      setClients(cRes.data || []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Failed to load fleet vehicles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        setLoading(true);
        const [vRes, cRes] = await Promise.all([
          axios.get<VehicleItem[]>("/api/vehicles"),
          axios.get<ClientOption[]>("/api/users?mode=clients"),
        ]);
        if (isMounted) {
          setVehicles(vRes.data || []);
          setClients(cRes.data || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { response?: { data?: { error?: string } } };
          toast.error(e.response?.data?.error || "Failed to load fleet vehicles");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    init();
    return () => { isMounted = false; };
  }, []);

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormData({
      name: "",
      imei: "",
      licensePlate: "",
      clientId: clients[0] ? String(clients[0].userId) : "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: VehicleItem) => {
    setEditingVehicle(v);
    setFormData({
      name: v.name,
      imei: v.imei,
      licensePlate: v.licensePlate,
      clientId: String(v.clientId),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.imei.trim() || !formData.licensePlate.trim() || !formData.clientId) {
      toast.error("Please complete all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingVehicle) {
        await axios.patch(`/api/vehicles/${editingVehicle.id}`, {
          name: formData.name.trim(),
          imei: formData.imei.trim(),
          licensePlate: formData.licensePlate.trim(),
          clientId: Number(formData.clientId),
        });
        toast.success("Vehicle updated successfully.");
      } else {
        await axios.post("/api/vehicles", {
          name: formData.name.trim(),
          imei: formData.imei.trim(),
          licensePlate: formData.licensePlate.trim(),
          clientId: Number(formData.clientId),
        });
        toast.success("Vehicle registered and assigned.");
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {

    try {
      await axios.delete(`/api/vehicles/${id}`);
      toast.success("Vehicle deleted.");
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Delete failed.");
    }
  };

  const handleRestore = async (id: number, name: string) => {
    try {
      await axios.patch(`/api/vehicles/${id}`, { isDeleted: false });
      toast.success(`Vehicle "${name}" restored successfully!`);
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Restore failed");
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (statusFilter === "ACTIVE" && v.deletedAt) return false;
    if (statusFilter === "DELETED" && !v.deletedAt) return false;

    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.licensePlate.toLowerCase().includes(q) ||
      v.imei.toLowerCase().includes(q) ||
      (v.clientCompanyName && v.clientCompanyName.toLowerCase().includes(q)) ||
      (v.clientName && v.clientName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Page Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <Car className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Fleet Vehicle Management</h1>
              <p className="text-xs text-slate-400">Register, reassign, restore, and track all fleet vehicles across clients.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="size-4 stroke-[3]" />
          <span>Add New Vehicle</span>
        </button>
      </div>

      {/* 2. Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Car className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Vehicles</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{vehicles.length}</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Active Fleet</p>
            <p className="text-2xl font-extrabold text-emerald-500 mt-0.5">
              {vehicles.filter((v) => !v.deletedAt).length}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
            <Trash2 className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Deleted Vehicles</p>
            <p className="text-2xl font-extrabold text-rose-500 mt-0.5">
              {vehicles.filter((v) => Boolean(v.deletedAt)).length}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 border border-purple-500/20">
            <UserCheck className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Available Clients</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{clients.length}</p>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {(["ALL", "ACTIVE", "DELETED"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                statusFilter === st
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-md"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              {st === "ALL" ? "All Fleet" : st === "ACTIVE" ? "Active Vehicles" : "Deleted Vehicles"}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by plate, IMEI, name, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* 4. Sleek Data Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Vehicle ID</th>
                <th className="py-3.5 px-4">Vehicle Model</th>
                <th className="py-3.5 px-4">License Plate</th>
                <th className="py-3.5 px-4">GPS Hardware IMEI</th>
                <th className="py-3.5 px-4">Assigned Client</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin text-emerald-500" />
                      <span>Loading fleet vehicles...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No vehicles found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">#{v.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{v.name}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {v.licensePlate}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{v.imei}</td>
                    <td className="py-3.5 px-4">
                      {v.clientCompanyName ? (
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{v.clientCompanyName}</p>
                          {v.clientName && <p className="text-[11px] text-slate-400">{v.clientName} ({v.clientEmail})</p>}
                        </div>
                      ) : (
                        <span className="text-slate-400">Client ID: {v.clientId}</span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="py-3.5 px-4">
                      {v.deletedAt ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30">
                          <Trash2 className="size-3" />
                          <span>Deleted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                          Active
                        </span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {v.deletedAt ? (
                          <button
                            type="button"
                            onClick={() => handleRestore(v.id, v.name)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-colors cursor-pointer"
                            title="Restore Vehicle"
                          >
                            <RotateCcw className="size-3.5 stroke-[2.5]" />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(v)}
                              className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Reassign / Edit Vehicle"
                            >
                              <Edit3 className="size-4" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete Vehicle"
                              >
                                <Trash2 className="size-4" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete vehicle &quot;{v.name}&quot;?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(v.id)}
                                    className="bg-rose-600 hover:bg-rose-700 text-white"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Car className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingVehicle ? "Edit / Reassign Vehicle" : "Register New Vehicle"}
                  </h2>
                  <p className="text-xs text-slate-400">Assign GPS tracking hardware to client profiles.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle Name / Model *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Toyota Hilux 4x4"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  License Plate Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 09432-116-16"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  GPS Hardware IMEI *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 864201049281745"
                  value={formData.imei}
                  onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign to Client Profile *
                </label>
                <div className="relative">
                  <div
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white flex items-center justify-between cursor-pointer"
                    onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  >
                    <span className={cn("truncate pr-2", formData.clientId ? "" : "text-slate-400")}>
                      {formData.clientId 
                        ? clients.find(c => String(c.userId) === formData.clientId)?.companyName + " (" + clients.find(c => String(c.userId) === formData.clientId)?.name + ")"
                        : "Select Client Account..."}
                    </span>
                    <Search className="size-4 text-slate-400" />
                  </div>
                  
                  {isClientDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 max-h-60 flex flex-col overflow-hidden">
                      <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                        <input
                          type="text"
                          placeholder="Search clients by name, company, or email..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="overflow-y-auto">
                        {clients.filter(c => 
                          c.companyName.toLowerCase().includes(clientSearch.toLowerCase()) || 
                          c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                          c.email.toLowerCase().includes(clientSearch.toLowerCase())
                        ).length > 0 ? (
                          clients.filter(c => 
                            c.companyName.toLowerCase().includes(clientSearch.toLowerCase()) || 
                            c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                            c.email.toLowerCase().includes(clientSearch.toLowerCase())
                          ).map(c => (
                            <div
                              key={c.userId}
                              className="px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer text-slate-700 dark:text-slate-300 truncate"
                              title={`${c.companyName} (${c.name} - ${c.email})`}
                              onClick={() => {
                                setFormData({ ...formData, clientId: String(c.userId) });
                                setIsClientDropdownOpen(false);
                                setClientSearch("");
                              }}
                            >
                              {c.companyName} <span className="text-slate-400">({c.name} - {c.email})</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-center text-xs text-slate-400">
                            No clients found matching &quot;{clientSearch}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="size-4 stroke-[3]" />
                      <span>{editingVehicle ? "Save Vehicle" : "Register Vehicle"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
