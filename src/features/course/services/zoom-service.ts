import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export interface ZoomMeetingDetails {
  meetingId: string;
  joinUrl: string;
  passcode: string;
}

export async function getZoomCredentials(tenantId: string) {
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
  });

  const zoomSettings: any = (tenant?.settings as any)?.zoom || {};

  const clientId = zoomSettings.clientId || process.env.ZOOM_CLIENT_ID;
  const clientSecret = zoomSettings.clientSecret || process.env.ZOOM_CLIENT_SECRET;
  const accountId = zoomSettings.accountId || process.env.ZOOM_ACCOUNT_ID;

  return { clientId, clientSecret, accountId };
}

export async function generateZoomAccessToken(tenantId: string): Promise<string | null> {
  const { clientId, clientSecret, accountId } = await getZoomCredentials(tenantId);

  if (!clientId || !clientSecret || !accountId) {
    console.warn(`Zoom OAuth credentials not configured for tenant ${tenantId}.`);
    return null;
  }

  try {
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zoom OAuth token request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to generate Zoom access token:", error);
    return null;
  }
}

export async function createZoomMeeting(
  tenantId: string,
  topic: string,
  startTimeIso: string,
  durationMinutes: number
): Promise<ZoomMeetingDetails | null> {
  const token = await generateZoomAccessToken(tenantId);

  if (!token) {
    console.warn(`Using fallback mock Zoom meeting details for tenant ${tenantId} due to missing credentials.`);
    const mockId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    return {
      meetingId: mockId,
      joinUrl: `https://zoom.us/j/${mockId}?pwd=mock_passcode_${Date.now()}`,
      passcode: "123456",
    };
  }

  try {
    const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2, // Scheduled meeting
        start_time: startTimeIso,
        duration: durationMinutes,
        timezone: "UTC",
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          waiting_room: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zoom meeting creation API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      meetingId: data.id.toString(),
      joinUrl: data.join_url,
      passcode: data.password || "",
    };
  } catch (error) {
    console.error("Error creating Zoom meeting:", error);
    return null;
  }
}
