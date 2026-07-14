import Stripe from "stripe";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

// Mock keys are placeholders for Stripe keys that are not set in the environment variables
function isMockOrPlaceholderKey(key: string | undefined | null) {
  if (!key) return true;
  return key.includes("mock") || key === "sk_test_mock_stripe_key" || key === "pk_test_mock_stripe_key";
}


export async function getStripeClientForTenant(tenantId: string): Promise<Stripe> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
  });

  const secretKey =
    (tenant?.settings as any)?.gateways_config?.stripe?.secretKey ||
    process.env.STRIPE_SECRET_KEY ||
    "sk_test_mock_stripe_key";

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
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    "pk_test_mock_stripe_key"
  );
}

export async function createStripePaymentIntent(
  tenantId: string,
  amountInCents: number,
  metadata: Record<string, string>
) {
  const stripe = await getStripeClientForTenant(tenantId);
  const publishableKey = await getStripePublishableKeyForTenant(tenantId);

   // 🔹 NEW: simple mock detection that does NOT use `tenant`
  const secretKeyUsed =
    process.env.STRIPE_SECRET_KEY || "sk_test_mock_stripe_key";

  const isMock =
    !secretKeyUsed ||
    secretKeyUsed.includes("mock") ||
    !publishableKey ||
    publishableKey.includes("mock");

  // 🔹 In mock mode, DON'T call Stripe and return clientSecret = null
  if (isMock) {
    return {
      clientSecret: null,
      publishableKey,
    };
  }

  // existing behavior: real Stripe call
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    metadata,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    publishableKey: await getStripePublishableKeyForTenant(tenantId),
  };
}
