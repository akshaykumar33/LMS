"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { completePaymentAndEnrollAction, createStripePaymentIntentAction } from "../actions/admission-actions";
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
  Barcode
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ApplicationDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  batch: {
    name: string;
    description: string | null;
  };
}

interface CheckoutConsoleProps {
  application: ApplicationDetails;
  primaryColor?: string;
  tuitionFee?: string;
  paymentRequired?: boolean;
  enabledGateways?: {
    stripe?: boolean;
    razorpay?: boolean;
    paypal?: boolean;
  } | null;
}

export function CheckoutConsole({ 
  application, 
  primaryColor, 
  tuitionFee = "1500.00", 
  paymentRequired = true,
  enabledGateways
}: CheckoutConsoleProps) {
  const router = useRouter();
  const brandColor = primaryColor || "#0ea5e9";

  const showStripe = enabledGateways?.stripe !== false;
  const showRazorpay = enabledGateways?.razorpay !== false;
  const showPaypal = enabledGateways?.paypal !== false;

  // Determine initial active gateway
  const getInitialGateway = () => {
    if (showStripe) return "stripe";
    if (showRazorpay) return "razorpay";
    if (showPaypal) return "paypal";
    return "stripe";
  };

  const [activeGateway, setActiveGateway] = useState<"stripe" | "razorpay" | "paypal">(getInitialGateway());
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stripe dynamic initialization
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Razorpay UPI & Netbanking form fields
  const [upiId, setUpiId] = useState("");
  const [selectedBank, setSelectedBank] = useState("sbi");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown
  
  // PayPal Login form fields
  const [paypalEmail, setPaypalEmail] = useState(`sandbox-${application.firstName.toLowerCase()}@example.com`);
  const [paypalPassword, setPaypalPassword] = useState("");
  const [paypalAuthorized, setPaypalAuthorized] = useState(false);
  const [authorizingPaypal, setAuthorizingPaypal] = useState(false);
  const [paypalStep, setPaypalStep] = useState("");

  // Sync active gateway if active options change
  useEffect(() => {
    if (activeGateway === "stripe" && !showStripe) {
      if (showRazorpay) setActiveGateway("razorpay");
      else if (showPaypal) setActiveGateway("paypal");
    } else if (activeGateway === "razorpay" && !showRazorpay) {
      if (showStripe) setActiveGateway("stripe");
      else if (showPaypal) setActiveGateway("paypal");
    } else if (activeGateway === "paypal" && !showPaypal) {
      if (showStripe) setActiveGateway("stripe");
      else if (showRazorpay) setActiveGateway("razorpay");
    }
  }, [showStripe, showRazorpay, showPaypal, activeGateway]);

  // Load Stripe client configuration from backend (only if payment is required and Stripe is enabled)
  useEffect(() => {
    if (!paymentRequired || !showStripe) return;
    async function initStripe() {
      try {
        const res = await createStripePaymentIntentAction(application.id);
        if (res.success && res.clientSecret && res.publishableKey) {
          setClientSecret(res.clientSecret);
          setStripePromise(loadStripe(res.publishableKey));
        } else if (res.error) {
          setError(res.error);
        }
      } catch (err: any) {
        console.error("Failed to load Stripe config:", err);
        setError("Could not initialize Stripe gateway configuration.");
      }
    }
    initStripe();
  }, [application.id, paymentRequired, showStripe]);

  useEffect(() => {
    if (activeGateway === "razorpay" && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [activeGateway, timeLeft]);

  // Trigger confetti when success is achieved
  useEffect(() => {
    if (success) {
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: [brandColor, "#10b981", "#6366f1"]
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: [brandColor, "#10b981", "#6366f1"]
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [success, brandColor]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleAuthorizePaypal = async () => {
    if (!paypalEmail.includes("@")) {
      setError("Please enter a valid PayPal account email.");
      return;
    }
    if (paypalPassword.length < 4) {
      setError("Please enter your sandbox password (minimum 4 characters).");
      return;
    }

    setError(null);
    setAuthorizingPaypal(true);

    const steps = [
      "Connecting to PayPal Secure Sandbox...",
      "Fetching profile details for sandbox account...",
      "Verifying wallet balances and permissions...",
      "Authorized successfully!"
    ];

    for (let i = 0; i < steps.length; i++) {
      setPaypalStep(steps[i]!);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    setPaypalAuthorized(true);
    setAuthorizingPaypal(false);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (activeGateway === "razorpay") {
      if (upiId && !upiId.includes("@")) {
        setError("Please enter a valid UPI ID (e.g. user@bank).");
        return;
      }
    } else if (activeGateway === "paypal") {
      if (!paypalAuthorized) {
        setError("Please authorize your PayPal sandbox wallet first.");
        return;
      }
    }

    setLoading(true);

    const steps = [
      `Initiating secure Sandbox ${activeGateway.toUpperCase()} transaction...`,
      "Verifying credentials against mock payment gateway...",
      `Authorizing enrollment transaction value of $${parseFloat(tuitionFee).toFixed(2)}...`,
      "Enrolling student account & initializing workspace cookies...",
    ];

    for (let i = 0; i < steps.length; i++) {
      setLoadingStep(steps[i]!);
      await new Promise((r) => setTimeout(r, 650));
    }

    try {
      const mockTxn = `${activeGateway === "razorpay" ? "pay" : "pay_pal"}_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
      
      const result = await completePaymentAndEnrollAction(
        application.id,
        activeGateway,
        mockTxn
      );

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Sandbox transaction failed. Please retry.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleFreeBypass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const steps = [
      "Initializing student profile registration...",
      "Configuring domain enrollment context...",
      "Activating workspace cookies...",
      "Enrollment processed successfully!"
    ];

    for (let i = 0; i < steps.length; i++) {
      setLoadingStep(steps[i]!);
      await new Promise((r) => setTimeout(r, 650));
    }

    try {
      const result = await completePaymentAndEnrollAction(
        application.id,
        "free",
        "free_bypass"
      );

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Enrollment bypass failed. Please retry.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-xl bg-card/60 border border-border/80 backdrop-blur-md shadow-2xl rounded-2xl p-8 space-y-8 text-center relative overflow-hidden sexy-border-glow">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full bg-sky-500/10 blur-2xl animate-pulse"></div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white">Payment Confirmed!</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Your enrollment processing fee was paid successfully.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-border p-5 rounded-2xl text-left max-w-md mx-auto space-y-3.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Enrolled Student</span>
              <span className="text-xs font-bold text-white font-mono">{application.firstName} {application.lastName}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Cohort Batch</span>
              <span className="text-xs font-bold text-emerald-400">{application.batch.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Enrollment Status</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase">
                Active / Paid
              </span>
            </div>
          </div>

          <div className="p-3 bg-secondary/35 border border-border rounded-xl text-[10px] text-slate-400 max-w-md mx-auto leading-relaxed">
            🚀 <strong>Payment Confirmed:</strong> Your tuition fee payment has been recorded. Please proceed to set up your account password.
          </div>

          <button
            onClick={() => {
              router.push(`/signup?appId=${application.id}`);
            }}
            className="w-full max-w-md h-12 rounded-xl text-xs font-bold text-white hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            style={{ backgroundColor: brandColor }}
          >
            Proceed to Account Signup <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl flex flex-col md:flex-row items-stretch gap-6 relative z-10 text-xs">
      
      {/* Checkout Form */}
      <Card className="flex-1 border-border/60 shadow-2xl bg-card/60 backdrop-blur-md overflow-hidden">
        <div className="h-full flex flex-col justify-between p-6 sm:p-8 space-y-6">
          {!paymentRequired ? (
            <form onSubmit={handleFreeBypass} className="space-y-6 flex-1 flex flex-col justify-center py-6">
              <div className="space-y-3 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Tuition Sponsored / Free</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-normal">
                    Your institution domain does not require enrollment payments at this time. You can complete your enrollment for free immediately.
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-lg text-xs text-rose-450 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:opacity-95"
                style={{ backgroundColor: brandColor }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Processing self-enrollment...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Enrollment & Setup Account</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="border-b border-border pb-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Payment Method</span>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {showStripe && (
                    <button
                      type="button"
                      onClick={() => setActiveGateway("stripe")}
                      className={`h-11 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1.5 font-bold transition-all cursor-pointer text-[10px] sm:text-xs ${
                        activeGateway === "stripe"
                          ? "bg-slate-800 border-slate-700 text-white shadow-lg shadow-black/20"
                          : "bg-transparent border-border/40 hover:bg-slate-800/40 text-slate-400"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" style={activeGateway === "stripe" ? { color: brandColor } : undefined} />
                      <span>Stripe Card</span>
                    </button>
                  )}
                  
                  {showRazorpay && (
                    <button
                      type="button"
                      onClick={() => setActiveGateway("razorpay")}
                      className={`h-11 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1.5 font-bold transition-all cursor-pointer text-[10px] sm:text-xs ${
                        activeGateway === "razorpay"
                          ? "bg-slate-800 border-slate-700 text-white shadow-lg shadow-black/20"
                          : "bg-transparent border-border/40 hover:bg-slate-800/40 text-slate-400"
                      }`}
                    >
                      <QrCode className="w-4 h-4" style={activeGateway === "razorpay" ? { color: brandColor } : undefined} />
                      <span>Razorpay UPI</span>
                    </button>
                  )}

                  {showPaypal && (
                    <button
                      type="button"
                      onClick={() => setActiveGateway("paypal")}
                      className={`h-11 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1.5 font-bold transition-all cursor-pointer text-[10px] sm:text-xs ${
                        activeGateway === "paypal"
                          ? "bg-slate-800 border-slate-700 text-white shadow-lg shadow-black/20"
                          : "bg-transparent border-border/40 hover:bg-slate-800/40 text-slate-400"
                      }`}
                    >
                      <Wallet className="w-4 h-4" style={activeGateway === "paypal" ? { color: brandColor } : undefined} />
                      <span>PayPal</span>
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-lg text-xs text-rose-450 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* STRIPE CARD VIEW */}
              {activeGateway === "stripe" && showStripe && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {stripePromise && clientSecret ? (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <StripePaymentForm 
                        brandColor={brandColor}
                        clientSecret={clientSecret}
                        application={application}
                        onSuccess={() => setSuccess(true)}
                        onError={(err) => setError(err)}
                        loading={loading}
                        setLoading={setLoading}
                        setLoadingStep={setLoadingStep}
                      />
                    </Elements>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 space-y-3">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      <span className="text-[10px] text-slate-400 font-mono">Initializing secure Stripe Elements...</span>
                    </div>
                  )}
                </div>
              )}

              {/* RAZORPAY UPI & BANKING VIEW */}
              {activeGateway === "razorpay" && showRazorpay && (
                <form onSubmit={handlePayment} className="space-y-5 animate-in fade-in duration-200">
                  <div className="bg-slate-950/40 border border-border p-4 rounded-xl flex items-center justify-between text-white">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold text-sky-400 uppercase tracking-widest">Razorpay Sandbox</span>
                      <h4 className="text-xs font-bold font-mono">UPI Payment Gateway</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] text-slate-500 block">Session Expires</span>
                      <span className="text-xs font-mono font-black text-rose-400">{formatTime(timeLeft)}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-400 text-xs font-bold">Virtual Payment Address (VPA)</Label>
                      <Input
                        type="text"
                        placeholder="success@razorpay"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="bg-slate-950 border-border text-white text-xs h-10"
                      />
                      <span className="text-[9px] text-slate-500 block font-mono">Accepts sandbox VPA formats like user@upi, success@razorpay.</span>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-400 text-xs font-bold">Or Select Bank Account</Label>
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="w-full bg-slate-950 border border-border rounded-xl text-white text-xs p-3 focus:outline-none"
                      >
                        <option value="sbi">State Bank of India (SBI)</option>
                        <option value="hdfc">HDFC Bank</option>
                        <option value="icici">ICICI Bank</option>
                        <option value="axis">Axis Bank</option>
                      </select>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:opacity-95"
                      style={{ backgroundColor: brandColor }}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span>Processing secure transaction...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          <span>Pay ${parseFloat(tuitionFee).toFixed(2)} via UPI / Netbanking</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* PAYPAL VIEW */}
              {activeGateway === "paypal" && showPaypal && (
                <form onSubmit={handlePayment} className="space-y-5 animate-in fade-in duration-200">
                  <div className="bg-slate-950/40 border border-border p-4 rounded-xl flex items-center justify-between text-white">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold text-[#FFC439] uppercase tracking-widest">PayPal Sandbox</span>
                      <h4 className="text-xs font-bold font-mono">Express Checkout Wallet</h4>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {!paypalAuthorized ? (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="p-4 bg-[#003087]/10 border border-[#003087]/30 rounded-xl space-y-3.5">
                          <h4 className="text-xs font-bold font-mono text-white">Express Payment Authorization</h4>
                          
                          {paypalStep && (
                            <div className="text-[10px] text-sky-400 font-mono min-h-[16px] animate-pulse">
                              {paypalStep}
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label className="text-slate-400 text-[10px] uppercase font-black">Sandbox Email Address</Label>
                            <Input
                              type="email"
                              value={paypalEmail}
                              onChange={(e) => setPaypalEmail(e.target.value)}
                              className="bg-slate-950 border-border text-white text-xs h-9"
                              placeholder="sandbox-buyer@example.com"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-slate-400 text-[10px] uppercase font-black">Password</Label>
                            <Input
                              type="password"
                              value={paypalPassword}
                              onChange={(e) => setPaypalPassword(e.target.value)}
                              className="bg-slate-950 border-border text-white text-xs h-9"
                              placeholder="••••••••"
                            />
                          </div>

                          <Button
                            type="button"
                            onClick={handleAuthorizePaypal}
                            className="w-full h-9 text-xs bg-[#0079C1] hover:bg-[#005ea6] text-white font-bold"
                          >
                            Log In to Sandbox PayPal Account
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl space-y-3 animate-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-start border-b border-border/40 pb-2">
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wide">✓ Account Connected</span>
                            <p className="text-xs font-mono font-bold text-slate-800">{paypalEmail}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPaypalAuthorized(false)}
                            className="text-[9px] text-slate-600 hover:text-slate-800 hover:underline"
                          >
                            Change account
                          </button>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600">Sandbox Balance</span>
                          <strong className="text-slate-900">$24,980.00 USD</strong>
                        </div>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-11 text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:opacity-95"
                          style={{ backgroundColor: brandColor }}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              <span>Processing secure Sandbox authorization...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4 mr-2" />
                              <span>Pay ${parseFloat(tuitionFee).toFixed(2)} via PayPal</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Sidebar Summary - Redesigned as a Premium Digital Receipt */}
      <div className="w-full md:w-80 bg-slate-900/90 border border-dashed border-border/80 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-b from-white/5 to-transparent"></div>
        
        <div className="space-y-6 relative z-10">
          <div className="flex items-center justify-between border-b border-dashed border-border pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Enrollment Invoice</span>
              <p className="text-[9px] text-slate-500 font-mono">No. INV-{Math.floor(100000 + Math.random() * 900000)}</p>
            </div>
            <Barcode className="w-8 h-8 text-slate-600 stroke-[1.2]" />
          </div>

          <div className="space-y-1 pb-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Academy Program</span>
            <h3 className="text-sm font-black text-white mt-0.5">{application.batch.name}</h3>
            <p className="text-[10px] text-slate-400 leading-normal mt-1">{application.batch.description || "Comprehensive semiconductor curriculum program."}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Tuition fees</span>
              <span className="font-mono text-white">${(paymentRequired ? parseFloat(tuitionFee) - (parseFloat(tuitionFee) > 50 ? 50 : 0) : 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Infrastructure tax</span>
              <span className="font-mono text-white">${(paymentRequired ? (parseFloat(tuitionFee) > 50 ? 50 : 0) : 0).toFixed(2)}</span>
            </div>
            <div className="border-t border-dashed border-border/85 pt-3 flex items-center justify-between text-xs font-bold text-white">
              <span className="uppercase tracking-wide text-slate-350">Grand Total</span>
              <span className="text-base font-mono text-emerald-400 font-black">${(paymentRequired ? parseFloat(tuitionFee) : 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-dashed border-border/80">
          <div className="bg-slate-950/40 p-3 rounded-xl text-[9.5px] text-slate-400 leading-relaxed font-sans flex gap-2 items-start">
            <span className="mt-0.5">🔒</span>
            <p>
              <strong>Sandbox Checkout:</strong> Safe mock sandbox interface. No actual financial operations are dispatched to production services.
            </p>
          </div>
          <div className="text-[8px] text-center font-mono text-slate-600 uppercase tracking-widest">
            Thank you for enrolling
          </div>
        </div>
      </div>

      {/* Full-Screen Loading Processing Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 transition-all duration-300">
          <div className="w-full max-w-sm bg-slate-900 border border-border/60 p-8 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center space-y-6 sexy-border-glow">
            <div className="p-3 bg-sky-500/10 rounded-full border border-sky-500/20 animate-spin">
              <Loader2 className="w-8 h-8 text-sky-400" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white">Verifying Transaction</h3>
              <p className="text-[11px] text-slate-400 min-h-[32px]">{loadingStep}</p>
            </div>
            
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full animate-infinite-loading" style={{ width: "65%" }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Inject custom CSS keyframes for infinite loader bar if not present */}
      <style jsx global>{`
        @keyframes infinite-loading {
          0% { left: -100%; width: 50%; }
          50% { left: 30%; width: 70%; }
          100% { left: 100%; width: 50%; }
        }
        .animate-infinite-loading {
          animation: infinite-loading 1.8s infinite ease-in-out;
        }
        @keyframes laser-sweep {
          0% { top: 0%; opacity: 0.3; }
          50% { top: 100%; opacity: 1; }
          100% { top: 0%; opacity: 0.3; }
        }
        .animate-laser {
          animation: laser-sweep 2.5s infinite linear;
        }
      `}</style>
    </div>
  );
}

interface StripePaymentFormProps {
  brandColor: string;
  clientSecret: string;
  application: any;
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
  setLoadingStep
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setLoadingStep("Connecting to Stripe Secure Gateway...");
    await new Promise((r) => setTimeout(r, 600));

    setLoadingStep("Authorizing checkout transaction...");
    
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card Element not initialized.");
      }

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
      } else if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
        setLoadingStep("Enrolling student account & initializing workspace cookies...");
        await new Promise((r) => setTimeout(r, 800));

        const actionRes = await completePaymentAndEnrollAction(
          application.id,
          "stripe",
          result.paymentIntent.id
        );

        if (actionRes.success) {
          onSuccess();
        } else {
          onError(actionRes.error || "Enrollment process failed. Please contact support.");
        }
        setLoading(false);
      }
    } catch (err: any) {
      onError(err.message || "An unexpected card error occurred.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4 animate-in fade-in duration-200">
        <div className="p-4 bg-slate-900/60 border border-white/5 rounded-xl">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Secure Card Credentials (Stripe Hosted Elements)
          </Label>
          <div className="p-3 bg-slate-950 border border-border/80 rounded-lg">
            <CardElement
              options={{
                style: {
                  base: {
                    color: "#ffffff",
                    fontSize: "12px",
                    fontFamily: "monospace, Courier, monospace",
                    "::placeholder": {
                      color: "#94a3b8",
                    },
                  },
                  invalid: {
                    color: "#f87171",
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border flex items-center justify-end">
        <Button
          type="submit"
          disabled={loading || !stripe}
          className="w-full h-11 text-xs font-bold text-white hover:opacity-90 shadow-lg disabled:opacity-50"
          style={{ backgroundColor: brandColor }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span>Processing secure Stripe transaction...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-2" />
              <span>Pay $1,500.00 via Stripe Elements</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
