import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { AsyncLocalStorage } from "async_hooks";

export const dbSubdomainStorage = new AsyncLocalStorage<string>();

// Prevent multiple connections during hot reloading in development
declare global {
  // eslint-disable-next-line no-var
  var dbClient: postgres.Sql | undefined;
}

const useJsonDb = process.env.USE_JSON_DB === "true" && !process.env.DATABASE_URL;

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
  // Base connection URL
  const connectionStringBase = process.env.DATABASE_URL || "postgresql://postgres:postgres123@127.0.0.1:5432/postgres";

  // Connection registry for all active database instances
  const dbClients = new Map<string, postgres.Sql>();

  const getDbClientForDatabase = (dbName: string): postgres.Sql => {
    if (!dbClients.has(dbName)) {
      try {
        const url = new URL(connectionStringBase);
        url.pathname = `/${dbName}`;
        const client = postgres(url.toString(), {
          max: process.env.NODE_ENV === "production" ? undefined : 10,
          idle_timeout: 20,
          connect_timeout: 10,
        });
        dbClients.set(dbName, client);
      } catch (err) {
        console.error(`Failed to initialize Postgres client for database: ${dbName}`, err);
        // Fallback to default client if url parsing fails
        return defaultClient;
      }
    }
    return dbClients.get(dbName)!;
  };

  // Normalize alias subdomains to their canonical schema name
  const normalizeSubdomain = (subdomain: string): string => {
    const s = subdomain.toLowerCase();
    // Alias mappings
    if (s === "vti" || s === "vtu") return "vt";
    return s;
  };

  const getDatabaseForSubdomain = (subdomain: string): string => {
    const s = normalizeSubdomain(subdomain);
    // Map subdomains to parent databases
    if (s === "test1" || s === "test1-sub" || s === "test1sub") {
      return "test1_db";
    }
    if (s === "vt" || s === "intel" || s === "intel-oregon" || s === "amd") {
      return "vt_db";
    }
    // Extract default database name from connection URL if not mapped
    try {
      const url = new URL(connectionStringBase);
      const dbName = url.pathname.replace("/", "");
      return dbName || "postgres";
    } catch {
      return "postgres";
    }
  };

  const defaultClient = globalThis.dbClient || postgres(connectionStringBase, {
    max: process.env.NODE_ENV === "production" ? undefined : 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.dbClient = defaultClient;
  }

  const resolveSubdomainFromHeaders = async (): Promise<string> => {
    const override = dbSubdomainStorage.getStore();
    if (override !== undefined) {
      return override || "";
    }
    try {
      const { headers } = require("next/headers");
      const headersList = await headers();
      let subdomain = headersList.get("x-tenant-subdomain") || "";
      const host = headersList.get("host") || "";
      console.log(`[DB RESOLVER] x-tenant-subdomain header: "${subdomain}" | host header: "${host}"`);
      if (!subdomain) {
        const cleanHost = host.split(":")[0];
        const parts = cleanHost.split(".");
        if (parts.length > 1 && cleanHost !== "localhost" && cleanHost !== "127.0.0.1") {
          subdomain = parts[0];
          console.log(`[DB RESOLVER] parsed subdomain from host: "${subdomain}"`);
        }
      }
      return subdomain;
    } catch (e: any) {
      if (!e?.message?.includes("dynamic server usage") && !e?.message?.includes("Dynamic server usage")) {
        console.log(`[DB RESOLVER] Error fetching headers: ${e?.message || e}`);
      }
      return "";
    }
  };

  const createAsyncQueryProxy = (
    asyncResolver: (state: { isValuesCalled: boolean; valuesArgs: any[] }) => Promise<any>
  ): any => {
    const state = { isValuesCalled: false, valuesArgs: [] as any[] };

    const targetObj = {
      then(onfulfilled?: any, onrejected?: any) {
        return asyncResolver(state).then(
          (realQuery) => {
            if (realQuery && typeof realQuery.then === "function") {
              return realQuery.then(onfulfilled, onrejected);
            }
            if (onfulfilled) return onfulfilled(realQuery);
            return realQuery;
          },
          onrejected
        );
      },
      catch(onrejected?: any) {
        return asyncResolver(state).then(
          (realQuery) => {
            if (realQuery && typeof realQuery.catch === "function") {
              return realQuery.catch(onrejected);
            }
            return realQuery;
          },
          onrejected
        );
      },
      finally(onfinally?: any) {
        return asyncResolver(state).then(
          (realQuery) => {
            if (realQuery && typeof realQuery.finally === "function") {
              return realQuery.finally(onfinally);
            }
            if (onfinally) onfinally();
            return realQuery;
          },
          (err) => {
            if (onfinally) onfinally();
            throw err;
          }
        );
      }
    };

    return new Proxy(targetObj, {
      get(target, prop, receiver) {
        if (prop in targetObj) {
          return Reflect.get(target, prop, receiver);
        }
        if (prop === "values") {
          state.isValuesCalled = true;
          return (...args: any[]) => {
            state.valuesArgs = args;
            return createAsyncQueryProxy(async () => {
              const res = await asyncResolver(state);
              return res;
            });
          };
        }
        return (...args: any[]) => {
          return createAsyncQueryProxy(async () => {
            const realQuery = await asyncResolver(state);
            if (realQuery && typeof realQuery[prop] === "function") {
              return realQuery[prop](...args);
            }
            return realQuery ? realQuery[prop] : undefined;
          });
        };
      }
    }) as any;
  };

  // Intercept every database query to apply transaction-scoped database and schema routing
  const clientProxy = new Proxy(defaultClient, {
    apply(target, thisArg, argArray) {
      return createAsyncQueryProxy(async (state) => {
        const subdomain = await resolveSubdomainFromHeaders();

        if (subdomain && subdomain !== "public") {
          const normalized = normalizeSubdomain(subdomain);
          const dbName = getDatabaseForSubdomain(subdomain);
          const activeClient = getDbClientForDatabase(dbName);
          const schemaName = `tenant_${normalized.replace(/[^a-zA-Z0-9_]/g, "")}`;
          
          console.log(`[DB PROXY] ROUTED QUERY -> Subdomain: "${subdomain}" (normalized: "${normalized}") | DB: "${dbName}" | Schema: "${schemaName}"`);

          // Run query inside a transaction setting search_path locally on the active DB client
          return await activeClient.begin(async (sql) => {
            await sql.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
            // @ts-ignore
            const queryObj = sql(argArray[0], argArray[1] || []) as any;
            let res;
            if (state.isValuesCalled) {
              res = await queryObj.values(...state.valuesArgs);
            } else {
              res = await queryObj;
            }
            console.log(`[DB PROXY RESULT] Query: tag-template | Res:`, res);
            return res;
          });
        }

        // Default client connection routing
        let activeClient = defaultClient;
        if (subdomain) {
          const dbName = getDatabaseForSubdomain(subdomain);
          activeClient = getDbClientForDatabase(dbName);
          console.log(`[DB PROXY] PUBLIC QUERY -> Subdomain: "${subdomain}" | DB: "${dbName}"`);
        } else {
          console.log(`[DB PROXY] BYPASS QUERY -> DB: default`);
        }
        const queryObj = Reflect.apply(activeClient, thisArg, argArray) as any;
        if (state.isValuesCalled && queryObj && typeof queryObj.values === "function") {
          return queryObj.values(...state.valuesArgs);
        }
        return queryObj;
      });
    },

    get(target, prop, receiver) {
      // Intercept unsafe query executions
      if (prop === "unsafe") {
        return (query: string, parameters?: any[]) => {
          return createAsyncQueryProxy(async (state) => {
            const subdomain = await resolveSubdomainFromHeaders();
            const dbName = getDatabaseForSubdomain(subdomain || "public");
            const activeClient = getDbClientForDatabase(dbName);

            if (subdomain && subdomain !== "public") {
              const normalized = normalizeSubdomain(subdomain);
              const schemaName = `tenant_${normalized.replace(/[^a-zA-Z0-9_]/g, "")}`;
              console.log(`[DB PROXY] ROUTED UNSAFE -> Subdomain: "${subdomain}" (normalized: "${normalized}") | DB: "${dbName}" | Schema: "${schemaName}"`);
              return await activeClient.begin(async (sql) => {
                await sql.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
                const queryObj = sql.unsafe(query, parameters || []) as any;
                let res;
                if (state.isValuesCalled) {
                  res = await queryObj.values(...state.valuesArgs);
                } else {
                  res = await queryObj;
                }
                console.log(`[DB PROXY RESULT] Unsafe: ${query.substring(0, 100)} | Params: ${JSON.stringify(parameters)} | Res:`, res);
                return res;
              });
            }

            console.log(`[DB PROXY] PUBLIC UNSAFE -> Subdomain: "${subdomain || "public"}" | DB: "${dbName}"`);
            const queryObj = activeClient.unsafe(query, parameters || []) as any;
            if (state.isValuesCalled && queryObj && typeof queryObj.values === "function") {
              return queryObj.values(...state.valuesArgs);
            }
            return queryObj;
          });
        };
      }

      // Intercept transactions to route them to the active database connection
      if (prop === "begin" || prop === "transaction") {
        return (...args: any[]) => {
          return createAsyncQueryProxy(async () => {
            const subdomain = await resolveSubdomainFromHeaders();
            const dbName = getDatabaseForSubdomain(subdomain || "public");
            const activeClient = getDbClientForDatabase(dbName);

            if (subdomain && subdomain !== "public") {
              const normalized = normalizeSubdomain(subdomain);
              const schemaName = `tenant_${normalized.replace(/[^a-zA-Z0-9_]/g, "")}`;
              const originalCallback = args[0];
              console.log(`[DB PROXY] ROUTED TRANSACTION -> Subdomain: "${subdomain}" (normalized: "${normalized}") | DB: "${dbName}" | Schema: "${schemaName}"`);
              return await (activeClient as any).begin((sql: any) => {
                sql.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
                return originalCallback(sql);
              });
            }

            console.log(`[DB PROXY] PUBLIC TRANSACTION -> Subdomain: "${subdomain || "public"}" | DB: "${dbName}"`);
            return await (activeClient as any).begin(...args);
          });
        };
      }

      return Reflect.get(target, prop, receiver);
    }
  }) as any;

  dbInstance = drizzle(clientProxy, { schema });
}

export const db = dbInstance;
