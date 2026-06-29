/**
 * JSON Database Provider
 * 
 * Loads db.json into an in-memory SQLite database (node:sqlite),
 * creates a mock postgres-js client that intercepts Drizzle-generated SQL,
 * translates PG syntax to SQLite, executes it, and writes mutations back to db.json.
 * 
 * Also provides a relational query proxy for db.query.xxx.findFirst/findMany.
 */

import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getTableConfig } from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";
import * as schema from "./schema";
import * as operators from "drizzle-orm";
import dbDataRaw from "../../db.json";

// ── Types ──────────────────────────────────────────────────────────────────

interface TableMeta {
  name: string;
  drizzleTable: any;
  columns: { name: string; dataType: string; columnType: string; hasDefault: boolean; notNull: boolean; primaryKey: boolean }[];
  /** Maps JS property name → SQL column name */
  propToCol: Record<string, string>;
  /** Maps SQL column name → JS property name */
  colToProp: Record<string, string>;
}

// ── Globals ────────────────────────────────────────────────────────────────

let sqlite: DatabaseSync;
let tableMetas: Record<string, TableMeta> = {};
let dbJsonPath: string;
let initialized = false;

// ── Schema introspection ───────────────────────────────────────────────────

function buildTableMetas() {
  const metas: Record<string, TableMeta> = {};
  for (const [key, val] of Object.entries(schema)) {
    if (val && typeof val === "object" && (val as any)[Symbol.for("drizzle:IsDrizzleTable")]) {
      const config = getTableConfig(val as any);
      const propToCol: Record<string, string> = {};
      const colToProp: Record<string, string> = {};

      // Build prop↔col mappings from the table object keys
      for (const [prop, colObj] of Object.entries(val)) {
        if (colObj && typeof colObj === "object" && (colObj as any).name) {
          propToCol[prop] = (colObj as any).name;
          colToProp[(colObj as any).name] = prop;
        }
      }

      metas[config.name] = {
        name: config.name,
        drizzleTable: val,
        columns: config.columns.map(c => ({
          name: c.name,
          dataType: c.dataType,
          columnType: c.columnType,
          hasDefault: c.hasDefault,
          notNull: c.notNull,
          primaryKey: c.primary,
        })),
        propToCol,
        colToProp,
      };
    }
  }
  return metas;
}

// ── SQLite table creation ──────────────────────────────────────────────────

function sqliteType(col: TableMeta["columns"][0]): string {
  if (col.dataType === "date") return "TEXT";
  if (col.dataType === "json") return "TEXT";
  if (col.dataType === "number") return "REAL";
  if (col.dataType === "boolean") return "INTEGER";
  return "TEXT";
}

function createSQLiteTables() {
  for (const meta of Object.values(tableMetas)) {
    const colDefs = meta.columns.map(col => {
      let def = `"${col.name}" ${sqliteType(col)}`;
      if (col.primaryKey) def += " PRIMARY KEY";
      return def;
    });
    const ddl = `CREATE TABLE IF NOT EXISTS "${meta.name}" (${colDefs.join(", ")})`;
    sqlite.exec(ddl);
  }
}

// ── Seed SQLite from db.json ───────────────────────────────────────────────

function serializeValue(val: any, col: TableMeta["columns"][0]): any {
  if (val === null || val === undefined) return null;
  if (col.dataType === "json") return JSON.stringify(val);
  if (col.dataType === "boolean") return val ? 1 : 0;
  if (col.dataType === "date") {
    if (val instanceof Date) return val.toISOString();
    return String(val);
  }
  return val;
}

function seedFromJson(data: Record<string, any[]>) {
  for (const [tableName, rows] of Object.entries(data)) {
    const meta = tableMetas[tableName];
    if (!meta || !rows || rows.length === 0) continue;

    const colNames = meta.columns.map(c => c.name);
    const placeholders = colNames.map(() => "?").join(", ");
    const insertSQL = `INSERT INTO "${tableName}" (${colNames.map(c => `"${c}"`).join(", ")}) VALUES (${placeholders})`;
    const stmt = sqlite.prepare(insertSQL);

    for (const row of rows) {
      const values = meta.columns.map(col => {
        const prop = meta.colToProp[col.name] || col.name;
        return serializeValue(row[prop], col);
      });
      try {
        stmt.run(...values);
      } catch (e: any) {
        // Skip duplicate primary key errors during seed
        if (!e.message?.includes("UNIQUE constraint")) {
          console.error(`[json-db] Seed error in ${tableName}:`, e.message);
        }
      }
    }
  }
}

