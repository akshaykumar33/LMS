import Link from "next/link";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { getTenantContext } from "@/features/auth/services/tenant";
import { getShortTenantName } from "@/utils/tenant-formatter";
import { BrandLogo } from "@/components/BrandLogo";
import { getCurrentUser } from "@/features/auth/services/session";
import { CourseRepository } from "@/features/course/repository/course-repository";
import { CourseCatalogExplorer } from "@/features/course/components/CourseCatalogExplorer";
import { db } from "@/db/db";
import { students, tenants, courses, batches } from "@/db/schema";
import { eq, and, ne, count, isNull } from "drizzle-orm";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Sparkles, ArrowRight, Library, GraduationCap, ShieldAlert, Cpu, CheckCircle, Database, LayoutGrid, BookOpen, Users, Layers } from "lucide-react";
import { SubdomainHeroSandbox } from "@/features/course/components/SubdomainHeroSandbox";
import { GatewayUserControls } from "@/components/GatewayUserControls";
import { getAncestorChain } from "@/features/auth/services/is-parent-tenant";

import { OrganizationHubExplorer } from "@/components/OrganizationHubExplorer";

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
    themeMode = themeSet ? themeSet : "light";
  }

  // Scenario 1: Multi-tenant SaaS hub for Wysbryx (Root gateway)
  // Auth Guard: Only SuperAdmin can view the global tenant directory
  if (!tenant || tenant.subdomain === "wysbryx") {
    if (!sessionUser || sessionUser.role !== "SuperAdmin") {
      redirect("/login");
    }
    // Fetch Tenant-Level organizations (those whose parent is Wysbryx root)
    const wysbryxTenant = await db.query.tenants.findFirst({
      where: eq(tenants.subdomain, "wysbryx")
    });
    const wysbryxId = tenant?.id || wysbryxTenant?.id;
    const topLevelTenants = wysbryxId
      ? await db.query.tenants.findMany({
          where: and(
            eq(tenants.status, "active"),
            eq(tenants.parentTenantId, wysbryxId)
          ),
        })
      : [];

    return (
      <div className="flex flex-col flex-1 bg-background text-foreground min-h-screen relative overflow-hidden font-sans">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-60"></div>
        
        {/* Ambient Radial Glowing Effects */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-orange-500/10 rounded-full blur-[160px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none"></div>

        {/* Global Toolbar Header */}
        <header className="border-b border-border/30 bg-background/45 backdrop-blur-xl relative z-20 sticky top-0">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrandLogo subdomain="wysbryx" iconOnly className="flex sm:hidden h-8 w-auto" />
              <BrandLogo subdomain="wysbryx" className="hidden sm:flex h-8 w-auto" />
              <span className="hidden sm:inline-flex text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded border border-border/40 whitespace-nowrap">
                Wysbryx Platform
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <div className="h-4 w-px bg-border/40" />
              <GatewayUserControls
                email={sessionUser!.email}
                role={sessionUser!.role}
                primaryColor="#f97316"
              />
            </div>
          </div>
        </header>

        {/* Main SaaS Hub Section */}
        <div className="relative max-w-6xl w-full mx-auto text-center space-y-16 px-6 py-20 flex-1 flex flex-col justify-center z-10">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-4 py-1.5 text-xs font-black text-orange-400 ring-1 ring-inset ring-orange-500/20 uppercase tracking-widest border border-orange-500/10">
              <Database className="w-3.5 h-3.5 text-orange-500 animate-pulse" /> SaaS Cloud Network
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground leading-tight max-w-4xl mx-auto">
              Wysbryx <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 text-glow">Enterprise Tenant Hub</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed font-semibold">
              Welcome to the Wysbryx multi-tenant training suite. Select a primary parent organization below to explore their sub-companies, dedicated learning divisions, and workspaces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
            {topLevelTenants.map((org: any) => {
              const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
              const isVercel = host.endsWith(".vercel.app");
              const devUrl = isLocal
                ? `http://${org.subdomain}.localhost${portSuffix}`
                : isVercel
                ? `/?tenant=${org.subdomain}`
                : `https://${org.subdomain}.${host}`;
              let pColor = org.branding?.primaryColor || "#3b82f6";
              
              return (
                 <a
                  key={org.subdomain}
                  href={devUrl}
                  className="flex flex-col justify-between p-8 rounded-3xl bg-card/45 backdrop-blur-md border border-border/40 text-left transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:border-[var(--tenant-color)] group relative overflow-hidden"
                  style={{ 
                    "--tenant-color": pColor,
                    borderColor: `${pColor}20`,
                    boxShadow: `0 0 40px rgba(0, 0, 0, 0.15), 0 0 1px ${pColor}15`
                  } as React.CSSProperties}
                >
                  <div 
                    className="absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-[0.06] group-hover:opacity-[0.18] transition-all duration-500" 
                    style={{ backgroundColor: pColor }}
                  />
                  
                  <div className="space-y-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center justify-center">
                        <BrandLogo subdomain={org.subdomain} iconOnly className="h-7 w-auto" />
                      </div>
                      <span 
                        className="text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border"
                        style={{ 
                          backgroundColor: pColor + "10", 
                          borderColor: pColor + "25",
                          color: pColor
                        }}
                      >
                        {org.subdomain}.localhost
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-foreground mb-2 group-hover:text-[var(--tenant-color)] transition-colors">{getShortTenantName(org.name, org.subdomain)}</h2>
                      <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                        Access the root gateway for {org.name} to configure courses, manage institutional sub-tenants, and view administrative analytics.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-border/20 flex justify-between items-center text-xs font-black text-muted-foreground relative z-10">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500/80">
                      <CheckCircle className="w-3 h-3 animate-pulse" /> System Online
                    </span>
                    <span 
                      className="flex items-center gap-1 transition-all group-hover:gap-2.5"
                      style={{ color: pColor }}
                    >
                      Enter Organization <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Retrieve the ancestor chain to determine the tenant level
  const chain = tenant ? await getAncestorChain(tenant.id) : [];

  // Scenario 2: Organization Hub for a Tenant-Level org (e.g. VT, Nvidia)
  // These have a chain length of 2 and may have child sub-tenants
  const childAcademies = await db.query.tenants.findMany({
    where: and(
      eq(tenants.status, "active"),
      eq(tenants.parentTenantId, tenant.id)
    ),
  });

  if (chain.length === 2 && childAcademies.length > 0) {
    // Auth Guard: Only SuperAdmin/Owner of this tenant can view the sub-tenant directory
    if (!sessionUser || !["SuperAdmin", "Owner"].includes(sessionUser.role)) {
      redirect(`/login?tenant=${tenant.subdomain}`);
    }

    // Fetch per-tenant stats for info badges
    const tenantIds = childAcademies.map((a: any) => a.id);
    const statsMap: Record<string, { courseCount: number; studentCount: number; batchCount: number }> = {};

    for (const tid of tenantIds) {
      const [courseResult] = await db.select({ value: count() }).from(courses).where(eq(courses.tenantId, tid));
      const [studentResult] = await db.select({ value: count() }).from(students).where(eq(students.tenantId, tid));
      const [batchResult] = await db.select({ value: count() }).from(batches).where(eq(batches.tenantId, tid));
      statsMap[tid] = {
        courseCount: courseResult?.value ?? 0,
        studentCount: studentResult?.value ?? 0,
        batchCount: batchResult?.value ?? 0,
      };
    }

    const orgName = tenant.name;
    const primaryColor = tenant.branding?.primaryColor || "#3b82f6";

    return (
      <div className="flex flex-col flex-1 bg-background text-foreground min-h-screen relative overflow-hidden font-sans">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-60"></div>
        
        {/* Ambient Radial Glowing Effects */}
        <div 
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full blur-[160px] pointer-events-none opacity-[0.09]"
          style={{ backgroundColor: primaryColor }}
        ></div>

        {/* Global Toolbar Header */}
        <header className="border-b border-border/30 bg-background/45 backdrop-blur-xl relative z-20 sticky top-0">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrandLogo subdomain={tenant.subdomain} iconOnly className="flex sm:hidden h-6 w-auto" />
              <BrandLogo subdomain={tenant.subdomain} className="hidden sm:flex h-6 w-auto" />
              <span className="hidden sm:inline text-border/40">|</span>
              <span className="hidden sm:inline-flex text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded border border-border/40 whitespace-nowrap">
                Network Portal
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <div className="h-4 w-px bg-border/40" />
              <GatewayUserControls
                email={sessionUser!.email}
                role={sessionUser!.role}
                showGatewayLink={true}
                primaryColor={primaryColor}
              />
            </div>
          </div>
        </header>

        {/* Main Hub Section */}
        <div className="relative max-w-6xl w-full mx-auto text-center space-y-12 px-6 py-16 flex-1 flex flex-col justify-center z-10 animate-fade-in">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest border" style={{ color: primaryColor, borderColor: primaryColor + "30" }}>
              <GraduationCap className="w-3.5 h-3.5" /> Institutional Hub
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground leading-tight max-w-4xl mx-auto">
              {orgName} <br/>
              <span className="text-transparent bg-clip-text text-glow" style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, #f59e0b)`, WebkitBackgroundClip: "text" }}>Semiconductor CoE</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed font-semibold">
              Select your affiliated semiconductor academy or corporate training division below to access customized EDA laboratories, lecture syllabi, and placements.
            </p>
          </div>

          <OrganizationHubExplorer
            childAcademies={childAcademies}
            statsMap={statsMap}
            primaryColor={primaryColor}
            host={host}
            portSuffix={portSuffix}
            parentSubdomain={tenant.subdomain}
          />
        </div>
      </div>
    );
  }

  // Scenario 3: Sub-Tenant or leaf-tenant branded page (e.g. Intel, AMD, TSMC)
  const allTenantCourses = await CourseRepository.getAllCourses(tenant.id);

  let enrolledCourseIds: string[] = [];
  if (sessionUser) {
    if (sessionUser.role === "Student") {
      const studentProfile = await db.query.students.findFirst({
        where: eq(students.userId, sessionUser.userId),
      });
      if (studentProfile) {
        const enrolled = await CourseRepository.getCoursesByBatch(tenant.id, studentProfile.batchId);
        enrolledCourseIds = enrolled.map((c: any) => c.id);
      }
    } else if (["SuperAdmin", "Owner", "Admin", "Program Manager"].includes(sessionUser.role)) {
      enrolledCourseIds = allTenantCourses.map((c: any) => c.id);
    }
  }

  const tenantParam = tenant.subdomain && tenant.subdomain !== "wysbryx" ? `?tenant=${tenant.subdomain}` : "";
  const loginUrl = sessionUser ? "/dashboard" : `/login${tenantParam}`;
  const applyUrl = `/admission/apply${tenantParam}`;
  const primaryColor = tenant.branding?.primaryColor || "#0ea5e9";

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-background text-foreground relative overflow-hidden font-sans">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40"></div>
      
      {/* Ambient background glow */}
      <div 
        className="absolute top-[-10%] right-[-10%] w-[900px] h-[600px] rounded-full blur-[180px] pointer-events-none opacity-[0.1]"
        style={{ backgroundColor: primaryColor }}
      ></div>

      {/* Header */}
      <header className="border-b border-border/40 bg-background/45 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo subdomain={tenant.subdomain} iconOnly className="flex sm:hidden h-7 w-auto" href="/dashboard" />
            <BrandLogo subdomain={tenant.subdomain} className="hidden sm:flex h-7 w-auto" href="/dashboard" />
            <span className="hidden sm:inline text-border/40">|</span>
            <span className="hidden sm:inline-flex text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded border border-border/40 whitespace-nowrap">
              Silicon Academy CoE
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <div className="h-4 w-px bg-border/40" />
            {sessionUser ? (
              <div className="flex items-center gap-3">
                <GatewayUserControls
                  email={sessionUser.email}
                  role={sessionUser.role}
                  primaryColor={primaryColor}
                />
              </div>
            ) : (
              <>
                <Link 
                  href={loginUrl} 
                  className="text-xs font-black text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Sign In
                </Link>
                <Link
                  href={applyUrl}
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
                <Cpu className="w-3.5 h-3.5 text-primary animate-pulse" /> Microelectronics Center of Excellence
              </span>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-none">
                Powering the Future of <br/>
                <span className="text-transparent bg-clip-text text-glow" style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${primaryColor}dd)`, WebkitBackgroundClip: "text" }}>Semiconductor Talent</span>
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-xl font-semibold">
                Welcome to the {tenant.branding?.companyName || tenant.name}. Our state-of-the-art curriculum in VLSI physical synthesis, sub-micron device physics, and layout design prepares engineers for production scaling.
              </p>
            </div>
 
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={applyUrl}
                className="inline-flex items-center justify-center rounded-xl text-xs font-black h-12 px-6 text-white hover:opacity-95 transition-all shadow-lg hover:shadow-xl cursor-pointer"
                style={{ 
                  backgroundColor: primaryColor,
                  boxShadow: `0 8px 30px ${primaryColor}25`
                }}
              >
                Submit Admission Application
              </Link>
              <Link
                href={loginUrl}
                className="inline-flex items-center justify-center rounded-xl text-xs font-black h-12 px-6 border border-border/60 bg-card/30 backdrop-blur-sm hover:bg-secondary/40 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Access Member Dashboard
              </Link>
            </div>
 
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-border/30 pt-8">
              {[
                { label: "Faculty Experts", val: "12+" },
                { label: "Active Cohorts", val: "4" },
                { label: "Placement Rate", val: "98%" },
                { label: "EDA Lab Stations", val: "50+" },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-2xl bg-card/20 border border-border/30 backdrop-blur-sm space-y-1">
                  <p className="text-xl font-black text-foreground" style={{ color: primaryColor }}>{stat.val}</p>
                  <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
 
          {/* Side Info card */}
          <div className="lg:col-span-5 hidden lg:block">
            <div className="p-1 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-transparent">
              <SubdomainHeroSandbox />
            </div>
          </div>
        </div>

        {/* Public course preview catalog explorer */}
        <div className="border-t border-border/30 pt-12">
          <CourseCatalogExplorer
            courses={allTenantCourses}
            enrolledCourseIds={enrolledCourseIds}
            isLoggedIn={!!sessionUser}
            primaryColor={primaryColor}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/50 backdrop-blur-md py-8 relative z-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground gap-4 font-semibold">
          <p>&copy; {new Date().getFullYear()} {tenant.branding?.companyName || tenant.name}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href={applyUrl} className="hover:text-foreground transition-colors">Apply Portal</Link>
            <Link href={loginUrl} className="hover:text-foreground transition-colors">Access Portal</Link>
            <span className="text-muted-foreground">Enterprise CoE Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

