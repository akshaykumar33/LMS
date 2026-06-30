"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { completePaymentAndEnrollAction } from "../actions/admission-actions";
import { 
  CreditCard, 
  QrCode, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Lock,
  Wallet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
}

export function CheckoutConsole({ application, primaryColor }: CheckoutConsoleProps) {
  const router = useRouter();
  const brandColor = primaryColor || "#0ea5e9";

  const [activeGateway, setActiveGateway] = useState<"stripe" | "razorpay" | "paypal">("stripe");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stripe Card form fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState(`${application.firstName} ${application.lastName}`);

  // Razorpay UPI & Netbanking form fields
  const [upiId, setUpiId] = useState("");
  const [selectedBank, setSelectedBank] = useState("sbi");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown
  
  // PayPal Login form fields
  const [paypalEmail, setPaypalEmail] = useState(`sandbox-${application.firstName.toLowerCase()}@example.com`);
  const [paypalPassword, setPaypalPassword] = useState("");
  const [paypalAuthorized, setPaypalAuthorized] = useState(false);

  useEffect(() => {
    if (activeGateway === "razorpay" && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [activeGateway, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getCardBrand = (num: string) => {
    const cleanNum = num.replace(/\D/g, "");
    if (cleanNum.startsWith("4")) return "visa";
    if (cleanNum.startsWith("5")) return "mastercard";
    return "generic";
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const formatted = value.match(/.{1,4}/g)?.join(" ") || "";
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2) {
      value = `${value.substring(0, 2)}/${value.substring(2, 4)}`;
    }
    setExpiry(value.substring(0, 5));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setCvv(value.substring(0, 4));
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate active gateway form values
    if (activeGateway === "stripe") {
      if (cardNumber.replace(/\s/g, "").length < 16) {
        setError("Please enter a valid 16-digit card number.");
        return;
      }
      if (expiry.length < 5) {
        setError("Please enter a valid expiry date (MM/YY).");
        return;
      }
      if (cvv.length < 3) {
        setError("Please enter a valid CVV code.");
        return;
      }
    } else if (activeGateway === "razorpay") {
      // If UPI is filled, prioritize it, otherwise Net Banking is fine
      if (upiId && !upiId.includes("@")) {
        setError("Please enter a valid UPI ID (e.g. user@bank).");
        return;
      }
    } else if (activeGateway === "paypal") {
      if (!paypalEmail.includes("@")) {
        setError("Please enter a valid PayPal account email.");
        return;
      }
      if (paypalPassword.length < 4) {
        setError("Please enter your sandbox password (minimum 4 characters).");
        return;
      }
    }

    setLoading(true);

    const steps = [
      `Initiating secure Sandbox ${activeGateway.toUpperCase()} transaction...`,
      "Verifying credentials against mock payment gateway...",
      "Authorizing enrollment transaction value of $1,500.00...",
      "Enrolling student account & initializing workspace cookies...",
    ];

    for (let i = 0; i < steps.length; i++) {
      setLoadingStep(steps[i]!);
      await new Promise((r) => setTimeout(r, 600));
    }

    try {
      const mockTxn = `${activeGateway === "stripe" ? "ch" : activeGateway === "razorpay" ? "pay" : "pay_pal"}_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
      
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

  if (success) {
    return (
      <div className="w-full max-w-xl bg-card border border-border backdrop-blur-lg shadow-2xl rounded-2xl p-8 space-y-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full bg-sky-500/10 blur-2xl animate-pulse"></div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-foreground">Payment Confirmed!</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Your enrollment processing fee was paid successfully via Sandbox <strong>{activeGateway.toUpperCase()}</strong>.
            </p>
          </div>

          <div className="bg-background/60 border border-border p-5 rounded-2xl text-left max-w-md mx-auto space-y-3.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Enrolled Student</span>
              <span className="text-xs font-bold text-foreground font-mono">{application.firstName} {application.lastName}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cohort Batch</span>
              <span className="text-xs font-bold text-emerald-400">{application.batch.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Enrollment Status</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                Active / Paid
              </span>
            </div>
          </div>

          <div className="p-3 bg-secondary/35 border border-border rounded-xl text-[10px] text-muted-foreground max-w-md mx-auto leading-relaxed">
            🚀 <strong>Payment Confirmed:</strong> Your tuition fee sandbox payment has been recorded. Please proceed to set up your account password.
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
      <Card className="flex-1 border-border/60 shadow-2xl bg-card">
        <form onSubmit={handlePayment} className="h-full flex flex-col justify-between p-6 sm:p-8 space-y-6">
          <div className="space-y-6">
            <div className="border-b border-border pb-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Payment Method</span>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setActiveGateway("stripe")}
                  className={`h-11 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1.5 font-bold transition-all cursor-pointer text-[10px] sm:text-xs ${
                    activeGateway === "stripe"
                      ? "bg-secondary border-muted-foreground/30 text-foreground shadow-lg"
                      : "bg-background border-border hover:bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <CreditCard className="w-4 h-4" style={activeGateway === "stripe" ? { color: brandColor } : undefined} />
                  <span>Stripe Card</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setActiveGateway("razorpay")}
                  className={`h-11 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1.5 font-bold transition-all cursor-pointer text-[10px] sm:text-xs ${
                    activeGateway === "razorpay"
                      ? "bg-secondary border-muted-foreground/30 text-foreground shadow-lg"
                      : "bg-background border-border hover:bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <QrCode className="w-4 h-4" style={activeGateway === "razorpay" ? { color: brandColor } : undefined} />
                  <span>Razorpay UPI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGateway("paypal")}
                  className={`h-11 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1.5 font-bold transition-all cursor-pointer text-[10px] sm:text-xs ${
                    activeGateway === "paypal"
                      ? "bg-secondary border-muted-foreground/30 text-foreground shadow-lg"
                      : "bg-background border-border hover:bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <Wallet className="w-4 h-4" style={activeGateway === "paypal" ? { color: brandColor } : undefined} />
                  <span>PayPal</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 p-3.5 rounded-lg text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* STRIPE CARD VIEW */}
            {activeGateway === "stripe" && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Visual Credit Card */}
                <div className="relative h-44 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-border/80 p-5 shadow-2xl flex flex-col justify-between overflow-hidden">
                  <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent pointer-events-none"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <div className="w-10 h-7 rounded bg-amber-500/10 border border-amber-500/30 relative overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-x-2 inset-y-1.5 border border-amber-500/20"></div>
                    </div>
                    {getCardBrand(cardNumber) === "visa" && (
                      <span className="text-base font-black italic text-sky-400">VISA</span>
                    )}
                    {getCardBrand(cardNumber) === "mastercard" && (
                      <span className="text-base font-black italic text-orange-400">MASTERCARD</span>
                    )}
                    {getCardBrand(cardNumber) === "generic" && (
                      <span className="text-[9px] font-mono font-bold tracking-widest text-muted-foreground">STRIPE SECURE</span>
                    )}
                  </div>

                  <div className="text-base font-mono tracking-[0.18em] text-foreground/90 my-3 relative z-10">
                    {cardNumber || "•••• •••• •••• ••••"}
                  </div>

                  <div className="flex items-center justify-between relative z-10">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Card Holder</span>
                      <p className="text-[10px] font-mono text-foreground uppercase truncate max-w-[200px]">{cardName || "Cardholder Name"}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Expires</span>
                      <p className="text-[10px] font-mono text-foreground">{expiry || "MM/YY"}</p>
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cardholder Name</Label>
                    <Input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="h-10 text-xs"
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Card Number</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="h-10 text-xs font-mono pr-12"
                        placeholder="4000 1234 5678 9010"
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                        {getCardBrand(cardNumber) === "visa" && <span className="text-[9px] font-bold text-sky-400 uppercase font-mono">Visa</span>}
                        {getCardBrand(cardNumber) === "mastercard" && <span className="text-[9px] font-bold text-orange-400 uppercase font-mono">MCard</span>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expiration Date</Label>
                      <Input
                        type="text"
                        value={expiry}
                        onChange={handleExpiryChange}
                        className="h-10 text-xs font-mono"
                        placeholder="MM/YY"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CVV / CVC</Label>
                      <Input
                        type="password"
                        value={cvv}
                        onChange={handleCvvChange}
                        className="h-10 text-xs font-mono"
                        placeholder="•••"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RAZORPAY UPI & BANKING VIEW */}
            {activeGateway === "razorpay" && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="bg-secondary/40 border border-border p-4 rounded-xl flex items-center justify-between text-foreground">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-bold text-sky-400 uppercase tracking-widest">Razorpay Sandbox</span>
                    <h4 className="text-xs font-bold font-mono">UPI Payment Gateway</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-muted-foreground block">Session Expires</span>
                    <span className="text-xs font-mono font-black text-rose-400">{formatTime(timeLeft)}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5 bg-background/50 border border-border/80 p-5 rounded-2xl">
                  {/* QR Code graphic */}
                  <div className="w-28 h-28 bg-white p-1 rounded-xl flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=enrollment@intel.lms.com&pn=${encodeURIComponent("Intel Semiconductor Academy")}&am=1500&cu=USD`)}`} 
                      alt="UPI Payment QR Code" 
                      className="w-full h-full object-contain"
                    />
                    {/* scanning laser */}
                    <div className="absolute inset-x-0 h-0.5 bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,1)] animate-laser pointer-events-none"></div>
                  </div>

                  <div className="space-y-3 flex-1 text-center sm:text-left">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">Scan QR Code or Enter UPI ID</p>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Scan using any Sandbox UPI App (BHIM, PhonePe, Google Pay, Paytm) to complete.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">UPI ID / VPA</Label>
                      <Input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="h-9 text-xs"
                        placeholder="username@okaxis"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Or Pay via Net Banking</Label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring"
                  >
                    <option value="sbi">State Bank of India (SBI)</option>
                    <option value="hdfc">HDFC Bank Ltd</option>
                    <option value="icici">ICICI Bank</option>
                    <option value="axis">Axis Bank</option>
                  </select>
                </div>
              </div>
            )}

            {/* PAYPAL CHECKOUT VIEW */}
            {activeGateway === "paypal" && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="bg-[#002f86]/10 border border-[#002f86]/20 p-4 rounded-xl flex items-center justify-between text-foreground">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-black text-[#0079C1] uppercase tracking-widest">PayPal Sandbox</span>
                    <h4 className="text-xs font-bold font-mono text-foreground">Express Payment Authorization</h4>
                  </div>
                  <Badge variant="outline" className="bg-[#0079C1]/10 text-[#0079C1] border-[#0079C1]/20 font-bold text-[9px]">
                    SECURED
                  </Badge>
                </div>

                {!paypalAuthorized ? (
                  <div className="bg-background/40 border border-border p-5 rounded-2xl space-y-3.5">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-foreground">Sign In to Sandbox PayPal Account</h4>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Authorize sandbox access using mock credentials.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">PayPal Email</Label>
                        <Input
                          type="email"
                          value={paypalEmail}
                          onChange={(e) => setPaypalEmail(e.target.value)}
                          className="h-9 text-xs"
                          placeholder="sandbox-buyer@paypal.com"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Password</Label>
                        <Input
                          type="password"
                          value={paypalPassword}
                          onChange={(e) => setPaypalPassword(e.target.value)}
                          className="h-9 text-xs"
                          placeholder="••••••••"
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={() => {
                          if (paypalEmail && paypalPassword) {
                            setPaypalAuthorized(true);
                            setError(null);
                          } else {
                            setError("Please enter your mock PayPal email and password to log in.");
                          }
                        }}
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
                        <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wide">✓ Account Connected</span>
                        <p className="text-xs font-mono font-bold text-foreground">{paypalEmail}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaypalAuthorized(false)}
                        className="text-[9px] text-muted-foreground hover:underline"
                      >
                        Change account
                      </button>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Sandbox Balance</span>
                      <strong className="text-foreground">$24,980.00 USD</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Authorized Amount</span>
                      <strong className="text-foreground">$1,500.00 USD</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-end">
            <Button
              type="submit"
              disabled={loading || (activeGateway === "paypal" && !paypalAuthorized)}
              className="w-full h-11 text-xs font-bold text-white hover:opacity-90 shadow-lg disabled:opacity-50"
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
                  <span>
                    Pay $1,500.00 via {activeGateway === "stripe" ? "Stripe" : activeGateway === "razorpay" ? "Razorpay" : "PayPal"}
                  </span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Sidebar Summary */}
      <div className="w-full md:w-80 bg-card/65 border border-border backdrop-blur-lg rounded-2xl p-6 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          <div className="space-y-1 border-b border-border/80 pb-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Selected Cohort</span>
            <h3 className="text-sm font-extrabold text-foreground mt-1">{application.batch.name}</h3>
            <p className="text-[10px] text-muted-foreground leading-normal">{application.batch.description || "Comprehensive semiconductor curriculum program."}</p>
          </div>

          <div className="space-y-3.5">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Order Summary</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Tuition processing</span>
                <span>$1,450.00</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Infrastructure tax</span>
                <span>$50.00</span>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-2 font-bold text-foreground">
                <span>Total Amount</span>
                <span className="text-sm font-mono">$1,500.00</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-secondary/40 border border-border rounded-xl p-3.5 text-[10px] text-muted-foreground leading-relaxed">
          🔒 <strong>Secure PCI-DSS Sandbox:</strong> This checkout runs inside an isolated mock payment ecosystem. No real credit cards or financial assets are processed.
        </div>
      </div>

      {/* Full-Screen Loading Processing Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 transition-all duration-300">
          <div className="w-full max-w-sm bg-card border border-border p-8 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center space-y-6">
            <div className="p-3 bg-primary/10 rounded-full border border-primary/20 animate-spin">
              <Loader2 className="w-8 h-8 text-sky-400" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-foreground">Verifying Transaction</h3>
              <p className="text-[11px] text-muted-foreground min-h-[32px]">{loadingStep}</p>
            </div>
            
            <div className="w-full bg-secondary h-1 rounded-full overflow-hidden relative">
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