// ── Write SQLite back to db.json ───────────────────────────────────────────

function deserializeValue(val: any, col: TableMeta["columns"][0]): any {
  if (val === null || val === undefined) return null;
  if (col.dataType === "json") {
    try { return JSON.parse(val as string); } catch { return val; }
  }
  if (col.dataType === "boolean") return val === 1 || val === true;
  return val;
}

function persistToJson() {
  const data: Record<string, any[]> = {};
  for (const meta of Object.values(tableMetas)) {
    const rows = sqlite.prepare(`SELECT * FROM "${meta.name}"`).all() as any[];
    data[meta.name] = rows.map(row => {
      const obj: any = {};
      for (const col of meta.columns) {
        const prop = meta.colToProp[col.name] || col.name;
        obj[prop] = deserializeValue(row[col.name], col);
      }
      return obj;
    });
  }
  writeFileSync(dbJsonPath, JSON.stringify(data, null, 2), "utf8");
}

// ── PG → SQLite SQL translation ────────────────────────────────────────────

function translateSQL(pgSQL: string, params: any[]): { sql: string; params: any[] } {
  let sql = pgSQL;

  // Replace $1, $2, ... with ?
  sql = sql.replace(/\$(\d+)/g, "?");

  // Replace PG-specific functions
  sql = sql.replace(/gen_random_uuid\(\)/gi, "'" + randomUUID() + "'");
  sql = sql.replace(/now\(\)/gi, "'" + new Date().toISOString() + "'");
  sql = sql.replace(/bool_or\(([^)]+)\)/gi, "max($1)");
  sql = sql.replace(/::text/gi, "");
  sql = sql.replace(/::integer/gi, "");
  sql = sql.replace(/::uuid/gi, "");
  sql = sql.replace(/::jsonb/gi, "");
  sql = sql.replace(/::json/gi, "");

  // Handle "returning" clause - SQLite supports RETURNING in newer versions
  // but node:sqlite may not. We'll handle it specially.

  // Replace PG json_agg / json_build_array (used in relational queries)
  // These won't work in SQLite - relational queries are handled separately

  // Translate boolean params
  const translatedParams = params.map(p => {
    if (typeof p === "boolean") return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString();
    return p;
  });

  return { sql, params: translatedParams };
}

// ── Execute SQL on SQLite ──────────────────────────────────────────────────

function executeSQLite(pgSQL: string, pgParams: any[]): any[] {
  const { sql, params } = translateSQL(pgSQL, pgParams);
  const isSelect = /^\s*select/i.test(sql);
  const isInsert = /^\s*insert/i.test(sql);
  const isUpdate = /^\s*update/i.test(sql);
  const isDelete = /^\s*delete/i.test(sql);
  const hasReturning = /\breturning\b/i.test(sql);

  try {
    if (isSelect) {
      const stmt = sqlite.prepare(sql);
      return stmt.all(...params) as any[];
    }

    if ((isInsert || isUpdate || isDelete) && hasReturning) {
      // SQLite's node:sqlite supports RETURNING
      try {
        const stmt = sqlite.prepare(sql);
        const result = stmt.all(...params) as any[];
        persistToJson();
        return result;
      } catch (e: any) {
        // Fallback: strip RETURNING, run, then query
        const returningMatch = sql.match(/\breturning\s+(.+)$/i);
        const withoutReturning = sql.replace(/\s+returning\s+.+$/i, "");
        const stmt = sqlite.prepare(withoutReturning);
        stmt.run(...params);
        persistToJson();
        // For INSERT, try to get last inserted row
        if (isInsert) {
          const tableMatch = sql.match(/insert\s+into\s+"([^"]+)"/i);
          if (tableMatch) {
            const lastRow = sqlite.prepare(`SELECT * FROM "${tableMatch[1]}" ORDER BY rowid DESC LIMIT 1`).all();
            return lastRow as any[];
          }
        }
        return [];
      }
    }

    if (isInsert || isUpdate || isDelete) {
      // Handle INSERT with "default" values - replace with actual defaults
      let fixedSql = sql;
      if (isInsert) {
        // Replace bare "default" keyword with NULL (SQLite doesn't support DEFAULT in VALUES)
        fixedSql = fixedSql.replace(/,\s*default\s*([,)])/gi, ", NULL$1");
        fixedSql = fixedSql.replace(/\(\s*default\s*,/gi, "(NULL,");
        fixedSql = fixedSql.replace(/,\s*default\s*\)/gi, ", NULL)");
      }
      const stmt = sqlite.prepare(fixedSql);
      stmt.run(...params);
      persistToJson();
      return [];
    }

    // Fallback
    const stmt = sqlite.prepare(sql);
    return stmt.all(...params) as any[];
  } catch (e: any) {
    console.error(`[json-db] SQLite execution error:`);
    console.error(`  SQL: ${sql}`);
    console.error(`  Params:`, params);
    console.error(`  Error:`, e.message);
    return [];
  }
}

