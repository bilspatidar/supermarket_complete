import mysql from "mysql2/promise";
import "dotenv/config";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "supermarket_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
});

console.log(
  `[Database] MySQL: ${process.env.MYSQL_HOST || "127.0.0.1"}:${process.env.MYSQL_PORT || 3306}/${process.env.MYSQL_DATABASE || "supermarket_db"}`
);

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function get(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

export async function run(sql, params = []) {
  const [result] = await pool.execute(sql, params);

  return {
    changes: result.affectedRows || 0,
    lastInsertRowid: result.insertId || 0,
    insertId: result.insertId || 0,
  };
}

export async function executeMultiple(sql) {
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

export async function transaction(callback) {
  const connection = await pool.getConnection();

  // SQLite-compatible transaction helpers
  const tx = {
    query: async (sql, params = []) => {
      const [rows] = await connection.execute(sql, params);
      return rows;
    },

    get: async (sql, params = []) => {
      const [rows] = await connection.execute(sql, params);
      return rows[0] || null;
    },

    run: async (sql, params = []) => {
      const [result] = await connection.execute(sql, params);

      return {
        changes: result.affectedRows || 0,
        lastInsertRowid: result.insertId || 0,
        insertId: result.insertId || 0,
      };
    },
  };

  try {
    await connection.beginTransaction();

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

export async function closeDatabase() {
  await pool.end();
}


export default {
  query,
  get,
  run,
  executeMultiple,
  transaction,
  closeDatabase,
};