import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const zoomWebhookSecret = process.env.ZOOM_WEBHOOK_SECRET || "mock_zoom_webhook_secret";

    // 1. Zoom URL Validation Challenge
    if (body.event === "url_validation") {
      const plainToken = body.payload.plainToken;
      const hashForValidation = crypto
        .createHmac("sha256", zoomWebhookSecret)
        .update(plainToken)
        .digest("hex");

      console.log("Zoom Webhook URL verification successful!");
      return NextResponse.json({
        plainToken: plainToken,
        encryptedToken: hashForValidation,
      }, { status: 200 });
    }

    // 2. Attendance/Participant Joined Event
    if (body.event === "meeting.participant_joined") {
      const participant = body.payload.object.participant;
      const meetingId = body.payload.object.id;
      console.log(`[ZOOM WEBHOOK] Participant ${participant.user_name} (${participant.email}) joined meeting ${meetingId}`);
    }

    // 3. Participant Left Event
    if (body.event === "meeting.participant_left") {
      const participant = body.payload.object.participant;
      const meetingId = body.payload.object.id;
      console.log(`[ZOOM WEBHOOK] Participant ${participant.user_name} (${participant.email}) left meeting ${meetingId}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Zoom Webhook processing error:", error);
    return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 });
  }
}