// ── Relational Query Resolver ──────────────────────────────────────────────

/** Get the Drizzle relations definition for a table by its SQL name */
function getRelationsForTable(tableName: string): any {
  // Relations are exported as <name>Relations
  const mapping: Record<string, any> = {
    tenants: schema.tenantsRelations,
    roles: schema.rolesRelations,
    permissions: schema.permissionsRelations,
    role_permissions: schema.rolePermissionsRelations,
    users: schema.usersRelations,
    batches: schema.batchesRelations,
    admission_applications: schema.admissionApplicationsRelations,
    admission_documents: schema.admissionDocumentsRelations,
    admission_payments: schema.admissionPaymentsRelations,
    students: schema.studentsRelations,
    courses: schema.coursesRelations,
    course_batches: schema.courseBatchesRelations,
    modules: schema.modulesRelations,
    lessons: schema.lessonsRelations,
    quizzes: schema.quizzesRelations,
    quiz_questions: schema.quizQuestionsRelations,
    quiz_attempts: schema.quizAttemptsRelations,
    notifications: schema.notificationsRelations,
    job_postings: schema.jobPostingsRelations,
    job_applications: schema.jobApplicationsRelations,
    certificates: schema.certificatesRelations,
    audit_logs: schema.auditLogsRelations,
  };
  return mapping[tableName];
}

/** Map a schema export key (e.g. "admissionApplications") to its SQL table name */
function schemaKeyToTableName(key: string): string | null {
  const table = (schema as any)[key];
  if (table && typeof table === "object" && table[Symbol.for("drizzle:Name")]) {
    return table[Symbol.for("drizzle:Name")];
  }
  return null;
}

/** Find the SQL table name for a Drizzle table object */
function getTableName(table: any): string {
  return table[Symbol.for("drizzle:Name")] || "";
}

/** Convert a SQLite row (SQL column names) to JS property names */
function rowToProps(row: any, meta: TableMeta): any {
  const obj: any = {};
  for (const col of meta.columns) {
    const prop = meta.colToProp[col.name] || col.name;
    obj[prop] = deserializeValue(row[col.name], col);
  }
  return obj;
}

/** Resolve a where clause (can be SQL object or callback function) */
function resolveWhereClause(where: any, drizzleTable: any): any {
  if (!where) return undefined;
  if (typeof where === "function") {
    return where(drizzleTable, operators);
  }
  return where;
}

/** Build a SQL WHERE string from a Drizzle SQL object */
function buildWhereFromDrizzle(where: any, drizzleTable: any, meta: TableMeta): { clause: string; params: any[] } {
  const resolved = resolveWhereClause(where, drizzleTable);
  if (!resolved) return { clause: "", params: [] };

  // Use a temporary select to extract the WHERE clause via toSQL()
  const { db: tmpDb } = require("./db");
  // We can compile SQL by building a dummy query
  const q = tmpDb.select().from(drizzleTable).where(resolved);
  const compiled = q.toSQL();

  // Extract the WHERE portion from the full SQL
  const whereMatch = compiled.sql.match(/\bwhere\s+(.+)$/i);
  if (!whereMatch) return { clause: "", params: [] };

  let whereClause = whereMatch[1];
  // Translate $1, $2 to ?
  whereClause = whereClause.replace(/\$(\d+)/g, "?");
  // Translate booleans in params
  const params = compiled.params.map((p: any) => {
    if (typeof p === "boolean") return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString();
    return p;
  });

  return { clause: whereClause, params };
}

