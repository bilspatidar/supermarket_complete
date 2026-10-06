import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeMultiple } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('[Migration] Starting database migration...');
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Strip single-line comments and execute
  const cleanSql = schemaSql
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('--')) return '';
      return line;
    })
    .join('\n');

  await executeMultiple(cleanSql);

  // Check and add account_type to users if not present
  try {
    const { query, run } = await import('./connection.js');
    const cols = await query('PRAGMA table_info(users)');
    const hasAccountType = cols.some(c => c.name === 'account_type');
    if (!hasAccountType) {
      await run("ALTER TABLE users ADD COLUMN account_type TEXT DEFAULT 'CUSTOMER'");
      console.log('[Migration] Added account_type column to users table.');
    }
    // Sync account_type based on user_roles
    await run(`
      UPDATE users SET account_type = 'INTERNAL'
      WHERE id IN (
        SELECT ur.user_id FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE r.name IN ('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER', 'CASHIER_POS', 'DELIVERY_STAFF')
      )
    `);
    await run(`
      UPDATE users SET account_type = 'CUSTOMER'
      WHERE account_type IS NULL OR account_type = ''
    `);
  } catch (colErr) {
    console.warn('[Migration] Note on column migration:', colErr.message);
  }

  console.log('[Migration] Database tables and indexes created successfully.');
}

// If invoked directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log('[Migration] Completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}
