import { NextRequest } from "next/server";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/features/auth/services/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const responseHeaders = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    let intervalId: any;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (event: string, data: any) => {
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch (e) {
            // Stream might be closed
          }
        };

        // Fetch initial list of notifications
        try {
          const list = await db.query.notifications.findMany({
            where: and(
              eq(schema.notifications.userId, user.userId),
              eq(schema.notifications.tenantId, user.tenantId)
            ),
            orderBy: [desc(schema.notifications.createdAt)],
            limit: 30,
          });
          sendEvent("initial", list);
        } catch (err) {
          console.error("SSE Initial load error:", err);
        }

        let lastChecked = new Date();

        intervalId = setInterval(async () => {
          try {
            const list = await db.query.notifications.findMany({
              where: and(
                eq(schema.notifications.userId, user.userId),
                eq(schema.notifications.tenantId, user.tenantId)
              ),
              orderBy: [desc(schema.notifications.createdAt)],
              limit: 30,
            });

            // Filter new ones created since last check
            const fresh = list.filter(
              (n: any) => new Date(n.createdAt).getTime() > lastChecked.getTime()
            );

            if (fresh.length > 0) {
              sendEvent("update", fresh);
              lastChecked = new Date();
            }
          } catch (err) {
            // Keep stream alive
          }
        }, 5000);
      },
      cancel() {
        if (intervalId) {
          clearInterval(intervalId);
        }
      },
    });

    return new Response(stream, { headers: responseHeaders });
  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }
}
