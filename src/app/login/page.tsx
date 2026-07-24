import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { getCurrentUser } from "@/features/auth/services/session";
import { isParentTenant, getAncestorChain } from "@/features/auth/services/is-parent-tenant";
import { ArrowLeft } from "lucide-react";

import { headers, cookies } from "next/headers";

export default async function LoginPage({ searchParams }: { searchParams: Promise<any> }) {
  /*
  // DISABLED: Moved cookie clearing logic to middleware (src/proxy.ts) to prevent auto-redirect loop.
  const resolvedParams = await searchParams;
  const isLogout = resolvedParams?.logout === "true";

  if (isLogout) {
    const cookieStore = await cookies();
    cookieStore.delete({ name: "access_token", path: "/" });
    cookieStore.delete({ name: "refresh_token", path: "/" });
    cookieStore.delete({ name: "x-tenant-subdomain", path: "/" });
    redirect("/login");
  }
  */

  const tenant = await getTenantContext();
  const sessionUser = await getCurrentUser();

  // If already logged in, redirect to dashboard (which handles role-based routing)
  if (sessionUser) {
    redirect("/dashboard");
  }

  // If not on the VT domain (wysbryx root or subtenants like Intel), redirect to VT login page
  if (!tenant || tenant.subdomain !== "vt") {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const port = host.split(":")[1] || "";
    const portSuffix = port ? `:${port}` : "";
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    const isVercel = host.endsWith(".vercel.app");

    const vtLoginUrl = isLocal
      ? `http://vt.localhost${portSuffix}/login`
      : isVercel
      ? `/login?tenant=vt`
      : `https://vt.${host}/login`;

    redirect(vtLoginUrl);
  }

  // Allow root-domain login for SuperAdmin
  const tenantName = tenant?.branding?.companyName || tenant?.name || "Wysbryx Platform";
  const primaryColor = tenant?.branding?.primaryColor || "#f97316"; // Wysbryx orange default
  const subdomain = tenant?.subdomain || "wysbryx";

  // Determine hierarchical depth (1 = platform root, 2 = tenant level, 3+ = sub-company/institute)
  const chainLength = tenant ? (await getAncestorChain(tenant.id)).length : 1;

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-background p-6 relative overflow-hidden min-h-screen">
      {/* Background decoration */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none opacity-10"
        style={{ backgroundColor: primaryColor }}
      ></div>

      <div className="relative z-10 w-full flex flex-col items-center gap-6">
        <LoginForm 
          tenantName={tenantName} 
          primaryColor={primaryColor} 
          subdomain={subdomain}
          isParentDomain={isParentTenant(tenant)}
          chainLength={chainLength}
        />
        
        {/* 
        <a 
          href="/" 
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Academy Selection
        </a>
        */}
      </div>
    </div>
  );
}
