import { NextRequest, NextResponse } from "next/server";
import { db, dbSubdomainStorage } from "@/db/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyRazorpayWebhookSignature } from "@/features/admission/services/razorpay-service";
import { getRazorpayWebhookSecret, getPaymentMode } from "@/features/admission/services/payment-config";
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

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing x-razorpay-signature header." }, { status: 400 });
  }

  try {
    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    // Resolve webhook secret: per-tenant override > env-based (mode-aware)
    const webhookSecret =
      (tenant.settings as any)?.gateways_config?.razorpay?.webhookSecret ||
      getRazorpayWebhookSecret();

    const isMockSecret =
      webhookSecret.includes("mock") || webhookSecret.includes("test_webhook_secret");

    const { isSandbox } = getPaymentMode("razorpay");

    // Verify signature — bypass only in sandbox with explicit mock key
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      if (isSandbox && isMockSecret) {
        console.warn("[Razorpay Sandbox] Bypassing signature verification — mock webhook secret in use.");
      } else {
        console.error("[Razorpay Webhook] Signature verification failed.");
        return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
      }
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    // ── Handle payment.captured ──────────────────────────────────────────────
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment) {
        return NextResponse.json({ error: "Missing payment entity in payload." }, { status: 400 });
      }

      const applicationId = payment.notes?.applicationId as string | undefined;
      if (!applicationId) {
        console.warn("[Razorpay Webhook] payment.captured received without applicationId in notes.");
        return NextResponse.json({ received: true });
      }

      await dbSubdomainStorage.run(tenant.subdomain, async () => {
        // Convert paise → rupees string for storage
        const amountRupees = ((payment.amount as number) / 100).toFixed(2);

        await AdmissionRepository.recordPayment(
          tenantId,
          applicationId,
          amountRupees,
          "razorpay",
          payment.id,
          "completed"
        );
        await AdmissionRepository.updateApplicationStatus(tenantId, applicationId, "paid");

        console.log(
          `[Razorpay Webhook] payment.captured — applicationId=${applicationId}, paymentId=${payment.id}, ` +
          `amount=₹${amountRupees}, mode=${isSandbox ? "sandbox" : "production"}, tenant=${tenant.subdomain}`
        );
      });
    }

    // ── Handle payment.failed ────────────────────────────────────────────────
    if (event.event === "payment.failed") {
      const payment = event.payload?.payment?.entity;
      const applicationId = payment?.notes?.applicationId as string | undefined;
      if (applicationId) {
        await dbSubdomainStorage.run(tenant.subdomain, async () => {
          await AdmissionRepository.recordPayment(
            tenantId,
            applicationId,
            "0.00",
            "razorpay",
            payment?.id ?? "unknown",
            "failed"
          );
          console.warn(
            `[Razorpay Webhook] payment.failed — applicationId=${applicationId}, error=${payment?.error_description}`
          );
        });
      }
    }

    // ── Handle refund.processed ──────────────────────────────────────────────
    if (event.event === "refund.processed") {
      const refund = event.payload?.refund?.entity;
      console.log(
        `[Razorpay Webhook] refund.processed — refundId=${refund?.id}, paymentId=${refund?.payment_id}, ` +
        `amount=₹${((refund?.amount ?? 0) / 100).toFixed(2)}`
      );
      // TODO: Update application record to reflect refunded status if needed
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Razorpay Webhook] Processing error:", error);
    return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 });
  }
}
