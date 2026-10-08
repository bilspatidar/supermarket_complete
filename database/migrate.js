import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { executeMultiple, query, run } from "./connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log("[Migration] Starting MySQL database migration...");

  const schemaPath = path.resolve(__dirname, "schema.sql");

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  let schemaSql = fs.readFileSync(schemaPath, "utf8");

  // Remove SQL comments
  schemaSql = schemaSql
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("--")) {
        return "";
      }

      return line;
    })
    .join("\n");

  await executeMultiple(schemaSql);

  /*
   * Additional migrations
   * Keep these MySQL-compatible.
   */

  await ensureColumn(
    "users",
    "account_type",
    "VARCHAR(30) DEFAULT 'CUSTOMER'"
  );

  await ensureColumn(
    "orders",
    "delivery_staff_id",
    "INT UNSIGNED NULL"
  );

  await ensureColumn(
    "order_status_history",
    "changed_by_role",
    "VARCHAR(50) NULL"
  );

  await ensureColumn(
    "payments",
    "collected_by",
    "INT UNSIGNED NULL"
  );

  await ensureColumn(
    "payments",
    "collected_at",
    "DATETIME NULL"
  );

  await ensureColumn(
    "payments",
    "settled_by",
    "INT UNSIGNED NULL"
  );

  await ensureColumn(
    "payments",
    "settled_at",
    "DATETIME NULL"
  );

  await ensureColumn(
    "payments",
    "settlement_note",
    "TEXT NULL"
  );

  await ensureColumn(
    "payments",
    "settlement_ref",
    "VARCHAR(191) NULL"
  );

  await ensureColumn(
    "roles",
    "status",
    "VARCHAR(30) DEFAULT 'ACTIVE'"
  );

  /*
   * Sync account type.
   */

  await run(`
    UPDATE users
    SET account_type = 'INTERNAL'
    WHERE id IN (
      SELECT ur.user_id
      FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN (
        'SUPER_ADMIN',
        'MASTER_ADMIN',
        'ADMIN',
        'STORE_MANAGER',
        'CASHIER_POS',
        'DELIVERY_STAFF'
      )
    )
  `);

  await run(`
    UPDATE users
    SET account_type = 'CUSTOMER'
    WHERE account_type IS NULL
       OR account_type = ''
  `);

  console.log("[Migration] MySQL tables, columns and data are ready.");
  console.log("[Migration] Completed.");
}

async function ensureColumn(table, column, definition) {
  const rows = await query(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
    `,
    [table, column]
  );

  if (Number(rows[0].count) === 0) {
    await run(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
    );

    console.log(
      `[Migration] Added ${column} to ${table}.`
    );
  }
}

runMigrations().catch((error) => {
  console.error("[Migration] Failed:", error.message);
  console.error(error);
  process.exit(1);
});