function isOneRelation(rel: any): boolean {
  if (!rel) return false;
  return (
    rel instanceof operators.One ||
    rel[Symbol.for("drizzle:entityKind")] === "One" ||
    rel.constructor?.name === "One"
  );
}

function isManyRelation(rel: any): boolean {
  if (!rel) return false;
  return (
    rel instanceof operators.Many ||
    rel[Symbol.for("drizzle:entityKind")] === "Many" ||
    rel.constructor?.name === "Many"
  );
}

/** Resolve `with` relations for a set of rows */
function resolveRelations(
  rows: any[],
  tableName: string,
  withSpec: Record<string, any>,
  meta: TableMeta
): any[] {
  const { db: tmpDb } = require("./db");
  const d = tmpDb as any;

  // Find the schema key for this tableName
  const schemaKey = d._.tableNamesMap[`public.${tableName}`] || d._.tableNamesMap[tableName];
  if (!schemaKey) return rows;

  const tableSchema = d._.schema[schemaKey];
  if (!tableSchema || !tableSchema.relations) return rows;

  return rows.map(row => {
    const enriched = { ...row };
    for (const [relName, relSpec] of Object.entries(withSpec)) {
      if (!relSpec) continue;
      const rel = tableSchema.relations[relName];
      if (!rel) continue;

      const targetTableName = rel.referencedTableName;
      const targetMeta = tableMetas[targetTableName];
      if (!targetMeta) continue;

      if (isOneRelation(rel)) {
        // One-to-one or Many-to-one relation
        const localColName = rel.config?.fields?.[0]?.name;
        const refColName = rel.config?.references?.[0]?.name;
        if (localColName && refColName) {
          const localProp = meta.colToProp[localColName] || localColName;
          const localVal = row[localProp];

          if (localVal != null) {
            const targetRows = sqlite.prepare(
              `SELECT * FROM "${targetTableName}" WHERE "${refColName}" = ? LIMIT 1`
            ).all(localVal) as any[];

            if (targetRows.length > 0) {
              let related = rowToProps(targetRows[0], targetMeta);
              // Handle nested with
              if (typeof relSpec === "object" && relSpec.with) {
                [related] = resolveRelations([related], targetTableName, relSpec.with, targetMeta);
              }
              // Handle columns filter
              if (typeof relSpec === "object" && relSpec.columns) {
                const filtered: any = {};
                for (const [col, include] of Object.entries(relSpec.columns)) {
                  if (include) filtered[col] = related[col];
                }
                related = filtered;
              }
              enriched[relName] = related;
            } else {
              enriched[relName] = null;
            }
          } else {
            enriched[relName] = null;
          }
        }
      } else if (isManyRelation(rel)) {
        // One-to-many relation
        // Find the inverse One relation on the target table that points back to us
        const targetSchemaKey = d._.tableNamesMap[`public.${targetTableName}`] || d._.tableNamesMap[targetTableName];
        const targetSchema = d._.schema[targetSchemaKey];
        if (targetSchema && targetSchema.relations) {
          let fkCol: string | null = null;
          let refCol: string | null = null;

          for (const targetRel of Object.values(targetSchema.relations) as any[]) {
            if (isOneRelation(targetRel) && targetRel.referencedTableName === tableName) {
              fkCol = targetRel.config?.fields?.[0]?.name;
              refCol = targetRel.config?.references?.[0]?.name;
              break;
            }
          }

          if (fkCol && refCol) {
            const refProp = meta.colToProp[refCol] || refCol;
            const localVal = row[refProp];
            if (localVal != null) {
              const targetRows = sqlite.prepare(
                `SELECT * FROM "${targetTableName}" WHERE "${fkCol}" = ?`
              ).all(localVal) as any[];

              let related = targetRows.map(r => rowToProps(r, targetMeta));
              // Handle nested with
              if (typeof relSpec === "object" && relSpec.with) {
                related = resolveRelations(related, targetTableName, relSpec.with, targetMeta);
              }
              enriched[relName] = related;
            } else {
              enriched[relName] = [];
            }
          } else {
            enriched[relName] = [];
          }
        } else {
          enriched[relName] = [];
        }
      }
    }
    return enriched;
  });
}

