import dotenv from "dotenv";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

dotenv.config();

const SOURCE_DIR = path.resolve("./smarket12");
const OUTPUT_DIR = path.resolve("./missing_images");

const files = fs
  .readdirSync(SOURCE_DIR)
  .filter((file) => file.toLowerCase().endsWith(".webp"));

const codes = files.map((file) =>
  path.basename(file, path.extname(file)).trim()
);

const db = await mysql.createConnection({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE || "supermarket_db",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
});

try {
  console.log("");
  console.log("======================================");
  console.log("   CHECKING LOCAL IMAGES");
  console.log("======================================");
  console.log(`Folder images : ${files.length}`);
  console.log("");

  const placeholders = codes.map(() => "?").join(",");

  const [rows] = await db.execute(
    `
    SELECT product_code
    FROM products
    WHERE product_code IN (${placeholders})
      AND COALESCE(is_image, 0) = 0
    `,
    codes
  );

  const missingCodes = new Set(
    rows.map((row) => String(row.product_code).trim())
  );

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const copied = [];

  for (const file of files) {
    const code = path.basename(file, path.extname(file)).trim();

    if (missingCodes.has(code)) {
      fs.copyFileSync(
        path.join(SOURCE_DIR, file),
        path.join(OUTPUT_DIR, file)
      );

      copied.push(file);
    }
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "list.txt"),
    copied.join("\n") + (copied.length ? "\n" : "")
  );

  console.log(`is_image = 0 : ${copied.length}`);
  console.log(`Output folder : ${OUTPUT_DIR}`);
  console.log("");

  for (const file of copied) {
    console.log(`✓ ${file}`);
  }

  console.log("");
  console.log("======================================");
  console.log("DONE");
  console.log("======================================");
} catch (error) {
  console.error("");
  console.error("❌ ERROR:", error.message);
  process.exit(1);
} finally {
  await db.end();
}