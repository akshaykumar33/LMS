import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { getCurrentUser } from "@/features/auth/services/session";
import { isParentTenant, getAncestorChain } from "@/features/auth/services/is-parent-tenant";

export default async function LoginPage() {
  const tenant = await getTenantContext();
  const sessionUser = await getCurrentUser();

  // If already logged in, redirect to dashboard
  if (sessionUser) {
    redirect("/dashboard");
  }

  const tenantName = tenant?.branding?.companyName || tenant?.name || "Wysbryx Platform";
  const primaryColor = tenant?.branding?.primaryColor || "#f97316"; // Default brand accent
  const subdomain = tenant?.subdomain || "vt";

  // Determine hierarchical depth
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
          isParentDomain={tenant ? isParentTenant(tenant) : true}
          chainLength={chainLength}
        />
      </div>
    </div>
  );
}
