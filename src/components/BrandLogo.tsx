import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  subdomain: string;
  className?: string;
  href?: string;
  iconOnly?: boolean;
}

export function BrandLogo({ subdomain, className = "h-8 w-auto", href, iconOnly = false }: BrandLogoProps) {
  const normSubdomain = subdomain.toLowerCase() === "vti" ? "vt" : subdomain.toLowerCase();

  const renderLogo = () => {
    if (normSubdomain === "wysbryx" || normSubdomain === "localhost" || normSubdomain === "") {
      return (
        <div className={`flex items-center gap-1.5 font-sans ${className}`}>
          <svg className="w-6 h-6 shrink-0 animate-pulse" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="28" height="28" rx="7" fill="#f97316" />
            <path d="M7 11L11.5 22L16 14L20.5 22L25 11" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="11" r="1.5" fill="#FFFFFF" />
          </svg>
          {!iconOnly && (
            <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
              Wysbryx
            </span>
          )}
        </div>
      );
    }

    if (normSubdomain === "intel") {
      if (iconOnly) {
        return (
          <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="28" height="28" rx="6" fill="#0068B5" />
            <rect x="7" y="7" width="18" height="18" rx="3" stroke="#FFFFFF" strokeWidth="2" fill="none" />
            <path d="M12 16H20" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 12V20" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="16" r="2" fill="#FFFFFF" />
          </svg>
        );
      }
      return (
        <svg className={className} viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="28" height="28" rx="6" fill="#0068B5" />
          <rect x="7" y="7" width="18" height="18" rx="3" stroke="#FFFFFF" strokeWidth="2" fill="none" />
          <path d="M12 16H20" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 12V20" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="16" r="2" fill="#FFFFFF" />
          <text x="38" y="22" fill="#0068B5" className="dark:fill-sky-400" fontFamily="system-ui, -apple-system, sans-serif" fontSize="15" fontWeight="bold">
            Intel CoE
          </text>
        </svg>
      );
    }

    if (normSubdomain === "amd") {
      if (iconOnly) {
        return (
          <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 16 L16 2 L30 16 L23 23 L16 16 L9 23 Z" fill="#ED1C24" />
          </svg>
        );
      }
      return (
        <svg className={className} viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 16 L16 2 L30 16 L23 23 L16 16 L9 23 Z" fill="#ED1C24" />
          <text x="38" y="22" fill="#ED1C24" className="dark:fill-red-500" fontFamily="system-ui, -apple-system, sans-serif" fontSize="15" fontWeight="bold">
            AMD CoE
          </text>
        </svg>
      );
    }

    if (normSubdomain === "tsmc") {
      return (
        <svg className={className} viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Geometric silicon wafer */}
          <circle cx="16" cy="16" r="13" stroke="#E05423" strokeWidth="2.5" strokeDasharray="3 2" />
          <rect x="11" y="11" width="10" height="10" rx="1" fill="#E05423" />
          {/* Typography */}
          <text x="38" y="22" fill="#E05423" className="dark:fill-orange-500" fontFamily="system-ui, -apple-system, sans-serif" fontSize="15" fontWeight="bold">
            TSMC CoE
          </text>
        </svg>
      );
    }

    if (normSubdomain === "vt") {
      return (
        <div className={`flex items-center gap-1.5 font-sans ${className}`}>
          <span 
            className="w-6 h-6 rounded text-white flex items-center justify-center text-xs font-black"
            style={{ background: "linear-gradient(135deg, #861F41 0%, #E57724 100%)" }}
          >
            VT
          </span>
          {!iconOnly && (
            <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
              Virginia Tech
            </span>
          )}
        </div>
      );
    }

    // Fallback default logo style
    return (
      <div className="flex items-center gap-1.5 font-sans">
        <span className="w-6 h-6 rounded bg-slate-800 text-white flex items-center justify-center text-xs font-black">
          {normSubdomain.substring(0, 1).toUpperCase()}
        </span>
        {!iconOnly && (
          <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
            {subdomain} CoE
          </span>
        )}
      </div>
    );
  };

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity focus:outline-none flex items-center">
        {renderLogo()}
      </Link>
    );
  }

  return renderLogo();
}
