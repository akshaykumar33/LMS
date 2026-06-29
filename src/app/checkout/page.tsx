import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { CheckoutConsole } from "@/features/admission/components/CheckoutConsole";
import { AdmissionRepository } from "@/features/admission/repository/admission-repository";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface CheckoutPageProps {
  searchParams: Promise<{ appId?: string }> | { appId?: string };
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const tenant = await getTenantContext();
  if (!tenant) {
    redirect("/");
  }

  const params = await searchParams;
  const appId = params?.appId;

  if (!appId) {
    redirect("/admission/apply");
  }

  // Fetch application details by tenant context
  const application = await AdmissionRepository.findById(tenant.id, appId);

  if (!application) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">Enrollment Session Expired</h2>
          <p className="text-xs text-muted-foreground leading-normal">
            We could not find the selected enrollment profile. Please return to the admission application and try again.
          </p>
          <a
            href="/admission/apply"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold text-white hover:opacity-90 transition-all"
          >
            Apply Now
          </a>
        </div>
      </div>
    );
  }

  const primaryColor = tenant.branding?.primaryColor || "#0ea5e9";
  const tenantName = tenant.branding?.companyName || tenant.name;

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-background p-6 relative overflow-hidden min-h-screen">
      {/* Background decoration */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none opacity-10"
        style={{ backgroundColor: primaryColor }}
      ></div>

      <div className="relative z-10 w-full flex flex-col items-center gap-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-foreground">{tenantName} Admissions</h1>
          <p className="text-xs text-muted-foreground">Secure Admission Enrollment Portal</p>
        </div>

        <CheckoutConsole 
          application={{
            id: application.id,
            firstName: application.firstName,
            lastName: application.lastName,
            email: application.email,
            batch: {
              name: application.batch.name,
              description: application.batch.description,
            }
          }}
          primaryColor={primaryColor}
        />
        
        <a 
          href="/admission/apply" 
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admission Application
        </a>
      </div>
    </div>
  );
}
