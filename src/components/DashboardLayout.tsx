"use client";
import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  Home, 
  BookOpen, 
  BarChart3, 
  Briefcase, 
  User, 
  LogOut, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Flame, 
  Users,
  Trophy,
  Shield,
  Layers,
  GraduationCap,
  Calendar,
  Sparkles
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { NotificationBell } from "@/features/notification/components/NotificationBell";
import { logoutAction } from "@/features/auth/actions/auth-actions";
import { CommandPalette } from "./CommandPalette";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  tenant: {
    id: string;
    name: string;
    subdomain: string;
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      companyName?: string;
    } | null;
  };
  studentProfile?: {
    rollNumber: string;
    admissionNumber: string;
    batch?: {
      name: string;
    } | null;
  } | null;
}

export function DashboardLayout({ children, user, tenant, studentProfile }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Gamification states (Students only)
  const [streakCount, setStreakCount] = useState(5);
  const [xp, setXp] = useState(450);
  const [level, setLevel] = useState(3);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (user.role === "Student" && typeof window !== "undefined") {
      const savedStreak = localStorage.getItem("student_streak");
      const savedXp = localStorage.getItem("student_xp");
      const savedLevel = localStorage.getItem("student_level");

      if (savedStreak) setStreakCount(parseInt(savedStreak));
      if (savedXp) setXp(parseInt(savedXp));
      if (savedLevel) setLevel(parseInt(savedLevel));

      const syncGamification = () => {
        const s = localStorage.getItem("student_streak");
        const x = localStorage.getItem("student_xp");
        const l = localStorage.getItem("student_level");
        if (s) setStreakCount(parseInt(s));
        if (x) setXp(parseInt(x));
        if (l) setLevel(parseInt(l));
      };
      window.addEventListener("gamification-update", syncGamification);
      return () => window.removeEventListener("gamification-update", syncGamification);
    }
  }, [user.role]);

  // Global Ctrl+K / Cmd+K to toggle command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    await logoutAction();
    router.push("/login");
  };

  const primaryColor = tenant.branding?.primaryColor || "#0ea5e9";

  // Dynamic Categorized Navigation groups based on user role
  const getNavigationGroups = () => {
    if (user.role === "Student") {
      return [
        {
          title: "Learning Hub",
          items: [
            {name: "Dashboard", href: "/dashboard", icon: Home},
            {name: "Active Courses", href: "/courses", icon: BookOpen},
            {name: "Digital Library", href: "/library", icon: Sparkles},
            {name: "Progress & Analytics", href: "/progress", icon: BarChart3},
          ]
        },
        {
          title: "Career & Placement",
          items: [
            { name: "Career Portal", href: "/career", icon: Briefcase },
          ]
        },
        {
          title: "Settings",
          items: [
            { name: "Student Profile", href: "/profile", icon: User },
          ]
        }
      ];
    }
    
    if (["Faculty", "Mentor"].includes(user.role)) {
      return [
        {
          title: "Cohort Management",
          items: [
            { name: "Overview Dashboard", href: "/faculty", icon: GraduationCap },
            { name: "Student Roster", href: "/faculty?tab=roster", icon: Users },
            { name: "Recent Submissions", href: "/faculty?tab=submissions", icon: BarChart3 },
          ]
        },
        {
          title: "Classroom Tools",
          items: [
            { name: "Live Zoom Scheduler", href: "/faculty?tab=schedule", icon: Calendar },
            { name: "Curriculum Editor", href: "/faculty?tab=curriculum", icon: Layers },
          ]
        }
      ];
    }

    if (["Owner", "Admin", "Program Manager"].includes(user.role)) {
      return [
        {
          title: "Student Admissions",
          items: [
            { name: "Admissions Hub", href: "/admin/admissions", icon: Users },
          ]
        },
        {
          title: "Curriculum & Analytics",
          items: [
            { name: "Curriculum Manager", href: "/admin/courses", icon: BookOpen },
            { name: "Platform Analytics", href: "/admin/analytics", icon: BarChart3 },
          ]
        },
        {
          title: "Recruiting",
          items: [
            { name: "Placement Console", href: "/admin/placement", icon: Briefcase },
          ]
        }
      ];
    }

    if (user.role === "Placement Officer") {
      return [
        {
          title: "Recruiting & Placements",
          items: [
            { name: "Placement Console", href: "/admin/placement", icon: Briefcase },
          ]
        }
      ];
    }

    if (user.role === "SuperAdmin") {
      return [
        {
          title: "System Administration",
          items: [
            { name: "System Tenants", href: "/super-admin", icon: Layers },
          ]
        }
      ];
    }

    if (user.role === "Guest") {
      return [
        {
          title: "Sandbox Overview",
          items: [
            { name: "Student Console", href: "/dashboard", icon: Home },
            { name: "Digital Library", href: "/library", icon: Sparkles },
            { name: "Elective Catalog", href: "/courses", icon: BookOpen },
          ]
        },
        {
          title: "Faculty Control",
          items: [
            { name: "Faculty Dashboard", href: "/faculty", icon: GraduationCap },
            { name: "Student Roster", href: "/faculty?tab=roster", icon: Users },
            { name: "Recent Submissions", href: "/faculty?tab=submissions", icon: BarChart3 },
            { name: "Class Zoom Scheduler", href: "/faculty?tab=schedule", icon: Calendar },
            { name: "Curriculum Editor", href: "/faculty?tab=curriculum", icon: Layers },
          ]
        },
        {
          title: "Administrative Hub",
          items: [
            { name: "Admissions Hub", href: "/admin/admissions", icon: Users },
            { name: "Curriculum Manager", href: "/admin/courses", icon: BookOpen },
            { name: "Platform Analytics", href: "/admin/analytics", icon: BarChart3 },
            { name: "Placement Console", href: "/admin/placement", icon: Briefcase },
          ]
        }
      ];
    }

    return [
      {
        title: "Platform Console",
        items: [
          { name: "Dashboard", href: "/dashboard", icon: Home }
        ]
      }
    ];
  };

  const navigationGroups = getNavigationGroups();
  const navigationItems = navigationGroups.flatMap(group => group.items);

  // Helper to format breadcrumbs
  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return [{ label: "Home", href: "/dashboard" }];
    
    return segments.map((seg, idx) => {
      const href = "/" + segments.slice(0, idx + 1).join("/");
      let label = seg.charAt(0).toUpperCase() + seg.slice(1);
      
      if (seg.length > 20) {
        label = "Details";
      }
      return { label, href };
    });
  };

  const getRoleBadgeColor = () => {
    switch (user.role) {
      case "SuperAdmin":
        return "bg-rose-500/10 text-rose-400 border-rose-500/25";
      case "Owner":
      case "Admin":
      case "Program Manager":
        return "bg-amber-500/10 text-amber-400 border-amber-500/25";
      case "Faculty":
      case "Mentor":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/25";
      case "Placement Officer":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <CommandPalette 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        navigationItems={navigationItems}
      />

      {/* Floating Desktop Sidebar */}
      <aside 
        className={`fixed top-4 bottom-4 left-4 z-40 hidden md:flex flex-col bg-card/65 backdrop-blur-xl border border-border rounded-2xl transition-all duration-300 shadow-2xl ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-5 flex items-center justify-between border-b border-border/50">
          <div className="flex items-center gap-3 overflow-hidden">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2 truncate">
                <BrandLogo subdomain={tenant.subdomain} className="h-6 w-auto" href={user.role === "Student" ? "/dashboard" : pathname} />
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground opacity-75">
                  Platform
                </span>
              </div>
            )}
            {isSidebarCollapsed && (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                {tenant.name.charAt(0)}
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground hidden md:block"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {navigationGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              {!isSidebarCollapsed && (
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 block mb-1">
                  {group.title}
                </span>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/faculty" && pathname.startsWith(item.href));

                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group overflow-hidden ${
                        isActive 
                          ? "text-primary bg-primary/10 border-l-2 border-primary animate-in fade-in" 
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                      style={isActive ? { borderLeftColor: primaryColor, color: primaryColor } : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                      {isSidebarCollapsed && (
                        <div className="absolute left-16 bg-popover text-popover-foreground text-[10px] font-bold px-2 py-1 rounded border border-border opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 shadow-md">
                          {item.name}
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Slot at Bottom */}
        <div className="p-4 border-t border-border/50 bg-secondary/20 rounded-b-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary/70 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </div>
            
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 justify-between">
                  <p className="text-xs font-extrabold text-foreground truncate">
                    {user.firstName}
                  </p>
                  <span className={`text-[8px] font-black border px-1.5 py-0.5 rounded shrink-0 ${getRoleBadgeColor()}`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            )}
          </div>

          {!isSidebarCollapsed && (
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="truncate max-w-[130px] font-medium">
                {user.role === "Student" ? (studentProfile?.batch?.name || "No cohort") : tenant.name}
              </span>
              <form onSubmit={handleLogout}>
                <button 
                  type="submit" 
                  className="flex items-center gap-1 font-bold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {isSidebarCollapsed && (
            <div className="mt-3 flex justify-center">
              <form onSubmit={handleLogout}>
                <button 
                  type="submit" 
                  className="p-1 rounded bg-background hover:bg-destructive/15 text-muted-foreground hover:text-destructive cursor-pointer border border-border"
                  title="Sign Out"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 z-40 md:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-4 h-4" />
          </button>
          <BrandLogo subdomain={tenant.subdomain} className="h-6 w-auto" href={user.role === "Student" ? "/dashboard" : pathname} />
        </div>
        <div className="flex items-center gap-2">
          {user.role === "Student" && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-500 text-xs font-black">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
              <span>{streakCount}d</span>
            </div>
          )}
          <NotificationBell />
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-sm bg-card border-r border-border h-full flex flex-col p-6 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-8">
              <BrandLogo subdomain={tenant.subdomain} className="h-6 w-auto" href={user.role === "Student" ? "/dashboard" : pathname} />
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <nav className="flex-1 space-y-6 overflow-y-auto">
              {navigationGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 block mb-1">
                    {group.title}
                  </span>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/faculty" && pathname.startsWith(item.href));

                      return (
                        <a
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            isActive 
                              ? "text-primary bg-primary/10 border-l-2 border-primary" 
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                          style={isActive ? { borderLeftColor: primaryColor, color: primaryColor } : undefined}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.name}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-border pt-4 mt-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary/70 flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <form onSubmit={handleLogout}>
                <button 
                  type="submit" 
                  className="w-full flex items-center justify-center gap-2 py-2 border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-xl text-xs font-bold cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Contents Frame */}
      <div 
        className={`flex-1 flex flex-col min-w-0 md:pl-4 transition-all duration-300 ${
          isSidebarCollapsed ? "md:ml-24" : "md:ml-68"
        }`}
      >
        {/* Top Header */}
        <header className="h-16 hidden md:flex items-center justify-between px-8 border-b border-border/40 shrink-0 sticky top-0 bg-background/50 backdrop-blur-md z-30">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            {getBreadcrumbs().map((b, idx, arr) => (
              <React.Fragment key={b.href}>
                {idx > 0 && <span className="text-[10px] opacity-40">/</span>}
                <a 
                  href={b.href}
                  className={`hover:text-foreground transition-colors ${
                    idx === arr.length - 1 ? "text-foreground font-extrabold" : ""
                  }`}
                >
                  {b.label}
                </a>
              </React.Fragment>
            ))}
          </div>

          {/* User Controls / Stats Panel */}
          <div className="flex items-center gap-5">
            {/* Search command Palette button */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-3 px-3 py-1.5 rounded-xl border border-border bg-card/45 hover:bg-secondary text-muted-foreground hover:text-foreground text-[11px] font-bold transition-all shadow-sm group"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search...</span>
              <kbd className="bg-popover border border-border text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shadow-sm opacity-60 group-hover:opacity-100 transition-opacity">
                Ctrl K
              </kbd>
            </button>

            {/* Student gamification details */}
            {user.role === "Student" && (
              <>
                <div 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs font-black shadow-inner cursor-pointer hover:scale-105 transition-transform"
                  title="Daily Learning Streak! Complete lessons to keep it alive."
                >
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                  <span>{streakCount} Day Streak</span>
                </div>

                <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-muted-foreground border-l border-border pl-5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>{xp} XP</span>
                  <span className="text-[10px] font-black bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                    Level {level}
                  </span>
                </div>
              </>
            )}

            {/* Non-student dynamic role pill */}
            {user.role !== "Student" && (
              <div className="flex items-center gap-2 pl-4">
                <span className={`text-[10px] font-extrabold uppercase border px-3 py-1 rounded-full flex items-center gap-1.5 ${getRoleBadgeColor()}`}>
                  <Shield className="w-3 h-3" />
                  {user.role} Portal
                </span>
              </div>
            )}

            {/* Theme & Notifications */}
            <div className="flex items-center gap-3 border-l border-border pl-5">
              <ThemeSwitcher />
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Content body wrapper */}
        <main className="flex-1 p-6 md:p-8 pt-20 md:pt-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