/** Build a relational query handler for a specific table */
function buildRelationalQueryHandler(schemaKey: string) {
  const tableName = schemaKeyToTableName(schemaKey);
  if (!tableName) return undefined;

  const meta = tableMetas[tableName];
  const drizzleTable = (schema as any)[schemaKey];
  if (!meta || !drizzleTable) return undefined;

  return {
    findFirst: async (opts: any = {}) => {
      let sql = `SELECT * FROM "${tableName}"`;
      let params: any[] = [];

      if (opts.where) {
        const { clause, params: whereParams } = buildWhereFromDrizzle(opts.where, drizzleTable, meta);
        if (clause) {
          sql += ` WHERE ${clause}`;
          params = whereParams;
        }
      }

      if (opts.orderBy) {
        const orderSql = buildOrderBy(opts.orderBy, drizzleTable);
        if (orderSql) sql += ` ORDER BY ${orderSql}`;
      }

      sql += " LIMIT 1";

      const rows = sqlite.prepare(sql).all(...params) as any[];
      if (rows.length === 0) return undefined;

      let result = rowToProps(rows[0], meta);

      if (opts.with) {
        [result] = resolveRelations([result], tableName, opts.with, meta);
      }

      return result;
    },

    findMany: async (opts: any = {}) => {
      let sql = `SELECT * FROM "${tableName}"`;
      let params: any[] = [];

      if (opts.where) {
        const { clause, params: whereParams } = buildWhereFromDrizzle(opts.where, drizzleTable, meta);
        if (clause) {
          sql += ` WHERE ${clause}`;
          params = whereParams;
        }
      }

      if (opts.orderBy) {
        const orderSql = buildOrderBy(opts.orderBy, drizzleTable);
        if (orderSql) sql += ` ORDER BY ${orderSql}`;
      }

      if (opts.limit) {
        sql += ` LIMIT ?`;
        params.push(opts.limit);
      }

      if (opts.offset) {
        sql += ` OFFSET ?`;
        params.push(opts.offset);
      }

      const rows = sqlite.prepare(sql).all(...params) as any[];
      let results = rows.map(r => rowToProps(r, meta));

      if (opts.with) {
        results = resolveRelations(results, tableName, opts.with, meta);
      }

      return results;
    },
  };
}

/** Build ORDER BY clause from Drizzle orderBy array */
function buildOrderBy(orderBy: any, drizzleTable: any): string {
  if (!orderBy) return "";
  const items = Array.isArray(orderBy) ? orderBy : [orderBy];
  const parts: string[] = [];

  for (const item of items) {
    if (!item) continue;
    // Drizzle orderBy items are SQL objects; extract from queryChunks
    if (item.queryChunks) {
      const itemParts: string[] = [];
      for (const chunk of item.queryChunks) {
        if (chunk && chunk.name) {
          // It's a column reference
          const tableName = chunk.table?.[Symbol.for("drizzle:Name")] || "";
          itemParts.push(`"${tableName}"."${chunk.name}"`);
        } else if (chunk && chunk.value) {
          const val = Array.isArray(chunk.value) ? chunk.value.join("") : chunk.value;
          if (val.trim()) {
            itemParts.push(val.trim());
          }
        }
      }
      if (itemParts.length > 0) {
        parts.push(itemParts.join(" "));
      }
    }
  }

  return parts.join(", ") || "";
}

// ── Mock Postgres Client ───────────────────────────────────────────────────

