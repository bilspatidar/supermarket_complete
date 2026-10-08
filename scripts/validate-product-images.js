import dotenv from "dotenv";
import mysql from "mysql2/promise";
import {
  S3Client,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

dotenv.config();

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
  },
});

const db = await mysql.createConnection({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE || "supermarket_db",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
});

async function main() {
  console.log("");
  console.log("================================");
  console.log("   R2 IMAGE VALIDATION");
  console.log("================================");
  console.log("");

  // 1. Get all R2 files
  const r2Files = new Set();
  let continuationToken;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );

    for (const object of response.Contents || []) {
      if (object.Key) {
        r2Files.add(object.Key);
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;

  } while (continuationToken);

  console.log(`R2 files: ${r2Files.size}`);

  // 2. Get ONLY products where is_image = 0
  const [products] = await db.execute(`
    SELECT id, product_code
    FROM products
    WHERE COALESCE(is_image, 0) = 0
      AND product_code IS NOT NULL
      AND TRIM(product_code) <> ''
  `);

  console.log(`Products to check: ${products.length}`);
  console.log("");

  let updated = 0;
  let missing = 0;

  // 3. Validate against R2
  for (const product of products) {
    const code = String(product.product_code).trim();
    const filename = `${code}.webp`;

    if (r2Files.has(filename)) {

      await db.execute(
        `
        UPDATE products
        SET
          image = ?,
          is_image = 1
        WHERE id = ?
        `,
        [filename, product.id]
      );

      updated++;

      console.log(`✓ ${code}`);

    } else {
      missing++;
    }
  }

  console.log("");
  console.log("================================");
  console.log(`Checked : ${products.length}`);
  console.log(`Updated : ${updated}`);
  console.log(`Missing : ${missing}`);
  console.log("================================");
  console.log("");
  console.log("✓ Done.");
  console.log("");

  await db.end();
}

main().catch(async (error) => {
  console.error("");
  console.error("❌ ERROR:", error.message);
  console.error("");

  await db.end();
  process.exit(1);
});