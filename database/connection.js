import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_URL || `file:${path.resolve(__dirname, '../database.sqlite')}`;

export const client = createClient({
  url: dbPath,
});

/**
 * Execute a query that returns multiple rows
 */
export async function query(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows || [];
}

/**
 * Execute a query that returns a single row
 */
export async function get(sql, args = []) {
  const result = await client.execute({ sql, args });
  return (result.rows && result.rows.length > 0) ? result.rows[0] : null;
}

/**
 * Execute an INSERT, UPDATE, or DELETE query
 */
export async function run(sql, args = []) {
  const result = await client.execute({ sql, args });
  return {
    lastInsertRowid: result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : null,
    rowsAffected: result.rowsAffected || 0,
  };
}

/**
 * Execute multiple raw statements (e.g. migration script)
 */
export async function executeMultiple(statements) {
  // Split statements by semicolon where appropriate or execute in batch
  const stmts = statements
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of stmts) {
    await client.execute(stmt);
  }
}

/**
 * Run a transaction
 */
export async function transaction(callback) {
  const tx = await client.transaction('write');
  try {
    const txHelper = {
      query: async (sql, args = []) => {
        const res = await tx.execute({ sql, args });
        return res.rows || [];
      },
      get: async (sql, args = []) => {
        const res = await tx.execute({ sql, args });
        return (res.rows && res.rows.length > 0) ? res.rows[0] : null;
      },
      run: async (sql, args = []) => {
        const res = await tx.execute({ sql, args });
        return {
          lastInsertRowid: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : null,
          rowsAffected: res.rowsAffected || 0,
        };
      },
    };
    const result = await callback(txHelper);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

export default {
  client,
  query,
  get,
  run,
  executeMultiple,
  transaction,
};
