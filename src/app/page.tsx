import Link from "next/link";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { getTenantContext } from "@/features/auth/services/tenant";
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
    const wysbryxId = tenant?.id;
    const topLevelTenants = wysbryxId
      ? await db.query.tenants.findMany({
          where: and(
            eq(tenants.status, "active"),
            eq(tenants.parentTenantId, wysbryxId)
          ),
        })
      : await db.query.tenants.findMany({
          where: and(
            eq(tenants.status, "active"),
            isNull(tenants.parentTenantId)
          ),
        });

    return (
      <div className="flex flex-col flex-1 bg-background text-foreground min-h-screen relative overflow-hidden font-sans">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-60"></div>
        
        {/* Ambient Radial Glowing Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-orange-500/5 rounded-full blur-[160px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-zinc-400/5 rounded-full blur-[140px] pointer-events-none"></div>

        {/* Global Toolbar Header */}
        <header className="border-b border-border/40 bg-background/50 backdrop-blur-xl relative z-20 sticky top-0">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BrandLogo subdomain="wysbryx" />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Wysbryx Platform
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <div className="h-4 w-px bg-border" />
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-4 py-1.5 text-xs font-black text-orange-400 ring-1 ring-inset ring-orange-500/20 uppercase tracking-widest">
              <Database className="w-3.5 h-3.5" /> SaaS Cloud Network
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground leading-tight max-w-4xl mx-auto">
              Wysbryx <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-zinc-400">Enterprise Tenant Hub</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
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
                  className="flex flex-col justify-between p-8 rounded-3xl bg-card/85 backdrop-blur-sm border border-border/80 text-left transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl hover:border-[var(--tenant-color)] group relative overflow-hidden"
                  style={{ "--tenant-color": pColor } as React.CSSProperties}
                >
                  <div 
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-[0.05] group-hover:opacity-[0.15] transition-all duration-500" 
                    style={{ backgroundColor: pColor }}
                  />
                  
                  <div className="space-y-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <span 
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-lg transition-transform group-hover:scale-110 duration-300"
                        style={{ background: `linear-gradient(135deg, ${pColor}, ${pColor}bb)` }}
                      >
                        {org.name.substring(0, 2).toUpperCase()}
                      </span>
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
                      <h2 className="text-lg font-black text-foreground mb-2 group-hover:text-[var(--tenant-color)] transition-colors">{org.name}</h2>
                      <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                        Access the root gateway for {org.name} to configure courses, manage institutional sub-tenants, and view administrative analytics.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-border/30 flex justify-between items-center text-xs font-black text-muted-foreground relative z-10">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500/80">
                      <CheckCircle className="w-3 h-3" /> System Online
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
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-60"></div>
        
        {/* Ambient Radial Glowing Effects */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full blur-[160px] pointer-events-none opacity-[0.07]"
          style={{ backgroundColor: primaryColor }}
        ></div>

        {/* Global Toolbar Header */}
        <header className="border-b border-border/40 bg-background/50 backdrop-blur-xl relative z-20 sticky top-0">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span 
                className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-black text-xs shadow-lg animate-pulse"
                style={{ backgroundColor: primaryColor }}
              >
                {tenant.subdomain.toUpperCase()}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                {orgName} Network
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <div className="h-4 w-px bg-border" />
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
        <div className="relative max-w-6xl w-full mx-auto text-center space-y-16 px-6 py-20 flex-1 flex flex-col justify-center z-10">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest border" style={{ color: primaryColor, borderColor: primaryColor + "30" }}>
              <GraduationCap className="w-3.5 h-3.5" /> Institutional Hub
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground leading-tight max-w-4xl mx-auto">
              {orgName} <br/>
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, #f59e0b)`, WebkitBackgroundClip: "text" }}>Semiconductor CoE</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Select your affiliated semiconductor academy or corporate training division below to access customized EDA laboratories, lecture syllabi, and placements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
            {childAcademies.map((org: any) => {
              const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
              const isVercel = host.endsWith(".vercel.app");
              const devUrl = isLocal
                ? `http://${org.subdomain}.localhost${portSuffix}`
                : isVercel
                ? `/?tenant=${org.subdomain}`
                : `https://${org.subdomain}.${host}`;
              let pColor = org.branding?.primaryColor || primaryColor;
              
              const stats = statsMap[org.id] || { courseCount: 0, studentCount: 0, batchCount: 0 };

              return (
                 <a
                  key={org.subdomain}
                  href={devUrl}
                  className="flex flex-col justify-between p-6 rounded-3xl bg-card/80 backdrop-blur-sm border border-border/80 text-left transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl hover:border-[var(--tenant-color)] group relative overflow-hidden"
                  style={{ "--tenant-color": pColor } as React.CSSProperties}
                >
                  <div 
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-[0.04] group-hover:opacity-[0.12] transition-all duration-500" 
                    style={{ backgroundColor: pColor }}
                  />
                  
                  <div className="space-y-5 relative z-10">
                    <div className="flex items-center justify-between">
                      <BrandLogo subdomain={org.subdomain} className="h-7 w-auto" />
                      <span 
                        className="text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border"
                        style={{ 
                          backgroundColor: pColor + "10", 
                          borderColor: pColor + "25",
                          color: pColor
                        }}
                      >
                        .{org.subdomain}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-foreground mb-1.5 group-hover:text-[var(--tenant-color)] transition-colors">{org.name}</h2>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 font-semibold">
                        {org.branding?.companyName 
                          ? `${org.branding.companyName} — Advanced semiconductor training, EDA labs, and industry placement programs.`
                          : "Access physical-layout labs, CAD simulation nodes, and verified job postings from international semiconductor partners."
                        }
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        className="inline-flex items-center gap-1 text-[9px] font-extrabold border rounded-xl px-3 py-1 transition-all duration-300"
                        style={{ 
                          backgroundColor: pColor + "08", 
                          borderColor: pColor + "20",
                          color: pColor 
                        }}
                      >
                        <BookOpen className="w-3 h-3" />
                        {stats.courseCount} Courses
                      </span>
                      <span 
                        className="inline-flex items-center gap-1 text-[9px] font-extrabold border rounded-xl px-3 py-1 transition-all duration-300"
                        style={{ 
                          backgroundColor: pColor + "08", 
                          borderColor: pColor + "20",
                          color: pColor 
                        }}
                      >
                        <Users className="w-3 h-3" />
                        {stats.studentCount} Students
                      </span>
                      <span 
                        className="inline-flex items-center gap-1 text-[9px] font-extrabold border rounded-xl px-3 py-1 transition-all duration-300"
                        style={{ 
                          backgroundColor: pColor + "08", 
                          borderColor: pColor + "20",
                          color: pColor 
                        }}
                      >
                        <Layers className="w-3 h-3" />
                        {stats.batchCount} Cohorts
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/30 flex justify-between items-center text-xs font-black text-muted-foreground relative z-10">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500/80">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                    <span 
                      className="flex items-center gap-1 transition-all group-hover:gap-2.5"
                      style={{ color: pColor }}
                    >
                      Access Portal <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
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
  const loginUrl = `/login${tenantParam}`;
  const applyUrl = `/admission/apply${tenantParam}`;
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
                <Cpu className="w-3.5 h-3.5" /> Microelectronics Center of Excellence
              </span>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-none">
                Powering the Future of <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">Semiconductor Talent</span>
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-xl font-semibold">
                Welcome to the {tenant.branding?.companyName || tenant.name}. Our state-of-the-art curriculum in VLSI physical synthesis, sub-micron device physics, and layout design prepares engineers for production scaling.
              </p>
            </div>
 
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={applyUrl}
                className="inline-flex items-center justify-center rounded-xl text-xs font-black h-12 px-6 text-white hover:opacity-95 transition-all shadow-md shadow-primary/20 cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                Submit Admission Application
              </Link>
              <Link
                href={loginUrl}
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
            <Link href={applyUrl} className="hover:text-foreground transition-colors">Apply Portal</Link>
            <Link href={loginUrl} className="hover:text-foreground transition-colors">Access Portal</Link>
            <span className="text-muted-foreground">Enterprise CoE Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
