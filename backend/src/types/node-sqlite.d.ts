declare module 'node:sqlite' {
  export interface StatementResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    run(...params: unknown[]): StatementResult;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
