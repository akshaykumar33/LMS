import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { getCurrentUser } from "@/features/auth/services/session";
import { isParentTenant, getAncestorChain } from "@/features/auth/services/is-parent-tenant";
import { ArrowLeft } from "lucide-react";

export default async function LoginPage() {
  const tenant = await getTenantContext();
  const sessionUser = await getCurrentUser();

  // If already logged in, redirect to dashboard (which handles role-based routing)
  if (sessionUser) {
    redirect("/dashboard");
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
        
        <a 
          href="/" 
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Academy Selection
        </a>
      </div>
    </div>
  );
}
