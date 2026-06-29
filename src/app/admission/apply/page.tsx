import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { AdmissionWizardForm } from "@/features/admission/components/AdmissionWizardForm";
import { db } from "@/db/db";
import { batches } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

export default async function AdmissionApplyPage() {
  const tenant = await getTenantContext();

  if (!tenant) {
    redirect("/");
  }

  // Fetch active batches for selection
  const batchesList = await db.query.batches.findMany({
    where: and(
      eq(batches.tenantId, tenant.id),
      sql`${batches.deletedAt} IS NULL`
    ),
  });

  const primaryColor = tenant.branding?.primaryColor || "#0ea5e9";

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-background p-6 relative overflow-hidden min-h-screen">
      {/* Background decoration */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none opacity-10"
        style={{ backgroundColor: primaryColor }}
      ></div>

      <div className="relative z-10 w-full flex flex-col items-center gap-6">
        <AdmissionWizardForm 
          batches={batchesList.map((b: any) => ({ id: b.id, name: b.name, description: b.description }))} 
          tenantName={tenant.name}
          primaryColor={primaryColor}
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
