import Link from "next/link";
import { headers, cookies } from "next/headers";
import { getTenantContext } from "@/features/auth/services/tenant";
import { BrandLogo } from "@/components/BrandLogo";
import { getCurrentUser } from "@/features/auth/services/session";
import { CourseRepository } from "@/features/course/repository/course-repository";
import { CourseCatalogExplorer } from "@/features/course/components/CourseCatalogExplorer";
import { db } from "@/db/db";
import { students, tenants } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Sparkles, ArrowRight, Library, GraduationCap, ShieldAlert, Cpu, CheckCircle, Database, LayoutGrid } from "lucide-react";
import { SubdomainHeroSandbox } from "@/features/course/components/SubdomainHeroSandbox";

export default async function Home() {
  const tenant = await getTenantContext();
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const port = host.split(":")[1] || "";
  const portSuffix = port ? `:${port}` : "";
  const sessionUser = await getCurrentUser();
  const cookieStore = await cookies();

  let themeMode = cookieStore.get("theme_mode")?.value;
  if (!themeMode) {
    const themeSet = cookieStore.get("theme_set")?.value;
    themeMode = themeSet ? "dark" : "dark";
  }

  // Scenario 1: Multi-tenant hub for Virginia Tech CoE Platform
  if (!tenant) {
    // Fetch all active academies from database (excluding vt parent itself)
    const activeAcademies = await db.query.tenants.findMany({
      where: and(
        eq(tenants.status, "active"),
        ne(tenants.subdomain, "vt")
      ),
    });

    return (
      <div className="flex flex-col flex-1 bg-background text-foreground min-h-screen relative overflow-hidden font-sans">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-60"></div>
        
        {/* Ambient Radial Glowing Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-red-600/5 rounded-full blur-[160px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[140px] pointer-events-none"></div>

        {/* Global Toolbar Header */}
        <header className="border-b border-border/40 bg-background/50 backdrop-blur-xl relative z-20 sticky top-0">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-orange-500 text-white flex items-center justify-center font-black text-xs shadow-lg">
                VT
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Virginia Tech CoE Hub
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeSwitcher />
              {sessionUser ? (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground hidden sm:inline max-w-[120px] truncate" title={sessionUser.email}>
                    Signed in as <strong className="text-foreground">{sessionUser.email.split("@")[0]}</strong>
                  </span>
                  <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center font-bold text-[10px] shadow-sm select-none" title={sessionUser.email}>
                    {sessionUser.email.substring(0, 2).toUpperCase()}
                  </div>
                  {sessionUser.role === "SuperAdmin" ? (
                    <Link
                      href="/super-admin"
                      className="inline-flex items-center gap-1.5 justify-center rounded-xl text-xs font-black h-9 px-4 bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Super Admin Console
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center justify-center rounded-xl text-xs font-black h-9 px-4 bg-secondary text-foreground hover:bg-secondary/80 transition-all border border-border shadow-sm cursor-pointer"
                    >
                      Go to Workspace
                    </Link>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl text-xs font-black h-9 px-4 bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all cursor-pointer"
                >
                  Admin Console
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Main Hub Section */}
        <div className="relative max-w-6xl w-full mx-auto text-center space-y-16 px-6 py-20 flex-1 flex flex-col justify-center z-10">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-4 py-1.5 text-xs font-black text-red-400 ring-1 ring-inset ring-red-500/20 uppercase tracking-widest">
              <GraduationCap className="w-3.5 h-3.5" /> Academy Network Gate
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground leading-tight max-w-4xl mx-auto">
              Virginia Tech <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-amber-400">Semiconductor CoE</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Select your affiliated semiconductor academy or corporate training division below to access customized EDA laboratories, lecture syllabi, and placements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
            {activeAcademies.map((org: any) => {
              const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
              const isVercel = host.endsWith(".vercel.app");
              const devUrl = isLocal
                ? `http://${org.subdomain}.localhost${portSuffix}`
                : isVercel
                ? `/?tenant=${org.subdomain}`
                : `https://${org.subdomain}.${host}`;
              let pColor = org.branding?.primaryColor || "#0ea5e9";
              let sColor = org.branding?.secondaryColor || "#0ea5e9";
              
              if (pColor === "#000000" || pColor.toLowerCase() === "black") {
                pColor = sColor !== "#000000" && sColor !== "" ? sColor : "#0ea5e9";
              }

              return (
                <a
                  key={org.subdomain}
                  href={devUrl}
                  className="flex flex-col justify-between p-6 rounded-3xl bg-card border border-border/80 text-left transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:border-slate-500 group relative overflow-hidden"
                  style={{ "--tenant-color": pColor } as React.CSSProperties}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
                  
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <BrandLogo subdomain={org.subdomain} className="h-7 w-auto" />
                      <span className="text-[9px] font-black bg-secondary border border-border/60 px-2 py-0.5 rounded text-muted-foreground uppercase">
                        .{org.subdomain}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-foreground mb-1 group-hover:text-primary transition-colors">{org.name}</h2>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 font-semibold">
                        Access physical-layout labs, CAD simulation nodes, and verified job postings from international semiconductor partners.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-border/30 flex justify-between items-center text-xs font-black text-muted-foreground">
                    <span className="text-[10px] text-muted-foreground opacity-80">EDA Labs Included</span>
                    <span 
                      className="flex items-center gap-1 transition-all group-hover:gap-2"
                      style={{ color: pColor }}
                    >
                      Access Portal <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground border-t border-border/40 pt-8 max-w-md mx-auto leading-relaxed font-semibold">
            <p>
              💡 <strong>Administrator Notice:</strong> Academies are isolated under subdomain routing contexts. Select an academy above or log in directly to configure settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Scenario 2: Active Tenant branded page
  const allTenantCourses = await CourseRepository.getAllCourses(tenant.id);

  let enrolledCourseIds: string[] = [];
  if (sessionUser && sessionUser.role === "Student") {
    const studentProfile = await db.query.students.findFirst({
      where: eq(students.userId, sessionUser.userId),
    });
    if (studentProfile) {
      const enrolled = await CourseRepository.getCoursesByBatch(tenant.id, studentProfile.batchId);
      enrolledCourseIds = enrolled.map((c: any) => c.id);
    }
  }

  const primaryColor = tenant.branding?.primaryColor || "#0ea5e9";

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-background text-foreground relative overflow-hidden font-sans">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40"></div>
      
      {/* Ambient background glow */}
      <div 
        className="absolute top-0 right-0 w-[800px] h-[600px] rounded-full blur-[160px] pointer-events-none opacity-[0.08]"
        style={{ backgroundColor: primaryColor }}
      ></div>

      {/* Header */}
      <header className="border-b border-border bg-background/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo subdomain={tenant.subdomain} className="h-7 w-auto" href="/dashboard" />
            <span className="text-border">|</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Silicon Academy CoE
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <div className="h-4 w-px bg-border" />
            {sessionUser ? (
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground font-semibold hidden sm:inline max-w-[120px] truncate" title={sessionUser.email}>
                  Signed in as <strong className="text-foreground">{sessionUser.email.split("@")[0]}</strong>
                </span>
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm select-none border" 
                  style={{ backgroundColor: primaryColor + "15", borderColor: primaryColor + "30", color: primaryColor }}
                  title={sessionUser.email}
                >
                  {sessionUser.email.substring(0, 2).toUpperCase()}
                </div>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-xl text-xs font-black h-9 px-4 text-white hover:opacity-90 transition-all shadow-md shadow-primary/20 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  Enter Workspace
                </Link>
              </div>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-xs font-black text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Sign In
                </Link>
                <Link
                  href="/admission/apply"
                  className="inline-flex items-center justify-center rounded-xl text-xs font-black h-9 px-4 text-white hover:opacity-90 transition-all shadow-md shadow-primary/20 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  Apply Now
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-16 relative z-10 space-y-24">
        
        {/* Hero section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-4">
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary border border-primary/20">
                <Cpu className="w-3.5 h-3.5" /> Microelectronics Center of Excellence
              </span>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-none">
                Powering the Future of <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">Semiconductor Talent</span>
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-xl font-semibold">
                Welcome to the {tenant.branding?.companyName || tenant.name}. Our state-of-the-art curriculum in VLSI physical synthesis, sub-micron device physics, and layout design prepares engineers for production scaling.
              </p>
            </div>
 
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/admission/apply"
                className="inline-flex items-center justify-center rounded-xl text-xs font-black h-12 px-6 text-white hover:opacity-95 transition-all shadow-md shadow-primary/20 cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                Submit Admission Application
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl text-xs font-black h-12 px-6 border border-border bg-card/45 hover:bg-secondary/40 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Access Member Dashboard
              </Link>
            </div>
 
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-border/50 pt-8">
              {[
                { label: "Faculty Experts", val: "12+" },
                { label: "Active Cohorts", val: "4" },
                { label: "Placement Rate", val: "98%" },
                { label: "EDA Lab Stations", val: "50+" },
              ].map((stat, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xl font-black text-foreground">{stat.val}</p>
                  <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
 
          {/* Side Info card */}
          <div className="lg:col-span-5 hidden lg:block">
            <SubdomainHeroSandbox />
          </div>
        </div>

        {/* Public course preview catalog explorer */}
        <div className="border-t border-border/40 pt-12">
          <CourseCatalogExplorer
            courses={allTenantCourses}
            enrolledCourseIds={enrolledCourseIds}
            isLoggedIn={!!sessionUser}
            primaryColor={primaryColor}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8 relative z-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground gap-4 font-semibold">
          <p>&copy; {new Date().getFullYear()} {tenant.branding?.companyName || tenant.name}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/admission/apply" className="hover:text-foreground transition-colors">Apply Portal</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Access Portal</Link>
            <span className="text-muted-foreground">Enterprise CoE Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
