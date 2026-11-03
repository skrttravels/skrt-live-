"use client";

import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, Building, Sparkles, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const roleColors: Record<string, string> = {
  admin: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  manager: "bg-[#2388ff]/10 text-[#2388ff] border-[#2388ff]/20",
};

const MODULES = [
  'dashboard', 'shipments', 'inventory', 'cashMemos', 'vehicles', 'tracking',
  'drivers', 'clients', 'invoices', 'contacts', 'expenses',
  'analytics', 'users', 'settings',
] as const;

type Module = typeof MODULES[number];
type Permissions = Record<Module, { view: boolean; create: boolean; edit: boolean; delete: boolean }>;

const defaultPermissions = (all: boolean): Permissions =>
  Object.fromEntries(MODULES.map(m => [m, { view: all, create: all, edit: all, delete: all }])) as Permissions;

export default function SettingsPage() {
  const { user: authUser, isLoading: authLoading } = useAuth();

  // ── Profile state ──
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Company state ──
  const [company, setCompany] = useState({ companyName: "", gstin: "", address: "", phone: "", email: "" });
  const [companyLoading, setCompanyLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);

  // ── Security state ──
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  // ── Permissions state ──
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [perms, setPerms] = useState<Permissions | null>(null);
  const [permsLoading, setPermsLoading] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  // ── Fetch profile ──
  useEffect(() => {
    if (authLoading || !authUser) return;
    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        const { data } = await api.get("/auth/profile");
        const u = data.data || data;
        setProfile({ name: u.name || "", email: u.email || "", phone: u.phone || "" });
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [authUser, authLoading]);

  // ── Fetch company settings ──
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        setCompanyLoading(true);
        const { data } = await api.get("/settings/company");
        const s = data.data || data;
        setCompany({
          companyName: s.companyName || "",
          gstin: s.gstin || "",
          address: s.address || "",
          phone: s.phone || "",
          email: s.email || "",
        });
      } catch {
        toast.error("Failed to load company settings");
      } finally {
        setCompanyLoading(false);
      }
    };
    fetchCompany();
  }, []);

  // ── Fetch users ──
  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const { data } = await api.get("/auth/users");
      if (data.success) setUsers(data.data || []);
    } catch {
      console.error("Failed to fetch users");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchPermissions = useCallback(async () => {
    try {
      setPermsLoading(true);
      const { data } = await api.get("/settings/permissions");
      if (data.success && data.data?.permissions) {
        setPerms(data.data.permissions);
      }
    } catch {
      toast.error("Failed to load permissions");
    } finally {
      setPermsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser?.role === 'admin') fetchPermissions();
  }, [authUser?.role, fetchPermissions]);

  // ── Handlers ──
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name.trim() || !profile.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    try {
      setSavingProfile(true);
      const { data } = await api.put("/auth/profile", profile);
      toast.success("Profile updated successfully");
      if (data.data) {
        setProfile({ name: data.data.name, email: data.data.email, phone: data.data.phone || "" });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCompany(true);
      await api.put("/settings/company", company);
      toast.success("Company details updated successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update company details");
    } finally {
      setSavingCompany(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwords.currentPassword || !passwords.newPassword) {
      toast.error("Please fill in both password fields");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    try {
      setSavingPassword(true);
      await api.post("/auth/change-password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success("Password changed successfully");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!perms) return;
    try {
      setSavingPerms(true);
      await api.put("/settings/permissions", perms);
      toast.success("Permissions saved");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save permissions");
    } finally {
      setSavingPerms(false);
    }
  };

  const setModulePerm = (mod: Module, action: 'view' | 'create' | 'edit' | 'delete', val: boolean) => {
    setPerms(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [mod]: { ...prev[mod], [action]: val },
      };
    });
  };

  const selectAll = () => {
    setPerms(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      for (const m of MODULES) {
        next[m] = { view: true, create: true, edit: true, delete: true };
      }
      return next;
    });
  };

  const clearAll = () => {
    setPerms(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      for (const m of MODULES) {
        next[m] = { view: false, create: false, edit: false, delete: false };
      }
      return next;
    });
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingRole(userId);
      await api.put(`/auth/users/${userId}`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
      toast.success("Role updated successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const isLoading = profileLoading || companyLoading || authLoading;
  const inputClass = "bg-zinc-900/60 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-primary focus:border-primary";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Settings <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage your account, organization details, security, and user permissions.
          </p>
        </div>

        <Card className="bg-zinc-950/40 border-zinc-800 backdrop-blur-md shadow-xl overflow-hidden">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-zinc-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs uppercase tracking-wider font-semibold">Loading settings...</p>
              </div>
            ) : (
              <Tabs defaultValue="profile" className="flex flex-col space-y-6 w-full">
                <TabsList className="w-full justify-start border-b border-zinc-800 bg-transparent p-0 gap-6 rounded-none h-auto pb-3 flex">
                  <TabsTrigger value="profile" className="gap-2 bg-transparent text-zinc-400 hover:text-zinc-100 data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-3 pt-0 text-sm font-semibold transition-all">
                    <User className="w-4 h-4" /> Profile Details
                  </TabsTrigger>
                  <TabsTrigger value="company" className="gap-2 bg-transparent text-zinc-400 hover:text-zinc-100 data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-3 pt-0 text-sm font-semibold transition-all">
                    <Building className="w-4 h-4" /> Company Details
                  </TabsTrigger>
                  <TabsTrigger value="security" className="gap-2 bg-transparent text-zinc-400 hover:text-zinc-100 data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-3 pt-0 text-sm font-semibold transition-all">
                    <Shield className="w-4 h-4" /> Security
                  </TabsTrigger>
                  {authUser?.role === 'admin' && (
                    <TabsTrigger value="permissions" className="gap-2 bg-transparent text-zinc-400 hover:text-zinc-100 data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-3 pt-0 text-sm font-semibold transition-all">
                      <Users className="w-4 h-4" /> Permissions
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* ── Profile Tab ── */}
                <TabsContent value="profile" className="outline-none space-y-6 animate-in fade-in-50 duration-200">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-zinc-100">Profile Details</h3>
                    <p className="text-sm text-zinc-400">Update your personal details and how others see you on the platform.</p>
                  </div>
                  <form onSubmit={handleSaveProfile} className="space-y-4 max-w-4xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
                        <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={inputClass} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-zinc-300">Phone</Label>
                        <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputClass} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                      <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputClass} />
                    </div>
                    <Button type="submit" disabled={savingProfile} className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-6 py-2 transition-all disabled:opacity-50">
                      {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save Changes
                    </Button>
                  </form>
                </TabsContent>

                {/* ── Company Tab ── */}
                <TabsContent value="company" className="outline-none space-y-6 animate-in fade-in-50 duration-200">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-zinc-100">Company Details</h3>
                    <p className="text-sm text-zinc-400">Manage your organization&apos;s legal and public information.</p>
                  </div>
                  <form onSubmit={handleSaveCompany} className="space-y-4 max-w-4xl">
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-zinc-300">Company Name</Label>
                      <Input id="companyName" value={company.companyName} onChange={(e) => setCompany({ ...company, companyName: e.target.value })} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gstin" className="text-zinc-300">GSTIN</Label>
                      <Input id="gstin" value={company.gstin} onChange={(e) => setCompany({ ...company, gstin: e.target.value })} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-zinc-300">Address</Label>
                      <Input id="address" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyPhone" className="text-zinc-300">Phone</Label>
                        <Input id="companyPhone" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} className={inputClass} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyEmail" className="text-zinc-300">Email</Label>
                        <Input id="companyEmail" type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} className={inputClass} />
                      </div>
                    </div>
                    <Button type="submit" disabled={savingCompany} className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-6 py-2 transition-all disabled:opacity-50">
                      {savingCompany ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Update Organization
                    </Button>
                  </form>
                </TabsContent>

                {/* ── Security Tab ── */}
                <TabsContent value="security" className="outline-none space-y-6 animate-in fade-in-50 duration-200">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-zinc-100">Security Settings</h3>
                    <p className="text-sm text-zinc-400">Secure your account with a strong password.</p>
                  </div>
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-4xl">
                    <div className="space-y-2">
                      <Label htmlFor="currentPass" className="text-zinc-300">Current Password</Label>
                      <Input id="currentPass" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPass" className="text-zinc-300">New Password</Label>
                      <Input id="newPass" type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPass" className="text-zinc-300">Confirm New Password</Label>
                      <Input id="confirmPass" type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} className={inputClass} />
                    </div>
                    <Button type="submit" disabled={savingPassword} className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-6 py-2 transition-all disabled:opacity-50">
                      {savingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Change Password
                    </Button>
                  </form>
                </TabsContent>

                {/* ── Permissions Tab ── */}
                {authUser?.role === 'admin' && (
                <TabsContent value="permissions" className="outline-none space-y-6 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between max-w-4xl">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                        Permission Matrix
                      </h3>
                      <p className="text-sm text-zinc-400">
                        Configure what each role can do. Admin always has full access.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={clearAll} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Clear</Button>
                      <Button variant="outline" size="sm" onClick={selectAll} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Select All</Button>
                    </div>
                  </div>

                  {permsLoading ? (
                    <div className="flex items-center justify-center py-12 text-zinc-400 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <p className="text-xs uppercase tracking-wider font-semibold">Loading permissions...</p>
                    </div>
                  ) : perms ? (
                    <div className="max-w-4xl space-y-6">
                      <div className="rounded-xl border border-zinc-800 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-zinc-900/60 border-b border-zinc-800">
                              <th className="text-left text-zinc-400 font-bold px-4 py-3 text-xs uppercase tracking-wider">Module</th>
                              <th className="text-center text-zinc-400 font-bold px-2 py-3 text-xs uppercase tracking-wider border-l border-zinc-800">View</th>
                              <th className="text-center text-zinc-400 font-bold px-2 py-3 text-xs uppercase tracking-wider border-l border-zinc-800">Create</th>
                              <th className="text-center text-zinc-400 font-bold px-2 py-3 text-xs uppercase tracking-wider border-l border-zinc-800">Edit</th>
                              <th className="text-center text-zinc-400 font-bold px-2 py-3 text-xs uppercase tracking-wider border-l border-zinc-800">Delete</th>
                            </tr>
                          </thead>
                          <tbody>
                            {MODULES.map((mod) => {
                              const p = perms[mod] || { view: true, create: false, edit: false, delete: false };
                              const viewChecked = p.view === undefined ? true : p.view;
                              return (
                                <tr key={mod} className="border-b border-zinc-800/60 hover:bg-zinc-900/40 transition-colors">
                                  <td className="px-4 py-3 text-zinc-100 font-semibold text-sm capitalize">{mod === 'cashMemos' ? 'Cash Memos' : mod}</td>
                                  {(['view', 'create', 'edit', 'delete'] as const).map((action) => (
                                    <td key={action} className="px-2 py-3 text-center border-l border-zinc-800/40">
                                      <input
                                        type="checkbox"
                                        checked={action === 'view' ? viewChecked : p[action]}
                                        onChange={(e) => setModulePerm(mod, action, e.target.checked)}
                                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-primary focus:ring-primary cursor-pointer accent-[#2388ff]"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center gap-4">
                        <Button
                          onClick={handleSavePermissions}
                          disabled={savingPerms}
                          className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-6 py-2 transition-all disabled:opacity-50"
                        >
                          {savingPerms ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Save Permissions
                        </Button>
                        <p className="text-[11px] text-zinc-500">
                          Changes apply immediately after saving. Admin role is not affected.
                        </p>
                      </div>

                      <div className="border-t border-zinc-800 pt-6">
                        <h4 className="text-sm font-bold text-zinc-100 mb-4">User Role Assignment</h4>
                        <div className="rounded-xl border border-zinc-800 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-zinc-900/60 border-b border-zinc-800">
                                <th className="text-left text-zinc-400 font-bold px-4 py-3 text-xs uppercase tracking-wider">Name</th>
                                <th className="text-left text-zinc-400 font-bold px-4 py-3 text-xs uppercase tracking-wider">Email</th>
                                <th className="text-left text-zinc-400 font-bold px-4 py-3 text-xs uppercase tracking-wider">Role</th>
                                <th className="text-right text-zinc-400 font-bold px-4 py-3 text-xs uppercase tracking-wider">Change Role</th>
                              </tr>
                            </thead>
                            <tbody>
                              {users.map((u: any) => (
                                <tr key={u._id} className="border-b border-zinc-800/60 hover:bg-zinc-900/40 transition-colors">
                                  <td className="px-4 py-3 text-zinc-100 font-semibold text-sm">{u.name}</td>
                                  <td className="px-4 py-3 text-zinc-400 text-sm">{u.email}</td>
                                  <td className="px-4 py-3">
                                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border", roleColors[u.role])}>
                                      {u.role}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <select
                                      value={u.role}
                                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                      disabled={updatingRole === u._id}
                                      className={cn("bg-zinc-900/60 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer focus:ring-1 focus:ring-primary", updatingRole === u._id && "opacity-50 cursor-not-allowed")}
                                      style={{ colorScheme: "dark" }}
                                    >
                                      <option value="admin" className="bg-zinc-900">Admin</option>
                                      <option value="manager" className="bg-zinc-900">Manager</option>
                                    </select>
                                    {updatingRole === u._id && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary inline-block ml-2" />}
                                  </td>
                                </tr>
                              ))}
                              {users.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">No users found</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </TabsContent>
                )}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
