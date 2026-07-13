import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

interface XapiStatementOptions {
  actorEmail: string;
  actorName: string;
  verbId: string;
  verbDisplay: string;
  activityId: string;
  activityName: string;
  activityDescription?: string;
  resultScoreRaw?: number;
  resultSuccess?: boolean;
  resultCompletion?: boolean;
}

/**
 * Format and dispatch an ADL-compliant xAPI statement.
 * If the active tenant settings contain external LRS credentials, dispatch them.
 * Otherwise, save to public.audit_logs or log to console.
 */
export async function sendXapiStatement(tenantId: string, options: XapiStatementOptions) {
  try {
    // 1. Fetch tenant context to check for LRS configurations
    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });

    // 2. Format standard ADL xAPI statement
    const statement = {
      actor: {
        mbox: `mailto:${options.actorEmail}`,
        name: options.actorName,
        objectType: "Agent",
      },
      verb: {
        id: options.verbId,
        display: {
          "en-US": options.verbDisplay,
        },
      },
      object: {
        id: options.activityId,
        objectType: "Activity",
        definition: {
          name: {
            "en-US": options.activityName,
          },
          ...(options.activityDescription && {
            description: {
              "en-US": options.activityDescription,
            },
          }),
        },
      },
      result: {
        ...(options.resultScoreRaw !== undefined && {
          score: {
            raw: options.resultScoreRaw,
          },
        }),
        ...(options.resultSuccess !== undefined && {
          success: options.resultSuccess,
        }),
        ...(options.resultCompletion !== undefined && {
          completion: options.resultCompletion,
        }),
      },
      timestamp: new Date().toISOString(),
    };

    // 3. Dispatch based on configuration
    // We check tenant.settings or environment variables
    const settingsXapi = (tenant?.settings as any)?.xapi;
    const lrsUrl = settingsXapi?.lrsUrl || process.env.LRS_URL;
    const lrsUsername = settingsXapi?.username || process.env.LRS_USERNAME;
    const lrsPassword = settingsXapi?.password || process.env.LRS_PASSWORD;

    if (lrsUrl && lrsUsername && lrsPassword) {
      console.log(`[xAPI] Sending statement to external LRS: ${lrsUrl}`);
      const credentials = Buffer.from(`${lrsUsername}:${lrsPassword}`).toString("base64");
      
      const response = await fetch(lrsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Experience-API-Version": "1.0.3",
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify(statement),
      });

      if (!response.ok) {
        throw new Error(`LRS responded with status code ${response.status}`);
      }
      console.log(`[xAPI] Successfully transmitted statement to external LRS.`);
    } else {
      console.log(`[xAPI Sandbox] LRS credentials not fully configured. Statement payload:`, JSON.stringify(statement, null, 2));
      // Save statement to audit log for internal tracking
      await db.insert(schema.auditLogs).values({
        tenantId: tenantId,
        action: `xapi:${options.verbDisplay}`,
        entityName: "xapi_statement",
        entityId: options.activityId.substring(0, 36),
        userId: null, // Global statement audit
        metadata: statement,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error(`[xAPI Error] Failed to process xAPI transmission:`, error);
    return { success: false, error: error.message || "Failed to dispatch xAPI statement." };
  }
}
