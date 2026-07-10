"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeftRight, Check, Cpu } from "lucide-react";

interface TenantQuickSwitcherProps {
  userRole: string;
  currentSubdomain: string;
}

import { getSwitchableTenantsAction } from "@/features/admin/actions/tenant-actions";

interface TenantQuickSwitcherProps {
  userRole: string;
  currentSubdomain: string;
}

export function TenantQuickSwitcher({ userRole, currentSubdomain }: TenantQuickSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Only administrators can switch tenants
  const isAllowed = ["Owner", "Admin", "Program Manager", "SuperAdmin"].includes(userRole);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadTenants() {
      try {
        const res = await getSwitchableTenantsAction();
        if (res.success && res.data) {
          setTenants(res.data);
        }
      } catch (err) {
        console.error("Failed to load switchable tenants:", err);
      } finally {
        setLoading(false);
      }
    }
    if (isAllowed && mounted) {
      loadTenants();
    }
  }, [isAllowed, mounted]);

  if (!mounted || !isAllowed) return null;

  // Hierarchical sort helper
  const getSortedHierarchy = (): { item: any; depth: number }[] => {
    const sorted: { item: any; depth: number }[] = [];
    const visited = new Set<string>();

    const addDescendants = (parentId: string | null, currentDepth: number) => {
      const children = tenants.filter(t => t.parentTenantId === parentId);
      for (const child of children) {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          sorted.push({ item: child, depth: currentDepth });
          addDescendants(child.id, currentDepth + 1);
        }
      }
    };

    const topLevel = tenants.filter(t => !t.parentTenantId);
    for (const parent of topLevel) {
      if (!visited.has(parent.id)) {
        visited.add(parent.id);
        sorted.push({ item: parent, depth: 0 });
        addDescendants(parent.id, 1);
      }
    }

    // Safety fallback
    for (const item of tenants) {
      if (!visited.has(item.id)) {
        sorted.push({ item, depth: 0 });
      }
    }

    return sorted;
  };

  const handleSwitch = (targetSubdomain: string) => {
    if (targetSubdomain === currentSubdomain) return;

    const host = window.location.host; // e.g. "intel.localhost:3080" or "localhost:3080"
    const protocol = window.location.protocol;
    const pathname = window.location.pathname;

    // Handle Localhost
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      const parts = host.split(".");
      if (parts.length > 1 && !parts[parts.length - 2].includes("localhost")) {
        parts[0] = targetSubdomain;
        window.location.href = `${protocol}//${parts.join(".")}${pathname}`;
      } else {
        // Fallback to query param on bare localhost
        window.location.href = `${protocol}//${host}${pathname}?tenant=${targetSubdomain}`;
      }
    } else {
      // Handle Production (Vercel or custom domain)
      const parts = host.split(".");
      const isVercel = host.endsWith(".vercel.app");
      if ((isVercel && parts.length > 3) || (!isVercel && parts.length > 2)) {
        parts[0] = targetSubdomain;
        window.location.href = `${protocol}//${parts.join(".")}${pathname}`;
      } else {
        window.location.href = `${protocol}//${host}${pathname}?tenant=${targetSubdomain}`;
      }
    }
  };

  const sortedList = getSortedHierarchy();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-card border border-border text-primary hover:text-foreground shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:scale-105 active:scale-95 group cursor-pointer"
        title="Quick Switch Tenant Subdomain"
      >
        <ArrowLeftRight className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop Clicker */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className="absolute bottom-16 right-0 w-72 bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 max-h-96 overflow-y-auto">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Cpu className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Domain Switcher ({sortedList.length})
              </span>
            </div>
            
            {loading ? (
              <div className="text-center py-4 text-xs font-semibold text-muted-foreground">
                Loading domains...
              </div>
            ) : sortedList.length === 0 ? (
              <div className="text-center py-4 text-xs font-semibold text-muted-foreground">
                No accessible domains.
              </div>
            ) : (
              <div className="space-y-1.5">
                {sortedList.map(({ item: t, depth }) => {
                  const isActive = t.subdomain === currentSubdomain;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSwitch(t.subdomain)}
                      style={{ paddingLeft: `${Math.max(12, depth * 14)}px` }}
                      className={`w-full flex items-center justify-between py-2 rounded-xl text-left border transition-all text-xs font-black cursor-pointer ${
                        isActive
                          ? "bg-muted/65 border-border/80 text-foreground cursor-default"
                          : "bg-muted/10 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border/80 active:scale-[0.98]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {depth > 0 && (
                          <span className="text-muted-foreground/50 font-mono shrink-0 mr-0.5">
                            └─
                          </span>
                        )}
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/35"}`} />
                        <span className="truncate">{t.name}</span>
                      </div>
                      {isActive ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <span className="text-[9px] text-muted-foreground/60 font-mono font-medium ml-1">
                          .{t.subdomain}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
