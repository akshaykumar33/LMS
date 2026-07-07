"use client";

import React, { useState, useEffect } from "react";
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
  X,
  CheckCircle2,
  Lock,
  Unlock,
  Shield,
  CreditCard,
  Sliders,
  CheckSquare,
  Square,
  Loader2
} from "lucide-react";
import { 
  createTenantAction, 
  updateTenantAction,
  getTenantPermissionsAction,
  toggleRolePermissionAction 
} from "@/features/admin/actions/tenant-actions";
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
  settings?: {
    features?: {
      enableLibrary: boolean;
      enablePlacement: boolean;
      enableProctoring: boolean;
      enableCertificates: boolean;
    };
    gateways?: {
      stripe: boolean;
      razorpay: boolean;
      paypal: boolean;
    };
    restrictions?: {
      maxUsers: number;
      maxCourses: number;
      allowSelfSignup: boolean;
    };
  } | null;
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

  // Main navigation tabs
  const [activeMainTab, setActiveMainTab] = useState<"academies" | "permissions">("academies");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Modal edit tabs
  const [activeModalTab, setActiveModalTab] = useState<"branding" | "features">("branding");

  // Create Form fields
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [secondaryColor, setSecondaryColor] = useState("#0f172a");

  // Edit Form branding fields
  const [editName, setEditName] = useState("");
  const [editSubdomain, setEditSubdomain] = useState("");
  const [editCustomDomain, setEditCustomDomain] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editPrimaryColor, setEditPrimaryColor] = useState("#0ea5e9");
  const [editSecondaryColor, setEditSecondaryColor] = useState("#0f172a");
  const [editStatus, setEditStatus] = useState("active");

  // Edit Form settings fields
  const [enableLibrary, setEnableLibrary] = useState(true);
  const [enablePlacement, setEnablePlacement] = useState(true);
  const [enableProctoring, setEnableProctoring] = useState(true);
  const [enableCertificates, setEnableCertificates] = useState(true);
  const [stripe, setStripe] = useState(true);
  const [razorpay, setRazorpay] = useState(true);
  const [paypal, setPaypal] = useState(true);
  const [maxUsers, setMaxUsers] = useState(200);
  const [maxCourses, setMaxCourses] = useState(50);
  const [allowSelfSignup, setAllowSelfSignup] = useState(true);

  // Permission Matrix states
  const [matrixTenantId, setMatrixTenantId] = useState("");
  const [matrixRoles, setMatrixRoles] = useState<any[]>([]);
  const [matrixPermissions, setMatrixPermissions] = useState<any[]>([]);
  const [matrixMappings, setMatrixMappings] = useState<any[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [togglingMatrix, setTogglingMatrix] = useState<string | null>(null); // key: roleId-permissionId

  useEffect(() => {
    if (activeMainTab === "permissions" && tenantsList.length > 0 && !matrixTenantId) {
      // Auto select first tenant
      setMatrixTenantId(tenantsList[0].id);
      loadPermissionMatrix(tenantsList[0].id);
    }
  }, [activeMainTab]);

  const loadPermissionMatrix = async (tenantId: string) => {
    if (!tenantId) {
      setMatrixRoles([]);
      setMatrixPermissions([]);
      setMatrixMappings([]);
      return;
    }
    setLoadingMatrix(true);
    setErrorMsg(null);
    try {
      const res = await getTenantPermissionsAction(tenantId);
      if (res.success && res.roles && res.permissions && res.mappings) {
        setMatrixRoles(res.roles);
        setMatrixPermissions(res.permissions);
        setMatrixMappings(res.mappings);
      } else {
        setErrorMsg(res.error || "Failed to load permissions.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error fetching matrix.");
    } finally {
      setLoadingMatrix(false);
    }
  };

  const handleTogglePermission = async (roleId: string, permissionId: string, isCurrentlyEnabled: boolean) => {
    const key = `${roleId}-${permissionId}`;
    setTogglingMatrix(key);
    try {
      const res = await toggleRolePermissionAction(roleId, permissionId, !isCurrentlyEnabled);
      if (res.success) {
        if (isCurrentlyEnabled) {
          setMatrixMappings(prev => prev.filter(m => !(m.roleId === roleId && m.permissionId === permissionId)));
        } else {
          setMatrixMappings(prev => [...prev, { roleId, permissionId }]);
        }
      } else {
        alert(res.error || "Failed to toggle permission.");
      }
    } catch (e: any) {
      alert(e.message || "Error toggling permission.");
    } finally {
      setTogglingMatrix(null);
    }
  };

  const filteredTenants = tenantsList.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = tenantsList.filter(t => t.status === "active").length;
  const suspendedCount = tenantsList.filter(t => t.status === "suspended").length;

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
        setTenantsList(prev => [...prev, res.data as Tenant]);
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

    // Load settings values
    const s = tenant.settings || {};
    setEnableLibrary(s.features?.enableLibrary ?? true);
    setEnablePlacement(s.features?.enablePlacement ?? true);
    setEnableProctoring(s.features?.enableProctoring ?? true);
    setEnableCertificates(s.features?.enableCertificates ?? true);
    setStripe(s.gateways?.stripe ?? true);
    setRazorpay(s.gateways?.razorpay ?? true);
    setPaypal(s.gateways?.paypal ?? true);
    setMaxUsers(s.restrictions?.maxUsers ?? 200);
    setMaxCourses(s.restrictions?.maxCourses ?? 50);
    setAllowSelfSignup(s.restrictions?.allowSelfSignup ?? true);

    setActiveModalTab("branding");
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
        settings: {
          features: {
            enableLibrary,
            enablePlacement,
            enableProctoring,
            enableCertificates,
          },
          gateways: {
            stripe,
            razorpay,
            paypal,
          },
          restrictions: {
            maxUsers: Number(maxUsers),
            maxCourses: Number(maxCourses),
            allowSelfSignup,
          }
        }
      });

      if (res.success && res.data) {
        setSuccessMsg("Academy configuration updated!");
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
    <div className="space-y-8">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/80 to-slate-950/80 border border-border relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="space-y-2 relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border border-amber-500/20">
            <Sparkles className="w-3 h-3" /> Multi-Tenant Orchestrator
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Super Admin Operations Desk</h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Register academies, customize theme branding, configure fine-grained module access/gateways, and customize permissions.
          </p>
        </div>
        <div className="flex gap-3 shrink-0 relative z-10">
          <button
            onClick={() => {
              setIsCreateOpen(true);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-950/30 hover:shadow-sky-500/10 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Register Academy Portal
          </button>
        </div>
      </div>

      {/* Main Navigation Switcher */}
      <div className="flex border-b border-border/40 gap-4">
        <button
          onClick={() => setActiveMainTab("academies")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 px-1 ${
            activeMainTab === "academies" 
              ? "border-sky-500 text-sky-400 font-extrabold" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Registered Academies ({tenantsList.length})
        </button>
        <button
          onClick={() => setActiveMainTab("permissions")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 px-1 ${
            activeMainTab === "permissions" 
              ? "border-sky-500 text-sky-400 font-extrabold" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Global Permission Matrix
        </button>
      </div>

      {activeMainTab === "academies" ? (
        <>
          {/* Stats Matrix */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Total Academies", val: tenantsList.length, icon: Building, color: "text-sky-400" },
              { label: "Active Portals", val: activeCount, icon: Activity, color: "text-emerald-400" },
              { label: "Suspended Portals", val: suspendedCount, icon: ShieldAlert, color: "text-rose-400" },
              { label: "Platform Node", val: "v2.6.5-VT", icon: Globe, color: "text-purple-400" },
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
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Registered Academy Domains</h3>
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
                                  className="w-7 h-7 rounded object-contain bg-slate-900 p-0.5 border border-border" 
                                />
                              ) : (
                                <div className="w-7 h-7 rounded bg-secondary text-slate-300 flex items-center justify-center font-bold text-[10px]">
                                  {t.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-slate-200">{t.branding?.companyName || t.name}</p>
                                  {t.settings?.restrictions?.maxUsers && (
                                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded">
                                      {t.settings.restrictions.maxUsers} Users
                                    </span>
                                  )}
                                </div>
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
                                className="p-1.5 rounded bg-slate-850 hover:bg-slate-700 text-slate-300 hover:text-white border border-border/40 transition-all flex items-center gap-1 text-[10px]"
                                title="Configure Features & Limits"
                              >
                                <Settings className="w-3 h-3 text-sky-400" /> Settings
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
        </>
      ) : (
        /* Global Permission Matrix View */
        <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/40 pb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Global RBAC Permission Matrix</h3>
              <p className="text-xs text-slate-500 mt-1">Configure permission policies for system-seeded roles of specific tenants.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs text-slate-400 shrink-0 font-medium">Select Tenant:</label>
              <select
                value={matrixTenantId}
                onChange={e => {
                  setMatrixTenantId(e.target.value);
                  loadPermissionMatrix(e.target.value);
                }}
                className="w-full sm:w-64 h-9 px-3 rounded-lg bg-slate-900 border border-border/40 text-xs text-white"
              >
                {tenantsList.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.subdomain})</option>
                ))}
              </select>
            </div>
          </div>

          {loadingMatrix ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              <p className="text-xs font-medium">Querying database permissions mapping...</p>
            </div>
          ) : matrixRoles.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No roles found for the selected tenant. Try re-seeding the database.
            </div>
          ) : (
            <div className="overflow-x-auto border border-border/40 rounded-xl bg-slate-900/50">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-slate-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-3.5 sticky left-0 bg-slate-950 border-r border-border/40 z-10 w-64">Permission Policy</th>
                    {matrixRoles.map(role => (
                      <th key={role.id} className="p-3.5 text-center min-w-28 border-r border-border/40 last:border-0">
                        <div className="font-bold text-slate-200">{role.name}</div>
                        <div className="text-[8px] text-slate-500 font-normal lowercase max-w-28 truncate">{role.description}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {matrixPermissions.map(perm => (
                    <tr key={perm.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 sticky left-0 bg-slate-950/80 backdrop-blur border-r border-border/40 font-mono text-[10.5px] font-bold text-slate-300">
                        <div>{perm.name}</div>
                        <div className="text-[8.5px] text-slate-500 font-sans font-normal mt-0.5">{perm.description}</div>
                      </td>
                      {matrixRoles.map(role => {
                        const isEnabled = matrixMappings.some(m => m.roleId === role.id && m.permissionId === perm.id);
                        const key = `${role.id}-${perm.id}`;
                        const isToggling = togglingMatrix === key;

                        return (
                          <td key={role.id} className="p-3 text-center border-r border-border/30 last:border-0">
                            <button
                              disabled={isToggling}
                              onClick={() => handleTogglePermission(role.id, perm.id, isEnabled)}
                              className={`mx-auto w-5 h-5 rounded flex items-center justify-center border transition-all ${
                                isEnabled 
                                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20" 
                                  : "bg-transparent border-slate-700 text-slate-600 hover:border-slate-500"
                              }`}
                            >
                              {isToggling ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isEnabled ? (
                                <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-400/20" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Tenant */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col sexy-border-glow">
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Register New Academy</h4>
              </div>
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {errorMsg}
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
                  className="h-10 px-4 rounded-xl border border-border/45 text-xs font-bold text-slate-450 hover:text-white"
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
          <div className="w-full max-w-2xl bg-slate-900 border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col sexy-border-glow">
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Academy Orchestrator Settings</h4>
              </div>
              <button 
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingTenant(null);
                }}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-350 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Internal Tabs */}
            <div className="flex border-b border-border/40 bg-slate-950/40 px-5">
              <button
                type="button"
                onClick={() => setActiveModalTab("branding")}
                className={`py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 px-3 transition-colors ${
                  activeModalTab === "branding" ? "border-sky-500 text-sky-400" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Branding & Custom Domain
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("features")}
                className={`py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 px-3 transition-colors ${
                  activeModalTab === "features" ? "border-sky-500 text-sky-400" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Features, Gateways & Limits
              </button>
            </div>

            <form onSubmit={handleUpdateTenant} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] flex-1">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {successMsg}
                  </div>
                )}

                {activeModalTab === "branding" ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Form Input fields */}
                    <div className="md:col-span-7 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Academy name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/40 text-xs text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Subdomain</label>
                          <input
                            type="text"
                            required
                            value={editSubdomain}
                            onChange={e => setEditSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                            className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/40 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Custom Domain</label>
                          <input
                            type="text"
                            value={editCustomDomain}
                            onChange={e => setEditCustomDomain(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/40 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Logo SVG / PNG URL</label>
                        <input
                          type="url"
                          value={editLogoUrl}
                          onChange={e => setEditLogoUrl(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/40 text-xs text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Primary Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={editPrimaryColor}
                              onChange={e => setEditPrimaryColor(e.target.value)}
                              className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={editPrimaryColor}
                              onChange={e => setEditPrimaryColor(e.target.value)}
                              className="w-full h-9 px-2 rounded-lg bg-transparent border border-border/40 text-xs text-white font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Secondary Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={editSecondaryColor}
                              onChange={e => setEditSecondaryColor(e.target.value)}
                              className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={editSecondaryColor}
                              onChange={e => setEditSecondaryColor(e.target.value)}
                              className="w-full h-9 px-2 rounded-lg bg-transparent border border-border/40 text-xs text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Status</label>
                        <select
                          value={editStatus}
                          onChange={e => setEditStatus(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-border/40 text-xs text-white"
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    </div>

                    {/* Live Customizer Swatch Preview */}
                    <div className="md:col-span-5 flex flex-col justify-start space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Live Branding Swatch Preview</label>
                      <div 
                        className="rounded-2xl border border-white/10 p-5 shadow-2xl flex flex-col justify-between h-56 transition-all"
                        style={{ 
                          background: `linear-gradient(135deg, ${editSecondaryColor} 0%, #030712 100%)` 
                        }}
                      >
                        <div className="flex items-center justify-between">
                          {editLogoUrl ? (
                            <img src={editLogoUrl} alt="logo" className="h-6 max-w-[90px] object-contain" />
                          ) : (
                            <span className="font-black text-sm uppercase tracking-wider text-white">
                              {editName.substring(0,3).toUpperCase()}
                            </span>
                          )}
                          <span 
                            className="text-[9px] px-2 py-0.5 rounded-full font-bold border"
                            style={{ 
                              borderColor: `${editPrimaryColor}40`, 
                              color: editPrimaryColor, 
                              backgroundColor: `${editPrimaryColor}10` 
                            }}
                          >
                            Live Swatch
                          </span>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-sm font-extrabold text-white leading-tight">{editName}</h5>
                          <p className="text-[10px] text-slate-400 font-mono tracking-tight flex items-center gap-1">
                            <Globe className="w-3 h-3 text-slate-500" />
                            {editSubdomain || "sub"}.lms-matrix.edu
                          </p>
                          {editCustomDomain && (
                            <p className="text-[9px] text-sky-400/90 font-mono leading-none">
                              → custom domain: {editCustomDomain}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[9px] text-slate-500">
                          <span>Primary: <b className="font-mono text-white">{editPrimaryColor}</b></span>
                          <button
                            type="button"
                            className="px-3 py-1 rounded font-bold text-white transition-all hover:brightness-110"
                            style={{ backgroundColor: editPrimaryColor }}
                          >
                            Button
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Features & Gateways configuration */
                  <div className="space-y-6">
                    {/* Feature Toggles */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                        <Palette className="w-4 h-4 text-sky-400" />
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-300">Academic Modules Config</h5>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: "lib", label: "Digital Library Module", desc: "Allow students to view course notes and files", state: enableLibrary, set: setEnableLibrary },
                          { id: "plac", label: "Placement Career Hub", desc: "Enable recruiters and jobs console", state: enablePlacement, set: setEnablePlacement },
                          { id: "proct", label: "Proctoring Integrity Engine", desc: "Enable proctored quiz sessions", state: enableProctoring, set: setEnableProctoring },
                          { id: "cert", label: "Automated Certificates", desc: "Release blockchain credentials on pass", state: enableCertificates, set: setEnableCertificates }
                        ].map(feature => (
                          <div 
                            key={feature.id} 
                            onClick={() => feature.set(!feature.state)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              feature.state 
                                ? "bg-sky-600/10 border-sky-500/40 text-white" 
                                : "bg-slate-900/30 border-border/40 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <div>
                              <p className="text-[11px] font-bold">{feature.label}</p>
                              <p className="text-[9px] text-slate-500 mt-0.5">{feature.desc}</p>
                            </div>
                            <button
                              type="button"
                              className={`w-8 h-4 rounded-full p-0.5 transition-colors relative ${feature.state ? "bg-sky-500" : "bg-slate-800"}`}
                            >
                              <div className={`w-3 h-3 rounded-full bg-white transition-transform ${feature.state ? "translate-x-4" : "translate-x-0"}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment Gateways */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                        <CreditCard className="w-4 h-4 text-sky-400" />
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-350">Active Payment Gateways</h5>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { id: "stripe", label: "Stripe Gateway", state: stripe, set: setStripe },
                          { id: "razor", label: "Razorpay Checkout", state: razorpay, set: setRazorpay },
                          { id: "paypal", label: "PayPal Integration", state: paypal, set: setPaypal }
                        ].map(gw => (
                          <div 
                            key={gw.id} 
                            onClick={() => gw.set(!gw.state)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-20 ${
                              gw.state 
                                ? "bg-sky-600/10 border-sky-500/40 text-white" 
                                : "bg-slate-900/30 border-border/40 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <span className="text-[11px] font-bold">{gw.label}</span>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[8px] uppercase tracking-wider text-slate-500">{gw.state ? "Active" : "Disabled"}</span>
                              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${gw.state ? "bg-sky-500 border-sky-500 text-white" : "border-slate-700"}`}>
                                {gw.state && <CheckCircle2 className="w-2.5 h-2.5" />}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Restrictions */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                        <Sliders className="w-4 h-4 text-sky-400" />
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-350">Platform Restriction Limits</h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Max Users Limit</label>
                          <input
                            type="number"
                            value={maxUsers}
                            onChange={e => setMaxUsers(Number(e.target.value))}
                            className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/40 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Max Courses Limit</label>
                          <input
                            type="number"
                            value={maxCourses}
                            onChange={e => setMaxCourses(Number(e.target.value))}
                            className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/40 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1.5 flex flex-col justify-end">
                          <label 
                            onClick={() => setAllowSelfSignup(!allowSelfSignup)}
                            className="flex items-center gap-2 cursor-pointer h-9 select-none text-xs text-slate-300"
                          >
                            <input 
                              type="checkbox" 
                              checked={allowSelfSignup} 
                              onChange={() => {}} 
                              className="sr-only" 
                            />
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${allowSelfSignup ? "bg-sky-500 border-sky-500 text-white" : "border-slate-700"}`}>
                              {allowSelfSignup && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                            Allow Public Signup
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border/50 bg-slate-950/40 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingTenant(null);
                  }}
                  className="h-10 px-4 rounded-xl border border-border/45 text-xs font-bold text-slate-450 hover:text-white"
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
