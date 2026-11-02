import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';

@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  private pool?: Pool;
  private embedded?: PGlite;
  async onModuleInit() {
    if (process.env.DATABASE_URL) this.pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, max: 5 });
    else this.embedded = process.env.DATA_DIR === ':memory:' ? new PGlite() : new PGlite(process.env.DATA_DIR || './.data');
    await this.query(`CREATE TABLE IF NOT EXISTS issues (
      id UUID PRIMARY KEY,
      title VARCHAR(120) NOT NULL,
      description VARCHAR(3000) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await this.query('CREATE INDEX IF NOT EXISTS issues_status_created_idx ON issues(status, created_at DESC)');
  }
  async query(sql: string, values: unknown[] = []): Promise<{rows: Record<string, unknown>[]}> {
    if (this.pool) return this.pool.query(sql, values);
    return this.embedded!.query(sql, values);
  }
  async onModuleDestroy() { await this.pool?.end(); await this.embedded?.close(); }
}
