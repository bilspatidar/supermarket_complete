import 'dotenv/config';
import { createClient } from '@libsql/client';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DB_CLIENT = (process.env.DB_CLIENT || 'sqlite').toLowerCase();

let client = null;
let mysqlPool = null;

if (DB_CLIENT === 'sqlite') {
  const dbPath =
    process.env.DATABASE_URL ||
    `file:${path.resolve(__dirname, '../database.sqlite')}`;

  client = createClient({ url: dbPath });
  console.log(`[Database] SQLite: ${dbPath}`);
} else if (DB_CLIENT === 'mysql') {
  mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'supermarket_db',
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    charset: 'utf8mb4',
  });

  console.log(
    `[Database] MySQL: ${process.env.MYSQL_HOST || '127.0.0.1'}:${process.env.MYSQL_PORT || 3306}/${process.env.MYSQL_DATABASE || 'supermarket_db'}`
  );
} else {
  throw new Error(`Unsupported DB_CLIENT: ${DB_CLIENT}. Use sqlite or mysql.`);
}

export async function query(sql, args = []) {
  if (DB_CLIENT === 'mysql') {
    const [rows] = await mysqlPool.execute(sql, args);
    return Array.isArray(rows) ? rows : [];
  }

  const result = await client.execute({ sql, args });
  return result.rows || [];
}

export async function get(sql, args = []) {
  const rows = await query(sql, args);
  return rows.length ? rows[0] : null;
}

export async function run(sql, args = []) {
  if (DB_CLIENT === 'mysql') {
    const [result] = await mysqlPool.execute(sql, args);
    return {
      lastInsertRowid: result.insertId !== undefined ? Number(result.insertId) : null,
      rowsAffected: result.affectedRows || 0,
    };
  }

  const result = await client.execute({ sql, args });
  return {
    lastInsertRowid:
      result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : null,
    rowsAffected: result.rowsAffected || 0,
  };
}

export async function executeMultiple(statements) {
  const stmts = statements
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of stmts) {
    await run(stmt);
  }
}

export async function transaction(callback) {
  if (DB_CLIENT === 'mysql') {
    const connection = await mysqlPool.getConnection();

    try {
      await connection.beginTransaction();

      const tx = {
        query: async (sql, args = []) => {
          const [rows] = await connection.execute(sql, args);
          return Array.isArray(rows) ? rows : [];
        },
        get: async (sql, args = []) => {
          const [rows] = await connection.execute(sql, args);
          return rows.length ? rows[0] : null;
        },
        run: async (sql, args = []) => {
          const [result] = await connection.execute(sql, args);
          return {
            lastInsertRowid: result.insertId !== undefined ? Number(result.insertId) : null,
            rowsAffected: result.affectedRows || 0,
          };
        },
      };

      const result = await callback(tx);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  const tx = await client.transaction('write');

  try {
    const helper = {
      query: async (sql, args = []) => {
        const result = await tx.execute({ sql, args });
        return result.rows || [];
      },
      get: async (sql, args = []) => {
        const result = await tx.execute({ sql, args });
        return result.rows?.length ? result.rows[0] : null;
      },
      run: async (sql, args = []) => {
        const result = await tx.execute({ sql, args });
        return {
          lastInsertRowid:
            result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : null,
          rowsAffected: result.rowsAffected || 0,
        };
      },
    };

    const result = await callback(helper);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

export { client, mysqlPool };

export default {
  client,
  mysqlPool,
  DB_CLIENT,
  query,
  get,
  run,
  executeMultiple,
  transaction,
};
