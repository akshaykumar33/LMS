"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  completePaymentAndEnrollAction,
  createStripePaymentIntentAction,
  createRazorpayOrderAction,
  verifyAndCompleteRazorpayPaymentAction,
} from "../actions/admission-actions";
import confetti from "canvas-confetti";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Wallet,
  Barcode,
  Lock,
  Zap,
  RefreshCw,
  ChevronRight,
  BadgeCheck,
  TestTube2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApplicationDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  batch: { name: string; description: string | null };
}

interface CheckoutConsoleProps {
  application: ApplicationDetails;
  primaryColor?: string;
}

type Gateway = "stripe" | "razorpay";

// ─── Sandbox badge ─────────────────────────────────────────────────────────────

function SandboxBadge({ gateway }: { gateway: Gateway }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/30 bg-amber-500/10 text-amber-400">
      <TestTube2 className="w-2.5 h-2.5" /> {gateway === "stripe" ? "Stripe Test Mode" : "Razorpay Test Mode"}
    </span>
  );
}

// ─── Test card hint ────────────────────────────────────────────────────────────

function StripeTestHint() {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[10px] leading-relaxed">
      <TestTube2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
      <div className="space-y-0.5 text-muted-foreground">
        <p className="font-black text-amber-400 uppercase tracking-wider text-[9px]">Stripe Test Credentials</p>
        <p>Card: <span className="font-mono text-foreground font-bold">4242 4242 4242 4242</span></p>
        <p>Expiry: <span className="font-mono text-foreground font-bold">any future date</span> &nbsp;·&nbsp; CVC: <span className="font-mono text-foreground font-bold">any 3 digits</span></p>
        <p className="text-[9px] mt-1">Use <span className="font-mono text-rose-400">4000 0000 0000 9995</span> to simulate a declined card.</p>
      </div>
    </div>
  );
}

function RazorpayTestHint() {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[10px] leading-relaxed">
      <TestTube2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
      <div className="space-y-0.5 text-muted-foreground">
        <p className="font-black text-amber-400 uppercase tracking-wider text-[9px]">Razorpay Test Credentials</p>
        <p>Card: <span className="font-mono text-foreground font-bold">4111 1111 1111 1111</span></p>
        <p>Expiry: <span className="font-mono text-foreground font-bold">any future date</span> &nbsp;·&nbsp; CVV: <span className="font-mono text-foreground font-bold">any 3 digits</span></p>
        <p className="text-[9px] mt-1">UPI: use <span className="font-mono text-emerald-400">success@razorpay</span> to simulate success.</p>
      </div>
    </div>
  );
}

