import { notFound } from "next/navigation";
import { CertificateRepository } from "@/features/course/repository/certificate-repository";
import { BrandLogo } from "@/components/BrandLogo";

interface PageProps {
  params: Promise<{
    certificateId: string;
  }>;
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { certificateId } = await params;

  const cert = await CertificateRepository.getCertificateDetails(certificateId);

  if (!cert) {
    notFound();
  }

  const studentName = `${cert.student.user.firstName} ${cert.student.user.lastName}`;
  const issueDate = new Date(cert.issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const primaryColor = cert.tenant.branding?.primaryColor || "#0068B5";

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col items-center justify-center p-4 md:p-8 print:bg-white print:text-black">
      {/* Interactive Toolbar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6 bg-card border border-border p-4 rounded-xl shadow-lg print:hidden">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs font-bold text-emerald-400">Official Medha Verification Portal</span>
        </div>
        <a
          href="javascript:window.print()"
          className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          Print / Save PDF
        </a>
      </div>

      {/* Printable Certificate Frame */}
      <div className="w-full max-w-4xl bg-card border-4 border-double border-border rounded-3xl p-8 md:p-16 relative overflow-hidden shadow-2xl flex flex-col items-center text-center space-y-8 print:border-black print:bg-white print:shadow-none print:text-black">
        {/* Certificate Watermark background */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none opacity-5 print:hidden"
          style={{ backgroundColor: primaryColor }}
        />

        {/* Head Branding */}
        <div className="space-y-3 z-10">
          <BrandLogo subdomain={cert.tenant.subdomain} className="h-12 mx-auto w-auto" />
          <h2 className="text-xs font-extrabold tracking-widest text-slate-500 uppercase">
            Center of Excellence in Semiconductor Technology
          </h2>
        </div>

        {/* Title */}
        <div className="space-y-2 z-10">
          <h1 className="text-3xl md:text-5xl font-serif font-black tracking-tight text-white print:text-black">
            Certificate of Completion
          </h1>
          <p className="text-xs italic text-slate-400 print:text-slate-600">
            This credential is officially issued and verified by {cert.tenant.name}
          </p>
        </div>

        {/* Body Text */}
        <div className="space-y-6 max-w-2xl z-10">
          <p className="text-xs uppercase tracking-wider text-slate-500">This is proudly presented to</p>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-sky-400 print:text-black underline decoration-double decoration-slate-800 underline-offset-8">
            {studentName}
          </h2>
          <p className="text-xs leading-relaxed text-slate-350 print:text-slate-700 max-w-xl mx-auto">
            for successfully satisfying all competency standards, laboratory workspace scenarios, and academic assessments for the graduate-level specialization course:
          </p>
          <h3 className="text-lg md:text-2xl font-black text-white print:text-black">
            {cert.course?.name || "Unknown Course"} ({cert.course?.code || "N/A"})
          </h3>
          <p className="text-xs text-slate-400">
            with an overall competency grade of <strong className="text-white print:text-black">{cert.metadata?.grade || "Passed"}</strong> (Average score of {cert.metadata?.avgScore || 70}%)
          </p>
        </div>

        {/* Footer Seal & Signature */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-border/80 z-10 print:border-black">
          {/* Issue Date */}
          <div className="flex flex-col justify-end space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Date Issued</span>
            <span className="text-xs font-semibold text-slate-300 print:text-black">{issueDate}</span>
          </div>

          {/* Verification Badge */}
          <div className="flex justify-center items-center">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center justify-center relative print:border-black print:bg-transparent">
              <span className="text-2xl">🛡️</span>
              <span className="text-[8px] font-extrabold uppercase text-emerald-400 tracking-wider mt-1 print:text-black">
                Verified
              </span>
            </div>
          </div>

          {/* Signature/Authority */}
          <div className="flex flex-col justify-end space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Authorized Signature</span>
            <span className="font-serif italic text-slate-300 print:text-black text-sm">Medha Board of Directors</span>
          </div>
        </div>

        {/* Cryptographic Seal info */}
        <div className="pt-6 text-[9px] text-slate-500 font-mono space-y-1 z-10 print:text-slate-600">
          <div>Certificate ID: {cert.id}</div>
          <div className="hidden md:block">Signature: {cert.metadata?.digitalSignature || "SHA256:N/A"}</div>
        </div>
      </div>
      
      {/* CSS overrides for print media */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-black {
            border-color: black !important;
          }
          .print\\:text-black {
            color: black !important;
          }
        }
      `}} />
    </div>
  );
}
