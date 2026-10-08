import 'dotenv/config';
import { createClient } from '@libsql/client';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_CLIENT = (process.env.DB_CLIENT || 'sqlite').toLowerCase();

let client = null;
let mysqlPool = null;

/*
|--------------------------------------------------------------------------
| SQLite
|--------------------------------------------------------------------------
*/

if (DB_CLIENT === 'sqlite') {
  const dbPath =
    process.env.DATABASE_URL ||
    `file:${path.resolve(__dirname, '../database.sqlite')}`;

  client = createClient({
    url: dbPath,
  });

  console.log(`[Database] Using SQLite: ${dbPath}`);
}

/*
|--------------------------------------------------------------------------
| MySQL
|--------------------------------------------------------------------------
*/

if (DB_CLIENT === 'mysql') {
  mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'supermarket_db',

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  });

  console.log(
    `[Database] Using MySQL: ${process.env.MYSQL_HOST || '127.0.0.1'}:${process.env.MYSQL_PORT || 3306}/${process.env.MYSQL_DATABASE || 'supermarket_db'}`
  );
}

/*
|--------------------------------------------------------------------------
| Query
|--------------------------------------------------------------------------
*/

export async function query(sql, args = []) {
  if (DB_CLIENT === 'mysql') {
    const [rows] = await mysqlPool.execute(sql, args);
    return rows || [];
  }

  const result = await client.execute({
    sql,
    args,
  });

  return result.rows || [];
}

/*
|--------------------------------------------------------------------------
| Get Single Row
|--------------------------------------------------------------------------
*/

export async function get(sql, args = []) {
  const rows = await query(sql, args);

  return rows.length > 0 ? rows[0] : null;
}

/*
|--------------------------------------------------------------------------
| Run INSERT / UPDATE / DELETE
|--------------------------------------------------------------------------
*/

export async function run(sql, args = []) {
  if (DB_CLIENT === 'mysql') {
    const [result] = await mysqlPool.execute(sql, args);

    return {
      lastInsertRowid:
        result.insertId !== undefined
          ? Number(result.insertId)
          : null,

      rowsAffected:
        result.affectedRows !== undefined
          ? result.affectedRows
          : 0,
    };
  }

  const result = await client.execute({
    sql,
    args,
  });

  return {
    lastInsertRowid:
      result.lastInsertRowid !== undefined
        ? Number(result.lastInsertRowid)
        : null,

    rowsAffected:
      result.rowsAffected || 0,
  };
}

/*
|--------------------------------------------------------------------------
| Execute Multiple SQL Statements
|--------------------------------------------------------------------------
*/

export async function executeMultiple(statements) {
  const stmts = statements
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of stmts) {
    await run(stmt);
  }
}

/*
|--------------------------------------------------------------------------
| Transaction
|--------------------------------------------------------------------------
*/

export async function transaction(callback) {
  /*
  |--------------------------------------------------------------------------
  | MySQL Transaction
  |--------------------------------------------------------------------------
  */

  if (DB_CLIENT === 'mysql') {
    const connection = await mysqlPool.getConnection();

    try {
      await connection.beginTransaction();

      const txHelper = {
        query: async (sql, args = []) => {
          const [rows] = await connection.execute(sql, args);
          return rows || [];
        },

        get: async (sql, args = []) => {
          const [rows] = await connection.execute(sql, args);
          return rows.length > 0 ? rows[0] : null;
        },

        run: async (sql, args = []) => {
          const [result] = await connection.execute(sql, args);

          return {
            lastInsertRowid:
              result.insertId !== undefined
                ? Number(result.insertId)
                : null,

            rowsAffected:
              result.affectedRows !== undefined
                ? result.affectedRows
                : 0,
          };
        },
      };

      const result = await callback(txHelper);

      await connection.commit();

      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SQLite Transaction
  |--------------------------------------------------------------------------
  */

  const tx = await client.transaction('write');

  try {
    const txHelper = {
      query: async (sql, args = []) => {
        const result = await tx.execute({
          sql,
          args,
        });

        return result.rows || [];
      },

      get: async (sql, args = []) => {
        const result = await tx.execute({
          sql,
          args,
        });

        return result.rows && result.rows.length > 0
          ? result.rows[0]
          : null;
      },

      run: async (sql, args = []) => {
        const result = await tx.execute({
          sql,
          args,
        });

        return {
          lastInsertRowid:
            result.lastInsertRowid !== undefined
              ? Number(result.lastInsertRowid)
              : null,

          rowsAffected:
            result.rowsAffected || 0,
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

export { DB_CLIENT };

export default {
  client,
  mysqlPool,
  query,
  get,
  run,
  executeMultiple,
  transaction,
  DB_CLIENT,
};