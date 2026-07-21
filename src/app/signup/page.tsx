import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { SignupForm } from "@/features/auth/components/SignupForm";
import { db } from "@/db/db";
import { batches, admissionApplications } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

interface SignupPageProps {
  searchParams: Promise<{ appId?: string }> | { appId?: string };
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  redirect("/login?error=self_signup_disabled");
  /*
  const tenant = await getTenantContext();

  if (!tenant) {
    redirect("/");
  }

  const resolvedParams = await searchParams;
  const appId = resolvedParams?.appId;

  // Enforce flow: If no appId is provided, redirect to admission form
  if (!appId) {
    redirect("/admission/apply");
  }

  // Fetch the application details by ID and tenant context
  const application = await db.query.admissionApplications.findFirst({
    where: and(
      eq(admissionApplications.id, appId),
      eq(admissionApplications.tenantId, tenant.id)
    ),
  });

  // Enforce flow: If application not found, redirect to admission form
  if (!application) {
    redirect("/admission/apply");
  }

  // Enforce flow: If already approved/enrolled, redirect to login page
  if (application.status === "approved") {
    redirect(`/login?email=${encodeURIComponent(application.email)}&already_enrolled=true`);
  }

  // Enforce flow: If payment is not completed, redirect to the checkout sandbox page
  if (application.status !== "paid") {
    redirect(`/checkout?appId=${appId}`);
  }

  // Fetch active batches for selection
  const batchesList = await db.query.batches.findMany({
    where: and(
      eq(batches.tenantId, tenant.id),
      sql`${batches.deletedAt} IS NULL`
    ),
  });

  const tenantName = tenant.branding?.companyName || tenant.name;
  const primaryColor = tenant.branding?.primaryColor || "#0ea5e9";

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-background p-6 relative overflow-hidden min-h-screen">
      {/* Background decoration }
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none opacity-10"
        style={{ backgroundColor: primaryColor }}
      ></div>

      <div className="relative z-10 w-full flex flex-col items-center gap-6">
        <SignupForm 
          batches={batchesList.map((b: any) => ({ id: b.id, name: b.name, description: b.description }))} 
          tenantName={tenantName}
          primaryColor={primaryColor}
        />
        
        <a 
          href="/admission/apply" 
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Start New Admission Application
        </a>
      </div>
    </div>
  );
  */
}
