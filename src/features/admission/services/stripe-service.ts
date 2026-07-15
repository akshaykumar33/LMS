/**
 * Stripe Service
 *
 * Per-tenant Stripe client factory with env-driven sandbox/production switching.
 * Delegates key resolution to payment-config.ts — no code changes needed to go live.
 */

import Stripe from "stripe";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStripeEnvKeys, getStripeWebhookSecret, getPaymentMode } from "./payment-config";

// ─────────────────────────────────────────────────────────────────────────────
// Client factory
// ─────────────────────────────────────────────────────────────────────────────

export async function getStripeClientForTenant(tenantId: string): Promise<Stripe> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
  });

  // Per-tenant override takes priority, then env-based key for current mode
  const secretKey =
    (tenant?.settings as any)?.gateways_config?.stripe?.secretKey ||
    getStripeEnvKeys().secretKey;

  return new Stripe(secretKey, {
    apiVersion: "2025-01-27.acercans" as any,
  });
}

export async function getStripePublishableKeyForTenant(tenantId: string): Promise<string> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
  });

  return (
    (tenant?.settings as any)?.gateways_config?.stripe?.publishableKey ||
    getStripeEnvKeys().publishableKey
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Intent creation
// ─────────────────────────────────────────────────────────────────────────────

export async function createStripePaymentIntent(
  tenantId: string,
  amountInCents: number,
  metadata: Record<string, string>
) {
  const stripe = await getStripeClientForTenant(tenantId);
  const { isSandbox } = getPaymentMode("stripe");

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    metadata: {
      ...metadata,
      // Embed the mode in metadata so webhook handlers can log it
      paymentMode: isSandbox ? "sandbox" : "production",
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    publishableKey: await getStripePublishableKeyForTenant(tenantId),
    isSandbox,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook secret resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the correct Stripe webhook secret for the given tenant,
 * falling back to the env-based secret for the current mode.
 */
export function getStripeWebhookSecretForTenant(tenant: any): string {
  return (
    (tenant?.settings as any)?.gateways_config?.stripe?.webhookSecret ||
    getStripeWebhookSecret()
  );
}
