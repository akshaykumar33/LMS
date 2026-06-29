import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Prevent multiple connections during hot reloading in development
declare global {
  // eslint-disable-next-line no-var
  var dbClient: postgres.Sql | undefined;
}

const useJsonDb = process.env.USE_JSON_DB === "true";

let dbInstance: any;

if (useJsonDb) {
  const { initJsonDb, getJsonDbClient, getJsonDbQueryProxy } = require("./json-db-provider");
  initJsonDb();
  const mockClient = getJsonDbClient();
  const queryProxy = getJsonDbQueryProxy();
  const realDrizzle = drizzle(mockClient, { schema });
  dbInstance = new Proxy(realDrizzle, {
    get(target, prop, receiver) {
      if (prop === "query") {
        return queryProxy;
      }
      return Reflect.get(target, prop, receiver);
    }
  });
} else {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres123@127.0.0.1:5432/lms_coe_db";

  const client = globalThis.dbClient || postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? undefined : 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.dbClient = client;
  }

  dbInstance = drizzle(client, { schema });
}

export const db = dbInstance;

