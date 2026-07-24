import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  subdomain: string;
  className?: string;
  href?: string;
  iconOnly?: boolean;
}

export function BrandLogo({ subdomain, className = "h-8 w-auto", href, iconOnly = false }: BrandLogoProps) {
  const normSubdomain = ["vti", "intel", "intel-oregon", "amd", "qualcomm"].includes(subdomain.toLowerCase())
    ? "vt"
    : ["gaming", "ai", "mellanox", "nvidia-graphics"].includes(subdomain.toLowerCase())
    ? "nvidia"
    : subdomain.toLowerCase();

  const renderLogo = () => {
    if (normSubdomain === "wysbryx" || normSubdomain === "localhost" || normSubdomain === "") {
      return (
        <div className={`flex items-center gap-1.5 font-sans ${className}`}>
          <img 
            src="https://www.wysbryx.com/wysbryx_v.png" 
            alt="Wysbryx Logo" 
            className="w-6 h-6 object-contain"
          />
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
          <svg className={`w-7 h-7 ${className}`} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          <svg className={`w-7 h-7 ${className}`} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      if (iconOnly) {
        return (
          <svg className={`w-7 h-7 ${className}`} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="13" stroke="#E05423" strokeWidth="2.5" strokeDasharray="3 2" />
            <rect x="11" y="11" width="10" height="10" rx="1" fill="#E05423" />
          </svg>
        );
      }
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
      if (iconOnly) {
        return (
          <img 
            src="/vt-logo.png" 
            alt="Virginia Tech" 
            className={`h-7 w-auto object-contain shrink-0 ${className}`}
          />
        );
      }
      return (
        <div className={`flex items-center gap-1.5 font-sans ${className}`}>
          <img 
            src="/vt-logo.png" 
            alt="Virginia Tech" 
            className="h-6 w-auto object-contain shrink-0"
          />
        </div>
      );
    }

    if (normSubdomain === "nvidia") {
      if (iconOnly) {
        return (
          <svg className={`w-7 h-7 ${className}`} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="28" height="28" rx="6" fill="#76B900" />
            <path d="M10 22V14L16 10L22 14V22L16 18Z" fill="#FFFFFF" />
          </svg>
        );
      }
      return (
        <svg className={className} viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="28" height="28" rx="6" fill="#76B900" />
          <path d="M10 22V14L16 10L22 14V22L16 18Z" fill="#FFFFFF" />
          <text x="38" y="22" fill="#76B900" className="dark:fill-green-400" fontFamily="system-ui, -apple-system, sans-serif" fontSize="15" fontWeight="bold">
            Nvidia Corp
          </text>
        </svg>
      );
    }

    if (normSubdomain === "mellanox") {
      if (iconOnly) {
        return (
          <svg className={`w-7 h-7 ${className}`} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="28" height="28" rx="6" fill="#00B4D8" />
            <path d="M8 16H14L16 12L18 20L20 16H24" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        );
      }
      return (
        <svg className={className} viewBox="0 0 150 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="28" height="28" rx="6" fill="#00B4D8" />
          <path d="M8 16H14L16 12L18 20L20 16H24" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <text x="38" y="22" fill="#00B4D8" className="dark:fill-cyan-400" fontFamily="system-ui, -apple-system, sans-serif" fontSize="15" fontWeight="bold">
            Mellanox CoE
          </text>
        </svg>
      );
    }

    if (normSubdomain === "qualcomm") {
      if (iconOnly) {
        return (
          <svg className={`w-7 h-7 ${className}`} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="28" height="28" rx="6" fill="#3253DC" />
            <circle cx="16" cy="16" r="8" stroke="#FFFFFF" strokeWidth="2" fill="none" />
            <path d="M20 20L26 26" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      }
      return (
        <svg className={className} viewBox="0 0 160 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="28" height="28" rx="6" fill="#3253DC" />
          <circle cx="16" cy="16" r="8" stroke="#FFFFFF" strokeWidth="2" fill="none" />
          <path d="M20 20L26 26" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <text x="38" y="22" fill="#3253DC" className="dark:fill-indigo-400" fontFamily="system-ui, -apple-system, sans-serif" fontSize="15" fontWeight="bold">
            Qualcomm Institute
          </text>
        </svg>
      );
    }

    // Fallback default logo style
    if (iconOnly) {
      return (
        <span className={`w-7 h-7 rounded bg-slate-800 text-white flex items-center justify-center text-xs font-black shrink-0 ${className}`}>
          {normSubdomain.substring(0, 1).toUpperCase()}
        </span>
      );
    }
    return (
      <div className={`flex items-center gap-1.5 font-sans ${className}`}>
        <span className="w-6 h-6 rounded bg-slate-800 text-white flex items-center justify-center text-xs font-black shrink-0 animate-in fade-in duration-200">
          {normSubdomain.substring(0, 1).toUpperCase()}
        </span>
        <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
          {subdomain} CoE
        </span>
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
