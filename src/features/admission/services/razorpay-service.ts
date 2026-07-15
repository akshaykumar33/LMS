/**
 * Razorpay Service
 *
 * Mirrors stripe-service.ts pattern.
 * Per-tenant key resolution with env-var fallback via payment-config.ts.
 * Switching sandbox ↔ production = changing RAZORPAY_MODE env var only.
 */

import Razorpay from "razorpay";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getRazorpayEnvKeys, getPaymentMode } from "./payment-config";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Client factory
// ─────────────────────────────────────────────────────────────────────────────

export async function getRazorpayClientForTenant(tenantId: string): Promise<Razorpay> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
  });

  const tenantKeys = (tenant?.settings as any)?.gateways_config?.razorpay;
  const envKeys = getRazorpayEnvKeys();

  const key_id = tenantKeys?.keyId || envKeys.keyId;
  const key_secret = tenantKeys?.keySecret || envKeys.keySecret;

  return new Razorpay({ key_id, key_secret });
}

export async function getRazorpayPublishableKeyForTenant(tenantId: string): Promise<string> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
  });

  const tenantKeyId = (tenant?.settings as any)?.gateways_config?.razorpay?.keyId;
  return tenantKeyId || getRazorpayEnvKeys().keyId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Order creation
// ─────────────────────────────────────────────────────────────────────────────

export interface RazorpayOrderResult {
  orderId: string;
  /** Amount in smallest currency unit (paise for INR) */
  amount: number;
  currency: string;
  keyId: string;
  isSandbox: boolean;
}

/**
 * Creates a Razorpay order.
 * @param tenantId  Tenant context
 * @param amountInPaise  Amount in paise (INR) — e.g. 125000 = ₹1,250.00
 * @param receipt  Short receipt reference for your records
 * @param notes  Arbitrary key-value metadata
 */
export async function createRazorpayOrder(
  tenantId: string,
  amountInPaise: number,
  receipt: string,
  notes: Record<string, string> = {}
): Promise<RazorpayOrderResult> {
  const razorpay = await getRazorpayClientForTenant(tenantId);
  const keyId = await getRazorpayPublishableKeyForTenant(tenantId);
  const { isSandbox } = getPaymentMode("razorpay");

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt,
    notes,
  });

  return {
    orderId: order.id,
    amount: order.amount as number,
    currency: order.currency,
    keyId,
    isSandbox,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies the Razorpay payment signature as per their HMAC-SHA256 spec.
 * Must be called server-side before enrolling a student.
 *
 * @param orderId   razorpay_order_id returned by the checkout
 * @param paymentId razorpay_payment_id returned by the checkout
 * @param signature razorpay_signature returned by the checkout
 * @param keySecret The Razorpay key secret to verify against
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

/**
 * Verifies a Razorpay webhook event signature.
 * Used in /api/webhooks/razorpay/[tenantId]/route.ts
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");
  return expectedSignature === signature;
}
