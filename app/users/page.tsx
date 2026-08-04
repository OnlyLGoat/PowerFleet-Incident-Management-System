"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Users, 
  Search, 
  Trash2, 
  Edit3, 
  Power, 
  Loader2, 
  X, 
  Plus, 
  ShieldCheck, 
  Wrench, 
  Building2,
  Check,
  User,
  CheckCircle2,
  XCircle,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  deletedAt?: string | null;
  role: "Admin" | "Support Manager" | "Technician" | "ClientUser";
  isActive?: boolean;
  department?: string;
  hireDate?: string;
  canManageUsers?: boolean;
  canAssign?: boolean;
  specialty?: string;
  isAvailable?: boolean;
  companyName?: string;
  phone?: string;
}

export default function UsersManagementPage() {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [permFormData, setPermFormData] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    isActive: true,
    canManageUsers: false,
    canAssign: false,
    isAvailable: true,
    specialty: "",
    companyName: "",
    phone: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Register New User Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regData, setRegData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Technician",
    department: "Operations",
    companyName: "",
    phone: "",
    specialty: "GPS Installation",
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get<UserProfile[]>("/api/users");
      setUsersList(res.data || []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        setLoading(true);
        const res = await axios.get<UserProfile[]>("/api/users");
        if (isMounted) {
          setUsersList(res.data || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { response?: { data?: { error?: string } } };
          toast.error(e.response?.data?.error || "Failed to load users");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    init();
    return () => { isMounted = false; };
  }, []);

  // Quick Permission Toggle Handler
  const handleQuickToggle = async (user: UserProfile, field: string, currentValue?: boolean) => {
    const nextVal = !currentValue;
    try {
      await axios.patch(`/api/users/${user.id}`, { [field]: nextVal });
      toast.success(`Updated ${field} for ${user.name}`);
      fetchUsers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Failed to update permission");
    }
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setPermFormData({
      name: user.name,
      email: user.email,
      password: "",
      department: user.department ?? "",
      isActive: user.isActive ?? true,
      canManageUsers: user.canManageUsers ?? false,
      canAssign: user.canAssign ?? true,
      isAvailable: user.isAvailable ?? true,
      specialty: user.specialty ?? "",
      companyName: user.companyName ?? "",
      phone: user.phone ?? "",
    });
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsUpdating(true);
      await axios.patch(`/api/users/${editingUser.id}`, {
        name: permFormData.name,
        email: permFormData.email,
        ...(permFormData.password ? { password: permFormData.password } : {}),
        department: permFormData.department,
        isActive: permFormData.isActive,
        canManageUsers: permFormData.canManageUsers,
        canAssign: permFormData.canAssign,
        isAvailable: permFormData.isAvailable,
        specialty: permFormData.specialty,
        companyName: permFormData.companyName,
        phone: permFormData.phone,
      });

      toast.success(`User info and permissions updated for ${editingUser.name}.`);
      setEditingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Failed to update user");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.name.trim() || !regData.email.trim() || !regData.password.trim()) {
      toast.error("Please fill in required fields.");
      return;
    }

    try {
      setIsRegistering(true);
      await axios.post("/api/auth/register", {
        name: regData.name.trim(),
        email: regData.email.trim(),
        password: regData.password,
        role: regData.role,
        department: regData.department,
        companyName: regData.companyName,
        phone: regData.phone,
        specialty: regData.specialty,
      });

      toast.success(`Registered new ${regData.role} account.`);
      setIsRegisterOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeleteUser = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to soft-delete user account "${name}"?`)) return;

    try {
      await axios.delete(`/api/users/${id}`);
      toast.success(`User "${name}" soft-deleted.`);
      fetchUsers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Delete failed.");
    }
  };

  const handleRestoreUser = async (id: number, name: string) => {
    try {
      await axios.patch(`/api/users/${id}`, { isDeleted: false });
      toast.success(`User "${name}" account restored successfully!`);
      fetchUsers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Failed to restore user.");
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (roleFilter === "DELETED") {
      if (!u.deletedAt) return false;
    } else if (roleFilter !== "ALL") {
      if (u.role !== roleFilter) return false;
    }

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.companyName && u.companyName.toLowerCase().includes(q)) ||
      (u.specialty && u.specialty.toLowerCase().includes(q));

    return matchesSearch;
  });

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800";
      case "Support Manager":
        return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "Technician":
        return "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      default:
        return "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
              <Users className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">User Accounts & Permissions</h1>
              <p className="text-xs text-slate-400">Inspect user accounts, manage permissions, toggle staff availability, and update profiles.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsRegisterOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="size-4 stroke-[3]" />
          <span>Create New User</span>
        </button>
      </div>

      {/* 2. Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Accounts</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{usersList.length}</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Admins & Managers</p>
            <p className="text-2xl font-extrabold text-rose-500 mt-0.5">
              {usersList.filter((u) => u.role === "Admin" || u.role === "Support Manager").length}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Wrench className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Technicians</p>
            <p className="text-2xl font-extrabold text-amber-500 mt-0.5">
              {usersList.filter((u) => u.role === "Technician").length}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Client Accounts</p>
            <p className="text-2xl font-extrabold text-blue-500 mt-0.5">
              {usersList.filter((u) => u.role === "ClientUser").length}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Toolbar & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Role Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto no-scrollbar">
          {["ALL", "Admin", "Support Manager", "Technician", "ClientUser", "DELETED"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={cn(
                "px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                roleFilter === r
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-md"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              {r === "ALL" ? "All Roles" : r === "DELETED" ? "Deleted Accounts" : r}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, email, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* 4. Data Table with Explicit Permissions Column */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">User Profile</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Department / Company</th>
                <th className="py-3.5 px-4">Permissions & Capabilities</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin text-rose-500" />
                      <span>Loading user accounts...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No users found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                        <p className="text-slate-400 text-[11px] font-mono">{u.email}</p>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span className={cn("px-2.5 py-1 rounded-full border text-[11px] font-bold inline-block", getRoleBadgeStyle(u.role))}>
                        {u.role}
                      </span>
                    </td>

                    {/* Department / Company */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {u.companyName ? (
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{u.companyName}</p>
                          {u.phone && <p className="text-[11px] text-slate-400 font-mono">{u.phone}</p>}
                        </div>
                      ) : u.department ? (
                        <span className="font-medium">{u.department}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Interactive Permissions & Capabilities Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {u.role === "Admin" && (
                          <button
                            type="button"
                            onClick={() => handleQuickToggle(u, "canManageUsers", Boolean(u.canManageUsers))}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer",
                              u.canManageUsers
                                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-800 hover:bg-rose-100"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                            )}
                            title="Click to toggle Manage Users permission"
                          >
                            {u.canManageUsers ? <CheckCircle2 className="size-3 text-rose-500" /> : <XCircle className="size-3 text-slate-400" />}
                            <span>Manage Users: {u.canManageUsers ? "Granted" : "Disabled"}</span>
                          </button>
                        )}

                        {u.role === "Support Manager" && (
                          <button
                            type="button"
                            onClick={() => handleQuickToggle(u, "canAssign", Boolean(u.canAssign))}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer",
                              u.canAssign
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                            )}
                            title="Click to toggle Assign Tasks permission"
                          >
                            {u.canAssign ? <CheckCircle2 className="size-3 text-emerald-500" /> : <XCircle className="size-3 text-slate-400" />}
                            <span>Assign Tasks: {u.canAssign ? "Enabled" : "Disabled"}</span>
                          </button>
                        )}

                        {u.role === "Technician" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickToggle(u, "isAvailable", Boolean(u.isAvailable))}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer",
                                u.isAvailable
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800"
                                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-800"
                              )}
                              title="Click to toggle availability"
                            >
                              <Wrench className="size-3" />
                              <span>{u.isAvailable ? "Available" : "Unavailable"}</span>
                            </button>

                            {u.specialty && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                                {u.specialty}
                              </span>
                            )}
                          </>
                        )}

                        {u.role === "ClientUser" && (
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[10px] font-bold">
                            Client Account
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Active Status */}
                    <td className="py-3.5 px-4">
                      {u.deletedAt ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30">
                          <Trash2 className="size-3" />
                          <span>Deleted</span>
                        </span>
                      ) : u.role !== "ClientUser" ? (
                        <button
                          type="button"
                          onClick={() => handleQuickToggle(u, "isActive", Boolean(u.isActive))}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer",
                            u.isActive !== false
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 border-rose-200 dark:border-rose-800"
                          )}
                          title="Click to toggle account activation status"
                        >
                          <Power className="size-3" />
                          <span>{u.isActive !== false ? "Active" : "Deactivated"}</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800">
                          Active
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.deletedAt ? (
                          <button
                            type="button"
                            onClick={() => handleRestoreUser(u.id, u.name)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-colors cursor-pointer"
                            title="Restore User Account"
                          >
                            <RotateCcw className="size-3.5 stroke-[2.5]" />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(u)}
                              className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit All User Information"
                            >
                              <Edit3 className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Soft Delete User"
                            >
                              <Trash2 className="size-4" />
                            </button>
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

      {/* Edit User Modal (Edit All User Information) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                  <Edit3 className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit User Profile & Permissions
                  </h2>
                  <p className="text-xs text-slate-400">{editingUser.name} ({editingUser.role})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={permFormData.name}
                  onChange={(e) => setPermFormData({ ...permFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={permFormData.email}
                  onChange={(e) => setPermFormData({ ...permFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password (optional)
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to keep existing password"
                  value={permFormData.password}
                  onChange={(e) => setPermFormData({ ...permFormData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {editingUser.role !== "ClientUser" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={permFormData.department}
                    onChange={(e) => setPermFormData({ ...permFormData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {editingUser.role === "ClientUser" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={permFormData.companyName}
                      onChange={(e) => setPermFormData({ ...permFormData, companyName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={permFormData.phone}
                      onChange={(e) => setPermFormData({ ...permFormData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </>
              )}

              {/* Permissions & Availability Controls */}
              {editingUser.role === "Admin" && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Can Manage Users</p>
                    <p className="text-[11px] text-slate-400">Allow administrative privileges</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={permFormData.canManageUsers}
                    onChange={(e) => setPermFormData({ ...permFormData, canManageUsers: e.target.checked })}
                    className="size-4 accent-rose-500 cursor-pointer"
                  />
                </div>
              )}

              {editingUser.role === "Support Manager" && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Can Assign Tasks</p>
                    <p className="text-[11px] text-slate-400">Allow assigning tickets & creating sub-tasks</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={permFormData.canAssign}
                    onChange={(e) => setPermFormData({ ...permFormData, canAssign: e.target.checked })}
                    className="size-4 accent-emerald-500 cursor-pointer"
                  />
                </div>
              )}

              {editingUser.role === "Technician" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Technical Specialty
                    </label>
                    <input
                      type="text"
                      value={permFormData.specialty}
                      onChange={(e) => setPermFormData({ ...permFormData, specialty: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Technician Available</p>
                      <p className="text-[11px] text-slate-400">Toggle availability for assignments</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={permFormData.isAvailable}
                      onChange={(e) => setPermFormData({ ...permFormData, isAvailable: e.target.checked })}
                      className="size-4 accent-amber-500 cursor-pointer"
                    />
                  </div>
                </>
              )}

              {/* Account Activation Switch */}
              {editingUser.role !== "ClientUser" && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Account Active Status</p>
                    <p className="text-[11px] text-slate-400">Enable or disable login access</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={permFormData.isActive}
                    onChange={(e) => setPermFormData({ ...permFormData, isActive: e.target.checked })}
                    className="size-4 accent-emerald-500 cursor-pointer"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="size-4 stroke-[3]" />
                      <span>Save User Info</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register User Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                  <User className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Create User Account
                  </h2>
                  <p className="text-xs text-slate-400">Add an internal staff member or client profile.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Connor"
                  value={regData.name}
                  onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="sarah@powerfleet.com"
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={regData.password}
                  onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Role *
                </label>
                <select
                  value={regData.role}
                  onChange={(e) => setRegData({ ...regData, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="Technician">Technician</option>
                  <option value="Support Manager">Support Manager</option>
                  <option value="Admin">Admin</option>
                  <option value="ClientUser">Client</option>
                </select>
              </div>

              {regData.role === "ClientUser" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Global Logistics Corp"
                      value={regData.companyName}
                      onChange={(e) => setRegData({ ...regData, companyName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+213 550 123 456"
                      value={regData.phone}
                      onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="Operations / Technical Support"
                    value={regData.department}
                    onChange={(e) => setRegData({ ...regData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isRegistering ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="size-4 stroke-[3]" />
                      <span>Create Account</span>
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
