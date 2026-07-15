/**
 * Payment Configuration Service
 *
 * Single source of truth for payment gateway mode and routing.
 * Switching from sandbox → production only requires changing env vars.
 * No application code changes needed.
 */

export type PaymentGateway = "stripe" | "razorpay";

export interface PaymentMode {
  /** "sandbox" in test mode, "production" in live mode */
  mode: "sandbox" | "production";
  isSandbox: boolean;
}

/**
 * Returns the active payment mode for a given gateway.
 * Controlled by STRIPE_MODE and RAZORPAY_MODE env vars.
 * Defaults to "sandbox" if unset.
 */
export function getPaymentMode(gateway: PaymentGateway): PaymentMode {
  const raw =
    gateway === "stripe"
      ? (process.env.STRIPE_MODE ?? "sandbox")
      : (process.env.RAZORPAY_MODE ?? "sandbox");

  const mode = raw === "production" ? "production" : "sandbox";
  return { mode, isSandbox: mode === "sandbox" };
}

/**
 * Returns Stripe keys based on the current mode.
 * In sandbox: uses STRIPE_TEST_SECRET_KEY / STRIPE_TEST_PUBLISHABLE_KEY
 * In production: uses STRIPE_LIVE_SECRET_KEY / STRIPE_LIVE_PUBLISHABLE_KEY
 * Falls back to STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY for
 * backwards-compatibility.
 */
export function getStripeEnvKeys(): { secretKey: string; publishableKey: string } {
  const { isSandbox } = getPaymentMode("stripe");

  const secretKey = isSandbox
    ? (process.env.STRIPE_TEST_SECRET_KEY ??
       process.env.STRIPE_SECRET_KEY ??
       "sk_test_51MockStripeTestKey00000000000000000000000")
    : (process.env.STRIPE_LIVE_SECRET_KEY ??
       process.env.STRIPE_SECRET_KEY ??
       "");

  const publishableKey = isSandbox
    ? (process.env.STRIPE_TEST_PUBLISHABLE_KEY ??
       process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
       "pk_test_51MockStripeTestKey00000000000000000000000")
    : (process.env.STRIPE_LIVE_PUBLISHABLE_KEY ??
       process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
       "");

  return { secretKey, publishableKey };
}

/**
 * Returns Razorpay keys based on the current mode.
 * In sandbox: uses RAZORPAY_TEST_KEY_ID / RAZORPAY_TEST_KEY_SECRET
 * In production: uses RAZORPAY_LIVE_KEY_ID / RAZORPAY_LIVE_KEY_SECRET
 * Falls back to RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET for backwards-compat.
 */
export function getRazorpayEnvKeys(): { keyId: string; keySecret: string } {
  const { isSandbox } = getPaymentMode("razorpay");

  const keyId = isSandbox
    ? (process.env.RAZORPAY_TEST_KEY_ID ??
       process.env.RAZORPAY_KEY_ID ??
       "rzp_test_MockRazorpayTestKey00")
    : (process.env.RAZORPAY_LIVE_KEY_ID ??
       process.env.RAZORPAY_KEY_ID ??
       "");

  const keySecret = isSandbox
    ? (process.env.RAZORPAY_TEST_KEY_SECRET ??
       process.env.RAZORPAY_KEY_SECRET ??
       "MockRazorpayTestSecret0000000000")
    : (process.env.RAZORPAY_LIVE_KEY_SECRET ??
       process.env.RAZORPAY_KEY_SECRET ??
       "");

  return { keyId, keySecret };
}

/**
 * Returns the Stripe webhook secret for the current mode.
 */
export function getStripeWebhookSecret(): string {
  const { isSandbox } = getPaymentMode("stripe");
  return isSandbox
    ? (process.env.STRIPE_TEST_WEBHOOK_SECRET ??
       process.env.STRIPE_WEBHOOK_SECRET ??
       "whsec_test_mock_stripe_webhook_secret")
    : (process.env.STRIPE_LIVE_WEBHOOK_SECRET ??
       process.env.STRIPE_WEBHOOK_SECRET ??
       "whsec_live_replace_with_real_secret");
}

/**
 * Returns the Razorpay webhook secret for the current mode.
 */
export function getRazorpayWebhookSecret(): string {
  const { isSandbox } = getPaymentMode("razorpay");
  return isSandbox
    ? (process.env.RAZORPAY_TEST_WEBHOOK_SECRET ??
       process.env.RAZORPAY_WEBHOOK_SECRET ??
       "razorpay_test_webhook_secret_mock")
    : (process.env.RAZORPAY_LIVE_WEBHOOK_SECRET ??
       process.env.RAZORPAY_WEBHOOK_SECRET ??
       "razorpay_live_replace_with_real_secret");
}
