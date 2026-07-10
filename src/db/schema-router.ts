import { headers } from "next/headers";
import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Resolves the active schema name based on the client request header.
 * E.g., subdomain "intel" resolves to "tenant_intel".
 */
export async function getActiveSchemaName(): Promise<string> {
  try {
    const headersList = await headers();
    const subdomain = headersList.get("x-tenant-subdomain");
    if (subdomain && subdomain !== "vt" && subdomain !== "platform") {
      // Normalize schema name to prevent syntax issues
      return `tenant_${subdomain.toLowerCase().replace(/[^a-z0-9_]/g, "")}`;
    }
  } catch (e) {
    // Outside of a request context (e.g., dev seed script or backend background tasks)
  }
  return "public";
}

/**
 * Run database operations inside a scoped transaction with dynamic schema isolation.
 * Automatically resets the search_path upon transaction commit/rollback to keep the pool clean.
 */
export async function withTenantSchema<T>(queryFn: (tx: typeof db) => Promise<T>): Promise<T> {
  const schemaName = await getActiveSchemaName();

  // If the request maps to the top level (Virginia Tech / Super Admin), query public/default schema
  if (schemaName === "public") {
    return await queryFn(db);
  }

  // Wrap query operations in a transaction block
  return await db.transaction(async (tx) => {
    // SET LOCAL is transaction-scoped; once committed or aborted, the connection
    // reverts to its original search_path pool config.
    await tx.execute(sql.raw(`SET LOCAL search_path TO "${schemaName}", public`));
    
    // Execute the database operations within this transaction
    return await queryFn(tx as any);
  });
}
