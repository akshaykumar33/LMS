import { NextRequest, NextResponse } from "next/server";
import { db, dbSubdomainStorage } from "@/db/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStripeClientForTenant, getStripeWebhookSecretForTenant } from "@/features/admission/services/stripe-service";
import { AdmissionRepository } from "@/features/admission/repository/admission-repository";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> | { tenantId: string } }
) {
  const resolvedParams = await params;
  const tenantId = resolvedParams.tenantId;

  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant ID." }, { status: 400 });
  }

  try {
    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    const stripe = await getStripeClientForTenant(tenantId);
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
    }

    const rawBody = await req.text();

    const webhookSecret = getStripeWebhookSecretForTenant(tenant);
    const isMockSecret = webhookSecret.includes("mock") || webhookSecret.includes("test_mock");

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Stripe webhook signature verification failed:`, err.message);
      // In local sandbox dev with mock keys, bypass signature check so you can
      // test with `stripe trigger payment_intent.succeeded` without a real secret.
      if (isMockSecret) {
        console.warn("[Stripe Sandbox] Bypassing signature verification — mock webhook secret in use.");
        event = JSON.parse(rawBody);
      } else {
        return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const { applicationId } = paymentIntent.metadata || {};

      if (!applicationId) {
        return NextResponse.json({ error: "Missing applicationId in payment intent metadata." }, { status: 400 });
      }

      await dbSubdomainStorage.run(tenant.subdomain, async () => {
        await AdmissionRepository.recordPayment(
          tenantId,
          applicationId,
          "1500.00",
          "stripe",
          paymentIntent.id,
          "completed"
        );

        await AdmissionRepository.updateApplicationStatus(tenantId, applicationId, "paid");
        console.log(`Successfully processed webhook payment for application ${applicationId} on tenant ${tenant.subdomain}`);
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe webhook processing error:", error);
    return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 });
  }
}