// ─── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  application,
  brandColor,
  gateway,
}: {
  application: ApplicationDetails;
  brandColor: string;
  gateway: Gateway;
}) {
  const router = useRouter();
  return (
    <div className="w-full max-w-xl bg-card/60 border border-border/80 backdrop-blur-md shadow-2xl rounded-3xl p-8 space-y-8 text-center relative overflow-hidden checkout-success-glow">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full bg-sky-500/10 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 space-y-7">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-foreground">Payment Confirmed!</h2>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Your enrollment processing fee was received successfully via{" "}
            <span className="font-bold capitalize text-foreground">{gateway}</span>.
          </p>
        </div>

        {/* Receipt card */}
        <div className="bg-background/60 border border-border/60 p-5 rounded-2xl text-left max-w-md mx-auto space-y-3.5">
          {[
            { label: "Enrolled Student", value: `${application.firstName} ${application.lastName}` },
            { label: "Cohort Batch", value: application.batch.name, highlight: "text-emerald-400" },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="flex items-center justify-between border-b border-border/60 pb-2.5 last:border-0 last:pb-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
              <span className={`text-xs font-bold font-mono ${highlight || "text-foreground"}`}>{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Enrollment Status</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              Active / Paid
            </span>
          </div>
        </div>

        <div className="p-3 bg-secondary/30 border border-border rounded-xl text-[10px] text-muted-foreground max-w-md mx-auto leading-relaxed">
          🚀 Your tuition fee payment has been recorded. Please proceed to set up your account password.
        </div>

        <button
          onClick={() => router.push(`/signup?appId=${application.id}`)}
          className="w-full max-w-md h-12 rounded-xl text-xs font-bold text-white hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
          style={{ backgroundColor: brandColor }}
        >
          Proceed to Account Signup <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Loading overlay ───────────────────────────────────────────────────────────

function PaymentLoadingOverlay({ step }: { step: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Processing payment"
      className="fixed inset-0 bg-background/85 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-sm bg-card border border-border/60 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center space-y-6 checkout-success-glow">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-foreground">Verifying Transaction</h3>
          <p className="text-[11px] text-muted-foreground min-h-[32px] transition-all">{step}</p>
        </div>
        <div className="w-full bg-secondary/40 h-1.5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full animate-payment-progress" />
        </div>
      </div>
    </div>
  );
}

// ─── Error alert ───────────────────────────────────────────────────────────────

function ErrorAlert({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 p-3.5 rounded-xl border border-destructive/25 bg-destructive/8 text-xs text-destructive animate-in slide-in-from-top-1 duration-200"
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
      <span className="flex-1">{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="text-destructive/60 hover:text-destructive transition-colors shrink-0"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Gateway selector tabs ─────────────────────────────────────────────────────

const GATEWAY_META: Record<Gateway, { label: string; icon: React.FC<any>; description: string }> = {
  stripe: {
    label: "Card / Stripe",
    icon: CreditCard,
    description: "Visa, Mastercard, Amex",
  },
  razorpay: {
    label: "UPI / Razorpay",
    icon: QrCode,
    description: "UPI, Net Banking, Cards",
  },
};

function GatewayTabs({
  active,
  onChange,
  brandColor,
}: {
  active: Gateway;
  onChange: (g: Gateway) => void;
  brandColor: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Payment method">
      {(Object.keys(GATEWAY_META) as Gateway[]).map((g) => {
        const { label, icon: Icon, description } = GATEWAY_META[g];
        const isActive = active === g;
        return (
          <button
            key={g}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${g}`}
            id={`tab-${g}`}
            type="button"
            onClick={() => onChange(g)}
            className={`relative h-16 rounded-2xl border flex flex-col items-center justify-center gap-1 font-bold transition-all cursor-pointer text-[10px] sm:text-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive
                ? "bg-card/80 border-primary/50 text-foreground shadow-md shadow-primary/10"
                : "bg-card/20 border-border/40 hover:bg-card/50 text-muted-foreground hover:text-foreground"
            }`}
            style={isActive ? { boxShadow: `0 0 0 1px ${brandColor}30, 0 4px 16px ${brandColor}12` } : undefined}
          >
            <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
              style={isActive ? { color: brandColor } : undefined}
            />
            <span className="font-black">{label}</span>
            <span className="text-[8px] text-muted-foreground font-medium hidden sm:block">{description}</span>
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ backgroundColor: brandColor }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Stripe payment form ───────────────────────────────────────────────────────

interface StripeFormProps {
  brandColor: string;
  clientSecret: string;
  application: ApplicationDetails;
  onSuccess: () => void;
  onError: (err: string) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  setLoadingStep: (s: string) => void;
}

function StripePaymentForm({
  brandColor,
  clientSecret,
  application,
  onSuccess,
  onError,
  loading,
  setLoading,
  setLoadingStep,
}: StripeFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setLoadingStep("Connecting to Stripe secure gateway…");
    await new Promise((r) => setTimeout(r, 500));
    setLoadingStep("Authorising card transaction…");

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not initialised.");

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: `${application.firstName} ${application.lastName}`,
            email: application.email,
          },
        },
      });

      if (result.error) {
        onError(result.error.message || "Card verification failed.");
        setLoading(false);
        return;
      }

      if (result.paymentIntent?.status === "succeeded") {
        setLoadingStep("Enrolling student account…");
        await new Promise((r) => setTimeout(r, 700));

        const res = await completePaymentAndEnrollAction(
          application.id,
          "stripe",
          result.paymentIntent.id
        );
        if (res.success) {
          onSuccess();
        } else {
          onError(res.error || "Enrolment failed. Please contact support.");
        }
        setLoading(false);
      }
    } catch (err: any) {
      onError(err.message || "An unexpected card error occurred.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} id="panel-stripe" role="tabpanel" aria-labelledby="tab-stripe" className="space-y-5">
      <StripeTestHint />
      <div className="space-y-2">
        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
          Card details
        </Label>
        <div className="p-4 rounded-xl border border-border/60 bg-background/40 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
          <CardElement
            options={{
              style: {
                base: {
                  color: "var(--foreground)",
                  fontSize: "13px",
                  fontFamily: "ui-monospace, monospace",
                  "::placeholder": { color: "var(--muted-foreground)" },
                },
                invalid: { color: "var(--destructive)" },
              },
            }}
          />
        </div>
        <p className="text-[9px] text-muted-foreground flex items-center gap-1">
          <Lock className="w-2.5 h-2.5" aria-hidden /> Encrypted end-to-end via Stripe Elements
        </p>
      </div>

      <Button
        type="submit"
        disabled={loading || !stripe}
        className="w-full h-12 text-xs font-black text-white rounded-xl shadow-lg hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
        style={{ backgroundColor: brandColor }}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing…</>
        ) : (
          <><ShieldCheck className="w-4 h-4 mr-2" /> Pay $1,500.00 via Stripe</>
        )}
      </Button>
    </form>
  );
}

// ─── Razorpay panel ────────────────────────────────────────────────────────────

interface RazorpayPanelProps {
  application: ApplicationDetails;
  brandColor: string;
  onSuccess: () => void;
  onError: (err: string) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  setLoadingStep: (s: string) => void;
}

function RazorpayPanel({
  application,
  brandColor,
  onSuccess,
  onError,
  loading,
  setLoading,
  setLoadingStep,
}: RazorpayPanelProps) {
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderReady, setOrderReady] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [keyId, setKeyId] = useState<string | null>(null);
  const [isSandbox, setIsSandbox] = useState(true);
  const [timeLeft, setTimeLeft] = useState(600);

  // Countdown timer while order is ready
  useEffect(() => {
    if (!orderReady || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [orderReady, timeLeft]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const initOrder = async () => {
    setOrderLoading(true);
    onError("");
    try {
      const res = await createRazorpayOrderAction(application.id);
      if (!res.success || !res.orderId || !res.keyId) {
        onError(res.error || "Could not create Razorpay order.");
        return;
      }
      setOrderId(res.orderId);
      setKeyId(res.keyId);
      setIsSandbox(res.isSandbox ?? true);
      setOrderReady(true);
      setTimeLeft(600);
    } catch (e: any) {
      onError(e.message || "Razorpay order creation failed.");
    } finally {
      setOrderLoading(false);
    }
  };

  const openRazorpayCheckout = () => {
    if (!orderId || !keyId) return;

    setLoading(true);
    setLoadingStep("Opening Razorpay secure checkout…");

    const options: any = {
      key: keyId,
      amount: 12500000, // paise — matches createRazorpayOrder
      currency: "INR",
      name: "LMS Admissions",
      description: `Enrolment — ${application.batch.name}`,
      order_id: orderId,
      prefill: {
        name: `${application.firstName} ${application.lastName}`,
        email: application.email,
      },
      theme: { color: brandColor },
      modal: {
        ondismiss: () => {
          setLoading(false);
          setLoadingStep("");
        },
      },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        setLoadingStep("Verifying Razorpay signature…");
        await new Promise((r) => setTimeout(r, 500));
        setLoadingStep("Enrolling student account…");

        const res = await verifyAndCompleteRazorpayPaymentAction(
          application.id,
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature
        );

        if (res.success) {
          onSuccess();
        } else {
          onError(res.error || "Razorpay enrolment failed. Please contact support.");
          setLoading(false);
        }
      },
    };

    // Razorpay script is loaded globally (added to layout via next/script or injected below)
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      const rz = new (window as any).Razorpay(options);
      rz.on("payment.failed", (resp: any) => {
        onError(resp?.error?.description || "Payment failed. Please try again.");
        setLoading(false);
      });
      rz.open();
    } else {
      onError("Razorpay checkout could not be loaded. Please refresh and try again.");
      setLoading(false);
    }
  };

  return (
    <div id="panel-razorpay" role="tabpanel" aria-labelledby="tab-razorpay" className="space-y-5">
      <RazorpayTestHint />

      {/* Order init state */}
      {!orderReady ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-full p-4 rounded-xl border border-border/50 bg-background/40 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <p className="font-black text-foreground">Razorpay Secure Checkout</p>
              <p className="text-muted-foreground text-[10px]">UPI, Net Banking, Cards, Wallets</p>
            </div>
            <QrCode className="w-8 h-8 text-muted-foreground/40" aria-hidden />
          </div>

          <Button
            type="button"
            onClick={initOrder}
            disabled={orderLoading}
            className="w-full h-12 text-xs font-black text-white rounded-xl shadow-lg hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: brandColor }}
          >
            {orderLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating Razorpay order…</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Initialise Razorpay Checkout</>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Order ready card */}
          <div className="p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" /> Order Created
              </p>
              <p className="font-mono text-muted-foreground text-[10px] truncate max-w-[200px]">{orderId}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Expires in</p>
              <p className={`font-mono font-black text-xs ${timeLeft < 60 ? "text-destructive animate-pulse" : "text-foreground"}`}>
                {formatTime(timeLeft)}
              </p>
            </div>
          </div>

          {/* QR code visual hint */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-background/40">
            <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-md overflow-hidden">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`upi://pay?pa=pay@razorpay&pn=LMS+Admissions&am=125000&cu=INR&tr=${orderId}`)}`}
                alt="Scan with any UPI app to pay"
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="space-y-1.5 text-xs">
              <p className="font-black text-foreground">Scan to pay via UPI</p>
              <p className="text-muted-foreground text-[10px] leading-relaxed">
                Or click the button below to open<br />Razorpay's secure checkout.
              </p>
              <p className="text-[9px] font-mono text-muted-foreground/70">Amount: ₹1,25,000</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={openRazorpayCheckout}
              disabled={loading || timeLeft <= 0}
              className="flex-1 h-12 text-xs font-black text-white rounded-xl shadow-lg hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: brandColor }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing…</>
              ) : timeLeft <= 0 ? (
                "Order expired — refresh"
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" /> Pay ₹1,25,000 via Razorpay</>
              )}
            </Button>
            <button
              type="button"
              onClick={initOrder}
              disabled={orderLoading || loading}
              aria-label="Refresh order"
              title="Refresh order"
              className="h-12 w-12 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 flex items-center justify-center transition-all text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${orderLoading ? "animate-spin" : ""}`} aria-hidden />
            </button>
          </div>
        </div>
      )}

      {/* Razorpay checkout.js loader */}
      <RazorpayScript />
    </div>
  );
}

function RazorpayScript() {
  useEffect(() => {
    if (document.getElementById("razorpay-checkout-js")) return;
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      const el = document.getElementById("razorpay-checkout-js");
      if (el) document.body.removeChild(el);
    };
  }, []);
  return null;
}

// ─── Invoice sidebar ───────────────────────────────────────────────────────────

function InvoiceSidebar({
  application,
  gateway,
  isSandbox,
}: {
  application: ApplicationDetails;
  gateway: Gateway;
  isSandbox: boolean;
}) {
  // Stable invoice number scoped to the application id
  const invoiceNo = `INV-${application.id.replace(/-/g, "").substring(0, 8).toUpperCase()}`;

  return (
    <aside
      aria-label="Enrollment invoice"
      className="w-full md:w-80 shrink-0 bg-card/40 border border-dashed border-border/60 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden"
    >
      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden />

      <div className="space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dashed border-border pb-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-primary uppercase tracking-widest block">Enrollment Invoice</span>
            <p className="text-[9px] text-muted-foreground font-mono">{invoiceNo}</p>
          </div>
          <Barcode className="w-8 h-8 text-muted-foreground/30 stroke-[1.2]" aria-hidden />
        </div>

        {/* Program */}
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Academy Program</span>
          <h3 className="text-sm font-black text-foreground leading-tight">{application.batch.name}</h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
            {application.batch.description || "Comprehensive academic curriculum programme."}
          </p>
        </div>

        {/* Line items */}
        <div className="space-y-2.5">
          {[
            { label: "Tuition fees", amount: gateway === "razorpay" ? "₹1,21,500" : "$1,450.00" },
            { label: "Infrastructure levy", amount: gateway === "razorpay" ? "₹3,500" : "$50.00" },
          ].map(({ label, amount }) => (
            <div key={label} className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{label}</span>
              <span className="font-mono text-foreground">{amount}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-border/70 pt-2.5 flex items-center justify-between text-xs font-bold text-foreground">
            <span className="uppercase tracking-wide text-muted-foreground">Grand Total</span>
            <span className="text-base font-mono text-emerald-400 font-black">
              {gateway === "razorpay" ? "₹1,25,000" : "$1,500.00"}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="space-y-3 pt-4 border-t border-dashed border-border/70">
        {isSandbox && (
          <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[9.5px] text-muted-foreground leading-relaxed">
            <TestTube2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
            <p>
              <strong className="text-amber-400">Sandbox mode:</strong> No real transactions are processed.
            </p>
          </div>
        )}
        <div className="flex items-start gap-2 p-3 rounded-xl border border-border/40 bg-background/30 text-[9.5px] text-muted-foreground leading-relaxed">
          <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0 mt-0.5" aria-hidden />
          <p>Secured by <strong className="capitalize text-foreground">{gateway}</strong> — 256-bit TLS encryption.</p>
        </div>
        <p className="text-[8px] text-center font-mono text-muted-foreground/40 uppercase tracking-widest">
          Thank you for enrolling
        </p>
      </div>
    </aside>
  );
}

// ─── Main CheckoutConsole ──────────────────────────────────────────────────────

export function CheckoutConsole({ application, primaryColor }: CheckoutConsoleProps) {
  const brandColor = primaryColor || "#0ea5e9";

  const [activeGateway, setActiveGateway] = useState<Gateway>("stripe");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stripe Elements state
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeInitError, setStripeInitError] = useState<string | null>(null);
  const [stripeSandbox, setStripeSandbox] = useState(true);

  // Razorpay sandbox flag (comes back from order creation)
  const [razorpayIsSandbox, setRazorpayIsSandbox] = useState(true);

  // Initialise Stripe Elements on mount
  useEffect(() => {
    let cancelled = false;
    async function initStripe() {
      try {
        const res = await createStripePaymentIntentAction(application.id);
        if (cancelled) return;
        if (res.success && res.clientSecret && res.publishableKey) {
          setClientSecret(res.clientSecret);
          setStripePromise(loadStripe(res.publishableKey));
          setStripeSandbox(res.isSandbox ?? true);
        } else {
          setStripeInitError(res.error || "Could not initialise Stripe.");
        }
      } catch (e: any) {
        if (!cancelled) setStripeInitError("Could not load Stripe configuration.");
      }
    }
    initStripe();
    return () => { cancelled = true; };
  }, [application.id]);

  // Confetti on success
  useEffect(() => {
    if (!success) return;
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: [brandColor, "#10b981", "#6366f1"] });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: [brandColor, "#10b981", "#6366f1"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [success, brandColor]);

  const handleSuccess = useCallback(() => setSuccess(true), []);
  const handleError = useCallback((msg: string) => { if (msg) setError(msg); }, []);

  if (success) {
    return <SuccessScreen application={application} brandColor={brandColor} gateway={activeGateway} />;
  }

  const isSandbox = activeGateway === "stripe" ? stripeSandbox : razorpayIsSandbox;

  return (
    <div className="w-full max-w-4xl flex flex-col md:flex-row items-stretch gap-6 relative z-10 text-xs">
      {/* Main checkout card */}
      <Card className="flex-1 border-border/60 shadow-2xl bg-card/60 backdrop-blur-md overflow-hidden rounded-3xl">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="space-y-3 border-b border-border/40 pb-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-sm font-black tracking-tight text-foreground">Complete Enrollment Payment</h2>
                <p className="text-[10px] text-muted-foreground">Choose your preferred payment method below.</p>
              </div>
              {isSandbox && <SandboxBadge gateway={activeGateway} />}
            </div>
            <GatewayTabs active={activeGateway} onChange={(g) => { setActiveGateway(g); setError(null); }} brandColor={brandColor} />
          </div>

          {/* Error */}
          {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

          {/* Stripe panel */}
          {activeGateway === "stripe" && (
            <div className="animate-in fade-in duration-200">
              {stripeInitError ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center text-xs text-muted-foreground">
                  <AlertCircle className="w-8 h-8 text-destructive/60" aria-hidden />
                  <p className="max-w-xs">{stripeInitError}</p>
                </div>
              ) : stripePromise && clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripePaymentForm
                    brandColor={brandColor}
                    clientSecret={clientSecret}
                    application={application}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    loading={loading}
                    setLoading={setLoading}
                    setLoadingStep={setLoadingStep}
                  />
                </Elements>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden />
                  <span className="text-[10px] font-mono">Initialising Stripe Elements…</span>
                </div>
              )}
            </div>
          )}

          {/* Razorpay panel */}
          {activeGateway === "razorpay" && (
            <div className="animate-in fade-in duration-200">
              <RazorpayPanel
                application={application}
                brandColor={brandColor}
                onSuccess={handleSuccess}
                onError={handleError}
                loading={loading}
                setLoading={setLoading}
                setLoadingStep={setLoadingStep}
              />
            </div>
          )}

          {/* Trust footer */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-border/40">
            {[
              { icon: Lock, label: "256-bit TLS" },
              { icon: ShieldCheck, label: "PCI-DSS Compliant" },
              { icon: BadgeCheck, label: "Secure Checkout" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1 text-[9px] text-muted-foreground/60 font-semibold">
                <Icon className="w-3 h-3" aria-hidden /> {label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoice sidebar */}
      <InvoiceSidebar application={application} gateway={activeGateway} isSandbox={isSandbox} />

      {/* Loading overlay */}
      {loading && <PaymentLoadingOverlay step={loadingStep} />}
    </div>
  );
}
