import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getS3ClientForTenant(tenantId: string) {
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
  });

  const s3Settings: any = (tenant?.settings as any)?.s3 || {};

  const accessKeyId = s3Settings.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = s3Settings.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
  const region = s3Settings.region || process.env.AWS_REGION || "us-east-1";
  const bucketName = s3Settings.bucketName || process.env.AWS_S3_BUCKET || "wysbryx-lms-uploads";

  if (!accessKeyId || !secretAccessKey) {
    return { client: null, bucketName: null, region };
  }

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucketName, region };
}

export async function generatePresignedUploadUrl(
  tenantId: string,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; fileUrl: string } | null> {
  const { client, bucketName, region } = await getS3ClientForTenant(tenantId);

  const fileKey = `${tenantId}/${Date.now()}-${fileName}`;

  if (!client || !bucketName) {
    console.warn(`S3 credentials not configured for tenant ${tenantId}. Bypassing S3 and returning dev mock endpoint.`);
    return {
      uploadUrl: `/api/mock-upload?key=${encodeURIComponent(fileKey)}`,
      fileUrl: `/uploads/${fileKey}`,
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;

    return { uploadUrl, fileUrl };
  } catch (error) {
    console.error("Failed to generate S3 presigned URL:", error);
    return null;
  }
}
