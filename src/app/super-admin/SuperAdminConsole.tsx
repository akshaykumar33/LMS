"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Building, 
  Plus, 
  Search, 
  Settings, 
  Globe, 
  Palette, 
  Activity, 
  ShieldAlert, 
  ExternalLink,
  Sparkles,
  LogOut,
  X,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { createTenantAction, updateTenantAction } from "@/features/admin/actions/tenant-actions";
import { logoutAction } from "@/features/auth/actions/auth-actions";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName?: string;
  } | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SuperAdminConsoleProps {
  initialTenants: any[];
  user: any;
}

export function SuperAdminConsole({ initialTenants, user }: SuperAdminConsoleProps) {
  const [tenantsList, setTenantsList] = useState<Tenant[]>(initialTenants);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Create Form fields
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [secondaryColor, setSecondaryColor] = useState("#0f172a");

  // Edit Form fields
  const [editName, setEditName] = useState("");
  const [editSubdomain, setEditSubdomain] = useState("");
  const [editCustomDomain, setEditCustomDomain] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editPrimaryColor, setEditPrimaryColor] = useState("#0ea5e9");
  const [editSecondaryColor, setEditSecondaryColor] = useState("#0f172a");
  const [editStatus, setEditStatus] = useState("active");

  const filteredTenants = tenantsList.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = tenantsList.filter(t => t.status === "active").length;
  const suspendedCount = tenantsList.filter(t => t.status === "suspended").length;

  const handleLogout = async () => {
    await logoutAction();
    window.location.href = "/login";
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !subdomain) {
      setErrorMsg("Academy Name and Subdomain are required.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await createTenantAction({
        name,
        subdomain,
        customDomain: customDomain || undefined,
        logoUrl: logoUrl || undefined,
        primaryColor,
        secondaryColor,
      });

      if (res.success && res.data) {
        setSuccessMsg(`Academy "${name}" registered successfully!`);
        // Append to list
        setTenantsList(prev => [...prev, res.data as Tenant]);
        // Reset form
        setName("");
        setSubdomain("");
        setCustomDomain("");
        setLogoUrl("");
        setPrimaryColor("#0ea5e9");
        setSecondaryColor("#0f172a");
        setTimeout(() => {
          setIsCreateOpen(false);
          setSuccessMsg(null);
        }, 1200);
      } else {
        setErrorMsg(res.error || "Failed to create academy.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditName(tenant.name);
    setEditSubdomain(tenant.subdomain);
    setEditCustomDomain(tenant.customDomain || "");
    setEditLogoUrl(tenant.branding?.logoUrl || "");
    setEditPrimaryColor(tenant.branding?.primaryColor || "#0ea5e9");
    setEditSecondaryColor(tenant.branding?.secondaryColor || "#0f172a");
    setEditStatus(tenant.status);
    setIsEditOpen(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await updateTenantAction(editingTenant.id, {
        name: editName,
        subdomain: editSubdomain,
        customDomain: editCustomDomain || undefined,
        logoUrl: editLogoUrl || undefined,
        primaryColor: editPrimaryColor,
        secondaryColor: editSecondaryColor,
        status: editStatus,
      });

      if (res.success && res.data) {
        setSuccessMsg("Academy configuration updated!");
        // Update item in state list
        setTenantsList(prev => prev.map(t => t.id === editingTenant.id ? (res.data as Tenant) : t));
        setTimeout(() => {
          setIsEditOpen(false);
          setSuccessMsg(null);
          setEditingTenant(null);
        }, 1200);
      } else {
        setErrorMsg(res.error || "Failed to update academy.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10">
        
        {/* Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/80 to-slate-950/80 border border-border relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="space-y-2 relative z-10 text-center md:text-left">
            <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border border-amber-500/20">
              <Sparkles className="w-3 h-3" /> Multi-Tenant Orchestrator
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Manage System Tenants</h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Register active enterprise academies, custom domains, branding color schemes, and system states. Changes apply instantly across the network.
            </p>
          </div>
          <button
            onClick={() => {
              setIsCreateOpen(true);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="flex items-center gap-1.5 h-11 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-950/30 hover:shadow-sky-500/10 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Register Academy Portal
          </button>
        </div>

        {/* Stats Matrix */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Total Academies", val: tenantsList.length, icon: Building, color: "text-sky-400" },
            { label: "Active Portals", val: activeCount, icon: Activity, color: "text-emerald-400" },
            { label: "Suspended Portals", val: suspendedCount, icon: ShieldAlert, color: "text-rose-400" },
            { label: "Platform Node", val: "v2.6.1-VT", icon: Globe, color: "text-purple-400" },
          ].map((stat, i) => (
            <div key={i} className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between transition-all hover:scale-[1.02]">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                <p className="text-xl font-extrabold mt-1 text-slate-200">{stat.val}</p>
              </div>
              <div className={`p-2.5 rounded-lg bg-background/80 border border-border/60 ${stat.color} shadow-sm shadow-black/10`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Tenants Table Section */}
        <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-350">Registered Academy Domains</h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name or subdomain..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-8 pl-9 pr-4 rounded-lg bg-transparent border border-border/40 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-background/20 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="p-4">Academy Detail</th>
                  <th className="p-4">Subdomain</th>
                  <th className="p-4">Custom URL</th>
                  <th className="p-4 text-center">Branding Color</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/40 text-xs">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No academies found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    // Exclude vt parent itself from routing/testing options
                    const isParent = t.subdomain === "vt";
                    const isLocal = typeof window !== "undefined" && (window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1"));
                    const isVercel = typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app");
                    const portalUrl = isLocal
                      ? `http://${t.subdomain}.localhost:3000`
                      : isVercel
                      ? `/?tenant=${t.subdomain}`
                      : `https://${t.subdomain}.${window.location.host}`;

                    return (
                      <tr key={t.id} className="hover:bg-card transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {t.branding?.logoUrl ? (
                              <img 
                                src={t.branding.logoUrl} 
                                alt={t.name}
                                className="w-7 h-7 rounded object-contain bg-surface p-0.5 border border-border" 
                              />
                            ) : (
                              <div className="w-7 h-7 rounded bg-secondary text-slate-300 flex items-center justify-center font-bold text-[10px]">
                                {t.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-200">{t.branding?.companyName || t.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">ID: {t.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-400">
                          {t.subdomain}
                        </td>
                        <td className="p-4 text-slate-400">
                          {t.customDomain || <span className="text-[10px] text-slate-600 font-mono">None Configured</span>}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: t.branding?.primaryColor || "#0ea5e9" }}
                              title="Primary Theme Color"
                            />
                            <span className="text-[10px] font-mono text-slate-500">{t.branding?.primaryColor || "#0ea5e9"}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            t.status === "active" 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${t.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                            {t.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(t)}
                              className="p-1.5 rounded bg-secondary hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                              title="Edit Academy branding"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            {!isParent && (
                              <a
                                href={portalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded bg-sky-950/40 border border-sky-900/60 hover:bg-sky-900/60 text-sky-400 hover:text-white transition-all flex items-center justify-center"
                                title="Launch Academy Portal"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Modal: Create Tenant */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900/90 border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col sexy-border-glow">
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Register New Academy Portal</h4>
              </div>
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-350 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {errorMsg && (
                <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {successMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Academy name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nvidia Engineering Academy"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/40 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Subdomain</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. nvidia"
                    value={subdomain}
                    onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/40 text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Custom Domain</label>
                  <input
                    type="text"
                    placeholder="e.g. nvidia-coe.org"
                    value={customDomain}
                    onChange={e => setCustomDomain(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/40 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Logo SVG / PNG URL</label>
                <input
                  type="url"
                  placeholder="e.g. https://domain.com/logo.svg"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/40 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Primary Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/40 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Secondary Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/40 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-10 px-4 rounded-xl border border-border/45 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-10 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white disabled:opacity-50"
                >
                  {isLoading ? "Registering..." : "Register Academy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Tenant */}
      {isEditOpen && editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900/90 border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col sexy-border-glow">
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Edit Academy Settings</h4>
              </div>
              <button 
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-350 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTenant} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {errorMsg && (
                <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {successMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Academy name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nvidia Engineering Academy"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/40 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Subdomain</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. nvidia"
                    value={editSubdomain}
                    onChange={e => setEditSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/40 text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Custom Domain</label>
                  <input
                    type="text"
                    placeholder="e.g. nvidia-coe.org"
                    value={editCustomDomain}
                    onChange={e => setEditCustomDomain(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/40 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Logo SVG / PNG URL</label>
                <input
                  type="url"
                  placeholder="e.g. https://domain.com/logo.svg"
                  value={editLogoUrl}
                  onChange={e => setEditLogoUrl(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/40 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Primary Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editPrimaryColor}
                      onChange={e => setEditPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={editPrimaryColor}
                      onChange={e => setEditPrimaryColor(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/40 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Secondary Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editSecondaryColor}
                      onChange={e => setEditSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={editSecondaryColor}
                      onChange={e => setEditSecondaryColor(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/40 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-border/40 text-xs text-white"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="pt-4 border-t border-border/50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="h-10 px-4 rounded-xl border border-border/45 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-10 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
