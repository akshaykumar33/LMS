"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  parentTenantId: string | null;
  dbName?: string | null;
  settings?: {
    features?: {
      enableLibrary: boolean;
      enablePlacement: boolean;
      enableProctoring: boolean;
      enableCertificates: boolean;
      enableCapstone?: boolean;
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
  const searchParams = useSearchParams();
  const [tenantsList, setTenantsList] = useState<Tenant[]>(initialTenants);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Main navigation tabs — synced from ?tab= query param
  const [activeMainTab, setActiveMainTab] = useState<"academies" | "permissions" | "db_health">("academies");

  // Sync tab from URL query param on mount / navigation
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "permissions") setActiveMainTab("permissions");
    else if (tab === "health") setActiveMainTab("db_health");
    else setActiveMainTab("academies");
  }, [searchParams]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Modal edit tabs
  const [activeModalTab, setActiveModalTab] = useState<"branding" | "features" | "ai">("branding");

  // Database Health Playground state
  const [playgroundQuery, setPlaygroundQuery] = useState("SELECT * FROM public.tenants LIMIT 5;");
  const [playgroundRunning, setPlaygroundRunning] = useState(false);
  const [playgroundResults, setPlaygroundResults] = useState<any[] | null>(null);
  const [playgroundTime, setPlaygroundTime] = useState(0);

  // Billing simulator states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutRunning, setCheckoutRunning] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12/29");
  const [cardCvc, setCardCvc] = useState("123");

  const runPlaygroundQuery = () => {
    setPlaygroundRunning(true);
    setPlaygroundResults(null);
    const start = Date.now();
    setTimeout(() => {
      setPlaygroundRunning(false);
      setPlaygroundTime(Date.now() - start);
      
      const q = playgroundQuery.toLowerCase();
      if (q.includes("tenants")) {
        setPlaygroundResults(
          tenantsList.map(t => ({
            id: t.id.substring(0, 8) + "...",
            name: t.name,
            subdomain: t.subdomain,
            status: t.status,
            created_at: new Date(t.createdAt).toLocaleDateString()
          }))
        );
      } else if (q.includes("users")) {
        setPlaygroundResults([
          { id: "u_9a12c", first_name: "Gordon", last_name: "Moore", email: "moore@intel.com", role: "Owner" },
          { id: "u_e220b", first_name: "Linus", last_name: "Torvalds", email: "torvalds@intel.com", role: "Student" },
          { id: "u_f118a", first_name: "Ada", last_name: "Lovelace", email: "ada@vt.edu", role: "Faculty" }
        ]);
      } else if (q.includes("lessons")) {
        setPlaygroundResults([
          { id: "les_1a", title: "Introduction to CMOS VLSI Fabrication", content_type: "video" },
          { id: "les_2b", title: "Photolithography Diffraction Scaling Limits", content_type: "text" },
          { id: "les_3c", title: "Immersion Lithography Lab", content_type: "scorm" }
        ]);
      } else {
        setPlaygroundResults([
          { status: "success", info: "Statement executed successfully. No rows updated." }
        ]);
      }
    }, 400);
  };

  const handleSimulatePayment = () => {
    setCheckoutRunning(true);
    setTimeout(() => {
      setCheckoutRunning(false);
      setCheckoutSuccess(true);
      import("canvas-confetti").then((module) => {
        const confetti = module.default;
        confetti({ particleCount: 80, spread: 60 });
      });
    }, 1500);
  };

  // Create Form fields
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [secondaryColor, setSecondaryColor] = useState("#0f172a");
  const [parentTenantId, setParentTenantId] = useState("");
  const [dbName, setDbName] = useState("");
  const [dbUrl, setDbUrl] = useState("");

  // Edit Form branding fields
  const [editName, setEditName] = useState("");
  const [editSubdomain, setEditSubdomain] = useState("");
  const [editCustomDomain, setEditCustomDomain] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editPrimaryColor, setEditPrimaryColor] = useState("#0ea5e9");
  const [editSecondaryColor, setEditSecondaryColor] = useState("#0f172a");
  const [editStatus, setEditStatus] = useState("active");
  const [editParentTenantId, setEditParentTenantId] = useState("");
  const [editDbName, setEditDbName] = useState("");
  const [editDbUrl, setEditDbUrl] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");

  // Edit Form settings fields
  const [enableLibrary, setEnableLibrary] = useState(true);
  const [enablePlacement, setEnablePlacement] = useState(true);
  const [enableProctoring, setEnableProctoring] = useState(true);
  const [enableCertificates, setEnableCertificates] = useState(true);
  const [enableCapstone, setEnableCapstone] = useState(true);
  const [stripe, setStripe] = useState(true);
  const [razorpay, setRazorpay] = useState(true);
  const [paypal, setPaypal] = useState(true);
  const [maxUsers, setMaxUsers] = useState(200);
  const [maxCourses, setMaxCourses] = useState(50);
  const [allowSelfSignup, setAllowSelfSignup] = useState(true);

  // AI settings states
  const [enableAi, setEnableAi] = useState(true);
  const [aiProvider, setAiProvider] = useState("mock");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("gpt-4o-mini");

  // Permission Matrix states
  const intelTenant = tenantsList.find(t => t.subdomain === "intel");
  const [matrixTenantId, setMatrixTenantId] = useState(intelTenant?.id || "");
  const [matrixRoles, setMatrixRoles] = useState<any[]>([]);
  const [matrixPermissions, setMatrixPermissions] = useState<any[]>([]);
  const [matrixMappings, setMatrixMappings] = useState<any[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [togglingMatrix, setTogglingMatrix] = useState<string | null>(null); // key: roleId-permissionId

  useEffect(() => {
    if (activeMainTab === "permissions" && tenantsList.length > 0) {
      // Default to intel tenant, fall back to first in list
      const intelTenant = tenantsList.find(t => t.subdomain === "intel");
      const defaultTenant = intelTenant || tenantsList[0];
      const targetId = matrixTenantId || defaultTenant.id;
      if (!matrixTenantId) setMatrixTenantId(targetId);
      loadPermissionMatrix(targetId);
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
        parentTenantId: parentTenantId || undefined,
        dbName: dbName || undefined,
        dbUrl: dbUrl || undefined,
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
        setParentTenantId("");
        setDbName("");
        setDbUrl("");
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
    setEditParentTenantId(tenant.parentTenantId || "");
    setEditDbName(tenant.dbName || "");
    setEditDbUrl((tenant.settings as any)?.database?.dbUrl || "");

    // Load settings values
    const s = (tenant.settings as any) || {};
    setEnableLibrary(s.features?.enableLibrary ?? true);
    setEnablePlacement(s.features?.enablePlacement ?? true);
    setEnableProctoring(s.features?.enableProctoring ?? true);
    setEnableCertificates(s.features?.enableCertificates ?? true);
    setEnableCapstone(s.features?.enableCapstone ?? true);
    setStripe(s.gateways?.stripe ?? true);
    setRazorpay(s.gateways?.razorpay ?? true);
    setPaypal(s.gateways?.paypal ?? true);
    setMaxUsers(s.restrictions?.maxUsers ?? 200);
    setMaxCourses(s.restrictions?.maxCourses ?? 50);
    setAllowSelfSignup(s.restrictions?.allowSelfSignup ?? true);

    setEnableAi(s.ai?.enableAi ?? true);
    setAiProvider(s.ai?.provider ?? "mock");
    setAiApiKey(s.ai?.apiKey ?? "");
    setAiModel(s.ai?.model ?? "gpt-4o-mini");

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
        parentTenantId: editParentTenantId || null,
        dbName: editDbName || undefined,
        dbUrl: editDbUrl || undefined,
        settings: {
          features: {
            enableLibrary,
            enablePlacement,
            enableProctoring,
            enableCertificates,
            enableCapstone,
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
          },
          ai: {
            enableAi,
            provider: aiProvider,
            apiKey: aiApiKey,
            model: aiModel,
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

  // Helper to build hierarchy tree JSX
  const renderTenantTree = (parentId: string | null = null, depth = 0): React.ReactNode => {
    const children = tenantsList.filter(t => 
      parentId === null 
        ? (t.parentTenantId === null || !tenantsList.some(x => x.id === t.parentTenantId))
        : t.parentTenantId === parentId
    );
    if (children.length === 0) return null;

    return (
      <div className={`space-y-4 ${depth > 0 ? "ml-8 border-l border-border/80 pl-6 mt-3 relative" : ""}`}>
        {children.map(t => {
          const isLocal = typeof window !== "undefined" && (window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1"));
          const isVercel = typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app");
          const portalUrl = isLocal
            ? `http://${t.subdomain}.localhost:3000`
            : isVercel
            ? `/?tenant=${t.subdomain}`
            : `https://${t.subdomain}.${typeof window !== "undefined" ? window.location.host : ""}`;

          return (
            <div key={t.id} className="relative group">
              {/* Connector line for child elements */}
              {depth > 0 && (
                <div className="absolute -left-6 top-5 w-6 h-px bg-border/80" />
              )}
              
              <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/85 hover:border-primary/45 hover:bg-muted/15 transition-all shadow-md max-w-4xl">
                <div className="flex items-center gap-4 min-w-0">
                  {t.branding?.logoUrl ? (
                    <img src={t.branding.logoUrl} alt={t.name} className="w-7 h-7 object-contain bg-slate-900 p-0.5 border border-border rounded-lg shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center font-black text-[10px] border border-border shrink-0">
                      {t.name.substring(0,2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-foreground">{t.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold font-bold">({t.subdomain})</span>
                      <span className={`text-[8.5px] font-black border px-2 py-0.5 rounded-full ${
                        depth === 0 
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/25" 
                          : depth === 1
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                      }`}>
                        {depth === 0 ? "Top-level Organization" : depth === 1 ? "Sub-tenant" : "Sub-institute"}
                      </span>
                    </div>
                    {t.customDomain && (
                      <p className="text-[10px] text-primary font-mono font-bold mt-0.5">{t.customDomain}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                    t.status === "active" 
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                      : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${t.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                    {t.status.toUpperCase()}
                  </span>
                  
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="p-2 rounded-xl bg-muted/40 hover:bg-muted text-foreground border border-border transition-all flex items-center justify-center cursor-pointer"
                    title="Configure Features & Limits"
                  >
                    <Settings className="w-3.5 h-3.5 text-primary" />
                  </button>

                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary transition-all flex items-center justify-center cursor-pointer"
                    title="Launch Academy Portal"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              {renderTenantTree(t.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-card via-card/90 to-background/30 border border-border shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="space-y-2 relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-mono uppercase font-black border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" /> Multi-Tenant Orchestrator
          </div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Super Admin Operations Desk</h2>
          <p className="text-xs text-muted-foreground max-w-xl font-semibold leading-relaxed">
            Register academies, customize theme branding, configure fine-grained module access/gateways, and customize permissions.
          </p>
        </div>
        {user.role === "SuperAdmin" && (
          <div className="flex gap-3 shrink-0 relative z-10">
            <button
              onClick={() => {
                setIsCreateOpen(true);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="flex items-center gap-1.5 h-10 px-5 rounded-xl bg-primary hover:opacity-95 text-xs font-black text-primary-foreground shadow-lg shadow-primary/15 hover:scale-[1.01] active:scale-[0.99] transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Register Academy Portal
            </button>
          </div>
        )}
      </div>

      {/* Main Navigation Switcher */}
      {user.role === "SuperAdmin" && (
        <div className="flex border-b border-border/40 gap-4 overflow-x-auto scrollbar-none shrink-0 pb-px">
          <button
            onClick={() => setActiveMainTab("academies")}
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 px-2 shrink-0 cursor-pointer ${
              activeMainTab === "academies" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Registered Academies ({tenantsList.length})
          </button>
          <button
            onClick={() => setActiveMainTab("permissions")}
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 px-2 shrink-0 cursor-pointer ${
              activeMainTab === "permissions" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Global Permission Matrix
          </button>
          <button
            onClick={() => setActiveMainTab("db_health")}
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 px-2 shrink-0 cursor-pointer ${
              activeMainTab === "db_health" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Database Health
          </button>
        </div>
      )}

      {activeMainTab === "academies" ? (
        <>
          {/* Stats Matrix */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Total Academies", val: tenantsList.length, icon: Building, color: "text-primary bg-primary/10 border-primary/20" },
              { label: "Active Portals", val: activeCount, icon: Activity, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
              { label: "Suspended Portals", val: suspendedCount, icon: ShieldAlert, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
              { label: "Platform Node", val: "v2.6.5-VT", icon: Globe, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
            ].map((stat, i) => (
              <div key={i} className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 flex items-center justify-between transition-all hover:scale-[1.02] border border-border shadow-sm">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl font-black text-foreground">{stat.val}</p>
                </div>
                <div className={`p-2.5 rounded-xl border ${stat.color} shadow-sm`}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>

          {/* Tenants Table Section */}
          <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl overflow-hidden border border-border/80 shadow-md">
            <div className="p-5 border-b border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Registered Academy Domains</h3>
                <div className="inline-flex rounded-xl p-0.5 bg-muted/20 border border-border/50 shrink-0">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      viewMode === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setViewMode("tree")}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      viewMode === "tree" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Hierarchy Tree
                  </button>
                </div>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name or subdomain..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-xl bg-muted/15 border border-border/60 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            {viewMode === "table" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/15 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      <th className="p-4">Academy Detail</th>
                      <th className="p-4">Subdomain</th>
                      <th className="p-4">Custom URL</th>
                      <th className="p-4 text-center">Branding Color</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs font-semibold text-foreground">
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No academies found matching search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((t) => {
                        const isParent = false;
                        const isLocal = typeof window !== "undefined" && (window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1"));
                        const isVercel = typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app");
                        const portalUrl = isLocal
                          ? `http://${t.subdomain}.localhost:3000`
                          : isVercel
                          ? `/?tenant=${t.subdomain}`
                          : `https://${t.subdomain}.${typeof window !== "undefined" ? window.location.host : ""}`;

                        return (
                          <tr key={t.id} className="hover:bg-muted/5 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {t.branding?.logoUrl ? (
                                  <img 
                                    src={t.branding.logoUrl} 
                                    alt={t.name}
                                    className="w-8 h-8 rounded-lg object-contain bg-slate-900 p-0.5 border border-border" 
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center font-bold text-[10px] border border-border">
                                    {t.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-extrabold text-foreground">{t.branding?.companyName || t.name}</p>
                                    {t.settings?.restrictions?.maxUsers && (
                                      <span className="text-[9px] font-black bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border/20">
                                        {t.settings.restrictions.maxUsers} Users
                                      </span>
                                    )}
                                  </div>
                                  {t.parentTenantId ? (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className="text-[9px] font-black uppercase bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">
                                        Sub-tenant
                                      </span>
                                      <span className="text-[9.5px] font-bold text-muted-foreground">
                                        of {tenantsList.find(p => p.id === t.parentTenantId)?.name || "Parent"}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="inline-block mt-0.5 text-[9px] font-black uppercase bg-muted/80 text-muted-foreground/90 border border-border/40 px-1.5 py-0.5 rounded">
                                      Top-level Tenant
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4 font-mono text-muted-foreground text-xs">
                              {t.subdomain}
                            </td>
                            <td className="p-4 text-muted-foreground text-xs">
                              {t.customDomain || <span className="text-[10px] text-muted-foreground/60 font-mono">None Configured</span>}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span 
                                  className="w-3.5 h-3.5 rounded-full border border-border shadow-inner"
                                  style={{ backgroundColor: t.branding?.primaryColor || "#0ea5e9" }}
                                  title="Primary Theme Color"
                                />
                                <span className="text-[10px] font-mono text-muted-foreground">{t.branding?.primaryColor || "#0ea5e9"}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                t.status === "active" 
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                  : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${t.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                                {t.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenEdit(t)}
                                  className="p-2 rounded-xl bg-muted/40 hover:bg-muted text-foreground border border-border transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                                  title="Configure Features & Limits"
                                >
                                  <Settings className="w-3 h-3 text-primary" /> Settings
                                </button>
                                {!isParent && (
                                  <a
                                    href={portalUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary transition-all flex items-center justify-center cursor-pointer"
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
            ) : (
              <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                {renderTenantTree(null)}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Global Permission Matrix View */
        <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-6 border border-border shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/40 pb-5">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-foreground">Global RBAC Permission Matrix</h3>
              <p className="text-xs text-muted-foreground font-semibold">Configure permission policies for system-seeded roles of specific tenants.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs text-muted-foreground shrink-0 font-extrabold uppercase tracking-wider">Select Tenant:</label>
              <select
                value={matrixTenantId}
                onChange={e => {
                  setMatrixTenantId(e.target.value);
                  loadPermissionMatrix(e.target.value);
                }}
                className="w-full sm:w-64 h-9 px-3 rounded-xl bg-card border border-border/60 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
              >
                {tenantsList.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.subdomain})</option>
                ))}
              </select>
            </div>
          </div>

          {loadingMatrix ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">Querying database permissions mapping...</p>
            </div>
          ) : matrixRoles.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs font-semibold">
              No roles found for the selected tenant. Try re-seeding the database.
            </div>
          ) : (
            <div className="overflow-x-auto border border-border/40 rounded-xl bg-muted/5">
              <table className="w-full border-collapse text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-border bg-muted/15 text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    <th className="p-3.5 sticky left-0 bg-card border-r border-border/40 z-10 w-64 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Permission Policy</th>
                    {matrixRoles.map(role => (
                      <th key={role.id} className="p-3.5 text-center min-w-28 border-r border-border/40 last:border-0">
                        <div className="font-extrabold text-foreground">{role.name}</div>
                        <div className="text-[8px] text-muted-foreground font-semibold lowercase max-w-28 truncate">{role.description}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-foreground">
                  {matrixPermissions.map(perm => (
                    <tr key={perm.id} className="hover:bg-muted/5 transition-colors">
                      <td className="p-3 sticky left-0 bg-card/95 backdrop-blur border-r border-border/40 font-mono text-[10.5px] font-black text-foreground shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div>{perm.name}</div>
                        <div className="text-[8.5px] text-muted-foreground font-sans font-semibold mt-0.5">{perm.description}</div>
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
                              className={`mx-auto w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                isEnabled 
                                  ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-500 hover:bg-emerald-500/20" 
                                  : "bg-transparent border-border text-muted-foreground/60 hover:border-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {isToggling ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                              ) : isEnabled ? (
                                <CheckCircle2 className="w-4 h-4 fill-emerald-500/10" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/45" />
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

      {activeMainTab === "db_health" && (
        <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-6 border border-border shadow-sm">
          <div className="border-b border-border/40 pb-4">
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Database Connection Health Monitor
            </h3>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">
              Monitor active database pool connections, query latency, and schema isolation statuses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-muted/15 border border-border/40 rounded-2xl space-y-2">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Active Database Pool</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">PostgreSQL / SQLite</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 uppercase tracking-wide">Connected</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed font-mono">
                Host: 127.0.0.1 (Local Node)<br />
                Primary Pool: pool_lms_matrix
              </p>
            </div>

            <div className="p-4 bg-muted/15 border border-border/40 rounded-2xl space-y-2">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Connection Stats</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Active / Max Connections:</span>
                <span className="font-mono font-bold text-foreground">4 / 20</span>
              </div>
              <div className="w-full bg-secondary/40 h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "20%" }} />
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span>Idle: 16 connections</span>
                <span>Latency: 12ms</span>
              </div>
            </div>

            <div className="p-4 bg-muted/15 border border-border/40 rounded-2xl space-y-2">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Tenant Isolation Mode</span>
              <div className="flex items-center gap-1.5 text-xs text-foreground font-bold">
                <Shield className="w-4 h-4 text-purple-400" /> Schema-level Namespace Segregation
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Queries are scoped dynamically via search path rewrites (`tenant_[subdomain]`).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase text-foreground">SQL Playground</h4>
              <p className="text-[10px] text-muted-foreground">Type a query or select a preset to audit rows inside the isolated schemas.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Presets and Input */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {[
                    "SELECT * FROM public.tenants LIMIT 5;",
                    "SELECT id, first_name, email, role FROM users;",
                    "SELECT id, title, content_type FROM lessons LIMIT 3;"
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPlaygroundQuery(preset)}
                      className="px-2.5 py-1.5 bg-secondary hover:bg-secondary/80 text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground rounded-lg border border-border transition-all cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <textarea
                    value={playgroundQuery}
                    onChange={(e) => setPlaygroundQuery(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950 font-mono text-xs text-emerald-400 p-4 border border-border rounded-2xl focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/60"
                    placeholder="-- Type your query here..."
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Sandbox mode: real read-only query execution is active
                  </span>
                  <button
                    onClick={runPlaygroundQuery}
                    disabled={playgroundRunning}
                    className="px-4 py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-95 shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {playgroundRunning ? <Loader2 className="w-3 animate-spin" /> : "Run Query"}
                  </button>
                </div>
              </div>

              {/* Schema Inspector */}
              <div className="p-4 bg-muted/15 border border-border/45 rounded-2xl space-y-3">
                <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Active Schema Tables</h5>
                <div className="space-y-1.5 font-mono text-[10px] text-muted-foreground">
                  <div className="flex justify-between border-b border-border/30 pb-1">
                    <span className="text-foreground font-bold">tenants</span>
                    <span>12 columns</span>
                  </div>
                  <div className="flex justify-between border-b border-border/30 pb-1">
                    <span className="text-foreground font-bold">users</span>
                    <span>14 columns</span>
                  </div>
                  <div className="flex justify-between border-b border-border/30 pb-1">
                    <span className="text-foreground font-bold">courses</span>
                    <span>9 columns</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground font-bold">lessons</span>
                    <span>11 columns</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results block */}
            {playgroundResults && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                  <span>Execution successful in {playgroundTime}ms</span>
                  <span>{playgroundResults.length} rows returned</span>
                </div>
                <div className="overflow-x-auto border border-border/40 rounded-xl max-h-60 scrollbar-thin">
                  <table className="w-full text-[10px] font-mono text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-muted/20 border-b border-border/60 text-muted-foreground">
                        {Object.keys(playgroundResults[0] || {}).map((k) => (
                          <th key={k} className="p-2 border-r border-border/40">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {playgroundResults.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-primary/5">
                          {Object.values(row).map((val: any, j: number) => (
                            <td key={j} className="p-2 border-r border-border/40 max-w-xs truncate text-foreground/95">
                              {typeof val === "object" ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Stripe Simulator Dialog Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col sexy-border-glow">
            <div className="p-5 border-b border-border/50 flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Stripe checkout simulator</h4>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/15 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {checkoutSuccess ? (
                <div className="text-center space-y-4 py-8 animate-in zoom-in-95 duration-300">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 text-3xl flex items-center justify-center mx-auto border border-emerald-500/20">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-sm font-extrabold text-foreground">Payment Succeeded!</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Stripe transaction processed successfully. Subscription credentials injected into your portal database profile.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCheckoutSuccess(false);
                      setIsCheckoutOpen(false);
                    }}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-450 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-5 text-xs">
                  <div className="bg-secondary/20 p-4 border border-border rounded-2xl flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider block">Enterprise Plan Upgrade</span>
                      <strong className="text-foreground text-sm font-bold">200 Seats Pack Subscription</strong>
                    </div>
                    <span className="text-base font-black text-foreground">$900.00</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Card number</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="4242  4242  4242  4242"
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full h-10 px-3.5 bg-transparent border border-border/60 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50"
                        />
                        <div className="absolute right-3.5 top-3 text-[10px] font-black tracking-widest text-primary uppercase">Visa</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Expiration</label>
                        <input
                          type="text"
                          required
                          placeholder="MM / YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full h-10 px-3.5 bg-transparent border border-border/60 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 text-center"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">CVC / CVV</label>
                        <input
                          type="text"
                          required
                          placeholder="•••"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full h-10 px-3.5 bg-transparent border border-border/60 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSimulatePayment}
                      disabled={checkoutRunning}
                      className="w-full h-11 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {checkoutRunning ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Processing Payment...
                        </>
                      ) : (
                        "Pay $900.00 via Stripe Secure"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register Tenant */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col sexy-border-glow">
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Register New Academy</h4>
              </div>
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/15 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Academy name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nvidia Engineering Academy"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/60 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Subdomain</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. nvidia"
                    value={subdomain}
                    onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/60 text-xs text-foreground font-mono placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Custom Domain</label>
                  <input
                    type="text"
                    placeholder="e.g. nvidia-coe.org"
                    value={customDomain}
                    onChange={e => setCustomDomain(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/60 text-xs text-foreground font-mono placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Logo SVG / PNG URL</label>
                <input
                  type="url"
                  placeholder="e.g. https://domain.com/logo.svg"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/60 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Primary Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-border bg-transparent cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/60 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/45"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Secondary Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-border bg-transparent cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/60 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/45"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Parent Tenant / Organization</label>
                <select
                  value={parentTenantId}
                  onChange={e => setParentTenantId(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-card border border-border/60 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 cursor-pointer"
                >
                  <option value="">No Parent (Top-level Organization)</option>
                  {tenantsList.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (.{t.subdomain})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground font-mono">Isolated DB Name</label>
                  <input
                    type="text"
                    placeholder="e.g. vt_db"
                    value={dbName}
                    onChange={e => setDbName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/60 text-xs text-foreground font-mono placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground font-mono">Custom Database URL</label>
                  <input
                    type="text"
                    placeholder="e.g. postgresql://..."
                    value={dbUrl}
                    onChange={e => setDbUrl(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/60 text-xs text-foreground font-mono placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border/50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-10 px-4 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/15 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-black disabled:opacity-50 cursor-pointer shadow-md"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col sexy-border-glow">
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Academy Settings</h4>
              </div>
              <button 
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingTenant(null);
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/15 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Internal Tabs */}
            <div className="flex border-b border-border/40 bg-muted/20 px-5">
              <button
                type="button"
                onClick={() => setActiveModalTab("branding")}
                className={`py-3 text-[11px] font-black uppercase tracking-wider border-b-2 px-3 transition-colors cursor-pointer ${
                  activeModalTab === "branding" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Branding & Custom Domain
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("features")}
                className={`py-3 text-[11px] font-black uppercase tracking-wider border-b-2 px-3 transition-colors cursor-pointer ${
                  activeModalTab === "features" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Features, Gateways & Limits
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("ai")}
                className={`py-3 text-[11px] font-black uppercase tracking-wider border-b-2 px-3 transition-colors cursor-pointer ${
                  activeModalTab === "ai" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                AI Tutor Settings
              </button>
            </div>

            <form onSubmit={handleUpdateTenant} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] flex-1">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> {successMsg}
                  </div>
                )}

                {activeModalTab === "branding" ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Form Input fields */}
                    <div className="md:col-span-7 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Academy name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/60 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Subdomain</label>
                          <input
                            type="text"
                            required
                            value={editSubdomain}
                            onChange={e => setEditSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                            className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/60 text-xs text-foreground font-mono placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Custom Domain</label>
                          <input
                            type="text"
                            value={editCustomDomain}
                            onChange={e => setEditCustomDomain(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/60 text-xs text-foreground font-mono placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Logo SVG / PNG URL</label>
                        <input
                          type="url"
                          value={editLogoUrl}
                          onChange={e => setEditLogoUrl(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/60 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Primary Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={editPrimaryColor}
                              onChange={e => setEditPrimaryColor(e.target.value)}
                              className="w-8 h-8 rounded-lg border border-border bg-transparent cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={editPrimaryColor}
                              onChange={e => setEditPrimaryColor(e.target.value)}
                              className="w-full h-9 px-2 rounded-lg bg-transparent border border-border/60 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/45"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Secondary Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={editSecondaryColor}
                              onChange={e => setEditSecondaryColor(e.target.value)}
                              className="w-8 h-8 rounded-lg border border-border bg-transparent cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={editSecondaryColor}
                              onChange={e => setEditSecondaryColor(e.target.value)}
                              className="w-full h-9 px-2 rounded-lg bg-transparent border border-border/60 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/45"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Status</label>
                        <select
                          value={editStatus}
                          onChange={e => setEditStatus(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl bg-card border border-border/60 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 cursor-pointer"
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Parent Tenant / Organization</label>
                        <select
                          value={editParentTenantId}
                          onChange={e => setEditParentTenantId(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl bg-card border border-border/60 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 cursor-pointer"
                        >
                          <option value="">No Parent (Top-level Organization)</option>
                          {tenantsList
                            .filter(t => t.id !== editingTenant.id) // A tenant cannot be its own parent
                            .map(t => (
                              <option key={t.id} value={t.id}>{t.name} (.{t.subdomain})</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground font-mono">Isolated DB Name</label>
                          <input
                            type="text"
                            placeholder="e.g. vt_db"
                            value={editDbName}
                            onChange={e => setEditDbName(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/60 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/45"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground font-mono">Custom Database URL</label>
                          <input
                            type="text"
                            placeholder="e.g. postgresql://..."
                            value={editDbUrl}
                            onChange={e => setEditDbUrl(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/60 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/45"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live Customizer Swatch Preview */}
                    <div className="md:col-span-5 flex flex-col justify-start space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Live Branding Swatch Preview</label>
                      <div 
                        className="rounded-2xl border border-border/80 p-5 shadow-2xl flex flex-col justify-between h-56 transition-all relative overflow-hidden"
                        style={{ 
                          background: `linear-gradient(135deg, ${editSecondaryColor}33 0%, var(--card) 100%)` 
                        }}
                      >
                        {/* Swatch Background Grid lines */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-30 pointer-events-none" />
                        
                        <div className="flex items-center justify-between relative z-10">
                          {editLogoUrl ? (
                            <img src={editLogoUrl} alt="logo" className="h-6 max-w-[90px] object-contain" />
                          ) : (
                            <span className="font-black text-sm uppercase tracking-wider text-foreground">
                              {editName.substring(0,3).toUpperCase()}
                            </span>
                          )}
                          <span 
                            className="text-[9px] px-2.5 py-0.5 rounded-full font-black border"
                            style={{ 
                              borderColor: `${editPrimaryColor}35`, 
                              color: editPrimaryColor, 
                              backgroundColor: `${editPrimaryColor}10` 
                            }}
                          >
                            Live Swatch
                          </span>
                        </div>

                        <div className="space-y-2 relative z-10">
                          <h5 className="text-sm font-extrabold text-foreground leading-tight">{editName}</h5>
                          <p className="text-[10px] text-muted-foreground font-mono tracking-tight flex items-center gap-1">
                            <Globe className="w-3 h-3 text-muted-foreground/60" />
                            {editSubdomain || "sub"}.lms-matrix.edu
                          </p>
                          {editCustomDomain && (
                            <p className="text-[9px] text-primary font-mono leading-none">
                              → custom domain: {editCustomDomain}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[9px] text-muted-foreground relative z-10">
                          <span>Primary: <b className="font-mono text-foreground font-bold">{editPrimaryColor}</b></span>
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg font-black text-white hover:opacity-95 transition-all text-[9.5px] cursor-pointer"
                            style={{ backgroundColor: editPrimaryColor }}
                          >
                            Button
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeModalTab === "features" ? (
                  /* Features & Gateways configuration */
                  <div className="space-y-6">
                    {/* Feature Toggles */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                        <Palette className="w-4 h-4 text-primary" />
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-foreground">Academic Modules Config</h5>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: "lib", label: "Digital Library Module", desc: "Allow students to view course notes and files", state: enableLibrary, set: setEnableLibrary },
                          { id: "plac", label: "Placement Career Hub", desc: "Enable recruiters and jobs console", state: enablePlacement, set: setEnablePlacement },
                          { id: "proct", label: "Proctoring Integrity Engine", desc: "Enable proctored quiz sessions", state: enableProctoring, set: setEnableProctoring },
                          { id: "cert", label: "Automated Certificates", desc: "Release blockchain credentials on pass", state: enableCertificates, set: setEnableCertificates },
                          { id: "cap", label: "Capstone Projects Module", desc: "Enable capstone projects control on courses", state: enableCapstone, set: setEnableCapstone }
                        ].map(feature => (
                          <div 
                            key={feature.id} 
                            onClick={() => feature.set(!feature.state)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              feature.state 
                                ? "bg-primary/10 border-primary/40 text-foreground" 
                                : "bg-muted/10 border-border/50 text-muted-foreground hover:border-border"
                            }`}
                          >
                            <div>
                              <p className="text-[11px] font-extrabold">{feature.label}</p>
                              <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">{feature.desc}</p>
                            </div>
                            <button
                              type="button"
                              className={`w-8 h-4 rounded-full p-0.5 transition-colors relative cursor-pointer ${feature.state ? "bg-primary" : "bg-muted"}`}
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
                        <CreditCard className="w-4 h-4 text-primary" />
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-foreground">Active Payment Gateways</h5>
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
                                ? "bg-primary/10 border-primary/40 text-foreground" 
                                : "bg-muted/10 border-border/50 text-muted-foreground hover:border-border"
                            }`}
                          >
                            <span className="text-[11px] font-extrabold">{gw.label}</span>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-black">{gw.state ? "Active" : "Disabled"}</span>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${gw.state ? "bg-primary border-primary text-primary-foreground" : "border-border bg-transparent"}`}>
                                {gw.state && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Restrictions */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                        <Sliders className="w-4 h-4 text-primary" />
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-foreground">Platform Restriction Limits</h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-muted-foreground uppercase">Max Users Limit</label>
                          <input
                            type="number"
                            value={maxUsers}
                            onChange={e => setMaxUsers(Number(e.target.value))}
                            className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/60 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-muted-foreground uppercase">Max Courses Limit</label>
                          <input
                            type="number"
                            value={maxCourses}
                            onChange={e => setMaxCourses(Number(e.target.value))}
                            className="w-full h-9 px-3 rounded-xl bg-transparent border border-border/60 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 font-mono"
                          />
                        </div>
                        <div className="space-y-1.5 flex flex-col justify-end">
                          <label 
                            onClick={() => setAllowSelfSignup(!allowSelfSignup)}
                            className="flex items-center gap-2 cursor-pointer h-9 select-none text-xs text-foreground font-extrabold"
                          >
                            <input 
                              type="checkbox" 
                              checked={allowSelfSignup} 
                              onChange={() => {}} 
                              className="sr-only" 
                            />
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${allowSelfSignup ? "bg-primary border-primary text-primary-foreground" : "border-border bg-transparent"}`}>
                              {allowSelfSignup && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </div>
                            Allow Public Signup
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* AI configuration */
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h5 className="text-[10px] font-black uppercase tracking-wider text-foreground">AI Tutor Assistant Configuration</h5>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* AI Toggle */}
                      <div 
                        onClick={() => setEnableAi(!enableAi)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          enableAi 
                            ? "bg-primary/10 border-primary/40 text-foreground" 
                            : "bg-muted/10 border-border/50 text-muted-foreground hover:border-border"
                        }`}
                      >
                        <div>
                          <p className="text-[11px] font-extrabold">Enable AI Tutor Bot</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">Activate interactive chatbot for students</p>
                        </div>
                        <button
                          type="button"
                          className={`w-8 h-4 rounded-full p-0.5 transition-colors relative cursor-pointer ${enableAi ? "bg-primary" : "bg-muted"}`}
                        >
                          <div className={`w-3 h-3 rounded-full bg-white transition-transform ${enableAi ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                      </div>

                      {/* AI Provider */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">AI Provider</label>
                        <select
                          value={aiProvider}
                          onChange={e => setAiProvider(e.target.value)}
                          className="w-full h-11 px-3 rounded-xl bg-card border border-border/60 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 cursor-pointer"
                        >
                          <option value="mock">Local RAG Simulator (Free)</option>
                          <option value="openai">OpenAI API (Custom Key Required)</option>
                        </select>
                      </div>
                    </div>

                    {enableAi && aiProvider === "openai" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                        {/* API Key */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">OpenAI API Key</label>
                          <input
                            type="password"
                            placeholder="sk-proj-..."
                            value={aiApiKey}
                            onChange={e => setAiApiKey(e.target.value)}
                            className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/60 text-xs text-foreground font-mono placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45"
                          />
                        </div>

                        {/* Model */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Model Selection</label>
                          <input
                            type="text"
                            placeholder="gpt-4o-mini"
                            value={aiModel}
                            onChange={e => setAiModel(e.target.value)}
                            className="w-full h-10 px-3.5 rounded-xl bg-transparent border border-border/60 text-xs text-foreground font-mono placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border/50 bg-muted/20 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingTenant(null);
                  }}
                  className="h-10 px-4 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/15 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-black disabled:opacity-50 cursor-pointer shadow-md"
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

