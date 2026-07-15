"use client";

/**
 * PaymentSandboxBanner
 *
 * Renders a sticky top banner when the app is running in payment sandbox/test
 * mode. Reads NEXT_PUBLIC_PAYMENT_SANDBOX_MODE — set to "true" in .env to
 * show the banner. Switching to production simply removes or sets it to "false".
 */

import React, { useState } from "react";
import { TestTube2, X, ChevronRight } from "lucide-react";

interface PaymentSandboxBannerProps {
  /** Override the env var check — useful for storybook / tests */
  forceShow?: boolean;
  className?: string;
}

export function PaymentSandboxBanner({ forceShow, className = "" }: PaymentSandboxBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const shouldShow =
    forceShow ?? process.env.NEXT_PUBLIC_PAYMENT_SANDBOX_MODE === "true";

  if (!shouldShow || dismissed) return null;

  return (
    <div
      role="banner"
      aria-label="Payment sandbox mode active"
      className={`relative w-full flex items-center justify-between gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest border-b border-amber-500/20 bg-amber-500/8 backdrop-blur-sm z-40 ${className}`}
    >
      {/* Left: icon + message */}
      <div className="flex items-center gap-2 text-amber-400">
        <TestTube2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
        <span>
          Payment Sandbox Active — No real transactions will be processed.&nbsp;
          <a
            href="https://docs.stripe.com/testing"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-amber-300 transition-colors inline-flex items-center gap-0.5"
          >
            Stripe test docs <ChevronRight className="w-2.5 h-2.5" aria-hidden />
          </a>
          &nbsp;·&nbsp;
          <a
            href="https://razorpay.com/docs/payments/payments/test-card-upi-details/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-amber-300 transition-colors inline-flex items-center gap-0.5"
          >
            Razorpay test docs <ChevronRight className="w-2.5 h-2.5" aria-hidden />
          </a>
        </span>
      </div>

      {/* Right: dismiss */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss sandbox banner"
        className="shrink-0 text-amber-400/60 hover:text-amber-400 transition-colors p-1 rounded cursor-pointer"
      >
        <X className="w-3.5 h-3.5" aria-hidden />
      </button>
    </div>
  );
}
