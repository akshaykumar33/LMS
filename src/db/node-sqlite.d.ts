// Type declarations for Node.js experimental SQLite module (node:sqlite)
// Available in Node.js ≥22.5.0
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(location: string);
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }

  export class StatementSync {
    run(...params: any[]): RunResult;
    get(...params: any[]): any;
    all(...params: any[]): any[];
  }

  export interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }
}