function createMockPostgresClient() {
  const client = ((strings: TemplateStringsArray | string, ...values: any[]) => {
    // Tagged template or direct call
    let sql: string;
    let params: any[];
    if (Array.isArray(strings) || (typeof strings === "object" && "raw" in strings)) {
      sql = (strings as any).join("?");
      params = values;
    } else {
      sql = strings as string;
      params = values;
    }

    const resultObj = {
      then(onfulfilled: any, onrejected: any) {
        try {
          const rows = executeSQLite(sql, params);
          return Promise.resolve(rows).then(onfulfilled, onrejected);
        } catch (e) {
          return Promise.reject(e).then(onfulfilled, onrejected);
        }
      },
      values() {
        const rows = executeSQLite(sql, params);
        // Convert object rows to array rows (values mode)
        return Promise.resolve(rows.map((r: any) => Object.values(r)));
      },
    };
    return resultObj;
  }) as any;

  client.unsafe = (sql: string, params: any[] = []) => {
    const resultObj = {
      then(onfulfilled: any, onrejected: any) {
        try {
          const rows = executeSQLite(sql, params);
          return Promise.resolve(rows).then(onfulfilled, onrejected);
        } catch (e) {
          return Promise.reject(e).then(onfulfilled, onrejected);
        }
      },
      values() {
        const rows = executeSQLite(sql, params);
        return Promise.resolve(rows.map((r: any) => Object.values(r)));
      },
    };
    return resultObj;
  };

  client.safe = client;

  client.begin = async (cb: any) => {
    // Simple transaction support - SQLite is single-threaded so this is safe
    sqlite.exec("BEGIN TRANSACTION");
    try {
      const result = await cb(client);
      sqlite.exec("COMMIT");
      persistToJson();
      return result;
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }
  };

  client.options = {
    parsers: {},
    serializers: {},
  };

  return client;
}

// ── Build the relational query proxy ───────────────────────────────────────

function buildQueryProxy(): Record<string, any> {
  const proxy: Record<string, any> = {};

  // Map schema export keys to their handlers
  const schemaKeys = [
    "tenants", "roles", "permissions", "rolePermissions",
    "users", "batches", "admissionApplications", "admissionDocuments",
    "admissionPayments", "students", "courses", "courseBatches",
    "modules", "lessons", "quizzes", "quizQuestions",
    "quizAttempts", "notifications", "jobPostings", "jobApplications",
    "certificates", "auditLogs",
  ];

  for (const key of schemaKeys) {
    const handler = buildRelationalQueryHandler(key);
    if (handler) {
      proxy[key] = handler;
    }
  }

  return proxy;
}

// ── Public API ─────────────────────────────────────────────────────────────

export function initJsonDb() {
  if (initialized) return;

  console.log("[json-db] Initializing JSON database provider...");

  const isVercel = !!process.env.VERCEL;
  const tmpDbJsonPath = join(tmpdir(), "db.json");

  if (isVercel) {
    dbJsonPath = tmpDbJsonPath;
  } else {
    dbJsonPath = join(process.cwd(), "db.json");
  }

  let data = dbDataRaw;

  // On local, if the file exists, read from it to load any previous local mutations.
  // On Vercel, if /tmp/db.json exists, read from it, otherwise use the bundled dbDataRaw.
  try {
    if (existsSync(dbJsonPath)) {
      const raw = readFileSync(dbJsonPath, "utf8");
      data = JSON.parse(raw);
    } else if (isVercel) {
      // Create the file in /tmp so any subsequent writeFileSync doesn't fail
      writeFileSync(dbJsonPath, JSON.stringify(dbDataRaw, null, 2), "utf8");
    }
  } catch (err) {
    console.warn("[json-db] Failed to read from dbJsonPath, falling back to bundled data:", err);
    data = dbDataRaw;
  }

  sqlite = new DatabaseSync(":memory:");
  tableMetas = buildTableMetas();

  createSQLiteTables();
  seedFromJson(data);

  initialized = true;

  const tableCount = Object.keys(tableMetas).length;
  const totalRows = Object.values(data).reduce((sum: number, rows: any) => sum + (rows?.length || 0), 0);
  console.log(`[json-db] Loaded ${totalRows} records across ${tableCount} tables into SQLite.`);
}

export function getJsonDbClient() {
  if (!initialized) initJsonDb();
  return createMockPostgresClient();
}

export function getJsonDbQueryProxy() {
  if (!initialized) initJsonDb();
  return buildQueryProxy();
}

export function getJsonDbSqlite() {
  if (!initialized) initJsonDb();
  return sqlite;
}
