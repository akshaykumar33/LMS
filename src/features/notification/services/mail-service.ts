import nodemailer from "nodemailer";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  fromEmail: string;
  fromName: string;
}

export async function sendTenantEmail(
  tenantId: string,
  options: {
    to: string;
    subject: string;
    html: string;
  }
): Promise<void> {
  try {
    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });

    const smtpSettings: any = (tenant?.settings as any)?.smtp || {};

    const host = smtpSettings.host || process.env.SMTP_HOST;
    const port = parseInt(smtpSettings.port || process.env.SMTP_PORT || "2525");
    const secure = smtpSettings.secure !== undefined ? smtpSettings.secure : false;
    const authUser = smtpSettings.auth?.user || process.env.SMTP_USER;
    const authPass = smtpSettings.auth?.pass || process.env.SMTP_PASS;
    const fromEmail = smtpSettings.fromEmail || process.env.SMTP_FROM_EMAIL || "noreply@wysbryx-lms.com";
    const fromName = smtpSettings.fromName || process.env.SMTP_FROM_NAME || tenant?.name || "Wysbryx LMS";

    if (!host || !authUser || !authPass) {
      console.warn(`SMTP credentials are missing or partially configured for tenant ${tenantId}. Logging to stdout instead:`);
      console.log(`[SMTP DEV OUTBOX]
To: ${options.to}
Subject: ${options.subject}
Body: ${options.html}
`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: authUser,
        pass: authPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log(`Email dispatched successfully to ${options.to} via Nodemailer (Message ID: ${info.messageId})`);
  } catch (error) {
    console.error("Nodemailer service failed to send email:", error);
  }
}
